import { api } from './api';

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends SignInCredentials {
  name: string;
}

export async function signIn(credentials: SignInCredentials) {
  const response = await api.post('/auth/signin', credentials);
  const { token, user } = response.data;
  
  // Store token in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth-token', token);
  }
  
  return { token, user };
}

export async function signUp(credentials: SignUpCredentials) {
  const response = await api.post('/auth/signup', credentials);
  const { token, user } = response.data;
  
  // Store token in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth-token', token);
  }
  
  return { token, user };
}

export async function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-token');
  }
}

export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth-token');
  }
  return null;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    return null;
  }
}