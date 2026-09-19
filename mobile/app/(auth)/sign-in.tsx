import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, Eye, EyeOff, User, Lock } from 'lucide-react-native';

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadRemembered = async () => {
        try {
          const storedId = await AsyncStorage.getItem('@remembered_id');
          if (storedId) {
            setStudentId(storedId);
            setRememberMe(true);
          } else {
            setStudentId('');
            setRememberMe(false);
          }
          setPassword('');
          setError('');
        } catch (e) {}
      };
      loadRemembered();
    }, [])
  );

  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const [res] = await Promise.all([
        api.post('/auth/login', { student_id: studentId, password }),
        new Promise(res => setTimeout(res, 700))
      ]);
      
      if (rememberMe) {
        await AsyncStorage.setItem('@remembered_id', studentId);
      } else {
        await AsyncStorage.removeItem('@remembered_id');
      }

      if (res.data.token) {
        await signIn(res.data.token, res.data.user);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to sign in');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <View style={styles.heroAnchor}>
              <Image 
                source={require('../../assets/images/CCC_icon.png')} 
                style={{ width: 64, height: 64, borderRadius: 16 }} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.label}>Email or Library ID</Text>
            <View style={styles.inputContainer}>
              <User color="#9ca3af" size={18} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="none"
                placeholder="ID or Email"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock color="#9ca3af" size={18} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                placeholder="Password"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity 
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              >
                {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
              </TouchableOpacity>
            </View>

            <View style={styles.auxiliaryRow}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={13} color="#ffffff" strokeWidth={3} />}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push('/(auth)/forgot-password')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signUpLink}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/sign-up')}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Text style={styles.signUpTextBold}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fe',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  heroAnchor: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede9f6',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1e2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c7c8a',
  },
  formContainer: {
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede9f6',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e1e2e',
    height: '100%',
  },
  auxiliaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ede9f6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6C48C5',
    borderColor: '#6C48C5',
  },
  rememberMeText: {
    marginLeft: 10,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '500',
  },
  forgotPasswordText: {
    color: '#6C48C5',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#6C48C5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: '#7c7c8a',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpTextBold: {
    color: '#6C48C5',
    fontWeight: '700',
    fontSize: 14,
  },
});
