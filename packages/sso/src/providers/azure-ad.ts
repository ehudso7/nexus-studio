import { SSOConfig } from '../types'

export const AZURE_AD_DEFAULTS = {
  signatureAlgorithm: 'sha256' as const,
  digestAlgorithm: 'sha256' as const,
  attributeMapping: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    name: 'http://schemas.microsoft.com/identity/claims/displayname',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
    department: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department',
    jobTitle: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/jobtitle'
  }
}

export function createAzureADConfig(params: {
  tenantId: string
  clientId: string
  clientSecret?: string
  appIdUri?: string
}): Partial<SSOConfig> {
  const baseUrl = `https://login.microsoftonline.com/${params.tenantId}`

  if (params.clientSecret) {
    // OIDC configuration
    return {
      provider: 'AZURE_AD',
      discoveryUrl: `${baseUrl}/v2.0/.well-known/openid-configuration`,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      authorizationUrl: `${baseUrl}/oauth2/v2.0/authorize`,
      tokenUrl: `${baseUrl}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      jwksUri: `${baseUrl}/discovery/v2.0/keys`,
      attributeMapping: {
        email: 'mail',
        name: 'displayName',
        firstName: 'givenName',
        lastName: 'surname',
        groups: 'groups',
        department: 'department',
        jobTitle: 'jobTitle'
      }
    }
  } else {
    // SAML configuration
    return {
      provider: 'AZURE_AD',
      entryPoint: `${baseUrl}/saml2`,
      issuer: params.appIdUri || params.clientId,
      signatureAlgorithm: AZURE_AD_DEFAULTS.signatureAlgorithm,
      digestAlgorithm: AZURE_AD_DEFAULTS.digestAlgorithm,
      attributeMapping: AZURE_AD_DEFAULTS.attributeMapping
    }
  }
}

export function getAzureADMetadataUrl(tenantId: string, appId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/federationmetadata/2007-06/federationmetadata.xml?appid=${appId}`
}

export function validateAzureADGroups(groups: string[], allowedGroups: string[]): boolean {
  // Azure AD returns group IDs, not names
  // This function would check if user's groups include any allowed groups
  return groups.some(group => allowedGroups.includes(group))
}