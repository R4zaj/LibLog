import React from 'react';
import { TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen, MapPin, Flame, Edit, Heart, Bell, Shield, HelpCircle, Info, LogOut, ChevronRight, Clock, QrCode, X, Megaphone,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { YStack, XStack, Text, ScrollView, View, Separator } from 'tamagui';
import api from '../../api';

export default function Profile() {
  const { user, signOut, updateUser } = useAuth();
  const router = useRouter();
  const [qrVisible, setQrVisible] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
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

  React.useEffect(() => {
    if (editProfileVisible && programs.length === 0) {
      api
        .get('/settings/programs')
        .then((res) => setPrograms(res.data))
        .catch((err) => console.error('Failed to fetch programs', err));
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
    { id: 1, title: 'Edit Profile', sub: 'Update your information', icon: Edit, color: '#6C48C5', bg: '#faf5ff', action: () => setEditProfileVisible(true) },
    { id: 2, title: 'My Favorites', sub: '0 saved books', icon: Heart, color: '#ef4444', bg: '#fef2f2', action: () => router.push('/search') },
    { id: 5, title: 'Privacy Policy', sub: 'How we protect your data', icon: Shield, color: '#6C48C5', bg: '#faf5ff', action: () => setInfoModal({ visible: true, title: 'Privacy Policy', content: 'LibLog values your privacy. We collect only the necessary data to manage your library account securely. We do not sell or share your data with third parties.' }) },
    { id: 6, title: 'Help & Support', sub: 'FAQs and contact info', icon: HelpCircle, color: '#6C48C5', bg: '#faf5ff', action: () => setInfoModal({ visible: true, title: 'Help & Support', content: 'For assistance, please contact the library administration at admin@university.edu or visit the front desk.' }) },
    { id: 7, title: 'About', sub: 'Version 1.0.0', icon: Info, color: '#6C48C5', bg: '#faf5ff', action: () => setInfoModal({ visible: true, title: 'About', content: 'LibLog Mobile Version 1.0.0\nDeveloped by the CCC Library Team.' }) },
    ...(user?.role === 'ADMIN'
      ? [{ id: 8, title: 'Create Announcement', sub: 'Broadcast to all users', icon: Megaphone, color: '#fff', bg: '#6C48C5', action: () => setCreateAnnouncementVisible(true) }]
      : []),
  ];

  return (
    <ScrollView backgroundColor="#f4f1fa" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* ── Header ── */}
      <YStack backgroundColor="#6C48C5" paddingTop={60} paddingBottom={44} borderBottomLeftRadius={32} borderBottomRightRadius={32} alignItems="center" paddingHorizontal="$4">
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="rgba(255,255,255,0.2)"
          justifyContent="center"
          alignItems="center"
          marginBottom="$3"
        >
          <Text fontSize={28} color="white" fontWeight="800">
            {user?.first_name?.[0] || 'J'}
            {user?.last_name?.[0] || 'D'}
          </Text>
        </YStack>

        <Text fontSize={22} fontWeight="800" color="white" marginBottom="$1">
          {user?.first_name || 'Juan'} {user?.last_name || 'Dela Cruz'}
        </Text>
        <Text fontSize={13} color="#e0d4f7" marginBottom="$3">
          ✉ {user?.email || 'user@university.edu'}
        </Text>

        <XStack alignItems="center" marginBottom="$2" gap="$2">
          <YStack backgroundColor="rgba(255,255,255,0.2)" paddingHorizontal="$3" paddingVertical="$1" borderRadius={12}>
            <Text color="white" fontSize={11} fontWeight="700">
              {user?.role || 'Student'}
            </Text>
          </YStack>
          <Text color="#e0d4f7" fontSize={12}>
            🎓 {user?.program?.name || 'Computer Science'}
          </Text>
        </XStack>

        <Text color="#e0d4f7" fontSize={12} opacity={0.8} marginBottom="$3">
          ID: {user?.student_id || 'CCC-0000'}
        </Text>

        <TouchableOpacity
          onPress={() => setQrVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingHorizontal: 18,
            paddingVertical: 9,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <QrCode color="#fff" size={16} style={{ marginRight: 7 }} />
          <Text color="white" fontSize={13} fontWeight="700">
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
              <QRCode value={user?.student_id || 'Loading...'} size={200} color="#1e1e2e" backgroundColor="transparent" />
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
        marginTop={-28}
        borderRadius={20}
        paddingVertical="$4"
        borderWidth={1}
        borderColor="#f0eef5"
        shadowColor="rgba(108, 72, 197, 0.1)"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={1}
        shadowRadius={12}
        elevation={4}
      >
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#faf5ff" justifyContent="center" alignItems="center" marginBottom="$2">
            <BookOpen color="#6C48C5" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>3</Text>
          <Text fontSize={11} color="#9ca3af">Borrowed</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#ecfdf5" justifyContent="center" alignItems="center" marginBottom="$2">
            <MapPin color="#10b981" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>2</Text>
          <Text fontSize={11} color="#9ca3af">Visits</Text>
        </YStack>
        <View width={1} height="60%" backgroundColor="#f0eef5" alignSelf="center" />
        <YStack flex={1} alignItems="center">
          <YStack width={40} height={40} borderRadius={14} backgroundColor="#fff7ed" justifyContent="center" alignItems="center" marginBottom="$2">
            <Flame color="#f97316" size={20} />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom={2}>5</Text>
          <Text fontSize={11} color="#9ca3af">Streak</Text>
        </YStack>
      </XStack>

      <YStack paddingHorizontal="$5" paddingTop="$5">
        {/* Favorites Card */}
        <TouchableOpacity onPress={() => router.push('/search')}>
          <XStack
            backgroundColor="white"
            borderRadius={16}
            padding="$4"
            marginBottom="$4"
            borderWidth={1}
            borderColor="#f0eef5"
            alignItems="center"
          >
            <YStack width={40} height={40} borderRadius={14} backgroundColor="#fef2f2" justifyContent="center" alignItems="center" marginRight="$3">
              <Heart color="#ef4444" size={18} fill="#ef4444" />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="700" color="#1e1e2e" marginBottom={2}>
                Favorite Books
              </Text>
              <Text fontSize={12} color="#9ca3af">
                0 books saved to your collection
              </Text>
            </YStack>
            <ChevronRight color="#d1d5db" size={20} />
          </XStack>
        </TouchableOpacity>

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
            Member since April 2026
          </Text>
        </XStack>

        {/* Menu */}
        <YStack backgroundColor="white" borderRadius={20} padding="$2" marginBottom="$5" borderWidth={1} borderColor="#f0eef5">
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity onPress={item.action}>
                <XStack alignItems="center" padding="$3">
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
                  <ChevronRight color="#d1d5db" size={18} />
                </XStack>
              </TouchableOpacity>
              {idx < menuItems.length - 1 && (
                <View marginHorizontal="$3" height={1} backgroundColor="#e5e7eb" />
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
            backgroundColor: '#fef2f2',
          }}
        >
          <LogOut color="#ef4444" size={20} style={{ marginRight: 8 }} />
          <Text color="#ef4444" fontSize={15} fontWeight="700">
            Log Out
          </Text>
        </TouchableOpacity>
      </YStack>

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

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">Title</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="e.g. Library closed on holiday"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, title: text })}
            />

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">Body</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16, height: 100, textAlignVertical: 'top' }}
              placeholder="Announcement details..."
              multiline
              value={announcementForm.body}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, body: text })}
            />

            <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
              <Text fontSize={14} fontWeight="700" color="#374151">Active immediately</Text>
              <Switch
                value={announcementForm.is_active}
                onValueChange={(val) => setAnnouncementForm({ ...announcementForm, is_active: val })}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
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

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">Email</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="New email"
              value={editProfileForm.email}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">New Password</Text>
            <TextInput
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 }}
              placeholder="Leave blank to keep current"
              value={editProfileForm.password}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, password: text })}
              secureTextEntry
            />

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">Course / Program</Text>
            <TouchableOpacity
              onPress={() => setProgramModalVisible(true)}
              style={{ backgroundColor: '#faf9fe', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 12, padding: 12, marginBottom: 16, justifyContent: 'center' }}
            >
              <Text style={{ color: editProfileForm.program ? '#1e1e2e' : '#9ca3af', fontSize: 14 }}>
                {editProfileForm.program || 'Select a course'}
              </Text>
            </TouchableOpacity>

            <Text fontSize={14} fontWeight="700" color="#374151" marginBottom="$1.5">Year Level</Text>
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
    </ScrollView>
  );
}
