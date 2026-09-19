import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, BookOpen, Receipt, RefreshCcw, Activity } from 'lucide-react-native';
import api from '../../api';
import { useFocusEffect } from 'expo-router';
import { TabBarVisibilityContext } from './_layout';

type ActivityEvent = {
  id: string;
  type: 'ATTENDANCE_IN' | 'ATTENDANCE_OUT' | 'BORROW' | 'RETURN' | 'PENALTY';
  timestamp: string;
  title: string;
  subtitle?: string;
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'All' | 'Attendance' | 'Borrows' | 'Penalties'>('All');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { setTabBarVisible } = React.useContext(TabBarVisibilityContext);
  const lastOffsetY = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [attendanceRes, borrowRes] = await Promise.all([
        api.get('/attendance/my-history'),
        api.get(`/borrowing/user/${user.id}`)
      ]);

      const newEvents: ActivityEvent[] = [];

      // Process attendance
      (attendanceRes.data || []).forEach((log: any) => {
        newEvents.push({
          id: `att-in-${log.id}`,
          type: 'ATTENDANCE_IN',
          timestamp: log.logged_at,
          title: 'Checked in to Library',
          subtitle: new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (log.logged_out_at) {
          newEvents.push({
            id: `att-out-${log.id}`,
            type: 'ATTENDANCE_OUT',
            timestamp: log.logged_out_at,
            title: 'Checked out of Library',
            subtitle: `Duration: ${log.duration_minutes} min`
          });
        }
      });

      // Process borrows
      (borrowRes.data || []).forEach((b: any) => {
        newEvents.push({
          id: `bor-${b.id}`,
          type: 'BORROW',
          timestamp: b.borrowed_date,
          title: 'Borrowed Book',
          subtitle: b.book?.title
        });
        if (b.returned_date) {
          newEvents.push({
            id: `ret-${b.id}`,
            type: 'RETURN',
            timestamp: b.returned_date,
            title: 'Returned Book',
            subtitle: b.book?.title
          });
        }
      });

      // Mock penalty event if applicable (can be replaced by real endpoint later)
      if (Number(user.penalty_balance) > 0) {
        newEvents.push({
          id: `pen-mock`,
          type: 'PENALTY',
          timestamp: new Date().toISOString(),
          title: 'Pending Penalty Balance',
          subtitle: `₱${Number(user.penalty_balance).toFixed(2)}`
        });
      }

      newEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(newEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.penalty_balance]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const filteredEvents = events.filter((e) => {
    if (filter === 'All') return true;
    if (filter === 'Attendance') return e.type.startsWith('ATTENDANCE');
    if (filter === 'Borrows') return e.type === 'BORROW' || e.type === 'RETURN';
    if (filter === 'Penalties') return e.type === 'PENALTY';
    return true;
  });

  const renderIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_IN': return <LogIn color="#10b981" size={20} />;
      case 'ATTENDANCE_OUT': return <LogOut color="#6b7280" size={20} />;
      case 'BORROW': return <BookOpen color="#6C48C5" size={20} />;
      case 'RETURN': return <RefreshCcw color="#3b82f6" size={20} />;
      case 'PENALTY': return <Receipt color="#ef4444" size={20} />;
      default: return <Activity color="#9ca3af" size={20} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity History</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Attendance', 'Borrows', 'Penalties'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f as any)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C48C5" />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 98 }}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            if (offsetY <= 0) {
              setTabBarVisible(true);
            } else if (offsetY > lastOffsetY.current + 10) {
              setTabBarVisible(false);
            } else if (offsetY < lastOffsetY.current - 10) {
              setTabBarVisible(true);
            }
            lastOffsetY.current = offsetY;
          }}
          scrollEventThrottle={16}
        >
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent activity found.</Text>
            </View>
          ) : (
            filteredEvents.map((evt) => (
              <View key={evt.id} style={styles.card}>
                <View style={styles.iconContainer}>
                  {renderIcon(evt.type)}
                </View>
                <View style={styles.content}>
                  <Text style={styles.cardTitle}>{evt.title}</Text>
                  {evt.subtitle && <Text style={styles.cardSubtitle} numberOfLines={1}>{evt.subtitle}</Text>}
                </View>
                <Text style={styles.dateText}>
                  {new Date(evt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))
          )}
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fe',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e1e2e',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    backgroundColor: '#f4f1fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#6C48C5',
  },
  filterText: {
    color: '#6C48C5',
    fontWeight: '500',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ede9f6',
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#faf9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e2e',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c7c8a',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
});
