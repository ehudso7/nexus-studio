import { GraphQLClient } from 'graphql-request';
import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;

export async function getGraphQLClient(req?: any): Promise<GraphQLClient> {
  const client = new GraphQLClient(GRAPHQL_ENDPOINT);
  
  // Add authentication header if user is logged in
  try {
    const session = await getSession({ req });
    if (session?.accessToken) {
      client.setHeader('Authorization', `Bearer ${session.accessToken}`);
    }
  } catch (error) {
    // Ignore auth errors for public queries
  }
  
  return client;
}

// Browser-side client
export const graphQLClient = new GraphQLClient(GRAPHQL_ENDPOINT);

// Function to set auth header on browser client
export function setAuthToken(token: string | null) {
  if (token) {
    graphQLClient.setHeader('Authorization', `Bearer ${token}`);
  } else {
    graphQLClient.setHeader('Authorization', '');
  }
}