import { prisma, type User, AuthProvider } from '@nexus/database';
import { hashPassword, verifyPassword, generateSecureToken } from './password';
import { createSession, validateSession, revokeSession } from './session';
import {
  getOAuthProvider,
  getOAuthRedirectUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  normalizeOAuthUser,
} from './oauth';
import type {
  SignInInput,
  SignUpInput,
  ResetPasswordInput,
  UpdatePasswordInput,
  Session,
  AuthConfig,
} from '../types';

export class AuthService {
  constructor(private config: AuthConfig) {}

  async signUp(input: SignUpInput): Promise<Session> {
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

  async signIn(input: SignInInput): Promise<Session> {
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

  async signOut(token: string): Promise<void> {
    await revokeSession(token);
  }

  async validateSession(token: string): Promise<Session | null> {
    return validateSession(token, this.config.jwtSecret);
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ resetToken: string }> {
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

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new Error('User not found');
    }

    const isPasswordValid = await verifyPassword(
      user.password,
      input.currentPassword
    );

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getOAuthUrl(
    provider: string,
    redirectUri: string,
    state: string
  ): Promise<string> {
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

  async handleOAuthCallback(
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<Session> {
    const clientId = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`AUTH_${provider.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }

    const oauthProvider = getOAuthProvider(provider, clientId, clientSecret);

    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    const tokenData = await exchangeCodeForToken(
      oauthProvider,
      code,
      redirectUri
    );

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
          provider: provider.toUpperCase() as AuthProvider,
          providerId: normalizedUser.providerId,
          emailVerified: new Date(),
        },
      });
    } else if (!user.provider) {
      // Link OAuth account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: provider.toUpperCase() as AuthProvider,
          providerId: normalizedUser.providerId,
          emailVerified: user.emailVerified || new Date(),
        },
      });
    }

    return createSession(user, this.config.jwtSecret, this.config.jwtExpiresIn);
  }

  async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  async enableTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
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

  async disableTwoFactor(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
}