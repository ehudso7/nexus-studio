import { prisma, type User, type Session as PrismaSession } from '@nexus/database';
import { generateToken, verifyToken } from './jwt';
import type { Session, JWTPayload } from '../types';

export async function createSession(
  user: User,
  jwtSecret: string,
  jwtExpiresIn: string
): Promise<Session> {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  const token = generateToken(payload, jwtSecret, jwtExpiresIn);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });
  
  return {
    user,
    token,
    expiresAt,
  };
}

export async function validateSession(
  token: string,
  jwtSecret: string
): Promise<Session | null> {
  try {
    const payload = verifyToken(token, jwtSecret);
    
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return {
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.delete({
    where: { token },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}