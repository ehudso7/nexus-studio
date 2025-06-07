import { prisma } from '@nexus/database';
import { hashPassword, verifyPassword, generateSecureToken } from './password';
import { createSession, validateSession, revokeSession } from './session';
import { getOAuthProvider, getOAuthRedirectUrl, exchangeCodeForToken, fetchUserInfo, normalizeOAuthUser, } from './oauth';
export class AuthService {
    config;
    constructor(config) {
        this.config = config;
    }
    async signUp(input) {
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        const hashedPassword = await hashPassword(input.password);
        const user = await prisma.user.create({
            data: {
                email: input.email,
                name: input.name,
                password: hashedPassword,
            },
        });
        return createSession(user, this.config.jwtSecret, this.config.jwtExpiresIn);
    }
    async signIn(input) {
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (!user || !user.password) {
            throw new Error('Invalid email or password');
        }
        const isPasswordValid = await verifyPassword(user.password, input.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        return createSession(user, this.config.jwtSecret, this.config.jwtExpiresIn);
    }
    async signOut(token) {
        await revokeSession(token);
    }
    async validateSession(token) {
        return validateSession(token, this.config.jwtSecret);
    }
    async resetPassword(input) {
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (!user) {
            // Don't reveal whether the email exists
            return { resetToken: generateSecureToken() };
        }
        const resetToken = generateSecureToken();
        // In production, store this token with expiration and send email
        // For now, we'll just return it
        return { resetToken };
    }
    async updatePassword(userId, input) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.password) {
            throw new Error('User not found');
        }
        const isPasswordValid = await verifyPassword(user.password, input.currentPassword);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        const hashedPassword = await hashPassword(input.newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    }
    async getOAuthUrl(provider, redirectUri, state) {
        const clientId = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_ID`];
        const clientSecret = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
        if (!clientId || !clientSecret) {
            throw new Error(`OAuth provider ${provider} is not configured`);
        }
        const oauthProvider = getOAuthProvider(provider, clientId, clientSecret);
        if (!oauthProvider) {
            throw new Error(`Unknown OAuth provider: ${provider}`);
        }
        return getOAuthRedirectUrl(oauthProvider, redirectUri, state);
    }
    async handleOAuthCallback(provider, code, redirectUri) {
        const clientId = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_ID`];
        const clientSecret = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
        if (!clientId || !clientSecret) {
            throw new Error(`OAuth provider ${provider} is not configured`);
        }
        const oauthProvider = getOAuthProvider(provider, clientId, clientSecret);
        if (!oauthProvider) {
            throw new Error(`Unknown OAuth provider: ${provider}`);
        }
        const tokenData = await exchangeCodeForToken(oauthProvider, code, redirectUri);
        const userInfo = await fetchUserInfo(oauthProvider, tokenData.access_token);
        const normalizedUser = normalizeOAuthUser(provider, userInfo);
        let user = await prisma.user.findUnique({
            where: { email: normalizedUser.email },
        });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: normalizedUser.email,
                    name: normalizedUser.name,
                    avatar: normalizedUser.avatar,
                    provider: provider.toUpperCase(),
                    providerId: normalizedUser.providerId,
                    emailVerified: new Date(),
                },
            });
        }
        else if (!user.provider) {
            // Link OAuth account to existing user
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    provider: provider.toUpperCase(),
                    providerId: normalizedUser.providerId,
                    emailVerified: user.emailVerified || new Date(),
                },
            });
        }
        return createSession(user, this.config.jwtSecret, this.config.jwtExpiresIn);
    }
    async verifyEmail(userId) {
        await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: new Date() },
        });
    }
    async enableTwoFactor(userId) {
        const secret = generateSecureToken(32);
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
            },
        });
        // In production, generate actual QR code
        const qrCode = `otpauth://totp/NexusStudio?secret=${secret}`;
        return { secret, qrCode };
    }
    async disableTwoFactor(userId) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });
    }
}
