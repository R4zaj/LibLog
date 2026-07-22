import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TouchableWithoutFeedback, Dimensions, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Bell, Settings, Flame, ArrowRight, ScanLine, BookOpen, Bookmark, Calendar, ChevronRight, TrendingUp, Megaphone, Star, Users, Check, X, Activity, ArrowRightLeft, DollarSign, ExternalLink } from 'lucide-react-native';
import api from '../../api';

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
  const router = useRouter();
  const [insideNow, setInsideNow] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const [statsRes, annRes, borrowRes, usersRes, booksRes] = await Promise.all([
          api.get('/attendance/stats'),
          api.get('/announcements/active').catch(() => ({ data: [] })),
          user?.id ? api.get(`/borrowing/user/${user.id}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          api.get('/attendance/active').catch(() => ({ data: [] })),
          api.get('/literatures/books').catch(() => ({ data: [] }))
        ]);
        
        if (isMounted) {
          setInsideNow(statsRes.data.insideNow);
          setAnnouncements(annRes.data);
          setActiveBorrows(borrowRes.data);
          setActiveUsers(usersRes.data);
          setBooks(booksRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 30000); // refresh every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const announcementsCount = announcements.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.streakContainer}>
          <Flame color="#f97316" size={20} />
          <Text style={styles.streakCount}>5</Text>
          <Text style={styles.streakText}>day streak</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setNotificationsOpen(true)}>
            <Bell color="#1f2937" size={24} />
            {announcementsCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{announcementsCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
            <Settings color="#1f2937" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.first_name?.[0]?.toUpperCase() || 'J'}{user?.last_name?.[0]?.toUpperCase() || 'D'}</Text>
        </View>
        <View style={styles.headerTextCont}>
          <Text style={styles.greeting}>Good afternoon, {user?.first_name || 'Juan'}!</Text>
          <Text style={styles.subtitle}>{user?.program?.name || 'Computer Science'} • {user?.year_level || '1st Year'} • {user?.role === 'STUDENT' ? 'Student' : 'Staff'}</Text>
        </View>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            Library Open {insideNow !== null ? `· ${insideNow} inside` : '· Closes 9PM'}
          </Text>
        </View>
        <Text style={styles.dateText}>📅 {currentDate}</Text>
      </View>

      {/* Section: Announcements */}
      {announcements.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Megaphone color="#6C48C5" size={20} />
            <Text style={styles.sectionTitle}>Announcements</Text>
          </View>
          <View style={styles.announcementCard}>
            <View style={styles.announcementIconBg}>
              <Megaphone color="#fff" size={20} />
            </View>
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>{announcements[0].title}</Text>
              <Text style={styles.announcementBody}>{announcements[0].body}</Text>
              {announcements.length > 1 && (
                <View style={styles.paginationDots}>
                  {announcements.map((_, i) => (
                    <View key={i} style={i === 0 ? styles.dotActive : styles.dotInactive} />
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}

      {/* Section: Today's Highlight */}
      {books.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Star color="#6C48C5" size={20} />
            <Text style={styles.sectionTitle}>Today's Highlight</Text>
          </View>
          <View style={styles.highlightCard}>
            <View style={styles.highlightIconCont}>
              <BookOpen color="#fff" size={40} opacity={0.6} />
            </View>
            <View style={styles.highlightContent}>
              <View style={styles.featuredTag}>
                <Star color="#fbbf24" size={12} fill="#fbbf24" />
                <Text style={styles.featuredTagText}>Featured Pick</Text>
              </View>
              <Text style={styles.highlightBookTitle} numberOfLines={2}>{books[0].title}</Text>
              <Text style={styles.highlightBookAuthor} numberOfLines={1}>{books[0].author}</Text>
              <View style={styles.unavailableTag}>
                {books[0].available > 0 ? (
                  <Text style={[styles.unavailableText, { color: '#fbbf24' }]}>Available ({books[0].available})</Text>
                ) : (
                  <Text style={styles.unavailableText}>Currently unavailable <ArrowRight size={12} color="#fff" /></Text>
                )}
              </View>
            </View>
          </View>
        </>
      )}

      {/* Section: Current Borrow */}
      {activeBorrows.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Current Borrow</Text>
          </View>
          <View style={styles.borrowCard}>
            <View style={styles.borrowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.borrowTitle} numberOfLines={1}>{activeBorrows[0].book?.title || 'Unknown Book'}</Text>
                <Text style={styles.borrowAuthor} numberOfLines={1}>{activeBorrows[0].book?.author?.name || 'Unknown Author'}</Text>
              </View>
              {(() => {
                const daysLeft = Math.ceil((new Date(activeBorrows[0].due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                let statusBg = '#6C48C520';
                let statusColor = '#6C48C5';
                let statusText = `${daysLeft} days left`;
                
                if (daysLeft < 0) {
                  statusBg = '#fee2e2';
                  statusColor = '#ef4444';
                  statusText = 'Overdue';
                } else if (daysLeft === 0) {
                  statusBg = '#ffedd5';
                  statusColor = '#f97316';
                  statusText = 'Due Today!';
                } else if (daysLeft === 1) {
                  statusBg = '#fef08a';
                  statusColor = '#ca8a04';
                  statusText = 'Due Tomorrow';
                }

                return (
                  <View style={[styles.daysLeftBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.daysLeftText, { color: statusColor }]}>
                      {statusText}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.borrowCategory}>
              <Text style={styles.borrowCategoryText}>{activeBorrows[0].book?.genre?.name || 'General'}</Text>
            </View>
            <View style={styles.progressBarBg}>
              {(() => {
                const daysLeft = Math.ceil((new Date(activeBorrows[0].due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const barColor = daysLeft < 0 ? '#ef4444' : (daysLeft === 0 ? '#f97316' : (daysLeft === 1 ? '#eab308' : '#6C48C5'));
                const barWidth = daysLeft < 0 ? '100%' : (daysLeft <= 1 ? '90%' : '50%');
                return <View style={[styles.progressBarFill, { width: barWidth, backgroundColor: barColor }]} />;
              })()}
            </View>
            <View style={styles.borrowDates}>
              <Text style={styles.dateSmall}>Borrowed: {new Date(activeBorrows[0].borrow_date).toLocaleDateString()}</Text>
              <Text style={styles.dateSmall}>Due: {new Date(activeBorrows[0].due_date).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => router.push('/borrowed')}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <ChevronRight size={16} color="#6C48C5" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Section: Currently Inside (Activity Feed) */}
      <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.sectionBar} />
          <Users color="#6C48C5" size={20} />
          <Text style={styles.sectionTitle}>Currently Inside</Text>
        </View>
        <Text style={styles.seeAllText}>{activeUsers.length} Users</Text>
      </View>
      {activeUsers.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeUsersScroll} contentContainerStyle={{ paddingRight: 16 }}>
          {activeUsers.map((u) => (
            <View key={u.id} style={styles.activeUserCard}>
              <View style={styles.activeUserAvatar}>
                <Text style={styles.activeUserAvatarText}>
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </Text>
              </View>
              <Text style={styles.activeUserName} numberOfLines={1}>{u.first_name} {u.last_name}</Text>
              <Text style={styles.activeUserDept} numberOfLines={1}>{u.department}</Text>
              <Text style={styles.activeUserTime}>{new Date(u.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No users currently in the library.</Text>
        </View>
      )}

      {/* Section: Quick Actions */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={[styles.actionItem, { width: '30%' }]} onPress={() => router.push('/scan')}>
          <View style={styles.actionIconBg}><ScanLine color="#fff" size={24} /></View>
          <Text style={styles.actionTitle}>Scan QR</Text>
          <Text style={styles.actionSubtitle}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionItem, { width: '30%' }]} onPress={() => router.push('/borrowed')}>
          <View style={styles.actionIconBgOutline}><BookOpen color="#6C48C5" size={24} /></View>
          <Text style={styles.actionTitle}>Borrowing</Text>
          <Text style={styles.actionSubtitle}>View history</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionItem, { width: '30%' }]} onPress={() => router.push('/scan')}>
          <View style={styles.actionIconBgOutline}><Calendar color="#6C48C5" size={24} /></View>
          <Text style={styles.actionTitle}>Attendance</Text>
          <Text style={styles.actionSubtitle}>Check in</Text>
        </TouchableOpacity>
      </View>

      {/* Section: Recommended for You */}
      {books.length > 1 && (
        <>
          <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Recommended for You</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Text style={styles.seeAllText}>See All <ChevronRight size={14} color="#6C48C5" /></Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
            {books.slice(1, 4).map((book: any, i: number) => (
              <View key={book.id} style={styles.recCard}>
                <View style={[styles.recCover, { backgroundColor: i % 2 === 0 ? '#a855f7' : '#1e3a8a' }]}>
                  <View style={styles.recTags}>
                    <View style={styles.recTypeTag}><Text style={styles.recTypeText}>{book.genre || 'Book'}</Text></View>
                    <View style={styles.forYouTag}><Star color="#fff" size={10} fill="#fff" /><Text style={styles.forYouText}> For You</Text></View>
                  </View>
                  <BookOpen color="#fff" size={40} opacity={0.6} />
                </View>
                <Text style={styles.recAvail}>
                  <View style={[styles.dot, { backgroundColor: book.available > 0 ? '#22c55e' : '#ef4444' }]} /> 
                  {book.available > 0 ? `${book.available} available` : 'Unavailable'}
                </Text>
                <Text style={styles.recTitle} numberOfLines={2}>{book.title}</Text>
                <Text style={styles.recAuthor} numberOfLines={1}>{book.author}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Section: Trending in Your Department */}
      {books.length > 4 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <TrendingUp color="#6C48C5" size={20} />
            <Text style={styles.sectionTitle}>Trending in Your Department</Text>
          </View>
          <View style={styles.trendingList}>
            {books.slice(4, 9).map((book: any, idx: number) => (
              <View key={book.id} style={styles.trendingItem}>
                <View style={[styles.rankCircle, { backgroundColor: idx < 3 ? '#6C48C5' : '#f3e8ff' }]}>
                  <Text style={[styles.rankText, { color: idx < 3 ? '#fff' : '#6C48C5' }]}>{idx + 1}</Text>
                </View>
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingTitle} numberOfLines={1}>{book.title}</Text>
                  <Text style={styles.trendingAuthor} numberOfLines={1}>{book.author}</Text>
                </View>
                <View style={styles.trendingCount}>
                  <Text style={styles.countText}>⏱ {book.total} copies</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      </ScrollView>

      {/* Announcements Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsOpen}
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotificationsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Announcements {announcementsCount > 0 && `(${announcementsCount})`}</Text>
                </View>

                {/* List */}
                <ScrollView style={styles.notifList}>
                  {announcements.length === 0 ? (
                    <Text style={styles.noNotifsText}>No new announcements</Text>
                  ) : (
                    announcements.map(a => {
                      return (
                        <View 
                          key={a.id} 
                          style={styles.notifItem}
                        >
                          <View style={[styles.notifIconWrapper, { backgroundColor: '#f3e8ff' }]}>
                            <Megaphone size={18} color="#6C48C5" />
                          </View>
                          <View style={styles.notifContent}>
                            <View style={styles.notifTop}>
                              <Text style={[styles.notifTitle, styles.notifTitleUnread]}>{a.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.notifTime}>{formatTimeAgo(a.created_at)}</Text>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  streakContainer: { flexDirection: 'row', alignItems: 'center' },
  streakCount: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 4 },
  streakText: { fontSize: 14, color: '#6b7280' },
  topBarActions: { flexDirection: 'row' },
  iconBtn: { marginLeft: 16, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  headerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6C48C5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerTextCont: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#6b7280' },
  
  statusContainer: { marginBottom: 24 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  statusText: { color: '#059669', fontWeight: '600', fontSize: 12 },
  dateText: { fontSize: 13, color: '#6b7280' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  sectionBar: { width: 4, height: 20, backgroundColor: '#6C48C5', borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 8 },

  announcementCard: { backgroundColor: '#fcfaff', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 24, borderWidth: 1, borderColor: '#f3e8ff' },
  announcementIconBg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#6C48C5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  announcementContent: { flex: 1 },
  announcementTitle: { fontSize: 15, fontWeight: 'bold', color: '#6C48C5', marginBottom: 6 },
  announcementBody: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  paginationDots: { flexDirection: 'row', justifyContent: 'center' },
  dotActive: { width: 16, height: 6, borderRadius: 3, backgroundColor: '#6C48C5', marginRight: 4 },
  dotInactive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d8b4fe' },

  highlightCard: { backgroundColor: '#8b5cf6', borderRadius: 16, padding: 20, flexDirection: 'row', marginBottom: 24 },
  highlightIconCont: { width: 80, height: 110, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  highlightContent: { flex: 1, justifyContent: 'center' },
  featuredTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featuredTagText: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  highlightBookTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  highlightBookAuthor: { color: '#e9d5ff', fontSize: 13, marginBottom: 12 },
  unavailableTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  unavailableText: { color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 4 },

  borrowCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, borderLeftWidth: 4, borderLeftColor: '#6C48C5' },
  borrowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  borrowTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  borrowAuthor: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  daysLeftBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  daysLeftText: { color: '#6C48C5', fontSize: 12, fontWeight: 'bold' },
  borrowCategory: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#d8b4fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginBottom: 12 },
  borrowCategoryText: { color: '#a855f7', fontSize: 11 },
  progressBarBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, marginBottom: 8 },
  progressBarFill: { height: '100%', width: '40%', backgroundColor: '#6C48C5', borderRadius: 3 },
  borrowDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dateSmall: { fontSize: 11, color: '#9ca3af' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center' },
  viewDetailsText: { color: '#6C48C5', fontSize: 14, fontWeight: '600', marginRight: 4 },

  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' },
  actionItem: { width: '23%', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', elevation: 1 },
  actionIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C48C5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIconBgOutline: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 2 },
  actionSubtitle: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  seeAllText: { color: '#6C48C5', fontSize: 14, fontWeight: '600' },
  recommendedScroll: { marginBottom: 24, marginLeft: -16, paddingLeft: 16 },
  recCard: { width: 160, marginRight: 16 },
  recCover: { height: 200, borderRadius: 12, padding: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative' },
  recTags: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  recTypeTag: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  recTypeText: { fontSize: 10, fontWeight: 'bold', color: '#6C48C5' },
  forYouTag: { backgroundColor: '#fbbf24', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  forYouText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  recAvail: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  recTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  recAuthor: { fontSize: 12, color: '#9ca3af' },

  trendingList: { marginBottom: 24 },
  trendingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  rankCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 14, fontWeight: 'bold' },
  trendingInfo: { flex: 1 },
  trendingTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  trendingAuthor: { fontSize: 12, color: '#6b7280' },
  trendingCount: { marginLeft: 12 },
  countText: { fontSize: 12, color: '#9ca3af' },

  activeUsersScroll: { paddingLeft: 16, marginBottom: 24, marginLeft: -16 },
  activeUserCard: { width: 100, backgroundColor: '#fcfaff', borderRadius: 16, padding: 12, marginRight: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e9d5ff' },
  activeUserAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6C48C5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  activeUserAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  activeUserName: { fontSize: 12, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 2 },
  activeUserDept: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 6 },
  activeUserTime: { fontSize: 10, fontWeight: 'bold', color: '#10b981', textAlign: 'center' },
  emptyStateContainer: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 24 },
  emptyStateText: { color: '#6b7280', textAlign: 'center', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: height * 0.8, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fcfaff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
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
  notifItemUnread: { backgroundColor: '#f3e8ff' },
  notifIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  notifTitle: { fontSize: 14, color: '#4b5563', flex: 1, marginRight: 8 },
  notifTitleUnread: { fontWeight: 'bold', color: '#111827' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C48C5', marginRight: 6 },
  notifTime: { fontSize: 11, color: '#9ca3af' },
  notifMessage: { fontSize: 12, color: '#6b7280' },
  notifMessageUnread: { color: '#374151', fontWeight: '500' },
  notifTrigger: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  notifFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#fcfaff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  notifFooterText: { fontSize: 14, fontWeight: 'bold', color: '#6C48C5', marginLeft: 8 },
  closeModalBtn: { position: 'absolute', top: -50, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
});
