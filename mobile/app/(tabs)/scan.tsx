import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Vibration } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function ScanScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track the most recent log ID so we don't trigger the checkmark multiple times for the same scan
  const lastSeenLogId = useRef<number | null>(null);

  // Fast polling only when the screen is focused
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
              
              // If the latest log is less than 5 seconds old and we haven't seen it yet
              if (now - logTime < 5000 && lastSeenLogId.current !== latestLog.id) {
                // Only trigger animation if it wasn't the first load
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

      // Fetch immediately on focus
      fetchHistory();
      // Poll very fast (every 800ms) for near-instant feedback
      interval = setInterval(fetchHistory, 800);
      
      return () => clearInterval(interval);
    }, [])
  );

  const triggerCheckmark = () => {
    setShowCheckmark(true);
    
    // Trigger a brief vibration
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
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Library ID</Text>
        <Text style={styles.subtitle}>Present this QR code at the scanner to borrow or return books</Text>
        
        <View style={styles.qrContainer}>
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
        </View>
        
        <Text style={styles.studentId}>{user?.student_id}</Text>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.historyTitle}>Recent Scans</Text>
        
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No recent scans found.</Text>
        ) : (
          history.map((log) => {
            const date = new Date(log.logged_at);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            return (
              <View key={log.id} style={styles.historyCard}>
                <View style={styles.historyIconContainer}>
                  <Text style={styles.historyIcon}>
                    {log.action === 'CHECK_IN' ? '📥' : '📤'}
                  </Text>
                </View>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyAction}>
                    {log.action === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}
                  </Text>
                  <Text style={styles.historyDate}>{dateString}</Text>
                </View>
                <Text style={styles.historyTime}>{timeString}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Full Screen Blurred Checkmark Overlay */}
      {showCheckmark && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: fadeAnim }]}>
          <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <View style={styles.fullscreenCheckmarkContainer}>
              <View style={styles.checkmarkCircle}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  qrContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 268,
    minHeight: 268,
  },
  fullscreenCheckmarkContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  checkmarkText: {
    color: '#10b981',
    fontSize: 56,
    fontWeight: 'bold',
  },
  studentId: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#6C48C5',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    color: '#4b5563',
    marginBottom: 32,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyIcon: {
    fontSize: 18,
  },
  historyDetails: {
    flex: 1,
  },
  historyAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
});
