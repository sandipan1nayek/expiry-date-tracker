import { createAsyncThunk } from '@reduxjs/toolkit';
import { LoginForm, SignupForm, User } from '../../types';

// Mock user for demo purposes
const mockUser: User = {
  id: 'demo-user-123',
  email: 'demo@example.com',
  displayName: 'Demo User',
  photoURL: undefined,
  createdAt: new Date().toISOString(),
};

// Sign in thunk - simplified for Expo demo
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: LoginForm, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple validation for demo
      if (credentials.email === 'demo@example.com' && credentials.password === 'password') {
        return mockUser;
      } else {
        return rejectWithValue('Invalid email or password. Try: demo@example.com / password');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

// Sign up thunk - simplified for Expo demo
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (formData: SignupForm, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, just return a user object
      const newUser: User = {
        id: 'new-user-' + Date.now(),
        email: formData.email,
        displayName: formData.displayName,
        photoURL: undefined,
        createdAt: new Date().toISOString(),
      };
      
      return newUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed');
    }
  }
);

// Sign out thunk
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate sign out delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed');
    }
  }
);

// Send password reset email thunk - simplified for Expo demo
export const sendPasswordResetEmail = createAsyncThunk(
  'auth/sendPasswordResetEmail',
  async (email: string, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, just return success message
      return 'Password reset email sent successfully!';
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send reset email');
    }
  }
);

// Update profile thunk
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: { displayName?: string; photoURL?: string }, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, return updated user
      const updatedUser: User = {
        ...mockUser,
        ...updates,
      };
      
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);
