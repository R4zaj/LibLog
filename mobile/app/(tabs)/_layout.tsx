import { Tabs, usePathname } from 'expo-router';
import React, { useRef, useEffect, useState } from 'react';
import { View, Platform, Text, Animated, TouchableWithoutFeedback } from 'react-native';
import { Home, Search, QrCode, BookCopy, User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

interface TabButtonProps {
  children: React.ReactNode;
  onPress?: ((e: any) => void) | null;
  onLongPress?: ((e: any) => void) | null;
  accessibilityState?: any;
  style?: any;
}

const TabButton = (props: TabButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={props.onPress ?? undefined}
      onLongPress={props.onLongPress ?? undefined}
      accessibilityState={props.accessibilityState}
    >
      <Animated.View style={[props.style, { transform: [{ scale }] }]}>
        {props.children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function TabLayout() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [borrowCount, setBorrowCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      api.get(`/borrowing/user/${user.id}`)
        .then(res => {
          setBorrowCount(res.data.length || 0);
        })
        .catch(err => console.error('Failed to fetch borrow count:', err));
    }
  }, [user?.id, pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C48C5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        animation: 'fade',
        sceneStyle: {
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color, fontSize: 10, fontWeight: '600' }}>Home</Text>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C48C5', marginTop: 4, position: 'absolute', bottom: -8 }} />}
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Home color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 10, fontWeight: '600', marginBottom: 8 }}>Search</Text>,
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'QR',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <TabButton {...props}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? -25 : -35,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#6C48C5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#6C48C5',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 5,
                  borderWidth: 3,
                  borderColor: '#ffffff',
                }}>
                  <QrCode color="#ffffff" size={24} />
                </View>
                <Text style={{ 
                  color: props.accessibilityState?.selected ? '#6C48C5' : '#9ca3af', 
                  fontSize: 10, 
                  fontWeight: '600',
                  position: 'absolute',
                  bottom: Platform.OS === 'ios' ? -5 : 4
                }}>
                  QR
                </Text>
              </View>
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="borrowed"
        options={{
          title: 'Borrowed',
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 10, fontWeight: '600', marginBottom: 8 }}>Borrowed</Text>,
          tabBarIcon: ({ color }) => (
            <View>
              <BookCopy color={color} size={24} />
              {borrowCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -6,
                  backgroundColor: '#ef4444',
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>{borrowCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 10, fontWeight: '600', marginBottom: 8 }}>Profile</Text>,
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
