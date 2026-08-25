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
  created_at?: string;
  stats?: {
    borrowed: number;
    visits: number;
    streak: number;
  };
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
          // Load cached user data instantly for fast startup
          const cachedUser = await getItem('cached_user');
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch (e) {}
          }

          // Then refresh from server in the background
          try {
            const res = await api.get('/auth/me');
            if (res.data.user) {
              setUser(res.data.user);
              await setItem('cached_user', JSON.stringify(res.data.user));
            }
          } catch (e) {
            // If server is unreachable but we have cached data, keep using it
            if (!cachedUser) {
              console.warn('Failed to load user: token expired or invalid');
              await removeItem('token');
              await removeItem('cached_user');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load user: token expired or invalid');
        await removeItem('token');
        await removeItem('cached_user');
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
    await setItem('cached_user', JSON.stringify(userData));
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
        await setItem('cached_user', JSON.stringify(res.data.user));
      }
    } catch (e) {}
  };

  const signOut = async () => {
    await removeItem('token');
    await removeItem('cached_user');
    setUser(null);
  };

  const updateUser = async (newUserData: User) => {
    setUser(newUserData);
    await setItem('cached_user', JSON.stringify(newUserData));
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
        await setItem('cached_user', JSON.stringify(res.data.user));
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
