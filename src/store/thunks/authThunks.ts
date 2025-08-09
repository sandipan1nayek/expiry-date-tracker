import { createAsyncThunk } from '@reduxjs/toolkit';
import AuthService, { AuthResult } from '../../services/AuthService';
import { LoginForm, SignupForm } from '../../types';

// Sign in thunk
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: LoginForm, { rejectWithValue }) => {
    try {
      const result = await AuthService.signIn(
        credentials.email, 
        credentials.password, 
        credentials.rememberMe ?? true
      );
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Sign in failed');
      }
      
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

// Sign up thunk
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (formData: SignupForm, { rejectWithValue }) => {
    try {
      const result = await AuthService.signUp(
        formData.email,
        formData.password,
        formData.displayName
      );
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Sign up failed');
      }
      
      return result.data!;
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
      const result = await AuthService.signOut();
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Sign out failed');
      }
      
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed');
    }
  }
);

// Send password reset email thunk
export const sendPasswordResetEmail = createAsyncThunk(
  'auth/sendPasswordResetEmail',
  async (email: string, { rejectWithValue }) => {
    try {
      const result = await AuthService.sendPasswordResetEmail(email);
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to send reset email');
      }
      
      return result.message || 'Password reset email sent';
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
      const result = await AuthService.updateProfile(updates);
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update profile');
      }
      
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);
