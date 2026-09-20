import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Check, X, Mail } from 'lucide-react-native';
import api from '../../api';

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Password requirement checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasSpecialOrNum = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasSpecialOrNum;
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const handleRequestOtp = async () => {
    setError('');
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your Email or Library ID.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/request-otp', {
        identifier: trimmed,
        type: 'reset',
      });

      setResolvedEmail(res.data.email || trimmed);
      setMaskedEmail(res.data.maskedEmail || res.data.email || trimmed);
      setResendCooldown(30);
      setStep(2);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send reset code. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: resolvedEmail,
        otp: otp.trim(),
        new_password: newPassword,
      });

      setStep(3);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to reset password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, zIndex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setError('');
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../../assets/images/CCC_icon.png')}
              style={{ width: 80, height: 80, marginBottom: 14 }}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {step === 1 ? 'Forgot Password' : step === 2 ? 'Create New Password' : 'Password Reset'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Enter your registered email or library ID to receive a verification code'
                : step === 2
                ? `Enter the code sent to ${maskedEmail || 'your email'} and set your new password`
                : 'Your password has been successfully updated'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* STEP 1: Enter Identifier */}
            {step === 1 && (
              <>
                <Text style={styles.label}>Email or Library ID</Text>
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 2023-0001 or student@ccc.edu.ph"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.button, isLoading && { opacity: 0.7 }]}
                  onPress={handleRequestOtp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchLink}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchText}>Remember your password? </Text>
                  <Text style={[styles.switchText, styles.switchTextBold]}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2: Enter Code and New Password */}
            {step === 2 && (
              <>
                {/* Email Banner */}
                <View style={styles.infoBanner}>
                  <Mail size={18} color="#6C48C5" style={{ marginRight: 8 }} />
                  <Text style={styles.infoBannerText}>
                    Code sent to <Text style={{ fontWeight: '700' }}>{maskedEmail}</Text>
                  </Text>
                </View>

                {/* OTP Code */}
                <Text style={styles.label}>6-Digit Verification Code</Text>
                <TextInput
                  style={[styles.input, { letterSpacing: 4, textAlign: 'center', fontSize: 20, fontWeight: '700' }]}
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    if (error) setError('');
                  }}
                  placeholder="123456"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                {/* New Password */}
                <Text style={styles.label}>New Password</Text>
                <View style={{ position: 'relative', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, paddingRight: 50 }]}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (error) setError('');
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 16, top: 16 }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
                  </TouchableOpacity>
                </View>

                {/* Password Requirements Checklist */}
                <View style={styles.requirementsBox}>
                  <View style={styles.reqRow}>
                    {hasMinLength ? <Check size={14} color="#10b981" /> : <X size={14} color="#9ca3af" />}
                    <Text style={[styles.reqText, hasMinLength && styles.reqTextActive]}>At least 8 characters</Text>
                  </View>
                  <View style={styles.reqRow}>
                    {hasUpperCase && hasLowerCase ? <Check size={14} color="#10b981" /> : <X size={14} color="#9ca3af" />}
                    <Text style={[styles.reqText, hasUpperCase && hasLowerCase && styles.reqTextActive]}>
                      Uppercase and lowercase letters
                    </Text>
                  </View>
                  <View style={styles.reqRow}>
                    {hasSpecialOrNum ? <Check size={14} color="#10b981" /> : <X size={14} color="#9ca3af" />}
                    <Text style={[styles.reqText, hasSpecialOrNum && styles.reqTextActive]}>
                      At least one number or symbol
                    </Text>
                  </View>
                </View>

                {/* Confirm Password */}
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={{ position: 'relative', marginBottom: 20 }}>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, paddingRight: 50 }]}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (error) setError('');
                    }}
                    placeholder="Re-type new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 16, top: 16 }}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
                  </TouchableOpacity>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  style={[styles.button, isLoading && { opacity: 0.7 }]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                {/* Resend Code Button */}
                <View style={styles.resendContainer}>
                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        resendCooldown > 0 ? { color: '#9ca3af' } : { color: '#6C48C5', fontWeight: '700' },
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Didn't receive the code? Resend"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 3: Success Confirmation */}
            {step === 3 && (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={54} color="#10b981" />
                </View>
                <Text style={styles.successTitle}>All Set!</Text>
                <Text style={styles.successMessage}>
                  Your password has been updated. You can now use your new password to sign in.
                </Text>

                <TouchableOpacity
                  style={[styles.button, { marginTop: 24, width: '100%' }]}
                  onPress={() => router.replace('/(auth)/sign-in')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  headerContainer: {
    marginBottom: 28,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#5b21b6',
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  requirementsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reqTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#6C48C5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
  },
  switchLink: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  switchText: {
    color: '#6b7280',
    fontSize: 15,
  },
  switchTextBold: {
    color: '#6C48C5',
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
