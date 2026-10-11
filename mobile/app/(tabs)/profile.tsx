import React from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle, BookOpen, MapPin, Flame, Edit, GraduationCap, Heart, Bell, Mail, Shield, HelpCircle, Info, LogOut, ChevronRight, Clock, QrCode, X, Megaphone, ArrowLeft
} from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View, Separator } from 'tamagui';
import api from '../../api';
import { useFavorites } from '../../context/FavoritesContext';
import { DynamicQrCode } from '../../components/DynamicQrCode';
import { EditProfileModal } from '../../components/EditProfileModal';

export default function Profile() {
  const { theme, isDarkMode } = useAppTheme();
  const { t } = useLanguage();
  const { user, signOut, updateUser } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const [qrVisible, setQrVisible] = React.useState(false);
  const [favoritesModalVisible, setFavoritesModalVisible] = React.useState(false);
  const [selectedFavBook, setSelectedFavBook] = React.useState<any | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = React.useState(false);

  const doSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const [createAnnouncementVisible, setCreateAnnouncementVisible] = React.useState(false);
  const [announcementForm, setAnnouncementForm] = React.useState({
    title: '',
    body: '',
    priority: 'NORMAL',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);



  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.body) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/settings/announcements', announcementForm);
      Alert.alert('Success', 'Announcement created successfully!');
      setCreateAnnouncementVisible(false);
      setAnnouncementForm({ title: '', body: '', priority: 'NORMAL', is_active: true });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [editProfileVisible, setEditProfileVisible] = React.useState(false);
  const [infoModal, setInfoModal] = React.useState({ visible: false, title: '', content: '' });

  const menuItems = [
    { id: 1, title: 'Edit Profile', sub: 'Update your information', icon: Edit, color: theme.primary, bg: theme.pillContainer, action: () => setEditProfileVisible(true) },
    { id: 2, title: 'My Favorites', sub: `${favorites.length} Favorite Book${favorites.length === 1 ? '' : 's'}`, icon: Heart, color: '#ef4444', bg: isDarkMode ? "#451a1a" : "#fef3f2", action: () => setFavoritesModalVisible(true) },
    ...(user?.role === 'ADMIN'
      ? [{ id: 8, title: 'Create Announcement', sub: 'Broadcast to all users', icon: Megaphone, color: theme.pillTextActive, bg: '#6C48C5', action: () => setCreateAnnouncementVisible(true) }]
      : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pillContainer }}>
      {/* ── Sticky Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: theme.pillContainer }}>
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
          style={{ padding: 8, backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, position: 'absolute', left: 20, zIndex: 10 }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' }}>
          Profile
        </Text>
      </View>
      <ScrollView backgroundColor={theme.pillContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Header ── */}
      <YStack backgroundColor={theme.card} borderRadius={16} padding={20} borderWidth={1} borderColor={theme.border} alignItems="center" marginHorizontal="$5" marginTop="$5" marginBottom="$4" style={{ boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' }} elevation={2}>
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="#6C48C5"
          justifyContent="center"
          alignItems="center"
          marginBottom="$3"
        >
          <Text fontSize={28} color={theme.pillTextActive} fontWeight="800">
            {user?.first_name?.[0] || 'J'}
            {user?.last_name?.[0] || 'D'}
          </Text>
        </YStack>

        <Text fontSize={22} fontWeight="800" color={theme.text} marginBottom="$1">
          {user?.first_name || 'Juan'} {user?.last_name || 'Dela Cruz'}
        </Text>
        <XStack alignItems="center" gap="$1.5" marginBottom="$3">
          <Mail color={theme.textSecondary} size={13} />
          <Text fontSize={13} color={theme.textSecondary}>
            {user?.email || 'user@university.edu'}
          </Text>
        </XStack>

        <XStack alignItems="center" marginBottom="$2" gap="$2">
          <YStack backgroundColor={theme.border} paddingHorizontal="$3" paddingVertical="$1" borderRadius={12}>
            <Text color={theme.primary} fontSize={11} fontWeight="700">
              {user?.role || 'Student'}
            </Text>
          </YStack>
          <XStack alignItems="center" gap="$1">
            <GraduationCap color={theme.textSecondary} size={13} />
            <Text color={theme.textSecondary} fontSize={12}>
              {user?.program?.name || 'Computer Science'}
            </Text>
          </XStack>
        </XStack>

        <Text color={theme.textSecondary} fontSize={12} marginBottom="$3">
          ID: {user?.student_id || 'CCC-0000'}
        </Text>

        <TouchableOpacity
          onPress={() => setQrVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            paddingHorizontal: 18,
            paddingVertical: 9,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            minHeight: 48,
          }}
        >
          <QrCode color={theme.primary} size={16} style={{ marginRight: 7 }} />
          <Text color={theme.primary} fontSize={13} fontWeight="700">
            Show ID QR
          </Text>
        </TouchableOpacity>
      </YStack>

      {/* ── QR Modal ── */}
      <Modal animationType="fade" transparent visible={qrVisible} onRequestClose={() => setQrVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor={theme.card} borderRadius={16} padding="$5" alignItems="center">
            <TouchableOpacity onPress={() => setQrVisible(false)} style={{ position: 'absolute', top: 16, right: 16, padding: 8, minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}>
              <X color={theme.textSecondary} size={24} />
            </TouchableOpacity>
            <Text fontSize={24} fontWeight="800" color={theme.text} marginBottom="$1">
              Your Library ID
            </Text>
            <Text fontSize={13} color={theme.textSecondary} marginBottom="$5" textAlign="center">
              Scan at the entrance or front desk
            </Text>
            <YStack
              padding="$4"
              backgroundColor={theme.background}
              borderRadius={16}
              borderWidth={1}
              borderColor={theme.border}
            >
              <DynamicQrCode fallbackId={user?.student_id || ''} offlineSecret={user?.offline_secret} size={200} />
            </YStack>
            <Text marginTop="$3" fontSize={16} fontWeight="700" color={theme.primary} letterSpacing={2}>
              {user?.student_id}
            </Text>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Stats Card ── */}
      <XStack
        backgroundColor={theme.card}
        marginHorizontal="$5"
        borderRadius={16}
        paddingVertical="$4"
        borderWidth={1}
        borderColor={theme.border}
        style={{ boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' }}
        elevation={2}
      >
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor={theme.background} justifyContent="center" alignItems="center" marginBottom="$2">
            <BookOpen color={theme.primary} size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color={theme.text} marginBottom={2}>{user?.stats?.borrowed || 0}</Text>
          <Text fontSize={11} color={theme.textSecondary}>Borrowed</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#ecfdf5" justifyContent="center" alignItems="center" marginBottom="$2">
            <MapPin color="#10b981" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color={theme.text} marginBottom={2}>{user?.stats?.visits || 0}</Text>
          <Text fontSize={11} color={theme.textSecondary}>Visits</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#fff7ed" justifyContent="center" alignItems="center" marginBottom="$2">
            <Flame color="#f97316" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color={theme.text} marginBottom={2}>{user?.stats?.streak || 0}</Text>
          <Text fontSize={11} color={theme.textSecondary}>Streak</Text>
        </YStack>
      </XStack>

      <YStack paddingHorizontal="$5" paddingTop="$5">
        {/* Member Since */}
        <XStack
          backgroundColor={theme.background}
          padding="$3"
          borderRadius={12}
          marginBottom="$5"
          alignItems="center"
          borderWidth={1}
          borderColor={theme.border}
        >
          <Clock color={theme.primary} size={16} style={{ marginRight: 8 }} />
          <Text color={theme.primary} fontSize={13} fontWeight="500">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2026'}
          </Text>
        </XStack>

        {/* Menu */}
        <YStack backgroundColor={theme.card} borderRadius={16} padding={12} marginBottom="$5" borderWidth={1} borderColor={theme.border} style={{ boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' }} elevation={2}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity onPress={item.action} style={{ minHeight: 48, justifyContent: 'center' }}>
                <XStack alignItems="center" padding="$2">
                  <YStack width={40} height={40} borderRadius={14} backgroundColor={item.bg as any} justifyContent="center" alignItems="center" marginRight="$3">
                    <item.icon color={item.color} size={20} />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color={theme.text} marginBottom={2}>
                      {item.title}
                    </Text>
                    <Text fontSize={12} color={theme.textSecondary}>
                      {item.sub}
                    </Text>
                  </YStack>
                  <ChevronRight color={theme.textSecondary} size={18} />
                </XStack>
              </TouchableOpacity>
              {idx < menuItems.length - 1 && (
                <View marginHorizontal="$3" height={1} backgroundColor={theme.border} />
              )}
            </React.Fragment>
          ))}
        </YStack>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#fecaca',
            backgroundColor: isDarkMode ? "#451a1a" : "#fef3f2",
            minHeight: 48,
          }}
        >
          <LogOut color="#ef4444" size={20} style={{ marginRight: 8 }} />
          <Text color="#ef4444" fontSize={15} fontWeight="700">
            Log Out
          </Text>
        </TouchableOpacity>
      </YStack>

      {/* ── Log Out Confirmation Modal ── */}
      <Modal animationType="fade" transparent visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="80%" backgroundColor={theme.card} borderRadius={16} padding="$5" alignItems="center">
            <YStack backgroundColor={isDarkMode ? "#451a1a" : "#fef3f2"} padding="$3" borderRadius={20} marginBottom="$3">
              <LogOut color="#ef4444" size={28} />
            </YStack>
            <Text fontSize={24} fontWeight="800" color={theme.text} marginBottom="$2">Log Out</Text>
            <Text fontSize={15} color={theme.textSecondary} textAlign="center" marginBottom="$5">
              Are you sure you want to log out of your account?
            </Text>
            <XStack gap={12} width="100%">
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: theme.border,
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text color={theme.textSecondary} fontWeight="700" fontSize={15}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLogoutModalVisible(false);
                  doSignOut();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text color="#ffffff" fontWeight="700" fontSize={15}>Log Out</Text>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Create Announcement Modal ── */}
      <Modal animationType="slide" transparent visible={createAnnouncementVisible} onRequestClose={() => setCreateAnnouncementVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor={theme.card} borderRadius={16} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize={24} fontWeight="800" color={theme.text}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setCreateAnnouncementVisible(false)} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', marginRight: -12, marginTop: -12 }}>
                <X color={theme.textSecondary} size={24} />
              </TouchableOpacity>
            </XStack>

            <Text fontSize={14} fontWeight="700" color={theme.textSecondary} marginBottom="$1.5">Title</Text>
            <TextInput
              style={{ backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="e.g. Library closed on holiday"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, title: text })}
            />

            <Text fontSize={14} fontWeight="700" color={theme.textSecondary} marginBottom="$1.5">Body</Text>
            <TextInput
              style={{ backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16, height: 100, textAlignVertical: 'top' }}
              placeholder="Announcement details..."
              multiline
              value={announcementForm.body}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, body: text })}
            />

            <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
              <Text fontSize={14} fontWeight="700" color={theme.textSecondary}>Active immediately</Text>
              <Switch
                value={announcementForm.is_active}
                onValueChange={(val) => setAnnouncementForm({ ...announcementForm, is_active: val })}
                trackColor={{ false: '#9ca3af', true: '#6C48C5' }}
                thumbColor={announcementForm.is_active ? '#6C48C5' : '#f4f3f4'}
              />
            </XStack>

            <TouchableOpacity
              onPress={handleCreateAnnouncement}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#6C48C5',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                opacity: isSubmitting ? 0.7 : 1,
                minHeight: 48,
                justifyContent: 'center',
              }}
            >
              <Text color={theme.pillTextActive} fontSize={16} fontWeight="700">
                {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
              </Text>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Edit Profile Pop-Up Modal ── */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
      />

      {/* ── Info Modal ── */}
      <Modal animationType="fade" transparent visible={infoModal.visible} onRequestClose={() => setInfoModal({ ...infoModal, visible: false })}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor={theme.card} borderRadius={24} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontSize={20} fontWeight="800" color={theme.text}>{infoModal.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal({ ...infoModal, visible: false })} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}>
                <X color={theme.textSecondary} size={24} />
              </TouchableOpacity>
            </XStack>
            <Text fontSize={15} color={theme.textSecondary} lineHeight={22}>
              {infoModal.content}
            </Text>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Favorites Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={favoritesModalVisible}
        onRequestClose={() => {
          setSelectedFavBook(null);
          setFavoritesModalVisible(false);
        }}
      >
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="flex-end">
          <YStack backgroundColor={theme.pillContainer} borderTopLeftRadius={16} borderTopRightRadius={16} padding="$5" paddingTop="$6" paddingBottom={Platform.OS === 'ios' ? 40 : 20} maxHeight="90%">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
              <Text fontSize={24} fontWeight="800" color={theme.text}>My Favorites</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFavBook(null);
                  setFavoritesModalVisible(false);
                }}
                style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', marginRight: -12, marginTop: -12 }}
              >
                <X color={theme.primary} size={24} />
              </TouchableOpacity>
            </XStack>

            <Text fontSize={12} color={theme.textSecondary} marginBottom="$4">
              {favorites.length} {favorites.length === 1 ? 'book' : 'books'} saved in collection
            </Text>

            {favorites.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical="$8">
                <YStack width={68} height={68} borderRadius={34} backgroundColor={isDarkMode ? "#451a1a" : "#fef3f2"} justifyContent="center" alignItems="center" marginBottom="$3">
                  <Heart color="#ef4444" size={32} />
                </YStack>
                <Text fontSize={17} fontWeight="700" color={theme.text} marginBottom="$1">
                  No Favorite Books Yet
                </Text>
                <Text fontSize={13} color={theme.textSecondary} textAlign="center" paddingHorizontal="$4" marginBottom="$5">
                  Tap the heart icon on any book while browsing to save it to your favorites list.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFavoritesModalVisible(false);
                    router.push('/search');
                  }}
                  style={{
                    backgroundColor: '#6C48C5',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    minHeight: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text color={theme.pillTextActive} fontSize={14} fontWeight="700">Explore Catalog</Text>
                </TouchableOpacity>
              </YStack>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap="$2.5" paddingBottom="$4">
                  {favorites.map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      onPress={() => setSelectedFavBook(book)}
                      activeOpacity={0.7}
                    >
                      <XStack
                        backgroundColor={theme.background}
                        borderRadius={16}
                        padding={12}
                        marginBottom="$3"
                        borderWidth={1}
                        borderColor={theme.border}
                        style={{ boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' }}
                        elevation={2}
                        flexDirection="row"
                        alignItems="center"
                      >
                        <YStack
                          width={48}
                          height={48}
                          borderRadius={12}
                          backgroundColor={theme.border}
                          justifyContent="center"
                          alignItems="center"
                          marginRight="$3"
                        >
                          <BookOpen color={theme.primary} size={22} />
                        </YStack>
                        <YStack flex={1} marginRight="$2">
                          <Text fontSize={14} fontWeight="700" color={theme.text} numberOfLines={1}>
                            {book.title}
                          </Text>
                          <Text fontSize={12} color={theme.textSecondary} numberOfLines={1} marginBottom={2}>
                            {book.author}
                          </Text>
                          <XStack alignItems="center" gap="$2">
                            <YStack backgroundColor="rgba(108, 72, 197, 0.1)" paddingHorizontal="$1.5" paddingVertical={2} borderRadius={6}>
                              <Text fontSize={10} fontWeight="700" color={theme.primary}>
                                {book.genre || book.type || 'Book'}
                              </Text>
                            </YStack>
                            <Text fontSize={10} fontWeight="600" color={book.available && book.available > 0 ? '#10b981' : '#ef4444'}>
                              {book.available && book.available > 0 ? `${book.available} available` : 'Out of stock'}
                            </Text>
                          </XStack>
                        </YStack>
                        <TouchableOpacity
                          onPress={() => removeFavorite(book.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{
                            minHeight: 48,
                            minWidth: 48,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 10,
                            backgroundColor: isDarkMode ? "#451a1a" : "#fef3f2",
                          }}
                        >
                          <Heart color="#ef4444" size={18} fill="#ef4444" />
                        </TouchableOpacity>
                      </XStack>
                    </TouchableOpacity>
                  ))}
                </YStack>
              </ScrollView>
            )}
          </YStack>
        </YStack>
      </Modal>

      {/* ── Favorite Book Detail Sub-Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={!!selectedFavBook}
        onRequestClose={() => setSelectedFavBook(null)}
      >
        <View flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center" padding="$4">
          <YStack backgroundColor={theme.card} width="100%" maxWidth={400} borderRadius={24} padding="$5" elevation={8}>
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$4">
              <YStack flex={1} marginRight="$3">
                <Text fontSize={18} fontWeight="800" color={theme.text} marginBottom="$1">
                  {selectedFavBook?.title}
                </Text>
                <Text fontSize={13} color={theme.textSecondary}>
                  By {selectedFavBook?.author}
                </Text>
              </YStack>
              <TouchableOpacity onPress={() => setSelectedFavBook(null)} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}>
                <View backgroundColor={theme.pillContainer} padding="$2" borderRadius={12}>
                  <X color={theme.primary} size={20} />
                </View>
              </TouchableOpacity>
            </XStack>

            <ScrollView maxHeight={280} showsVerticalScrollIndicator={false}>
              <YStack gap="$2.5" marginBottom="$4">
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color={theme.textSecondary}>Genre</Text>
                  <Text fontSize={13} fontWeight="600" color={theme.text}>{selectedFavBook?.genre || selectedFavBook?.type || 'N/A'}</Text>
                </XStack>
                {selectedFavBook?.shelf ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={theme.textSecondary}>Shelf</Text>
                    <Text fontSize={13} fontWeight="600" color={theme.text}>{selectedFavBook?.shelf}</Text>
                  </XStack>
                ) : null}
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color={theme.textSecondary}>Condition</Text>
                  <Text fontSize={13} fontWeight="600" color={selectedFavBook?.condition === 'POOR' ? '#ef4444' : '#10b981'}>{selectedFavBook?.condition || 'GOOD'}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color={theme.textSecondary}>Availability</Text>
                  <Text fontSize={13} fontWeight="600" color={selectedFavBook?.available > 0 ? '#10b981' : '#ef4444'}>
                    {selectedFavBook?.available ?? 'N/A'} {selectedFavBook?.total ? `/ ${selectedFavBook.total}` : ''}
                  </Text>
                </XStack>
                {selectedFavBook?.year ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={theme.textSecondary}>Year</Text>
                    <Text fontSize={13} fontWeight="600" color={theme.text}>{selectedFavBook?.year}</Text>
                  </XStack>
                ) : null}
                {selectedFavBook?.isbn ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={theme.textSecondary}>ISBN</Text>
                    <Text fontSize={13} fontWeight="600" color={theme.text}>{selectedFavBook?.isbn}</Text>
                  </XStack>
                ) : null}
                {selectedFavBook?.lccn ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={theme.textSecondary}>Call No. / LCCN</Text>
                    <Text fontSize={13} fontWeight="600" color={theme.text}>{selectedFavBook?.lccn}</Text>
                  </XStack>
                ) : null}
              </YStack>
            </ScrollView>

            <XStack gap="$2" marginTop="$2">
              <TouchableOpacity
                onPress={() => {
                  const toRemoveId = selectedFavBook?.id;
                  setSelectedFavBook(null);
                  if (toRemoveId) removeFavorite(toRemoveId);
                }}
                style={{
                  flex: 1,
                  backgroundColor: isDarkMode ? "#451a1a" : "#fef3f2",
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text color="#ef4444" fontSize={13} fontWeight="700">Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFavBook(null);
                  setFavoritesModalVisible(false);
                  router.push('/search');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#6C48C5',
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text color={theme.pillTextActive} fontSize={13} fontWeight="700">Find in Catalog</Text>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
