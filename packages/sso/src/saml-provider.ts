import { Strategy as SamlStrategy, SamlConfig } from '@node-saml/passport-saml'
import { PrismaClient } from '@nexus/database'
import crypto from 'crypto'
import { SSOConfig, SSOUser, SAMLResponse, AttributeMapping } from './types'

export class SAMLProvider {
  constructor(
    private db: PrismaClient,
    private config: SSOConfig
  ) {}

  getStrategy(callbackUrl: string) {
    if (!this.config.entryPoint || !this.config.certificate) {
      throw new Error('SAML configuration incomplete')
    }

    const samlConfig: SamlConfig = {
      entryPoint: this.config.entryPoint,
      issuer: this.config.issuer || 'nexus-studio',
      callbackUrl,
      cert: this.config.certificate,
      signatureAlgorithm: this.config.signatureAlgorithm || 'sha256',
      digestAlgorithm: this.config.digestAlgorithm || 'sha256',
      identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
      acceptedClockSkewMs: 5000,
      attributeConsumingServiceIndex: false,
      disableRequestedAuthnContext: true,
      forceAuthn: false,
      skipRequestCompression: false,
      decryptionPvk: null,
      passReqToCallback: true
    }

    return new SamlStrategy(
      samlConfig,
      async (req: any, profile: any, done: any) => {
        try {
          const user = await this.handleSAMLResponse(profile)
          done(null, user)
        } catch (error) {
          done(error)
        }
      },
      async (req: any, profile: any, done: any) => {
        try {
          const user = await this.handleSAMLResponse(profile)
          done(null, user)
        } catch (error) {
          done(error)
        }
      }
    )
  }

  async handleSAMLResponse(profile: any): Promise<SSOUser> {
    // Extract attributes based on mapping
    const mapping = this.config.attributeMapping || {}
    const attributes = profile.attributes || profile

    const email = this.getAttribute(attributes, mapping.email || 'email') || 
                  profile.nameID || 
                  profile.email

    if (!email) {
      throw new Error('Email attribute not found in SAML response')
    }

    // Check if email domain is allowed
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      const domain = email.split('@')[1]
      if (!this.config.allowedDomains.includes(domain)) {
        throw new Error(`Email domain ${domain} is not allowed`)
      }
    }

    const user: SSOUser = {
      id: profile.nameID || email,
      email,
      name: this.getAttribute(attributes, mapping.name || 'name') || 
            this.getAttribute(attributes, 'displayName'),
      firstName: this.getAttribute(attributes, mapping.firstName || 'firstName') ||
                 this.getAttribute(attributes, 'givenName'),
      lastName: this.getAttribute(attributes, mapping.lastName || 'lastName') ||
                this.getAttribute(attributes, 'surname'),
      groups: this.getAttributeArray(attributes, mapping.groups || 'groups') ||
              this.getAttributeArray(attributes, 'memberOf'),
      attributes
    }

    // Create or update user in database
    await this.syncUser(user)

    return user
  }

  private getAttribute(attributes: any, path: string): string | undefined {
    if (!path) return undefined

    const keys = path.split('.')
    let value = attributes

    for (const key of keys) {
      value = value?.[key]
      if (value === undefined) break
    }

    if (Array.isArray(value)) {
      return value[0]
    }

    return value?.toString()
  }

  private getAttributeArray(attributes: any, path: string): string[] | undefined {
    const value = this.getAttribute(attributes, path)
    
    if (!value) return undefined
    
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean)
    }

    return undefined
  }

  private async syncUser(ssoUser: SSOUser) {
    // Find or create user
    let user = await this.db.user.findUnique({
      where: { email: ssoUser.email }
    })

    if (!user) {
      user = await this.db.user.create({
        data: {
          email: ssoUser.email,
          name: ssoUser.name,
          emailVerified: new Date(), // SSO users are pre-verified
          provider: 'SAML' as any // This would need to be added to AuthProvider enum
        }
      })
    } else {
      // Update user info from SSO
      await this.db.user.update({
        where: { id: user.id },
        data: {
          name: ssoUser.name || user.name,
          lastLoginAt: new Date()
        }
      })
    }

    // Add user to organization if not already a member
    const existingMember = await this.db.organizationMember.findFirst({
      where: {
        organizationId: this.config.organizationId,
        userId: user.id
      }
    })

    if (!existingMember) {
      await this.db.organizationMember.create({
        data: {
          organizationId: this.config.organizationId,
          userId: user.id,
          role: this.config.defaultRole as any || 'MEMBER'
        }
      })
    }

    // Log the SSO login
    await this.db.auditLog.create({
      data: {
        userId: user.id,
        organizationId: this.config.organizationId,
        action: 'LOGIN',
        resourceType: 'sso',
        resourceId: this.config.id,
        metadata: {
          provider: 'SAML',
          email: ssoUser.email
        }
      }
    })
  }

  generateLoginUrl(callbackUrl: string, relayState?: string): string {
    if (!this.config.entryPoint) {
      throw new Error('SAML entry point not configured')
    }

    const samlRequest = this.createSAMLRequest(callbackUrl)
    const encodedRequest = Buffer.from(samlRequest).toString('base64')
    
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest
    })

    if (relayState) {
      params.append('RelayState', relayState)
    }

    return `${this.config.entryPoint}?${params.toString()}`
  }

  private createSAMLRequest(assertionConsumerServiceURL: string): string {
    const id = `_${crypto.randomBytes(16).toString('hex')}`
    const issueInstant = new Date().toISOString()
    const issuer = this.config.issuer || 'nexus-studio'

    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest 
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${this.config.entryPoint}"
    AssertionConsumerServiceURL="${assertionConsumerServiceURL}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${issuer}</saml:Issuer>
    <samlp:NameIDPolicy 
        Format="urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress"
        AllowCreate="true" />
</samlp:AuthnRequest>`
  }

  async generateMetadata(callbackUrl: string): Promise<string> {
    const issuer = this.config.issuer || 'nexus-studio'
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor 
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${issuer}">
    <SPSSODescriptor 
        AuthnRequestsSigned="false"
        WantAssertionsSigned="true"
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress</NameIDFormat>
        <AssertionConsumerService 
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="${callbackUrl}"
            index="0" />
    </SPSSODescriptor>
</EntityDescriptor>`
  }

  async handleLogout(nameId: string, sessionIndex?: string): Promise<string> {
    // Generate logout request
    const logoutRequest = this.createLogoutRequest(nameId, sessionIndex)
    const encodedRequest = Buffer.from(logoutRequest).toString('base64')
    
    return `${this.config.entryPoint}?SAMLRequest=${encodedRequest}`
  }

  private createLogoutRequest(nameId: string, sessionIndex?: string): string {
    const id = `_${crypto.randomBytes(16).toString('hex')}`
    const issueInstant = new Date().toISOString()
    const issuer = this.config.issuer || 'nexus-studio'

    let sessionIndexElement = ''
    if (sessionIndex) {
      sessionIndexElement = `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>`
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest 
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${this.config.entryPoint}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress">${nameId}</saml:NameID>
    ${sessionIndexElement}
</samlp:LogoutRequest>`
  }
}