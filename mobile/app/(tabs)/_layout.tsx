import { Tabs, usePathname } from 'expo-router';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Platform, Text, Animated, Pressable, TouchableOpacity, AppState } from 'react-native';
import { Home, Search, QrCode, BookCopy, User, History } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';

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
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={props.onPress ?? undefined}
      onLongPress={props.onLongPress ?? undefined}
      accessibilityState={props.accessibilityState}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ ...props.style, transform: [{ scale }] }}>
        {props.children}
      </Animated.View>
    </Pressable>
  );
};

export const TabBarVisibilityContext = React.createContext({
  setTabBarVisible: (visible: boolean) => {},
  setBorrowCount: (count: number) => {},
  refreshBorrowCount: () => {},
});

function CustomTabBar({ state, descriptors, navigation, translateY }: any) {
  const dockRoutes = state.routes.filter((r: any) => r.name !== 'scan' && r.name !== 'profile');
  const qrRoute = state.routes.find((r: any) => r.name === 'scan');
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <Animated.View style={{ transform: [{ translateY }], zIndex: 100, position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="box-none">
      <XStack
        position="absolute"
        bottom={insets.bottom > 0 ? insets.bottom + 8 : 16}
        left={16}
        right={16}
        alignItems="center"
        justifyContent="space-between"
        zIndex={100}
        pointerEvents="box-none"
      >
        <XStack
          flex={1}
          marginRight={12}
          backgroundColor={theme.tabBar as any}
          borderRadius={30}
          borderWidth={1}
          borderColor={theme.border as any}
          paddingHorizontal={8}
          paddingVertical={10}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
        {dockRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
          const color = isFocused ? theme.primary : theme.tabBarInactive;

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
            <TabButton key={route.key} onPress={onPress} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 48 }}>
              {options.tabBarIcon && options.tabBarIcon({ color, focused: isFocused, size: 24 })}
              {options.tabBarLabel && options.tabBarLabel({ color, focused: isFocused })}
            </TabButton>
          );
        })}
      </XStack>

      {qrRoute && (
        <TouchableOpacity 
          onPress={() => navigation.navigate(qrRoute.name)}
          activeOpacity={0.8}
          style={{
            width: 56, 
            height: 56, 
            borderRadius: 20, 
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <QrCode color="#ffffff" size={26} />
        </TouchableOpacity>
      )}
      </XStack>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useAppTheme();
  const pathname = usePathname();
  const [borrowCount, setBorrowCount] = useState(0);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: tabBarVisible ? 0 : 120,
      useNativeDriver: false,
      duration: 200,
    }).start();
  }, [tabBarVisible]);

  const refreshBorrowCount = useCallback(() => {
    if (!user?.id) {
      setBorrowCount(0);
      return;
    }
    api.get(`/borrowing/user/${user.id}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        const uniqueCount = new Set(list.map((b: any) => b.book_id ?? b.id)).size;
        setBorrowCount(uniqueCount);
      })
      .catch(err => console.error('Failed to fetch borrow count:', err));
  }, [user?.id]);

  useEffect(() => {
    refreshBorrowCount();
  }, [refreshBorrowCount, pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshBorrowCount();
    });
    const timer = setInterval(refreshBorrowCount, 15000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [user?.id, refreshBorrowCount]);

  return (
    <TabBarVisibilityContext.Provider value={{ setTabBarVisible, setBorrowCount, refreshBorrowCount }}>
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} translateY={translateY} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: {
          backgroundColor: theme.background,
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
          title: t('Home'),
          tabBarLabel: ({ focused, color }) => (
            <YStack alignItems="center">
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500', marginTop: 3, textAlign: 'center' }}>{t('Home')}</Text>
              <YStack alignItems="center" height={6} justifyContent="center" marginTop={2}>
                {focused ? <View style={{ backgroundColor: theme.primary, borderRadius: 2, height: 4, width: 4 }} /> : null}
              </YStack>
            </YStack>
          ),
          tabBarIcon: ({ color, focused }) => (
            <YStack alignItems="center" height={26} justifyContent="center" width={26}>
              <Home color={color} size={22} strokeWidth={focused ? 2.2 : 2} />
            </YStack>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('Search'),
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ focused, color }) => (
            <YStack alignItems="center">
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500', marginTop: 3, textAlign: 'center' }}>{t('Search')}</Text>
              <YStack alignItems="center" height={6} justifyContent="center" marginTop={2}>
                {focused ? <View style={{ backgroundColor: theme.primary, borderRadius: 2, height: 4, width: 4 }} /> : null}
              </YStack>
            </YStack>
          ),
          tabBarIcon: ({ color, focused }) => (
            <YStack alignItems="center" height={26} justifyContent="center" width={26}>
              <Search color={color} size={22} strokeWidth={focused ? 2.2 : 2} />
            </YStack>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'QR',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="borrowed"
        options={{
          title: t('Borrowed'),
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ focused, color }) => (
            <YStack alignItems="center">
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500', marginTop: 3, textAlign: 'center' }}>{t('Borrowed')}</Text>
              <YStack alignItems="center" height={6} justifyContent="center" marginTop={2}>
                {focused ? <View style={{ backgroundColor: theme.primary, borderRadius: 2, height: 4, width: 4 }} /> : null}
              </YStack>
            </YStack>
          ),
          tabBarIcon: ({ color, focused }) => (
            <YStack alignItems="center" height={26} justifyContent="center" width={26}>
              <BookCopy color={color} size={22} strokeWidth={focused ? 2.2 : 2} />
              {borrowCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
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
            </YStack>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('History'),
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarLabel: ({ focused, color }) => (
            <YStack alignItems="center">
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500', marginTop: 3, textAlign: 'center' }}>{t('History')}</Text>
              <YStack alignItems="center" height={6} justifyContent="center" marginTop={2}>
                {focused ? <View style={{ backgroundColor: theme.primary, borderRadius: 2, height: 4, width: 4 }} /> : null}
              </YStack>
            </YStack>
          ),
          tabBarIcon: ({ color, focused }) => (
            <YStack alignItems="center" height={26} justifyContent="center" width={26}>
              <History color={color} size={22} strokeWidth={focused ? 2.2 : 2} />
            </YStack>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Profile'),
          href: null,
        }}
      />
    </Tabs>
    </TabBarVisibilityContext.Provider>
  );
}
