import { Tabs, usePathname } from 'expo-router';
import React, { useRef, useEffect, useState } from 'react';
import { View, Platform, Text, Animated, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Home, Search, QrCode, BookCopy, User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export const TabBarVisibilityContext = React.createContext({
  setTabBarVisible: (visible: boolean) => {}
});

function CustomTabBar({ state, descriptors, navigation, translateY }: any) {
  const dockRoutes = state.routes.filter((r: any) => r.name !== 'scan');
  const qrRoute = state.routes.find((r: any) => r.name === 'scan');
  const insets = useSafeAreaInsets();

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: Math.max(insets.bottom, 16),
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      transform: [{ translateY }],
      zIndex: 100
    }}>
      <View style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#ede9f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      }}>
        {dockRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
          const color = isFocused ? '#6C48C5' : '#9ca3af';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton key={route.key} onPress={onPress} style={{ flex: 1 }}>
              {options.tabBarIcon && options.tabBarIcon({ color, focused: isFocused, size: 24 })}
              {options.tabBarLabel && options.tabBarLabel({ color, focused: isFocused })}
            </TabButton>
          );
        })}
      </View>

      <View style={{ width: 12 }} />

      {qrRoute && (
        <TouchableOpacity 
          onPress={() => navigation.navigate(qrRoute.name)}
          activeOpacity={0.8}
          style={{
            width: 54, 
            height: 54, 
            borderRadius: 20, 
            backgroundColor: '#6C48C5',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#6C48C5',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}
        >
          <QrCode color="#ffffff" size={24} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [borrowCount, setBorrowCount] = useState(0);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: tabBarVisible ? 0 : 150,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [tabBarVisible]);

  useEffect(() => {
    if (user?.id) {
      api.get(`/borrowing/user/${user.id}`)
        .then(res => {
          setBorrowCount(res.data.length || 0);
        })
        .catch(err => console.error('Failed to fetch borrow count:', err));
    }
  }, [user?.id]);

  return (
    <TabBarVisibilityContext.Provider value={{ setTabBarVisible }}>
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} translateY={translateY} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: {
          backgroundColor: '#ffffff',
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
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
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color, fontSize: 10, fontWeight: '600' }}>Search</Text>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C48C5', position: 'absolute', bottom: -8 }} />}
            </View>
          ),
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
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
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
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color, fontSize: 10, fontWeight: '600' }}>Borrowed</Text>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C48C5', position: 'absolute', bottom: -8 }} />}
            </View>
          ),
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
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color, fontSize: 10, fontWeight: '600' }}>Profile</Text>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C48C5', position: 'absolute', bottom: -8 }} />}
            </View>
          ),
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
    </TabBarVisibilityContext.Provider>
  );
}
