import React, { useState, useRef, useCallback } from 'react';
import { Animated, Vibration, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import { YStack, XStack, Text, ScrollView, ZStack, Separator } from 'tamagui';
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
      let interval: NodeJS.Timeout;
      
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
      interval = setInterval(fetchHistory, 800);
      
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
      })
    ]).start(() => {
      setShowCheckmark(false);
    });
  };

  return (
    <YStack f={1} bc="#f9fafb">
      <ScrollView>
        <YStack ai="center" p="$4" pt="$8" pb="$8" space="$4">
          <Text fontSize={28} fontWeight="bold" color="#1f2937">
            Your Library ID
          </Text>
          <Text fontSize={15} color="#6b7280" textAlign="center" px="$2" mb="$6">
            Present this QR code at the scanner to borrow or return books
          </Text>
          
          <YStack 
            p="$6" 
            bc="white" 
            br="$8" 
            shadowColor="#000" 
            shadowOffset={{ width: 0, height: 4 }} 
            shadowOpacity={0.1} 
            shadowRadius={12} 
            elevation={5} 
            mb="$6" 
            ai="center" 
            jc="center" 
            minWidth={268} 
            minHeight={268}
          >
            {user?.student_id ? (
              <QRCode
                value={user.student_id}
                size={220}
                color="black"
                backgroundColor="white"
              />
            ) : (
              <Text>Loading QR...</Text>
            )}
          </YStack>
          
          <Text fontSize={22} fontWeight="bold" letterSpacing={2} color="#6C48C5">
            {user?.student_id}
          </Text>
          <Text fontSize={18} color="#4b5563" mb="$6">
            {user?.first_name} {user?.last_name}
          </Text>
          
          <Separator w="100%" bc="#e5e7eb" mb="$4" />
          
          <Text fontSize={18} fontWeight="bold" color="#374151" alignSelf="flex-start" mb="$4">
            Recent Scans
          </Text>
          
          {history.length === 0 ? (
            <Text color="#9ca3af" fontStyle="italic" mt="$2">
              No recent scans found.
            </Text>
          ) : (
            history.map((log) => {
              const date = new Date(log.logged_at);
              const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return (
                <XStack 
                  key={log.id} 
                  ai="center" 
                  bc="white" 
                  w="100%" 
                  p="$4" 
                  br="$4" 
                  mb="$3" 
                  shadowColor="#000" 
                  shadowOffset={{ width: 0, height: 1 }} 
                  shadowOpacity={0.05} 
                  shadowRadius={4} 
                  elevation={2}
                >
                  <YStack w={40} h={40} br={20} bc="#f3f4f6" ai="center" jc="center" mr="$4">
                    <Text fontSize={18}>
                      {log.action === 'CHECK_IN' ? '📥' : '📤'}
                    </Text>
                  </YStack>
                  <YStack f={1}>
                    <Text fontSize={16} fontWeight="bold" color="#1f2937" mb="$1">
                      {log.action === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}
                    </Text>
                    <Text fontSize={13} color="#6b7280">{dateString}</Text>
                  </YStack>
                  <Text fontSize={14} fontWeight="600" color="#4b5563">{timeString}</Text>
                </XStack>
              );
            })
          )}
        </YStack>
      </ScrollView>

      {showCheckmark && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: fadeAnim }]}>
          <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <YStack f={1} ai="center" jc="center">
              <YStack 
                w={90} 
                h={90} 
                br={45} 
                bc="white" 
                ai="center" 
                jc="center" 
                shadowColor="#10b981" 
                shadowOffset={{ width: 0, height: 10 }} 
                shadowOpacity={0.3} 
                shadowRadius={20} 
                elevation={10}
              >
                <Text color="#10b981" fontSize={56} fontWeight="bold">✓</Text>
              </YStack>
            </YStack>
          </BlurView>
        </Animated.View>
      )}
    </YStack>
  );
}
