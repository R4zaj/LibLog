import React, { useState, useRef, useCallback } from 'react';
import { Animated, Vibration, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import { YStack, XStack, Text, ScrollView, Separator, View } from 'tamagui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function ScanScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastSeenLogId = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let interval: ReturnType<typeof setInterval>;

      const fetchHistory = async () => {
        try {
          const res = await api.get('/attendance/my-history');
          if (res.data && Array.isArray(res.data)) {
            if (res.data.length > 0) {
              const latestLog = res.data[0];
              const logTime = new Date(latestLog.logged_at).getTime();
              const now = new Date().getTime();

              if (now - logTime < 5000 && lastSeenLogId.current !== latestLog.id) {
                if (lastSeenLogId.current !== null) {
                  triggerCheckmark();
                }
              }
              lastSeenLogId.current = latestLog.id;
            }
            setHistory(res.data);
          }
        } catch (e) {
          console.error('Failed to fetch history', e);
        }
      };

      fetchHistory();
      interval = setInterval(fetchHistory, 10000);

      return () => clearInterval(interval);
    }, [])
  );

  const triggerCheckmark = () => {
    setShowCheckmark(true);
    Vibration.vibrate(200);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCheckmark(false);
    });
  };

  return (
    <YStack flex={1} backgroundColor="#f4f1fa">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack alignItems="center" paddingHorizontal="$5" paddingTop={56} paddingBottom="$8">

          {/* ── Header ── */}
          <Text
            fontSize={26}
            fontWeight="800"
            color="#1e1e2e"
            marginBottom="$1"
          >
            Your Library ID
          </Text>
          <Text
            fontSize={14}
            color="#7c7c8a"
            textAlign="center"
            lineHeight={20}
            marginBottom="$5"
            paddingHorizontal="$4"
          >
            Present this QR code at the library scanner
          </Text>

          {/* ── QR Card ── */}
          <YStack
            backgroundColor="white"
            borderRadius={28}
            padding="$5"
            alignItems="center"
            shadowColor="rgba(108, 72, 197, 0.15)"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={1}
            shadowRadius={24}
            elevation={8}
            marginBottom="$5"
            width="100%"
            maxWidth={320}
          >
            {/* Purple accent bar */}
            <View
              height={4}
              width={48}
              backgroundColor="#6C48C5"
              borderRadius={2}
              marginBottom="$4"
              opacity={0.6}
            />

            {/* QR Code */}
            <YStack
              backgroundColor="#faf9fe"
              borderRadius={20}
              padding="$4"
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="#ede9f6"
            >
              {user?.student_id ? (
                <QRCode
                  value={user.student_id}
                  size={200}
                  color="#1e1e2e"
                  backgroundColor="transparent"
                />
              ) : (
                <YStack width={200} height={200} alignItems="center" justifyContent="center">
                  <Text color="#9ca3af" fontSize={14}>Loading QR...</Text>
                </YStack>
              )}
            </YStack>

            {/* Student info */}
            <YStack alignItems="center" marginTop="$4" gap="$1">
              <Text
                fontSize={20}
                fontWeight="700"
                letterSpacing={3}
                color="#6C48C5"
              >
                {user?.student_id}
              </Text>
              <Text fontSize={15} color="#6b7280" fontWeight="500">
                {user?.first_name} {user?.last_name}
              </Text>
            </YStack>
          </YStack>

          {/* ── History Section ── */}
          <YStack width="100%" marginTop="$2">
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
              <Text fontSize={17} fontWeight="700" color="#1e1e2e">
                Recent Scans
              </Text>
              {history.length > 0 && (
                <Text fontSize={12} color="#9ca3af" fontWeight="500">
                  {history.length} record{history.length !== 1 ? 's' : ''}
                </Text>
              )}
            </XStack>

            {history.length === 0 ? (
              <YStack
                backgroundColor="white"
                borderRadius={16}
                padding="$5"
                alignItems="center"
                justifyContent="center"
                borderWidth={1}
                borderColor="#f0eef5"
              >
                <Text fontSize={32} marginBottom="$2">📋</Text>
                <Text color="#9ca3af" fontSize={14} fontWeight="500">
                  No recent scans found
                </Text>
                <Text color="#c4c4cc" fontSize={12} marginTop="$1">
                  Your scan history will appear here
                </Text>
              </YStack>
            ) : (
              history.map((log, index) => {
                const date = new Date(log.logged_at);
                const timeString = date.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateString = date.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });
                const isCheckIn = log.action === 'CHECK_IN';

                return (
                  <XStack
                    key={log.id}
                    alignItems="center"
                    backgroundColor="white"
                    width="100%"
                    padding="$3.5"
                    borderRadius={16}
                    marginBottom="$2.5"
                    borderWidth={1}
                    borderColor="#f0eef5"
                  >
                    {/* Icon */}
                    <YStack
                      width={44}
                      height={44}
                      borderRadius={14}
                      backgroundColor={isCheckIn ? '#ecfdf5' : '#fef3f2'}
                      alignItems="center"
                      justifyContent="center"
                      marginRight="$3"
                    >
                      <Text fontSize={20}>
                        {isCheckIn ? '📥' : '📤'}
                      </Text>
                    </YStack>

                    {/* Details */}
                    <YStack flex={1}>
                      <Text
                        fontSize={15}
                        fontWeight="600"
                        color="#1e1e2e"
                        marginBottom={2}
                      >
                        {isCheckIn ? 'Checked In' : 'Checked Out'}
                      </Text>
                      <Text fontSize={12} color="#9ca3af" fontWeight="400">
                        {dateString}
                      </Text>
                    </YStack>

                    {/* Time badge */}
                    <YStack
                      backgroundColor={isCheckIn ? '#ecfdf5' : '#fef3f2'}
                      paddingHorizontal="$2.5"
                      paddingVertical="$1.5"
                      borderRadius={10}
                    >
                      <Text
                        fontSize={13}
                        fontWeight="600"
                        color={isCheckIn ? '#059669' : '#dc2626'}
                      >
                        {timeString}
                      </Text>
                    </YStack>
                  </XStack>
                );
              })
            )}
          </YStack>
        </YStack>
      </ScrollView>

      {/* ── Full-screen scan success overlay ── */}
      {showCheckmark && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: fadeAnim }]}
        >
          <BlurView
            intensity={30}
            tint="light"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
            ]}
          >
            <YStack flex={1} alignItems="center" justifyContent="center">
              <YStack
                width={100}
                height={100}
                borderRadius={50}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
                shadowColor="#10b981"
                shadowOffset={{ width: 0, height: 12 }}
                shadowOpacity={0.35}
                shadowRadius={28}
                elevation={12}
              >
                <Text color="#10b981" fontSize={52} fontWeight="800">
                  ✓
                </Text>
              </YStack>
              <Text
                color="white"
                fontSize={18}
                fontWeight="700"
                marginTop="$4"
                textShadowColor="rgba(0,0,0,0.3)"
                textShadowOffset={{ width: 0, height: 1 }}
                textShadowRadius={4}
              >
                Scan Successful
              </Text>
            </YStack>
          </BlurView>
        </Animated.View>
      )}
    </YStack>
  );
}

