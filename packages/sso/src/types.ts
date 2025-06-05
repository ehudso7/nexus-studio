import { z } from 'zod'

export const SSOProviderSchema = z.enum([
  'SAML',
  'OIDC',
  'AZURE_AD',
  'OKTA',
  'AUTH0'
])
export type SSOProvider = z.infer<typeof SSOProviderSchema>

export interface SSOConfig {
  id: string
  organizationId: string
  provider: SSOProvider
  
  // SAML Configuration
  entryPoint?: string
  issuer?: string
  certificate?: string
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512'
  digestAlgorithm?: 'sha1' | 'sha256' | 'sha512'
  
  // OIDC Configuration
  clientId?: string
  clientSecret?: string
  discoveryUrl?: string
  authorizationUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
  jwksUri?: string
  
  // Common
  isActive: boolean
  allowedDomains?: string[]
  defaultRole?: string
  attributeMapping?: AttributeMapping
  
  createdAt: Date
  updatedAt: Date
}

export interface AttributeMapping {
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  groups?: string
  department?: string
  jobTitle?: string
}

export interface SSOUser {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  groups?: string[]
  attributes?: Record<string, any>
}

export interface SSOSession {
  provider: SSOProvider
  sessionIndex?: string
  nameId?: string
  nameIdFormat?: string
  accessToken?: string
  refreshToken?: string
  idToken?: string
  expiresAt?: Date
}

export interface SAMLRequest {
  id: string
  destination: string
  issueInstant: string
  assertionConsumerServiceURL: string
  providerName: string
}

export interface SAMLResponse {
  inResponseTo: string
  destination: string
  sessionIndex: string
  nameId: string
  nameIdFormat: string
  attributes: Record<string, any>
}

export interface OIDCTokens {
  accessToken: string
  refreshToken?: string
  idToken: string
  tokenType: string
  expiresIn: number
  scope: string
}

export interface JWKSKey {
  kty: string
  use: string
  kid: string
  alg: string
  n?: string
  e?: string
  x5c?: string[]
  x5t?: string
}

export const SAMLConfigSchema = z.object({
  entryPoint: z.string().url(),
  issuer: z.string(),
  certificate: z.string(),
  signatureAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  digestAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  allowedDomains: z.array(z.string()).optional(),
  attributeMapping: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    groups: z.string().optional()
  }).optional()
})

export const OIDCConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  discoveryUrl: z.string().url().optional(),
  authorizationUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
  allowedDomains: z.array(z.string()).optional(),
  attributeMapping: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    groups: z.string().optional()
  }).optional()
})

export type SAMLConfig = z.infer<typeof SAMLConfigSchema>
export type OIDCConfig = z.infer<typeof OIDCConfigSchema>