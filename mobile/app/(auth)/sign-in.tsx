import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    try {
      const res = await api.post('/auth/login', { student_id: studentId, password });
      
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
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, zIndex: 1 }}
      >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Image source={require('../../assets/images/CCC_icon.jpg')} style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16 }} />
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Email or Library ID</Text>
          <TextInput
            style={styles.input}
            value={studentId}
            onChangeText={setStudentId}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={{ position: 'relative', marginBottom: 20 }}>
            <TextInput
              style={[styles.input, { marginBottom: 0, paddingRight: 50 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
            />
            <TouchableOpacity 
              style={{ position: 'absolute', right: 16, top: 16 }}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            {rememberMe ? (
              <CheckSquare color="#6C48C5" size={20} />
            ) : (
              <Square color="#9ca3af" size={20} />
            )}
            <Text style={{ marginLeft: 8, color: '#374151', fontSize: 14 }}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <View style={[styles.signUpLink, { flexDirection: 'row', justifyContent: 'center' }]}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={[styles.signUpText, styles.signUpTextBold]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
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
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    color: '#111827',
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
  signUpLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signUpText: {
    color: '#6b7280',
    fontSize: 15,
  },
  signUpTextBold: {
    color: '#6C48C5',
    fontWeight: 'bold',
  },
});
