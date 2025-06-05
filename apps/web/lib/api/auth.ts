import type { SignInInput, SignUpInput, Session } from '@nexus/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class AuthApi {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async signIn(data: SignInInput): Promise<Session> {
    const session = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(session.token);
    return session;
  }

  async signUp(data: SignUpInput): Promise<Session> {
    const session = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(session.token);
    return session;
  }

  async signOut(): Promise<void> {
    try {
      await this.request('/auth/signout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      return await this.request('/auth/session');
    } catch {
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
}

export const authApi = new AuthApi();