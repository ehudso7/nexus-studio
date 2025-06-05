import { SSOConfig } from '../types'

export const OKTA_DEFAULTS = {
  signatureAlgorithm: 'sha256' as const,
  digestAlgorithm: 'sha256' as const,
  attributeMapping: {
    email: 'email',
    name: 'displayName',
    firstName: 'firstName',
    lastName: 'lastName',
    groups: 'groups',
    department: 'department',
    jobTitle: 'title'
  }
}

export function createOktaConfig(params: {
  domain: string
  clientId?: string
  clientSecret?: string
  appId?: string
}): Partial<SSOConfig> {
  const baseUrl = `https://${params.domain}`

  if (params.clientId && params.clientSecret) {
    // OIDC configuration
    return {
      provider: 'OKTA',
      discoveryUrl: `${baseUrl}/.well-known/openid-configuration`,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      authorizationUrl: `${baseUrl}/oauth2/v1/authorize`,
      tokenUrl: `${baseUrl}/oauth2/v1/token`,
      userInfoUrl: `${baseUrl}/oauth2/v1/userinfo`,
      jwksUri: `${baseUrl}/oauth2/v1/keys`,
      attributeMapping: OKTA_DEFAULTS.attributeMapping
    }
  } else if (params.appId) {
    // SAML configuration
    return {
      provider: 'OKTA',
      entryPoint: `${baseUrl}/app/${params.appId}/sso/saml`,
      issuer: 'nexus-studio',
      signatureAlgorithm: OKTA_DEFAULTS.signatureAlgorithm,
      digestAlgorithm: OKTA_DEFAULTS.digestAlgorithm,
      attributeMapping: OKTA_DEFAULTS.attributeMapping
    }
  }

  throw new Error('Either clientId/clientSecret or appId must be provided')
}

export function getOktaMetadataUrl(domain: string, appId: string): string {
  return `https://${domain}/app/${appId}/sso/saml/metadata`
}