import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { sendPasswordResetEmail } from '../../store/thunks/authThunks';
import { clearError, clearPasswordResetStatus } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation/AuthStackNavigator';
import { COLORS, VALIDATION } from '../../constants';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error, passwordResetEmailSent } = useAppSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Clear any existing errors and reset status when component mounts
  useEffect(() => {
    dispatch(clearError());
    dispatch(clearPasswordResetStatus());
  }, [dispatch]);

  // Show error alert when error changes
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // Show success alert when password reset email is sent
  useEffect(() => {
    if (passwordResetEmailSent) {
      Alert.alert(
        'Email Sent',
        'Password reset instructions have been sent to your email address. Please check your inbox and follow the instructions to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    }
  }, [passwordResetEmailSent, navigation]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear email error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSendResetEmail = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      await dispatch(sendPasswordResetEmail(email.trim())).unwrap();
    } catch (error) {
      // Error is handled by the useEffect above
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                emailError ? styles.inputError : null,
              ]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email address"
              placeholderTextColor={COLORS.GRAY_MEDIUM}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              autoFocus
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>What happens next?</Text>
            <Text style={styles.instructionsText}>
              • We'll send a password reset link to your email
            </Text>
            <Text style={styles.instructionsText}>
              • Click the link in the email to reset your password
            </Text>
            <Text style={styles.instructionsText}>
              • Create a new password and sign in
            </Text>
          </View>

          {/* Send Reset Email Button */}
          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleSendResetEmail}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.WHITE} size="small" />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backToLoginContainer}
            onPress={navigateToLogin}
            disabled={isLoading}>
            <Text style={styles.backToLoginText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Help */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you don't receive the email within a few minutes, please check your spam folder.
            If you continue to have issues, please contact support.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  inputError: {
    borderColor: COLORS.ERROR,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
    marginTop: 8,
  },
  instructionsContainer: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginContainer: {
    alignItems: 'center',
  },
  backToLoginText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ForgotPasswordScreen;
