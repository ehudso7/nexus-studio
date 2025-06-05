import { SSOConfig } from '../types'

export const AUTH0_DEFAULTS = {
  scope: 'openid email profile',
  attributeMapping: {
    email: 'email',
    name: 'name',
    firstName: 'given_name',
    lastName: 'family_name',
    groups: 'https://nexus-studio.com/groups',
    department: 'https://nexus-studio.com/department',
    jobTitle: 'https://nexus-studio.com/job_title'
  }
}

export function createAuth0Config(params: {
  domain: string
  clientId: string
  clientSecret: string
  customNamespace?: string
}): Partial<SSOConfig> {
  const baseUrl = `https://${params.domain}`
  const namespace = params.customNamespace || 'https://nexus-studio.com'

  return {
    provider: 'AUTH0',
    discoveryUrl: `${baseUrl}/.well-known/openid-configuration`,
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    authorizationUrl: `${baseUrl}/authorize`,
    tokenUrl: `${baseUrl}/oauth/token`,
    userInfoUrl: `${baseUrl}/userinfo`,
    jwksUri: `${baseUrl}/.well-known/jwks.json`,
    attributeMapping: {
      ...AUTH0_DEFAULTS.attributeMapping,
      groups: `${namespace}/groups`,
      department: `${namespace}/department`,
      jobTitle: `${namespace}/job_title`
    }
  }
}

export function createAuth0Rules(namespace: string = 'https://nexus-studio.com'): {
  addGroupsRule: string
  addMetadataRule: string
} {
  return {
    // Rule to add groups to ID token
    addGroupsRule: `
function addGroupsToToken(user, context, callback) {
  const namespace = '${namespace}';
  
  // Get groups from app_metadata or user_metadata
  const groups = user.app_metadata?.groups || user.user_metadata?.groups || [];
  
  // Add groups to ID token
  context.idToken[namespace + '/groups'] = groups;
  
  // Add other metadata
  context.idToken[namespace + '/department'] = user.user_metadata?.department || '';
  context.idToken[namespace + '/job_title'] = user.user_metadata?.job_title || '';
  
  callback(null, user, context);
}`,

    // Rule to sync user metadata
    addMetadataRule: `
function syncUserMetadata(user, context, callback) {
  const namespace = '${namespace}';
  
  // Only sync on first login or profile update
  if (context.stats.loginsCount > 1 && !context.request.query.sync) {
    return callback(null, user, context);
  }
  
  // Get user metadata from external source if needed
  // This is where you'd integrate with your HR system
  
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.synced_at = new Date().toISOString();
  
  auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
    .then(() => {
      callback(null, user, context);
    })
    .catch((err) => {
      callback(err);
    });
}`
  }
}

export function getAuth0ConnectionName(type: 'google' | 'microsoft' | 'saml'): string {
  const connectionMap = {
    google: 'google-oauth2',
    microsoft: 'windowslive',
    saml: 'samlp'
  }
  
  return connectionMap[type]
}