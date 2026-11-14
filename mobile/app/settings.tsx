import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronRight, RefreshCw, MessageSquare, ArrowLeft, User, Edit } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { EditProfileModal } from '../components/EditProfileModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { appearance, setAppearance, theme } = useAppTheme();
  
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const handleUpdateCheck = async () => {
    setIsUpdating(true);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    try {
      if (__DEV__) {
        setTimeout(() => {
          Alert.alert(
            'Development Mode',
            'Over-the-air updates are disabled in development builds. They work automatically in release/preview builds via EAS Update.'
          );
        }, 1200);
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new update is available. Would you like to download and install it now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Ready',
                    'The update has been downloaded. The app will restart now to apply it.',
                    [{ text: 'Restart', onPress: () => Updates.reloadAsync() }]
                  );
                } catch (e: any) {
                  Alert.alert('Update Failed', e?.message || 'Could not download update.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are already running the latest version of the app.');
      }
    } catch (e: any) {
      Alert.alert('Update Check', e?.message || 'Could not reach update service.');
    } finally {
      setTimeout(() => {
        spinValue.stopAnimation();
        spinValue.setValue(0);
        setIsUpdating(false);
      }, 1000);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const renderSegmentedPill = (options: {label: string, value: string}[], selected: string, onSelect: (val: any) => void) => (
    <View style={[styles.pillContainer, { backgroundColor: theme.pillContainer }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.pillBtn, 
            selected === opt.value && { backgroundColor: theme.pillActive }
          ]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.pillText,
            { color: theme.pillText },
            selected === opt.value && { color: theme.pillTextActive }
          ]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('Settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Account / Edit Profile */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('Account')}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{t('AccountSubtitle')}</Text>
          <TouchableOpacity 
            style={[styles.profileCardRow, { backgroundColor: theme.background, borderColor: theme.border }]} 
            onPress={() => setEditProfileVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarBox, { backgroundColor: '#6C48C5' }]}>
              <Text style={styles.avatarText}>
                {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || ''}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
                {user?.first_name || 'User'} {user?.last_name || ''}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                {user?.email || 'Tap to edit profile'}
              </Text>
            </View>
            <View style={[styles.editBadge, { backgroundColor: theme.pillContainer }]}>
              <Edit color={theme.primary} size={14} style={{ marginRight: 4 }} />
              <Text style={[styles.editBadgeText, { color: theme.primary }]}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('Appearance')}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{t('AppearanceSubtitle')}</Text>
          {renderSegmentedPill([
            {label: t('System'), value: 'System'},
            {label: t('Light'), value: 'Light'},
            {label: t('Dark'), value: 'Dark'}
          ], appearance, setAppearance)}
        </View>

        {/* Language */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('Language')}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{t('LanguageSubtitle')}</Text>
          {renderSegmentedPill([
            {label: 'English', value: 'English'},
            {label: 'Filipino', value: 'Filipino'}
          ], language, setLanguage)}
        </View>

        {/* Help & Support */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('HelpSupport')}</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/help')}>
            <Text style={[styles.rowText, { color: theme.text }]}>{t('HowToUse')}</Text>
            <ChevronRight color={theme.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('About')}</Text>
          <TouchableOpacity style={styles.row} onPress={handleUpdateCheck} disabled={isUpdating}>
            <Text style={[styles.rowText, { color: theme.text }]}>{t('CheckUpdates')}</Text>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={isUpdating ? theme.pillActive : theme.textSecondary} size={20} />
            </Animated.View>
          </TouchableOpacity>
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/release-notes')}>
            <Text style={[styles.rowText, { color: theme.text }]}>{t('WhatsNew')}</Text>
            <ChevronRight color={theme.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <TouchableOpacity style={styles.row}>
            <Text style={[styles.rowText, { color: theme.text }]}>{t('SendFeedback')}</Text>
            <MessageSquare color={theme.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Privacy Notice */}
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('PrivacyNotice')}</Text>
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            {t('PrivacyText')}
          </Text>
        </View>

      </ScrollView>

      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  profileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginTop: 8,
  },
  pillBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 48,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 8,
  }
});
