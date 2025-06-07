export const oauthProviders = {
    google: {
        id: 'google',
        name: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: ['openid', 'email', 'profile'],
    },
    github: {
        id: 'github',
        name: 'GitHub',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: ['read:user', 'user:email'],
    },
    microsoft: {
        id: 'microsoft',
        name: 'Microsoft',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: ['openid', 'email', 'profile'],
    },
};
export function getOAuthProvider(providerId, clientId, clientSecret) {
    const provider = oauthProviders[providerId];
    if (!provider)
        return null;
    return {
        ...provider,
        clientId,
        clientSecret,
    };
}
export function getOAuthRedirectUrl(provider, redirectUri, state) {
    const params = new URLSearchParams({
        client_id: provider.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: provider.scope.join(' '),
        state,
    });
    if (provider.id === 'google') {
        params.append('access_type', 'offline');
        params.append('prompt', 'consent');
    }
    return `${provider.authorizationUrl}?${params.toString()}`;
}
export async function exchangeCodeForToken(provider, code, redirectUri) {
    const params = new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    });
    const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body: params.toString(),
    });
    if (!response.ok) {
        throw new Error('Failed to exchange code for token');
    }
    return response.json();
}
export async function fetchUserInfo(provider, accessToken) {
    const response = await fetch(provider.userInfoUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }
    return response.json();
}
export function normalizeOAuthUser(provider, userInfo) {
    switch (provider) {
        case 'google':
            return {
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
                providerId: userInfo.id,
            };
        case 'github':
            return {
                email: userInfo.email,
                name: userInfo.name || userInfo.login,
                avatar: userInfo.avatar_url,
                providerId: userInfo.id.toString(),
            };
        case 'microsoft':
            return {
                email: userInfo.mail || userInfo.userPrincipalName,
                name: userInfo.displayName,
                avatar: undefined,
                providerId: userInfo.id,
            };
        default:
            throw new Error(`Unknown OAuth provider: ${provider}`);
    }
}
