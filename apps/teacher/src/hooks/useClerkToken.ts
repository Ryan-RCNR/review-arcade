/**
 * useClerkToken Hook
 *
 * Automatically stores Clerk auth token in secure memory storage
 * for use by the API client. Must be used within ClerkProvider.
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { storeClerkToken } from '@review-arcade/shared/utils';

export function useClerkToken() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    // Get and store the token immediately
    const storeToken = async () => {
      try {
        const token = await getToken();
        if (token) {
          storeClerkToken(token);
        }
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
      }
    };

    storeToken();

    // Refresh token periodically (every 50 minutes, tokens typically last 60 minutes)
    const refreshInterval = setInterval(storeToken, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [getToken, isSignedIn]);
}
