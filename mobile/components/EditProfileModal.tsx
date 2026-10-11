import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Calendar,
  Check,
  ArrowLeft,
  Search,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { user, updateUser } = useAuth();
  const { theme, isDarkMode } = useAppTheme();
  const { t } = useLanguage();

  const [modalRendered, setModalRendered] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'programs'>('form');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Programs list
  const [programs, setPrograms] = useState<any[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programSearch, setProgramSearch] = useState('');

  // Animation values for Pop Up Animation
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sync form data whenever user or visible changes
  useEffect(() => {
    if (visible) {
      setEmail(user?.email || '');
      setPassword('');
      setShowPassword(false);
      setProgram(user?.program?.name || '');
      setYearLevel(user?.year_level || '');
      setErrorMessage(null);
      setViewMode('form');
      setModalRendered(true);

      // Trigger Pop Up Entrance Animation
      scaleAnim.setValue(0.75);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Preload programs if empty
      if (programs.length === 0) {
        loadPrograms();
      }
    }
  }, [visible, user]);

  const loadPrograms = async () => {
    setProgramsLoading(true);
    try {
      const res = await api.get('/settings/programs');
      setPrograms(res.data || []);
    } catch (err) {
      console.error('Failed to load programs', err);
    } finally {
      setProgramsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Pop Up Exit Animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalRendered(false);
      onClose();
    });
  };

  const handleSave = async () => {
    if (!email.trim()) {
      setErrorMessage('Email address cannot be empty.');
      return;
    }
    if (password && password.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        email: email.trim(),
        year_level: yearLevel,
        program: program,
      };
      if (password) {
        payload.password = password;
      }

      const res = await api.put('/auth/me', payload);
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      Alert.alert('Profile Updated', 'Your information has been successfully updated.');
      handleDismiss();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const msg = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const yearLevelOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];

  const filteredPrograms = programs.filter(
    (p) =>
      p.name?.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.code?.toLowerCase().includes(programSearch.toLowerCase())
  );

  if (!modalRendered && !visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={modalRendered}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Semi-transparent backdrop with fade animation */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Pop-Up Modal Card with spring scale & fade animation */}
        <Animated.View
          style={[
            styles.popupCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {viewMode === 'form' ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.pillContainer }]}>
                    <UserIcon size={20} color={theme.primary} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                      {t('EditProfile') || 'Edit Profile'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                      {t('EditProfileSubtitle') || 'Update your personal information'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[styles.closeBtn, { backgroundColor: theme.pillContainer }]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* User Info Read-only Pill */}
                <View
                  style={[
                    styles.userBadgeCard,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.badgeName, { color: theme.text }]}>
                      {user?.first_name} {user?.last_name}
                    </Text>
                    <Text style={[styles.badgeSub, { color: theme.textSecondary }]}>
                      ID: {user?.student_id || 'N/A'} • {user?.role || 'STUDENT'}
                    </Text>
                  </View>
                  <View style={[styles.lockChip, { backgroundColor: theme.pillContainer }]}>
                    <ShieldCheck size={14} color={theme.primary} />
                    <Text style={[styles.lockChipText, { color: theme.primary }]}>Verified</Text>
                  </View>
                </View>

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Email Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <Mail size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="user@university.edu"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
                    <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                      (Leave blank to keep)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <Lock size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={theme.textSecondary} />
                      ) : (
                        <Eye size={18} color={theme.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Program / Course Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Course / Program</Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                    onPress={() => setViewMode('programs')}
                    activeOpacity={0.7}
                  >
                    <GraduationCap
                      size={18}
                      color={theme.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.input,
                        { color: program ? theme.text : theme.textSecondary, paddingTop: 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {program || 'Select your degree or program'}
                    </Text>
                    <View style={[styles.changeChip, { backgroundColor: theme.pillContainer }]}>
                      <Text style={[styles.changeChipText, { color: theme.primary }]}>Select</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Year Level Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Year Level</Text>
                  <View style={styles.yearPillsWrap}>
                    {yearLevelOptions.map((opt) => {
                      const isSelected = yearLevel === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => setYearLevel(opt)}
                          style={[
                            styles.yearPill,
                            {
                              backgroundColor: isSelected ? theme.pillActive : theme.background,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.yearPillText,
                              {
                                color: isSelected ? theme.pillTextActive : theme.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {opt}
                          </Text>
                          {isSelected && (
                            <Check
                              size={14}
                              color={theme.pillTextActive}
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                  onPress={handleDismiss}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                    {t('Cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>{t('Save') || 'Save Changes'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Program Selector Sub-view inside the same modal */
            <View style={styles.programsView}>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => setViewMode('form')}
                  style={[styles.closeBtn, { backgroundColor: theme.pillContainer }]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <ArrowLeft size={18} color={theme.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Select Program</Text>
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                    Choose your department/course
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[styles.closeBtn, { backgroundColor: theme.pillContainer }]}
                >
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    marginHorizontal: 16,
                    marginTop: 8,
                    marginBottom: 12,
                  },
                ]}
              >
                <Search size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Search courses..."
                  placeholderTextColor={theme.textSecondary}
                  value={programSearch}
                  onChangeText={setProgramSearch}
                  autoCapitalize="none"
                />
                {programSearch ? (
                  <TouchableOpacity onPress={() => setProgramSearch('')}>
                    <X size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {programsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Loading programs...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.programListScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredPrograms.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        No matching programs found
                      </Text>
                    </View>
                  ) : (
                    filteredPrograms.map((item) => {
                      const isSelected = program === item.name;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.programItem,
                            {
                              backgroundColor: isSelected ? theme.pillContainer : 'transparent',
                              borderBottomColor: theme.border,
                            },
                          ]}
                          onPress={() => {
                            setProgram(item.name);
                            setViewMode('form');
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={[
                                styles.programName,
                                {
                                  color: isSelected ? theme.primary : theme.text,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.code ? (
                              <Text
                                style={[styles.programCode, { color: theme.textSecondary }]}
                              >
                                {item.code}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected && <Check size={18} color={theme.primary} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  popupCard: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  userBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  lockChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  changeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  yearPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  yearPillText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6C48C5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C48C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  programsView: {
    maxHeight: 460,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  programListScroll: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 10,
  },
  programName: {
    fontSize: 14,
  },
  programCode: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
