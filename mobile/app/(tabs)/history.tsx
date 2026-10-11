import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, TextInput } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, BookOpen, Receipt, RefreshCcw, Activity, Search, Calendar, ListFilter, MoreVertical, ChevronRight, ChevronDown, Wind } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack } from 'tamagui';
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
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = typeof getStyles === 'function' ? getStyles(theme) : {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'All' | 'Attendance' | 'Borrows' | 'Penalties'>('All');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  
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
        if (log.action === 'CHECK_IN') {
          newEvents.push({
            id: `att-in-${log.id}`,
            type: 'ATTENDANCE_IN',
            timestamp: log.logged_at,
            title: 'Time in',
            subtitle: new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else if (log.action === 'CHECK_OUT') {
          newEvents.push({
            id: `att-out-${log.id}`,
            type: 'ATTENDANCE_OUT',
            timestamp: log.logged_at,
            title: 'Time out',
            subtitle: log.duration_minutes ? `Duration: ${log.duration_minutes} min` : new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      });

      // Process borrows
      (borrowRes.data || []).forEach((b: any) => {
        newEvents.push({
          id: `bor-${b.id}`,
          type: 'BORROW',
          timestamp: b.borrowed_date,
          title: 'Checked Out',
          subtitle: b.book?.title
        });
        if (b.returned_date) {
          newEvents.push({
            id: `ret-${b.id}`,
            type: 'RETURN',
            timestamp: b.returned_date,
            title: 'Checked In',
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
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesTitle = e.title.toLowerCase().includes(q);
      const matchesSubtitle = e.subtitle?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesSubtitle) return false;
    }

    if (filter === 'All') return true;
    if (filter === 'Attendance') return e.type.startsWith('ATTENDANCE');
    if (filter === 'Borrows') return e.type === 'BORROW' || e.type === 'RETURN';
    if (filter === 'Penalties') return e.type === 'PENALTY';
    return true;
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    const key = `${dayStr}|${dateStr}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {} as Record<string, ActivityEvent[]>);

  const sections = Object.entries(groupedEvents).map(([key, events]) => {
    const [dayStr, dateStr] = key.split('|');
    return { dayStr, dateStr, events };
  });

  const renderIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_IN': return <LogIn color="#10b981" size={16} />;
      case 'ATTENDANCE_OUT': return <LogOut color="#ef4444" size={16} />;
      case 'BORROW': return <BookOpen color={theme.primary} size={16} />;
      case 'RETURN': return <RefreshCcw color={theme.primary} size={16} />;
      case 'PENALTY': return <Receipt color="#ef4444" size={16} />;
      default: return <Activity color={theme.textSecondary} size={16} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <XStack paddingHorizontal={24} paddingTop={16} paddingBottom={8} justifyContent="space-between" alignItems="center">
        <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, flex: 1, paddingRight: 16 }}>
          You have {filteredEvents.length} history event{filteredEvents.length !== 1 ? 's' : ''}
        </Text>
        <XStack gap={8}>
          <TouchableOpacity 
            style={[styles.utilityChip, isSearchVisible && { borderColor: theme.primary }]} 
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
          >
            <Search color={isSearchVisible ? theme.primary : theme.textSecondary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.utilityChip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Calendar color={theme.textSecondary} size={20} />
          </TouchableOpacity>
        </XStack>
      </XStack>

      {isSearchVisible && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <View style={{ height: 48, backgroundColor: theme.background, borderRadius: 16, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 8 }}>
            <TextInput 
              style={{ flex: 1, fontSize: 14, color: theme.text }}
              placeholder="Search history..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity 
              hitSlop={{ top: 48, bottom: 48, left: 48, right: 48 }}
              onPress={() => {
                setSearchQuery('');
                setIsSearchVisible(false);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary, padding: 8 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Attendance', 'Borrows', 'Penalties'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f as any);
              }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 98 }}
          showsVerticalScrollIndicator={false}
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
            <YStack padding={32} alignItems="center" justifyContent="center" flex={1} marginTop={40}>
              <Wind color={theme.textSecondary} size={48} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary, textAlign: 'center' }}>
                No {filter.toLowerCase() === 'all' ? 'history' : filter.toLowerCase()} events found
              </Text>
            </YStack>
          ) : (
            sections.map((section, idx) => (
              <YStack key={idx} marginBottom={16}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                  onPress={() => {
                    const key = section.dayStr + '|' + section.dateStr;
                    setCollapsedDays(prev => ({
                      ...prev,
                      [key]: !prev[key]
                    }));
                  }}
                >
                  <XStack paddingVertical={12} alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8}>
                      {collapsedDays[section.dayStr + '|' + section.dateStr] ? (
                        <ChevronRight size={20} color={theme.textSecondary} />
                      ) : (
                        <ChevronDown size={20} color={theme.textSecondary} />
                      )}
                      <YStack>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>{section.dayStr}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>{section.dateStr}</Text>
                      </YStack>
                    </XStack>
                    <XStack backgroundColor={theme.pillContainer} paddingHorizontal={12} paddingVertical={6} borderRadius={9999} alignItems="center">
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{section.events.length} Event{section.events.length !== 1 ? 's' : ''}</Text>
                    </XStack>
                  </XStack>
                </TouchableOpacity>
                
                {!collapsedDays[section.dayStr + '|' + section.dateStr] && (
                  <YStack backgroundColor={theme.card} borderRadius={24} borderWidth={1} borderColor={theme.border} overflow="hidden">
                    {section.events.map((evt, evtIdx) => {
                      const isLast = evtIdx === section.events.length - 1;
                      const dotColor = evt.type === 'ATTENDANCE_IN' ? '#10b981' : evt.type === 'ATTENDANCE_OUT' ? '#ef4444' : (evt.type === 'BORROW' || evt.type === 'RETURN') ? theme.primary : '#ef4444';
                      const iconBgColor = evt.type === 'ATTENDANCE_OUT' ? '#fef2f2' : theme.pillContainer;
                      
                      return (
                        <XStack 
                          key={evt.id} 
                          padding={16} 
                          alignItems="center" 
                          borderBottomWidth={isLast ? 0 : 1} 
                          borderBottomColor={theme.border}
                        >
                          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: iconBgColor, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                            {renderIcon(evt.type)}
                          </View>
                          <YStack flex={1}>
                            <XStack justifyContent="space-between" alignItems="center" marginBottom={2}>
                              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }} numberOfLines={1}>{evt.title}</Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: dotColor, marginLeft: 8 }}>
                                {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </XStack>
                            {evt.subtitle && <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }} numberOfLines={1}>{evt.subtitle}</Text>}
                          </YStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}
              </YStack>
            ))
          )}
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
  },
  utilityChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    backgroundColor: theme.pillContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: theme.primary,
  },
  filterText: {
    color: theme.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  filterTextActive: {
    color: theme.pillTextActive,
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
    color: theme.textSecondary,
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.background,
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
    color: theme.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },
});
