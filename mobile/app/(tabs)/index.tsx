import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable, Dimensions, Alert, Modal, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Bell, Settings, Flame, ArrowRight, ScanLine, BookOpen, Bookmark, Calendar, ChevronRight, Clock, TrendingUp, Megaphone, Star, Users, Check, X, Activity, ArrowRightLeft, DollarSign, ExternalLink, AlertCircle, Heart, CircleUser } from 'lucide-react-native';
import api from '../../api';
import { useFavorites } from '../../context/FavoritesContext';
import type {
  Announcement,
  DashboardNotification,
  BorrowRecordWithBook,
  LiteratureBook,
  AttendanceLog,
} from '../../types/api';
import { TabBarVisibilityContext } from './_layout';
import { BookDetailModal } from '../../components/BookDetailModal';

const { width, height } = Dimensions.get('window');

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Just now';
}

export default function Home() {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<DashboardNotification[]>([]);
  const [activeBorrows, setActiveBorrows] = useState<BorrowRecordWithBook[]>([]);
  const [books, setBooks] = useState<LiteratureBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<LiteratureBook | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // New states for interactive cards
  const { setTabBarVisible } = React.useContext(TabBarVisibilityContext);
  const lastOffsetY = React.useRef(0);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [penaltyRange, setPenaltyRange] = useState<'day' | 'week' | 'all'>('day');

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return; // don't hit authenticated-adjacent endpoints before login resolves

    // Each source degrades to an empty fallback on its own failure (so one broken
    // endpoint doesn't blank the whole dashboard), but `hadError` still records that
    // it happened — otherwise a fully-down backend and a brand-new empty account
    // render identically, with no signal that anything actually failed.
    let hadError = false;
    const safeGet = async <T,>(promise: Promise<{ data: T }>, fallback: T): Promise<{ data: T }> => {
      try {
        return await promise;
      } catch (e) {
        hadError = true;
        return { data: fallback };
      }
    };

    try {
      const [annRes, borrowRes, booksRes, attendanceRes] = await Promise.all([
        safeGet<Announcement[]>(api.get<Announcement[]>('/announcements/active'), []),
        user?.id
          ? safeGet<BorrowRecordWithBook[]>(api.get<BorrowRecordWithBook[]>(`/borrowing/user/${user.id}`), [])
          : Promise.resolve({ data: [] as BorrowRecordWithBook[] }),
        safeGet<LiteratureBook[]>(api.get<LiteratureBook[]>('/literatures/books'), []),
        safeGet<AttendanceLog[]>(api.get<AttendanceLog[]>('/attendance/my-history'), []),
      ]);

      setActiveBorrows(borrowRes.data);
      setBooks(booksRes.data);
      setAttendanceLogs(attendanceRes.data);

      const rawAnnouncements = annRes.data || [];
      const rawBorrows = borrowRes.data || [];
      const now = new Date();
      const overdueNotifications: DashboardNotification[] = rawBorrows
        .filter((b) => b.status === 'OVERDUE' || (b.status === 'BORROWED' && new Date(b.due_date) < now))
        .map((b) => {
          const daysOverdue = Math.abs(Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / (1000 * 3600 * 24)));
          return {
            id: `overdue-${b.id}`,
            title: 'Book Overdue',
            body: `"${b.book?.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Please return it immediately.`,
            created_at: b.due_date,
            is_overdue: true,
          };
        });

      setAnnouncements([...overdueNotifications, ...rawAnnouncements]);
      setFetchError(hadError);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setFetchError(true);
    } finally {
      setIsLoading((prev) => {
        if (prev) {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }).start();
        }
        return false;
      });
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000); // refresh every 30s, only while this tab is focused
      return () => clearInterval(interval);
    }, [fetchDashboardData])
  );

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const greetingWord = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const announcementsCount = announcements.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#faf9fe' }}>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
           <ActivityIndicator size="large" color="#6C48C5" />
           <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Loading your library dashboard...</Text>
        </View>
      ) : (
        <Animated.ScrollView 
          style={[styles.container, { opacity: fadeAnim }]} 
          contentContainerStyle={{ paddingBottom: insets.bottom + 98 }}
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
        {/* Top Utility Bar */}
      <View style={styles.topUtilityBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../assets/images/CCC_icon.png')}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
          />
          <View style={styles.streakPill}>
            <Flame color="#f97316" size={16} fill="#f97316" />
            <Text style={styles.streakCount}>{user?.stats?.streak || 0}</Text>
            <Text style={styles.streakText}>day streak</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => setNotificationsOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell color="#1f2937" size={20} />
            {announcementsCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{announcementsCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings color="#1f2937" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => router.push('/profile')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <CircleUser color="#1f2937" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <Text style={styles.overlineDate}>{currentDate.toUpperCase()}</Text>
        <Text style={styles.greetingTitle}>{greetingWord}, {user?.first_name || 'Juan'}!</Text>
      </View>

      {/* Fetch error banner */}
      {fetchError && (
        <View style={styles.fetchErrorCard}>
          <AlertCircle color="#dc2626" size={18} />
          <Text style={styles.fetchErrorText}>Couldn't load dashboard data</Text>
          <TouchableOpacity onPress={fetchDashboardData} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={styles.fetchErrorRetry}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Streamlined Assistant Bubble */}
      {announcements.length > 0 && (
        <View style={styles.assistantCard}>
          <View style={styles.assistantIconTray}>
            <Megaphone color="#6C48C5" size={18} />
          </View>
          <View style={styles.assistantContent}>
            <Text style={styles.assistantOverline}>{announcements[0].is_overdue ? 'URGENT' : 'ANNOUNCEMENT'}</Text>
            <Text style={styles.assistantBody}>{announcements[0].title}: {announcements[0].body}</Text>
          </View>
        </View>
      )}

      {/* Two-Column Mid-Tier Grid Cards */}
      <View style={styles.gridContainer}>
        {/* Left Card: Attendance */}
        <View style={styles.gridCard}>
          <Text style={styles.gridEyebrow}>LAST 7 DAYS</Text>
          <View style={styles.chartContainer}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
              const todayIndex = new Date().getDay();
              const isToday = todayIndex === idx;
              
              // Calculate date for this day of week in the past 7 days
              const diff = todayIndex >= idx ? todayIndex - idx : 7 - (idx - todayIndex);
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() - diff);
              const targetDateString = targetDate.toLocaleDateString();

              const logsForDay = attendanceLogs.filter(log => new Date(log.logged_at).toLocaleDateString() === targetDateString);
              const totalMinutes = logsForDay.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
              const totalHours = totalMinutes / 60;
              
              // Base height 4px for empty days, up to ~50px max (assuming 10 hours max)
              const barHeight = Math.max(4, Math.min(50, totalHours * 5));

              return (
                <View key={idx} style={styles.chartCol}>
                  <View style={styles.chartBarBg}>
                    <View style={[styles.chartBarFill, { height: barHeight, backgroundColor: isToday ? '#6C48C5' : '#ede9f6' }]} />
                  </View>
                  <Text style={styles.chartLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Right Card: Penalties */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Penalties</Text>
          <View style={styles.penaltyValueCont}>
            <Text style={styles.currencySymbol}>₱</Text>
            <Text style={styles.penaltyValue}>
              {(() => {
                if (penaltyRange === 'all') return Number(user?.penalty_balance || 0).toFixed(2);
                
                // Derive estimated day/week penalties from activeBorrows
                const now = new Date().getTime();
                const overdues = activeBorrows.filter(b => b.status === 'OVERDUE' || (b.status === 'BORROWED' && new Date(b.due_date).getTime() < now));
                let totalEstimated = 0;
                
                overdues.forEach(b => {
                  const daysOverdue = Math.abs(Math.ceil((new Date(b.due_date).getTime() - now) / (1000 * 3600 * 24)));
                  // Mock 5 pesos per day penalty
                  const penaltyPerDay = 5;
                  if (penaltyRange === 'day' && daysOverdue > 0) {
                     // Assume today accrued a daily penalty if overdue
                     totalEstimated += penaltyPerDay;
                  } else if (penaltyRange === 'week' && daysOverdue > 0) {
                     // Max 7 days of penalty for this week
                     totalEstimated += Math.min(daysOverdue, 7) * penaltyPerDay;
                  }
                });
                return totalEstimated.toFixed(2);
              })()}
            </Text>
          </View>
          
          <View style={styles.segmentedPill}>
            {['Day', 'Week', 'All'].map((tab) => {
              const isActive = penaltyRange === tab.toLowerCase();
              return (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setPenaltyRange(tab.toLowerCase() as 'day' | 'week' | 'all')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                >
                  <Text style={[styles.segmentTabText, isActive && styles.segmentTabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Upcoming Borrows */}
      <View style={styles.borrowsSection}>
        <View style={styles.borrowsCard}>
          <View style={styles.borrowsHeaderRow}>
            <View style={styles.borrowsIconTray}>
              <Calendar color="#6C48C5" size={20} />
            </View>
            <View style={styles.borrowsHeaderContent}>
              <Text style={styles.borrowsTitle}>Due Soon</Text>
              <Text style={styles.borrowsSubtitle}>Active borrow return dates</Text>
            </View>
          </View>

          {activeBorrows.length > 0 ? (
            <View style={styles.borrowsList}>
              {activeBorrows.slice(0, 3).map((borrow, idx) => {
                const daysLeft = Math.ceil((new Date(borrow.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                let statusBg = '#ecfdf5';
                let statusColor = '#10b981';
                let statusText = 'Available';
                
                if (daysLeft <= 0) {
                  statusBg = '#fef2f2';
                  statusColor = '#ef4444';
                  statusText = `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`;
                } else if (daysLeft <= 2) {
                  statusBg = '#fef3c7';
                  statusColor = '#b45309';
                  statusText = `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
                } else {
                  statusText = `${daysLeft} days left`;
                }

                return (
                  <TouchableOpacity 
                    key={borrow.id} 
                    style={[styles.borrowRow, idx !== 0 && { borderTopWidth: 1, borderTopColor: '#f3f4f6' }, { minHeight: 48 }]}
                    activeOpacity={0.8}
                    onPress={() => router.push('/borrowed')}
                  >
                    <View style={styles.borrowRowIcon}>
                      <BookOpen color="#6C48C5" size={16} />
                    </View>
                    <View style={styles.borrowRowContent}>
                      <Text style={styles.borrowRowTitle} numberOfLines={1}>{borrow.book?.title || 'Unknown Book'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={[styles.borrowStatusPill, { backgroundColor: statusBg, marginRight: 8 }]}>
                          <Text style={[styles.borrowStatusText, { color: statusColor, fontWeight: '700' }]}>{statusText}</Text>
                        </View>
                        <Text style={styles.borrowRowDate}>{new Date(borrow.due_date).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      onPress={() => router.push('/scan')}
                    >
                      <ScanLine color="#9ca3af" size={20} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
             <View style={styles.borrowsEmpty}>
               <Text style={styles.borrowsEmptyText}>No active books currently borrowed.</Text>
             </View>
          )}
        </View>
      </View>

      {/* Section: Today's Highlight */}
      {books.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Highlight</Text>
          </View>
          <TouchableOpacity style={styles.highlightCard} onPress={() => setSelectedBook(books[0])}>
            <View style={styles.highlightIconCont}>
              <BookOpen color="#fff" size={40} opacity={0.85} />
            </View>
            <View style={styles.highlightContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.featuredTag}>
                  <Star color="#fbbf24" size={12} fill="#fbbf24" />
                  <Text style={styles.featuredTagText}>Featured Pick</Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); toggleFavorite(books[0]); }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 4 }}
                >
                  <Heart
                    color={isFavorite(books[0].id) ? '#ef4444' : '#9ca3af'}
                    size={20}
                    fill={isFavorite(books[0].id) ? '#ef4444' : 'none'}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.highlightBookTitle} numberOfLines={2}>{books[0].title}</Text>
              <Text style={styles.highlightBookAuthor} numberOfLines={1}>{books[0].author}</Text>
              <View style={styles.unavailableTag}>
                {books[0].available > 0 ? (
                  <Text style={[styles.unavailableText, { color: '#10b981' }]}>Available ({books[0].available})</Text>
                ) : (
                  <Text style={styles.unavailableText}>Currently unavailable <ArrowRight size={12} color="#9ca3af" /></Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}




      {/* Section: Recommended for You */}
      {books.length > 1 && (
        <>
          <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity onPress={() => router.push('/search')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.seeAllText}>See All <ChevronRight size={14} color="#6C48C5" /></Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
            {books.slice(1, 4).map((book, i) => (
              <TouchableOpacity key={book.id} style={styles.recCard} onPress={() => setSelectedBook(book)}>
                <View style={styles.recCover}>
                  <View style={styles.recTypeTag}>
                    <Text style={styles.recTypeText}>{book.genre || 'Book'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); toggleFavorite(book); }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.recFavBtn}
                  >
                    <Heart
                      color={isFavorite(book.id) ? '#ef4444' : '#6C48C5'}
                      size={18}
                      fill={isFavorite(book.id) ? '#ef4444' : 'none'}
                    />
                  </TouchableOpacity>
                  <BookOpen color="#6C48C5" size={32} />
                </View>
                <View style={styles.recAvailRow}>
                  <View style={[styles.dot, { backgroundColor: book.available > 0 ? '#10b981' : '#ef4444' }]} /> 
                  <Text style={[styles.recAvailText, { color: book.available > 0 ? '#10b981' : '#ef4444' }]}>
                    {book.available > 0 ? `${book.available} available` : 'Unavailable'}
                  </Text>
                </View>
                <Text style={styles.recTitle} numberOfLines={2} ellipsizeMode="tail">{book.title}</Text>
                <Text style={styles.recAuthor} numberOfLines={1}>{book.author}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Section: Trending in Your Department */}
      {books.length > 4 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending in Your Department</Text>
          </View>
          <View style={styles.trendingList}>
            {books.slice(4, 9).map((book, idx) => (
              <TouchableOpacity key={book.id} style={styles.trendingItem} onPress={() => setSelectedBook(book)}>
                <View style={[styles.rankCircle, { backgroundColor: idx < 3 ? '#6C48C5' : '#faf9fe' }]}>
                  <Text style={[styles.rankText, { color: idx < 3 ? '#fff' : '#6C48C5' }]}>{idx + 1}</Text>
                </View>
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingTitle} numberOfLines={1} ellipsizeMode="tail">{book.title}</Text>
                  <Text style={styles.trendingAuthor} numberOfLines={1} ellipsizeMode="tail">{book.author}</Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); toggleFavorite(book); }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 6, marginRight: 4 }}
                >
                  <Heart
                    color={isFavorite(book.id) ? '#ef4444' : '#cbd5e1'}
                    size={18}
                    fill={isFavorite(book.id) ? '#ef4444' : 'none'}
                  />
                </TouchableOpacity>
                <View style={styles.trendingCount}>
                  <Clock size={11} color="#9ca3af" strokeWidth={2} />
                  <Text style={styles.countText}>{book.total} copies</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      </Animated.ScrollView>
      )}

      {/* Book Detail Modal */}
      <BookDetailModal
        isOpen={!!selectedBook}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        isFavorite={selectedBook ? isFavorite(selectedBook.id) : false}
        onToggleFavorite={() => selectedBook && toggleFavorite(selectedBook)}
      />

      {/* Announcements Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsOpen}
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable onPress={() => setNotificationsOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable>
              <View style={styles.modalContent}>
                
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Notifications {announcementsCount > 0 && `(${announcementsCount})`}</Text>
                </View>

                {/* List */}
                <ScrollView style={styles.notifList}>
                  {announcements.length === 0 ? (
                    <Text style={styles.noNotifsText}>No new notifications</Text>
                  ) : (
                    announcements.map(a => {
                      return (
                        <View 
                          key={a.id} 
                          style={styles.notifItem}
                        >
                          <View style={[styles.notifIconWrapper, { backgroundColor: a.is_overdue ? '#fee2e2' : '#faf9fe' }]}>
                            {a.is_overdue ? (
                              <AlertCircle size={18} color="#ef4444" />
                            ) : (
                              <Megaphone size={18} color="#6C48C5" />
                            )}
                          </View>
                          <View style={styles.notifContent}>
                            <View style={styles.notifTop}>
                              <Text style={[styles.notifTitle, styles.notifTitleUnread, a.is_overdue && { color: '#ef4444' }]}>{a.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.notifTime}>{a.is_overdue ? 'Past Due' : formatTimeAgo(a.created_at)}</Text>
                              </View>
                            </View>
                            <Text style={[styles.notifMessage, styles.notifMessageUnread]}>{a.body}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setNotificationsOpen(false)}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topUtilityBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 24 },
  streakPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  streakCount: { fontSize: 14, fontWeight: '700', color: '#f97316', marginHorizontal: 6 },
  streakText: { fontSize: 14, color: '#f97316', fontWeight: '500' },
  topBarActions: { flexDirection: 'row', gap: 12 },
  actionChip: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ede9f6' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  greetingHeader: { marginBottom: 24 },
  overlineDate: { fontSize: 12, fontWeight: '700', color: '#7c7c8a', letterSpacing: 1, marginBottom: 4 },
  greetingTitle: { fontSize: 24, fontWeight: '800', color: '#1e1e2e' },
  
  assistantCard: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#ede9f6', elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)', alignItems: 'center' },
  assistantIconTray: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f4f1fa', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  assistantContent: { flex: 1 },
  assistantOverline: { fontSize: 12, fontWeight: '500', color: '#6C48C5', marginBottom: 2 },
  assistantBody: { fontSize: 14, fontWeight: '500', color: '#4b5563', lineHeight: 20 },

  gridContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  gridCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ede9f6', elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)', justifyContent: 'space-between', minHeight: 140 },
  gridEyebrow: { fontSize: 12, fontWeight: '500', color: '#7c7c8a', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 60, marginTop: 'auto' },
  chartCol: { alignItems: 'center', gap: 4 },
  chartBarBg: { height: 50, justifyContent: 'flex-end' },
  chartBarFill: { width: 6, borderRadius: 4 },
  chartLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600' },
  
  gridCardTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e', marginBottom: 8 },
  penaltyValueCont: { flexDirection: 'row', alignItems: 'flex-start' },
  currencySymbol: { fontSize: 14, fontWeight: '700', color: '#9ca3af', marginTop: 2, marginRight: 2 },
  penaltyValue: { fontSize: 24, fontWeight: '800', color: '#1e1e2e' },
  segmentedPill: { flexDirection: 'row', backgroundColor: '#f4f1fa', borderRadius: 9999, padding: 3, marginTop: 16, minHeight: 48 },
  segmentTab: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 9999 },
  segmentTabActive: { backgroundColor: '#6C48C5' },
  segmentTabText: { fontSize: 11, fontWeight: '600', color: '#7c7c8a' },
  segmentTabTextActive: { color: '#ffffff' },

  borrowsSection: { marginBottom: 32 },
  borrowsCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ede9f6', elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
  borrowsHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  borrowsIconTray: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#faf9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  borrowsHeaderContent: { flex: 1 },
  borrowsTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e' },
  borrowsSubtitle: { fontSize: 12, color: '#7c7c8a', fontWeight: '500' },
  borrowsList: { gap: 0 },
  borrowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  borrowRowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f4f1fa', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  borrowRowContent: { flex: 1, marginRight: 8 },
  borrowRowTitle: { fontSize: 14, fontWeight: '500', color: '#1e1e2e', marginBottom: 2 },
  borrowRowDate: { fontSize: 12, color: '#7c7c8a' },
  borrowStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  borrowStatusText: { fontSize: 12, fontWeight: '500' },
  borrowsEmpty: { paddingVertical: 24, alignItems: 'center' },
  borrowsEmptyText: { fontSize: 14, color: '#9ca3af' },


  container: { flex: 1, backgroundColor: '#faf9fe', paddingHorizontal: 16 },
  
  fetchErrorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, gap: 8 },
  fetchErrorText: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '500' },
  fetchErrorRetry: { fontSize: 12.5, color: '#6C48C5', fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e' },

  highlightCard: { backgroundColor: '#faf9fe', borderRadius: 16, padding: 20, flexDirection: 'row', marginBottom: 24, borderWidth: 1, borderColor: '#ede9f6', elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
  highlightIconCont: { width: 80, height: 110, backgroundColor: '#6C48C5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  highlightContent: { flex: 1, justifyContent: 'center' },
  featuredTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featuredTagText: { color: '#b45309', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  highlightBookTitle: { color: '#1e1e2e', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  highlightBookAuthor: { color: '#7c7c8a', fontSize: 14, fontWeight: '500', marginBottom: 12 },
  unavailableTag: { alignSelf: 'flex-start', backgroundColor: '#ede9f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  unavailableText: { color: '#9ca3af', fontSize: 12, fontWeight: '500', marginRight: 4 },

  seeAllText: { color: '#6C48C5', fontSize: 14, fontWeight: '600' },
  recommendedScroll: { marginBottom: 24, marginLeft: -16, paddingLeft: 16 },
  recCard: { width: 180, marginRight: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 16, padding: 12, elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
  recCover: { height: 190, backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  recTypeTag: { position: 'absolute', top: 10, left: 10, backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  recTypeText: { fontSize: 12, fontWeight: '500', color: '#6C48C5' },
  recFavBtn: { position: 'absolute', bottom: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)', elevation: 2, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  recAvailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  recAvailText: { fontSize: 12, fontWeight: '500' },
  recTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e', lineHeight: 22, marginBottom: 2 },
  recAuthor: { fontSize: 14, fontWeight: '500', color: '#7c7c8a' },

  trendingList: { marginBottom: 24 },
  trendingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
  rankCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 14, fontWeight: 'bold' },
  trendingInfo: { flex: 1 },
  trendingTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e', marginBottom: 2 },
  trendingAuthor: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  trendingCount: { marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { fontSize: 12, fontWeight: '500', color: '#9ca3af' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: height * 0.8, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#faf9fe', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e2e' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center' },
  markAllText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  notifTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 16 },
  notifTab: { paddingVertical: 12, paddingHorizontal: 8, marginRight: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  notifTabActive: { borderBottomColor: '#6C48C5' },
  notifTabText: { fontSize: 13, color: '#6b7280' },
  notifTabTextActive: { fontWeight: 'bold', color: '#6C48C5' },
  notifList: { flexShrink: 1 },
  noNotifsText: { textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 },
  notifItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  notifItemUnread: { backgroundColor: '#faf9fe' },
  notifIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: '#4b5563', flex: 1, marginRight: 8 },
  notifTitleUnread: { fontWeight: '600', color: '#1e1e2e' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C48C5', marginRight: 6 },
  notifTime: { fontSize: 11, color: '#9ca3af' },
  notifMessage: { fontSize: 12, color: '#6b7280' },
  notifMessageUnread: { color: '#4b5563', fontWeight: '500' },
  notifTrigger: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  notifFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#faf9fe', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  notifFooterText: { fontSize: 14, fontWeight: 'bold', color: '#6C48C5', marginLeft: 8 },
  closeModalBtn: { position: 'absolute', top: -50, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
});
