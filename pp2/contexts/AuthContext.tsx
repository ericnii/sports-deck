'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

/**
 * User interface representing authenticated user data
 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  favoriteTeam?: string;
  createdAt?: string;
}

/**
 * API response interface for login/session endpoints
 */
interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Context value interface
 */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
}

/**
 * Create the Auth Context with undefined as default
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that wraps the app and provides authentication context
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Function to check the current user session from the backend
   */
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let response = await fetch('/api/users/me', {
        method: 'GET',
        credentials: 'include', // Include cookies for secure session
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If access token is expired (401), attempt to silently refresh it
      if (response.status === 401) {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          // Retry original request with the new access token
          response = await fetch('/api/users/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      }

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        // Unauthorized - user is not logged in / refresh token is also invalid
        setUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setUser(null);
      // Don't set error here as this is a background check
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check session on component mount
   */
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Login function - authenticates user with email and password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Validate inputs
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errorData: AuthResponse = await response.json();
          throw new Error(
            errorData.error || `Login failed with status ${response.status}`
          );
        }

        const data: AuthResponse = await response.json();

        if (data.success && data.user) {
          setUser(data.user);
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        setUser(null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Logout function - clears user session
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Logout request failed, clearing local state anyway');
      }

      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Clear user state anyway to ensure clean logout
      setUser(null);
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Update user state locally without full refetch
   */
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    login,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use the Auth Context
 * Throws an error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
