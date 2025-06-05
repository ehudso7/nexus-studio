import { PrismaClient } from '@nexus-studio/database'
import { SAMLProvider } from './saml-provider'
import { OIDCProvider } from './oidc-provider'
import { SSOConfig, SSOProvider, SSOUser, SAMLConfigSchema, OIDCConfigSchema } from './types'
import crypto from 'crypto'

export class SSOManager {
  constructor(private db: PrismaClient) {}

  async createSSOConfig(params: {
    organizationId: string
    provider: SSOProvider
    config: any
  }): Promise<SSOConfig> {
    // Validate configuration based on provider
    let validatedConfig: any
    
    switch (params.provider) {
      case 'SAML':
      case 'OKTA':
      case 'AZURE_AD':
        validatedConfig = SAMLConfigSchema.parse(params.config)
        break
      case 'OIDC':
      case 'AUTH0':
        validatedConfig = OIDCConfigSchema.parse(params.config)
        break
      default:
        throw new Error(`Unsupported SSO provider: ${params.provider}`)
    }

    // Check if SSO already exists for this provider
    const existing = await this.db.sSOConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: params.provider
        }
      }
    })

    if (existing) {
      throw new Error(`SSO configuration for ${params.provider} already exists`)
    }

    // Create SSO configuration
    const ssoConfig = await this.db.sSOConfig.create({
      data: {
        organizationId: params.organizationId,
        provider: params.provider,
        ...validatedConfig,
        isActive: false // Start inactive until tested
      }
    })

    return this.mapToSSOConfig(ssoConfig)
  }

  async updateSSOConfig(
    organizationId: string,
    provider: SSOProvider,
    updates: Partial<SSOConfig>
  ): Promise<SSOConfig> {
    const existing = await this.db.sSOConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      }
    })

    if (!existing) {
      throw new Error(`SSO configuration for ${provider} not found`)
    }

    const updated = await this.db.sSOConfig.update({
      where: { id: existing.id },
      data: updates
    })

    return this.mapToSSOConfig(updated)
  }

  async getSSOConfig(organizationId: string, provider: SSOProvider): Promise<SSOConfig | null> {
    const config = await this.db.sSOConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      }
    })

    return config ? this.mapToSSOConfig(config) : null
  }

  async listSSOConfigs(organizationId: string): Promise<SSOConfig[]> {
    const configs = await this.db.sSOConfig.findMany({
      where: { organizationId }
    })

    return configs.map(config => this.mapToSSOConfig(config))
  }

  async toggleSSOConfig(
    organizationId: string,
    provider: SSOProvider,
    isActive: boolean
  ): Promise<SSOConfig> {
    const config = await this.db.sSOConfig.update({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      },
      data: { isActive }
    })

    // Log the action
    await this.db.auditLog.create({
      data: {
        organizationId,
        action: isActive ? 'UPDATE' : 'UPDATE',
        resourceType: 'sso_config',
        resourceId: config.id,
        metadata: {
          provider,
          isActive
        }
      }
    })

    return this.mapToSSOConfig(config)
  }

  async deleteSSOConfig(organizationId: string, provider: SSOProvider): Promise<void> {
    await this.db.sSOConfig.delete({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      }
    })

    // Log the deletion
    await this.db.auditLog.create({
      data: {
        organizationId,
        action: 'DELETE',
        resourceType: 'sso_config',
        resourceId: provider,
        metadata: { provider }
      }
    })
  }

  async getProvider(organizationId: string, provider: SSOProvider): Promise<SAMLProvider | OIDCProvider | null> {
    const config = await this.getSSOConfig(organizationId, provider)
    
    if (!config || !config.isActive) {
      return null
    }

    switch (provider) {
      case 'SAML':
      case 'OKTA':
      case 'AZURE_AD':
        return new SAMLProvider(this.db, config)
      case 'OIDC':
      case 'AUTH0':
        return new OIDCProvider(this.db, config)
      default:
        throw new Error(`Unsupported SSO provider: ${provider}`)
    }
  }

  async testSSOConnection(organizationId: string, provider: SSOProvider): Promise<{
    success: boolean
    error?: string
    metadata?: any
  }> {
    try {
      const config = await this.getSSOConfig(organizationId, provider)
      
      if (!config) {
        return { success: false, error: 'SSO configuration not found' }
      }

      // Test based on provider type
      switch (provider) {
        case 'SAML':
        case 'OKTA':
        case 'AZURE_AD':
          // For SAML, we can only verify the configuration is valid
          if (!config.entryPoint || !config.certificate) {
            return { success: false, error: 'SAML configuration incomplete' }
          }
          
          // Try to create a SAML provider instance
          const samlProvider = new SAMLProvider(this.db, config)
          const metadata = await samlProvider.generateMetadata('https://example.com/callback')
          
          return { 
            success: true, 
            metadata: { 
              metadataUrl: `/api/sso/${organizationId}/saml/metadata`,
              entityId: config.issuer || 'nexus-studio'
            }
          }

        case 'OIDC':
        case 'AUTH0':
          // For OIDC, we can attempt discovery
          const oidcProvider = new OIDCProvider(this.db, config)
          await oidcProvider.initialize()
          
          return { 
            success: true,
            metadata: {
              discoveryUrl: config.discoveryUrl,
              clientId: config.clientId
            }
          }

        default:
          return { success: false, error: 'Unsupported provider' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async generateSSOUrl(
    organizationId: string,
    provider: SSOProvider,
    callbackUrl: string,
    state?: string
  ): Promise<string> {
    const ssoProvider = await this.getProvider(organizationId, provider)
    
    if (!ssoProvider) {
      throw new Error('SSO not configured or inactive')
    }

    if (ssoProvider instanceof SAMLProvider) {
      return ssoProvider.generateLoginUrl(callbackUrl, state)
    } else if (ssoProvider instanceof OIDCProvider) {
      return ssoProvider.getAuthorizationUrl(callbackUrl, state)
    }

    throw new Error('Invalid SSO provider')
  }

  private mapToSSOConfig(dbConfig: any): SSOConfig {
    return {
      id: dbConfig.id,
      organizationId: dbConfig.organizationId,
      provider: dbConfig.provider,
      entryPoint: dbConfig.entryPoint,
      issuer: dbConfig.issuer,
      certificate: dbConfig.certificate,
      signatureAlgorithm: dbConfig.signatureAlgorithm,
      digestAlgorithm: dbConfig.digestAlgorithm,
      clientId: dbConfig.clientId,
      clientSecret: dbConfig.clientSecret,
      discoveryUrl: dbConfig.discoveryUrl,
      authorizationUrl: dbConfig.authorizationUrl,
      tokenUrl: dbConfig.tokenUrl,
      userInfoUrl: dbConfig.userInfoUrl,
      jwksUri: dbConfig.jwksUri,
      isActive: dbConfig.isActive,
      allowedDomains: dbConfig.allowedDomains,
      defaultRole: dbConfig.defaultRole,
      attributeMapping: dbConfig.attributeMapping,
      createdAt: dbConfig.createdAt,
      updatedAt: dbConfig.updatedAt
    }
  }

  // Generate a secure state parameter for OAuth flows
  generateState(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  // Verify state parameter to prevent CSRF
  verifyState(providedState: string, expectedState: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(providedState),
      Buffer.from(expectedState)
    )
  }
}