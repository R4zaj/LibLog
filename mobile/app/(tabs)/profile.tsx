import React from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle, BookOpen, MapPin, Flame, Edit, GraduationCap, Heart, Bell, Mail, Shield, HelpCircle, Info, LogOut, ChevronRight, Clock, QrCode, X, Megaphone,
} from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View, Separator } from 'tamagui';
import api from '../../api';
import { useFavorites } from '../../context/FavoritesContext';
import { DynamicQrCode } from '../../components/DynamicQrCode';

export default function Profile() {
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
  const [programModalVisible, setProgramModalVisible] = React.useState(false);
  const [programs, setPrograms] = React.useState<any[]>([]);
  const [programsLoading, setProgramsLoading] = React.useState(false);
  const [programsError, setProgramsError] = React.useState(false);

  const fetchPrograms = React.useCallback(() => {
    setProgramsLoading(true);
    setProgramsError(false);
    api
      .get('/settings/programs')
      .then((res) => setPrograms(res.data))
      .catch((err) => {
        console.error('Failed to fetch programs', err);
        setProgramsError(true);
      })
      .finally(() => setProgramsLoading(false));
  }, []);

  React.useEffect(() => {
    if (editProfileVisible && programs.length === 0 && !programsLoading) {
      fetchPrograms();
    }
  }, [editProfileVisible]);

  const [editProfileForm, setEditProfileForm] = React.useState({
    email: user?.email || '',
    password: '',
    program: user?.program?.name || '',
    year_level: user?.year_level || '',
  });
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);

  const handleEditProfile = async () => {
    setIsEditingProfile(true);
    try {
      const res = await api.put('/auth/me', editProfileForm);
      if (res.data.user) {
        updateUser(res.data.user);
        Alert.alert('Success', 'Profile updated successfully!');
        setEditProfileVisible(false);
        setEditProfileForm({ ...editProfileForm, password: '' });
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      const msg = error.response?.data?.error || 'Failed to update profile.';
      Alert.alert('Error', msg);
    } finally {
      setIsEditingProfile(false);
    }
  };

  const [infoModal, setInfoModal] = React.useState({ visible: false, title: '', content: '' });

  const menuItems = [
    { id: 1, title: 'Edit Profile', sub: 'Update your information', icon: Edit, color: '#6C48C5', bg: '#f4f1fa', action: () => setEditProfileVisible(true) },
    { id: 2, title: 'My Favorites', sub: `${favorites.length} Favorite Book${favorites.length === 1 ? '' : 's'}`, icon: Heart, color: '#ef4444', bg: '#fef3f2', action: () => setFavoritesModalVisible(true) },
    ...(user?.role === 'ADMIN'
      ? [{ id: 8, title: 'Create Announcement', sub: 'Broadcast to all users', icon: Megaphone, color: '#fff', bg: '#6C48C5', action: () => setCreateAnnouncementVisible(true) }]
      : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f1fa' }}>
    <ScrollView backgroundColor="#f4f1fa" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* ── Header ── */}
      <YStack backgroundColor="#ffffff" borderRadius={24} padding={20} borderWidth={1} borderColor="#ede9f6" alignItems="center" marginHorizontal="$5" marginTop="$5" marginBottom="$4">
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="#6C48C5"
          justifyContent="center"
          alignItems="center"
          marginBottom="$3"
        >
          <Text fontSize={28} color="white" fontWeight="800">
            {user?.first_name?.[0] || 'J'}
            {user?.last_name?.[0] || 'D'}
          </Text>
        </YStack>

        <Text fontSize={22} fontWeight="800" color="#1e1e2e" marginBottom="$1">
          {user?.first_name || 'Juan'} {user?.last_name || 'Dela Cruz'}
        </Text>
        <XStack alignItems="center" gap="$1.5" marginBottom="$3">
          <Mail color="#7c7c8a" size={13} />
          <Text fontSize={13} color="#7c7c8a">
            {user?.email || 'user@university.edu'}
          </Text>
        </XStack>

        <XStack alignItems="center" marginBottom="$2" gap="$2">
          <YStack backgroundColor="#ede9f6" paddingHorizontal="$3" paddingVertical="$1" borderRadius={12}>
            <Text color="#6C48C5" fontSize={11} fontWeight="700">
              {user?.role || 'Student'}
            </Text>
          </YStack>
          <XStack alignItems="center" gap="$1">
            <GraduationCap color="#7c7c8a" size={13} />
            <Text color="#7c7c8a" fontSize={12}>
              {user?.program?.name || 'Computer Science'}
            </Text>
          </XStack>
        </XStack>

        <Text color="#9ca3af" fontSize={12} marginBottom="$3">
          ID: {user?.student_id || 'CCC-0000'}
        </Text>

        <TouchableOpacity
          onPress={() => setQrVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'white',
            paddingHorizontal: 18,
            paddingVertical: 9,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#ede9f6',
          }}
        >
          <QrCode color="#6C48C5" size={16} style={{ marginRight: 7 }} />
          <Text color="#6C48C5" fontSize={13} fontWeight="700">
            Show ID QR
          </Text>
        </TouchableOpacity>
      </YStack>

      {/* ── QR Modal ── */}
      <Modal animationType="fade" transparent visible={qrVisible} onRequestClose={() => setQrVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor="white" borderRadius={24} padding="$5" alignItems="center">
            <TouchableOpacity onPress={() => setQrVisible(false)} style={{ position: 'absolute', top: 16, right: 16, padding: 8 }}>
              <X color="#7c7c8a" size={24} />
            </TouchableOpacity>
            <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom="$1">
              Your Library ID
            </Text>
            <Text fontSize={13} color="#7c7c8a" marginBottom="$5" textAlign="center">
              Scan at the entrance or front desk
            </Text>
            <YStack
              padding="$4"
              backgroundColor="#faf9fe"
              borderRadius={16}
              borderWidth={1}
              borderColor="#ede9f6"
            >
              <DynamicQrCode fallbackId={user?.student_id || ''} size={200} />
            </YStack>
            <Text marginTop="$3" fontSize={16} fontWeight="700" color="#6C48C5" letterSpacing={2}>
              {user?.student_id}
            </Text>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Stats Card ── */}
      <XStack
        backgroundColor="white"
        marginHorizontal="$5"
        borderRadius={24}
        paddingVertical="$4"
        borderWidth={1}
        borderColor="#ede9f6"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.03}
        shadowRadius={12}
        elevation={2}
      >
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#faf9fe" justifyContent="center" alignItems="center" marginBottom="$2">
            <BookOpen color="#6C48C5" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>{user?.stats?.borrowed || 0}</Text>
          <Text fontSize={11} color="#9ca3af">Borrowed</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#ecfdf5" justifyContent="center" alignItems="center" marginBottom="$2">
            <MapPin color="#10b981" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>{user?.stats?.visits || 0}</Text>
          <Text fontSize={11} color="#9ca3af">Visits</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#fff7ed" justifyContent="center" alignItems="center" marginBottom="$2">
            <Flame color="#f97316" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>{user?.stats?.streak || 0}</Text>
          <Text fontSize={11} color="#9ca3af">Streak</Text>
        </YStack>
      </XStack>

      <YStack paddingHorizontal="$5" paddingTop="$5">
        {/* Member Since */}
        <XStack
          backgroundColor="#faf9fe"
          padding="$3"
          borderRadius={12}
          marginBottom="$5"
          alignItems="center"
          borderWidth={1}
          borderColor="#ede9f6"
        >
          <Clock color="#6C48C5" size={16} style={{ marginRight: 8 }} />
          <Text color="#6C48C5" fontSize={13} fontWeight="500">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2026'}
          </Text>
        </XStack>

        {/* Menu */}
        <YStack backgroundColor="white" borderRadius={24} padding={12} marginBottom="$5" borderWidth={1} borderColor="#ede9f6">
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity onPress={item.action} style={{ minHeight: 48, justifyContent: 'center' }}>
                <XStack alignItems="center" padding="$2">
                  <YStack width={40} height={40} borderRadius={14} backgroundColor={item.bg as any} justifyContent="center" alignItems="center" marginRight="$3">
                    <item.icon color={item.color} size={20} />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color="#1e1e2e" marginBottom={2}>
                      {item.title}
                    </Text>
                    <Text fontSize={12} color="#9ca3af">
                      {item.sub}
                    </Text>
                  </YStack>
                  <ChevronRight color="#9ca3af" size={18} />
                </XStack>
              </TouchableOpacity>
              {idx < menuItems.length - 1 && (
                <View marginHorizontal="$3" height={1} backgroundColor="#f3f4f6" />
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
            backgroundColor: '#fef3f2',
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
          <YStack width="80%" backgroundColor="white" borderRadius={24} padding="$5" alignItems="center">
            <YStack backgroundColor="#fef3f2" padding="$3" borderRadius={20} marginBottom="$3">
              <LogOut color="#ef4444" size={28} />
            </YStack>
            <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom="$2">Log Out</Text>
            <Text fontSize={15} color="#4b5563" textAlign="center" marginBottom="$5">
              Are you sure you want to log out of your account?
            </Text>
            <XStack gap={12} width="100%">
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center'
                }}
              >
                <Text color="#4b5563" fontWeight="700" fontSize={15}>Cancel</Text>
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
                  alignItems: 'center'
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
          <YStack width="85%" backgroundColor="white" borderRadius={24} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize={20} fontWeight="800" color="#1e1e2e">Create Announcement</Text>
              <TouchableOpacity onPress={() => setCreateAnnouncementVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </XStack>

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">Title</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="e.g. Library closed on holiday"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, title: text })}
            />

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">Body</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16, height: 100, textAlignVertical: 'top' }}
              placeholder="Announcement details..."
              multiline
              value={announcementForm.body}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, body: text })}
            />

            <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
              <Text fontSize={14} fontWeight="700" color="#4b5563">Active immediately</Text>
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
              }}
            >
              <Text color="white" fontSize={16} fontWeight="700">
                {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
              </Text>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Edit Profile Modal ── */}
      <Modal animationType="fade" transparent visible={editProfileVisible} onRequestClose={() => setEditProfileVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor="white" borderRadius={24} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize={20} fontWeight="800" color="#1e1e2e">Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </XStack>

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">Email</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="New email"
              value={editProfileForm.email}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">New Password</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="Leave blank to keep current"
              value={editProfileForm.password}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, password: text })}
              secureTextEntry
            />

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">Course / Program</Text>
            <TouchableOpacity
              onPress={() => setProgramModalVisible(true)}
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, marginBottom: 16, justifyContent: 'center' }}
            >
              <Text style={{ color: editProfileForm.program ? '#1e1e2e' : '#9ca3af', fontSize: 14 }}>
                {editProfileForm.program || 'Select a course'}
              </Text>
            </TouchableOpacity>

            <Text fontSize={14} fontWeight="700" color="#4b5563" marginBottom="$1.5">Year Level</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="e.g. 1st Year"
              value={editProfileForm.year_level}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, year_level: text })}
            />

            <TouchableOpacity
              onPress={handleEditProfile}
              disabled={isEditingProfile}
              style={{
                backgroundColor: '#6C48C5',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                opacity: isEditingProfile ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              <Text color="white" fontSize={16} fontWeight="700">
                {isEditingProfile ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Program Selection Modal ── */}
      <Modal animationType="fade" transparent visible={programModalVisible} onRequestClose={() => setProgramModalVisible(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" maxHeight="70%" backgroundColor="white" borderRadius={24} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontSize={20} fontWeight="800" color="#1e1e2e">Select Course</Text>
              <TouchableOpacity onPress={() => setProgramModalVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </XStack>
            {programsLoading ? (
              <YStack alignItems="center" paddingVertical="$6">
                <ActivityIndicator size="small" color="#6C48C5" />
              </YStack>
            ) : programsError ? (
              <YStack alignItems="center" paddingVertical="$6" gap="$2">
                <AlertCircle color="#dc2626" size={24} />
                <Text fontSize={13} color="#b91c1c" fontWeight="500" textAlign="center">
                  Couldn't load courses
                </Text>
                <TouchableOpacity onPress={fetchPrograms} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                  <Text fontSize={12} color="#6C48C5" fontWeight="700">Tap to retry</Text>
                </TouchableOpacity>
              </YStack>
            ) : programs.length === 0 ? (
              <YStack alignItems="center" paddingVertical="$6">
                <Text fontSize={13} color="#9ca3af">No courses available</Text>
              </YStack>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {programs.map((prog) => (
                  <TouchableOpacity
                    key={prog.id}
                    onPress={() => {
                      setEditProfileForm({ ...editProfileForm, program: prog.name });
                      setProgramModalVisible(false);
                    }}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0eef5' }}
                  >
                    <Text style={{ fontSize: 16, color: '#1e1e2e', fontWeight: '500' }}>{prog.name}</Text>
                    <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{prog.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </YStack>
        </YStack>
      </Modal>

      {/* ── Info Modal ── */}
      <Modal animationType="fade" transparent visible={infoModal.visible} onRequestClose={() => setInfoModal({ ...infoModal, visible: false })}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center">
          <YStack width="85%" backgroundColor="white" borderRadius={24} padding="$5">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontSize={20} fontWeight="800" color="#1e1e2e">{infoModal.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal({ ...infoModal, visible: false })}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </XStack>
            <Text fontSize={15} color="#4b5563" lineHeight={22}>
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
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center" padding="$4">
          <YStack width="100%" maxWidth={460} maxHeight="82%" backgroundColor="white" borderRadius={24} padding="$5" elevation={8}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <XStack alignItems="center" gap="$2.5">
                <YStack width={40} height={40} borderRadius={14} backgroundColor="#fef3f2" justifyContent="center" alignItems="center">
                  <Heart color="#ef4444" size={20} fill="#ef4444" />
                </YStack>
                <YStack>
                  <Text fontSize={20} fontWeight="800" color="#1e1e2e">Favorite Books</Text>
                  <Text fontSize={12} color="#7c7c8a">
                    {favorites.length} {favorites.length === 1 ? 'book' : 'books'} saved in collection
                  </Text>
                </YStack>
              </XStack>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFavBook(null);
                  setFavoritesModalVisible(false);
                }}
              >
                <View backgroundColor="#f4f1fa" padding="$2" borderRadius={12}>
                  <X color="#6C48C5" size={20} />
                </View>
              </TouchableOpacity>
            </XStack>

            {favorites.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical="$8">
                <YStack width={68} height={68} borderRadius={34} backgroundColor="#fef3f2" justifyContent="center" alignItems="center" marginBottom="$3">
                  <Heart color="#ef4444" size={32} />
                </YStack>
                <Text fontSize={17} fontWeight="700" color="#1e1e2e" marginBottom="$1">
                  No Favorite Books Yet
                </Text>
                <Text fontSize={13} color="#9ca3af" textAlign="center" paddingHorizontal="$4" marginBottom="$5">
                  Tap the heart icon on any book while browsing to save it to your favorites list.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFavoritesModalVisible(false);
                    router.push('/search');
                  }}
                  style={{
                    backgroundColor: '#6C48C5',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text color="white" fontSize={14} fontWeight="700">Explore Catalog</Text>
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
                        backgroundColor="#faf9fe"
                        borderRadius={16}
                        padding="$3"
                        alignItems="center"
                        borderWidth={1}
                        borderColor="#f0eef5"
                      >
                        <YStack
                          width={48}
                          height={48}
                          borderRadius={12}
                          backgroundColor="#ede9f6"
                          justifyContent="center"
                          alignItems="center"
                          marginRight="$3"
                        >
                          <BookOpen color="#6C48C5" size={22} />
                        </YStack>
                        <YStack flex={1} marginRight="$2">
                          <Text fontSize={14} fontWeight="700" color="#1e1e2e" numberOfLines={1}>
                            {book.title}
                          </Text>
                          <Text fontSize={12} color="#7c7c8a" numberOfLines={1} marginBottom={2}>
                            {book.author}
                          </Text>
                          <XStack alignItems="center" gap="$2">
                            <YStack backgroundColor="rgba(108, 72, 197, 0.1)" paddingHorizontal="$1.5" paddingVertical={2} borderRadius={6}>
                              <Text fontSize={10} fontWeight="700" color="#6C48C5">
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
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          style={{
                            padding: 8,
                            borderRadius: 10,
                            backgroundColor: '#fef3f2',
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
          <YStack backgroundColor="white" width="100%" maxWidth={400} borderRadius={24} padding="$5" elevation={8}>
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$4">
              <YStack flex={1} marginRight="$3">
                <Text fontSize={18} fontWeight="800" color="#1e1e2e" marginBottom="$1">
                  {selectedFavBook?.title}
                </Text>
                <Text fontSize={13} color="#7c7c8a">
                  By {selectedFavBook?.author}
                </Text>
              </YStack>
              <TouchableOpacity onPress={() => setSelectedFavBook(null)}>
                <View backgroundColor="#f4f1fa" padding="$2" borderRadius={12}>
                  <X color="#6C48C5" size={20} />
                </View>
              </TouchableOpacity>
            </XStack>

            <ScrollView maxHeight={280} showsVerticalScrollIndicator={false}>
              <YStack gap="$2.5" marginBottom="$4">
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#7c7c8a">Genre</Text>
                  <Text fontSize={13} fontWeight="600" color="#1e1e2e">{selectedFavBook?.genre || selectedFavBook?.type || 'N/A'}</Text>
                </XStack>
                {selectedFavBook?.shelf ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#7c7c8a">Shelf</Text>
                    <Text fontSize={13} fontWeight="600" color="#1e1e2e">{selectedFavBook?.shelf}</Text>
                  </XStack>
                ) : null}
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#7c7c8a">Condition</Text>
                  <Text fontSize={13} fontWeight="600" color={selectedFavBook?.condition === 'POOR' ? '#ef4444' : '#10b981'}>{selectedFavBook?.condition || 'GOOD'}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#7c7c8a">Availability</Text>
                  <Text fontSize={13} fontWeight="600" color={selectedFavBook?.available > 0 ? '#10b981' : '#ef4444'}>
                    {selectedFavBook?.available ?? 'N/A'} {selectedFavBook?.total ? `/ ${selectedFavBook.total}` : ''}
                  </Text>
                </XStack>
                {selectedFavBook?.year ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#7c7c8a">Year</Text>
                    <Text fontSize={13} fontWeight="600" color="#1e1e2e">{selectedFavBook?.year}</Text>
                  </XStack>
                ) : null}
                {selectedFavBook?.isbn ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#7c7c8a">ISBN</Text>
                    <Text fontSize={13} fontWeight="600" color="#1e1e2e">{selectedFavBook?.isbn}</Text>
                  </XStack>
                ) : null}
                {selectedFavBook?.lccn ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#7c7c8a">Call No. / LCCN</Text>
                    <Text fontSize={13} fontWeight="600" color="#1e1e2e">{selectedFavBook?.lccn}</Text>
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
                  backgroundColor: '#fef3f2',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#fecaca',
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
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text color="white" fontSize={13} fontWeight="700">Find in Catalog</Text>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
