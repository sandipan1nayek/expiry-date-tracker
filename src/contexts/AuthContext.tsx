import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, clearUser, setInitialized } from '../store/slices/authSlice';
// import AuthService from '../services/AuthService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, isInitialized } = useAppSelector(state => state.auth);

  useEffect(() => {
    // Temporarily auto-login for testing the inventory features
    const initializeAuth = async () => {
      try {
        // Auto-login with a demo user for testing
        const demoUser: User = {
          id: 'demo-user-123',
          email: 'demo@example.com',
          displayName: 'Demo User',
          createdAt: new Date().toISOString(),
        };
        
        dispatch(setUser(demoUser));
        dispatch(setInitialized(true));
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(setInitialized(true));
      }
    };

    initializeAuth();
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
