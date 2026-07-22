import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { getItem, setItem, removeItem } from '../utils/Storage';
import api from '../api';

interface User {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  qr_code?: string;
  program?: { name: string; code?: string };
  year_level?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('auth:logout', () => {
      signOut();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await getItem('token');
        if (token) {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        }
      } catch (e) {
        console.warn('Failed to load user: token expired or invalid');
        await removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  const signIn = async (token: string, userData: User) => {
    await setItem('token', token);
    setUser(userData);
  };

  const signOut = async () => {
    await removeItem('token');
    setUser(null);
  };

  const updateUser = (newUserData: User) => {
    setUser(newUserData);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
