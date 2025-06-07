import { Issuer, Client, generators, TokenSet } from 'openid-client'
import { PrismaClient } from '@nexus/database'
import { SSOConfig, SSOUser, OIDCTokens } from './types'

export class OIDCProvider {
  private client?: Client
  
  constructor(
    private db: PrismaClient,
    private config: SSOConfig
  ) {}

  async initialize() {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('OIDC configuration incomplete')
    }

    let issuer: Issuer

    if (this.config.discoveryUrl) {
      // Auto-discover endpoints
      issuer = await Issuer.discover(this.config.discoveryUrl)
    } else if (
      this.config.authorizationUrl &&
      this.config.tokenUrl &&
      this.config.userInfoUrl
    ) {
      // Manual configuration
      issuer = new Issuer({
        issuer: this.config.issuer || 'unknown',
        authorization_endpoint: this.config.authorizationUrl,
        token_endpoint: this.config.tokenUrl,
        userinfo_endpoint: this.config.userInfoUrl,
        jwks_uri: this.config.jwksUri
      })
    } else {
      throw new Error('OIDC endpoints not configured')
    }

    this.client = new issuer.Client({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uris: [],
      response_types: ['code']
    })
  }

  async getAuthorizationUrl(redirectUri: string, state?: string): Promise<string> {
    if (!this.client) {
      await this.initialize()
    }

    const nonce = generators.nonce()
    const codeVerifier = generators.codeVerifier()
    const codeChallenge = generators.codeChallenge(codeVerifier)

    const params = {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      response_type: 'code',
      nonce,
      state: state || generators.state(),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    }

    const authUrl = this.client!.authorizationUrl(params)

    // Store code verifier and nonce for later use
    // In production, store these in Redis or session
    return authUrl
  }

  async handleCallback(
    redirectUri: string,
    params: Record<string, string>,
    codeVerifier: string,
    nonce: string
  ): Promise<SSOUser> {
    if (!this.client) {
      await this.initialize()
    }

    // Exchange code for tokens
    const tokenSet = await this.client!.callback(redirectUri, params, {
      code_verifier: codeVerifier,
      nonce
    })

    // Get user info
    const userinfo = await this.client!.userinfo(tokenSet.access_token!)

    // Map user attributes
    const user = this.mapUserInfo(userinfo)

    // Check if email domain is allowed
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      const domain = user.email.split('@')[1]
      if (!this.config.allowedDomains.includes(domain)) {
        throw new Error(`Email domain ${domain} is not allowed`)
      }
    }

    // Sync user to database
    await this.syncUser(user)

    return user
  }

  private mapUserInfo(userinfo: any): SSOUser {
    const mapping = this.config.attributeMapping || {}

    const email = userinfo[mapping.email || 'email'] || userinfo.email
    if (!email) {
      throw new Error('Email not found in OIDC response')
    }

    return {
      id: userinfo.sub,
      email,
      name: userinfo[mapping.name || 'name'] || userinfo.name,
      firstName: userinfo[mapping.firstName || 'given_name'] || userinfo.given_name,
      lastName: userinfo[mapping.lastName || 'family_name'] || userinfo.family_name,
      groups: userinfo[mapping.groups || 'groups'] || userinfo.groups,
      attributes: userinfo
    }
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
          emailVerified: new Date(),
          provider: 'OIDC' as any
        }
      })
    } else {
      await this.db.user.update({
        where: { id: user.id },
        data: {
          name: ssoUser.name || user.name,
          lastLoginAt: new Date()
        }
      })
    }

    // Add user to organization
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
          provider: 'OIDC',
          email: ssoUser.email
        }
      }
    })
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    if (!this.client) {
      await this.initialize()
    }

    return this.client!.refresh(refreshToken)
  }

  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    if (!this.client) {
      await this.initialize()
    }

    await this.client!.revoke(token, tokenTypeHint)
  }

  async introspectToken(token: string): Promise<any> {
    if (!this.client) {
      await this.initialize()
    }

    return this.client!.introspect(token)
  }

  async endSession(idToken: string, postLogoutRedirectUri?: string): Promise<string> {
    if (!this.client) {
      await this.initialize()
    }

    return this.client!.endSessionUrl({
      id_token_hint: idToken,
      post_logout_redirect_uri: postLogoutRedirectUri
    })
  }
}