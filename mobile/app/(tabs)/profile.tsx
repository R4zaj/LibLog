import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Modal, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, MapPin, Flame, Edit, Heart, Bookmark, Bell, Shield, HelpCircle, Info, LogOut, ChevronRight, Clock, QrCode, X, Megaphone } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import api from '../../api';

const { width } = Dimensions.get('window');

export default function Profile() {
  const { user, signOut, updateUser } = useAuth();
  const router = useRouter();
  const [qrVisible, setQrVisible] = React.useState(false);
  const [qrToken, setQrToken] = React.useState('');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [createAnnouncementVisible, setCreateAnnouncementVisible] = React.useState(false);
  const [announcementForm, setAnnouncementForm] = React.useState({ title: '', body: '', priority: 'NORMAL', is_active: true });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (qrVisible) {
      const fetchToken = async () => {
        try {
          const res = await api.get('/auth/qr-token');
          setQrToken(res.data.token);
        } catch (e) {
          console.error('Failed to get QR token', e);
        }
      };
      fetchToken(); // Initial fetch
      interval = setInterval(fetchToken, 25000); // Refresh every 25s
    }
    return () => clearInterval(interval);
  }, [qrVisible]);

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
      api.get('/settings/programs')
        .then(res => setPrograms(res.data))
        .catch(err => console.error('Failed to fetch programs', err));
    }
  }, [editProfileVisible]);

  const [editProfileForm, setEditProfileForm] = React.useState({
    email: user?.email || '',
    password: '',
    program: user?.program?.name || '',
    year_level: user?.year_level || ''
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header Background */}
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.first_name?.[0] || 'J'}{user?.last_name?.[0] || 'D'}</Text>
          </View>
          <Text style={styles.name}>{user?.first_name || 'Juan'} {user?.last_name || 'Dela Cruz'}</Text>
          <Text style={styles.email}>✉ {user?.email || 'user@university.edu'}</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>{user?.role || 'Student'}</Text>
            </View>
            <Text style={styles.programText}>🎓 {user?.program?.name || 'Computer Science'}</Text>
          </View>
          <Text style={styles.idText}>ID: {user?.student_id || 'CCC-0000'}</Text>
          
          <TouchableOpacity style={styles.qrButton} onPress={() => setQrVisible(true)}>
            <QrCode color="#fff" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.qrButtonText}>Show ID QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={qrVisible}
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setQrVisible(false)}>
              <X color="#6b7280" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Your Library ID</Text>
            <Text style={styles.modalSubtitle}>Scan at the entrance or front desk</Text>
            <View style={styles.qrCodeBox}>
              <QRCode
                value={qrToken || 'Loading...'}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.modalIdText}>{user?.student_id}</Text>
          </View>
        </View>
      </Modal>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: '#f3e8ff' }]}><BookOpen color="#6C48C5" size={20} /></View>
          <Text style={styles.statNum}>3</Text>
          <Text style={styles.statLabel}>Borrowed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: '#ecfdf5' }]}><MapPin color="#10b981" size={20} /></View>
          <Text style={styles.statNum}>2</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: '#fff7ed' }]}><Flame color="#f97316" size={20} /></View>
          <Text style={styles.statNum}>5</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <View style={styles.contentPadding}>
        {/* Favorite Books */}
        <View style={styles.card}>
          <View style={styles.favRow}>
            <View style={[styles.iconBg, { backgroundColor: '#fee2e2', marginRight: 12, width: 36, height: 36, borderRadius: 18 }]}><Heart color="#ef4444" size={18} fill="#ef4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Favorite Books</Text>
              <Text style={styles.cardSubtitle}>0 books saved to your collection</Text>
            </View>
            <ChevronRight color="#d1d5db" size={20} />
          </View>
        </View>

        {/* Member since */}
        <View style={styles.memberSince}>
          <Clock color="#6C48C5" size={16} style={{ marginRight: 8 }} />
          <Text style={styles.memberSinceText}>Member since April 2026</Text>
        </View>

        {/* Menu Actions */}
        <View style={styles.menuContainer}>
          {[
            { id: 1, title: 'Edit Profile', sub: 'Update your information', icon: Edit, color: '#6C48C5', bg: '#f3e8ff', action: () => setEditProfileVisible(true) },
            { id: 2, title: 'My Favorites', sub: '0 saved books', icon: Heart, color: '#ef4444', bg: '#fee2e2', action: () => router.push('/search') },
            { id: 4, title: 'Notification Preferences', sub: 'Due dates, reservations', icon: Bell, color: '#6C48C5', bg: '#f3e8ff', action: () => Alert.alert('Notifications', 'Preferences coming soon.') },
            { id: 5, title: 'Privacy Policy', sub: 'How we protect your data', icon: Shield, color: '#6C48C5', bg: '#f3e8ff', action: () => Alert.alert('Privacy Policy', 'Privacy policy text goes here.') },
            { id: 6, title: 'Help & Support', sub: 'FAQs and contact info', icon: HelpCircle, color: '#6C48C5', bg: '#f3e8ff', action: () => Alert.alert('Help & Support', 'Contact admin@university.edu for support.') },
            { id: 7, title: 'About', sub: 'Version 1.0.0', icon: Info, color: '#6C48C5', bg: '#f3e8ff', action: () => Alert.alert('About', 'LibLog Version 1.0.0') },
            ...(user?.role === 'ADMIN' ? [{ id: 8, title: 'Create Announcement', sub: 'Broadcast to all users', icon: Megaphone, color: '#fff', bg: '#6C48C5', action: () => setCreateAnnouncementVisible(true) }] : []),
          ].map(item => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.action}>
              <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                <item.icon color={item.color} size={20} />
              </View>
              <View style={styles.menuTextCont}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <ChevronRight color="#d1d5db" size={20} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </View>

      {/* Create Announcement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createAnnouncementVisible}
        onRequestClose={() => setCreateAnnouncementVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setCreateAnnouncementVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Title</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Library closed on holiday" 
                value={announcementForm.title}
                onChangeText={(text) => setAnnouncementForm({...announcementForm, title: text})}
              />
              
              <Text style={styles.label}>Body</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Announcement details..." 
                multiline
                value={announcementForm.body}
                onChangeText={(text) => setAnnouncementForm({...announcementForm, body: text})}
              />
              
              <View style={styles.switchRow}>
                <Text style={styles.label}>Active immediately</Text>
                <Switch 
                  value={announcementForm.is_active}
                  onValueChange={(val) => setAnnouncementForm({...announcementForm, is_active: val})}
                  trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
                  thumbColor={announcementForm.is_active ? '#6C48C5' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleCreateAnnouncement}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryBtnText}>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editProfileVisible}
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Email</Text>
              <TextInput 
                style={styles.input} 
                placeholder="New email" 
                value={editProfileForm.email}
                onChangeText={(text) => setEditProfileForm({...editProfileForm, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Text style={styles.label}>New Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Leave blank to keep current" 
                value={editProfileForm.password}
                onChangeText={(text) => setEditProfileForm({...editProfileForm, password: text})}
                secureTextEntry
              />
              
              <Text style={styles.label}>Course / Program</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center' }]} 
                onPress={() => setProgramModalVisible(true)}
              >
                <Text style={{ color: editProfileForm.program ? '#000' : '#9ca3af' }}>
                  {editProfileForm.program || "Select a course"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Year Level</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. 1st Year" 
                value={editProfileForm.year_level}
                onChangeText={(text) => setEditProfileForm({...editProfileForm, year_level: text})}
              />

              <TouchableOpacity 
                style={[styles.primaryBtn, isEditingProfile && { opacity: 0.7 }, { marginTop: 8 }]} 
                onPress={handleEditProfile}
                disabled={isEditingProfile}
              >
                <Text style={styles.primaryBtnText}>{isEditingProfile ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Program Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={programModalVisible}
        onRequestClose={() => setProgramModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setProgramModalVisible(false)}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 10, width: '100%' }} showsVerticalScrollIndicator={false}>
              {programs.map((prog, idx) => (
                <TouchableOpacity 
                  key={prog.id} 
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', width: '100%' }}
                  onPress={() => {
                    setEditProfileForm({...editProfileForm, program: prog.name});
                    setProgramModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#374151', fontWeight: '500' }}>{prog.name}</Text>
                  <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{prog.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  headerBg: { backgroundColor: '#a855f7', paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { alignItems: 'center', paddingHorizontal: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: '#e9d5ff', marginBottom: 12 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  roleTag: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginRight: 8 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  programText: { color: '#e9d5ff', fontSize: 12 },
  idText: { color: '#e9d5ff', fontSize: 12, opacity: 0.8, marginBottom: 12 },
  qrButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  qrButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  modalBody: { width: '100%' },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  qrCodeBox: { padding: 16, backgroundColor: '#fff', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  modalIdText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: '#6C48C5', letterSpacing: 1 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  primaryBtn: { backgroundColor: '#6C48C5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  statsCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -30, borderRadius: 16, flexDirection: 'row', paddingVertical: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  statItem: { flex: 1, alignItems: 'center' },
  statIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6b7280' },
  statDivider: { width: 1, height: '60%', backgroundColor: '#f3f4f6', alignSelf: 'center' },

  contentPadding: { paddingHorizontal: 16, paddingTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#6b7280' },

  iconBg: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  favRow: { flexDirection: 'row', alignItems: 'center' },
  
  memberSince: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfaff', padding: 12, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#f3e8ff' },
  memberSinceText: { color: '#6C48C5', fontSize: 13 },

  menuContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 8, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuTextCont: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#9ca3af' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
});
