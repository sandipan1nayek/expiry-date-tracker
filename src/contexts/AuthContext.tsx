import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, clearUser, setInitialized } from '../store/slices/authSlice';
import AuthService from '../services/AuthService';
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
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // Check for stored auth data first
        const shouldAutoSignIn = await AuthService.shouldAutoSignIn();
        if (shouldAutoSignIn) {
          const storedData = await AuthService.getStoredAuthData();
          if (storedData?.user) {
            dispatch(setUser(storedData.user));
          }
        }

        // Set up Firebase auth state listener
        unsubscribe = AuthService.onAuthStateChanged((user: User | null) => {
          if (user) {
            dispatch(setUser(user));
            // Update stored auth data when user signs in via Firebase
            AuthService.saveAuthData(user, true);
          } else {
            dispatch(clearUser());
            // Clear stored data when user signs out
            AuthService.clearStoredAuthData();
          }
          
          if (!isInitialized) {
            dispatch(setInitialized(true));
          }
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (!isInitialized) {
          dispatch(setInitialized(true));
        }
      }
    };

    initializeAuth();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch, isInitialized]);

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
