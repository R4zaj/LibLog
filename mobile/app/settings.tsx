import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, RefreshCw, MessageSquare, ArrowLeft } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const [appearance, setAppearance] = useState<'System' | 'Light' | 'Dark'>('System');
  const [language, setLanguage] = useState<'English' | 'Filipino'>('English');
  const [isUpdating, setIsUpdating] = useState(false);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const handleUpdateCheck = () => {
    setIsUpdating(true);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    setTimeout(() => {
      spinValue.stopAnimation();
      spinValue.setValue(0);
      setIsUpdating(false);
    }, 2000);
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const renderSegmentedPill = (options: string[], selected: string, onSelect: (val: any) => void) => (
    <View style={styles.pillContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.pillBtn, selected === opt && styles.pillBtnActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, selected === opt && styles.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <ArrowLeft color="#1e1e2e" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Appearance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.cardSubtitle}>Match your device or switch between modes</Text>
          {renderSegmentedPill(['System', 'Light', 'Dark'], appearance, setAppearance)}
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Language</Text>
          {renderSegmentedPill(['English', 'Filipino'], language, setLanguage)}
        </View>

        {/* Help & Support */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Help & Support</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/help')}>
            <Text style={styles.rowText}>How to use the App</Text>
            <ChevronRight color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <TouchableOpacity style={styles.row} onPress={handleUpdateCheck} disabled={isUpdating}>
            <Text style={styles.rowText}>Check for updates</Text>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={isUpdating ? "#6C48C5" : "#9ca3af"} size={20} />
            </Animated.View>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/release-notes')}>
            <Text style={styles.rowText}>What's new</Text>
            <ChevronRight color="#9ca3af" size={20} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowText}>Send feedback</Text>
            <MessageSquare color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>

        {/* Privacy Notice */}
        <View style={[styles.card, styles.privacyCard]}>
          <Text style={styles.cardTitle}>Privacy Notice</Text>
          <Text style={styles.privacyText}>
            CCC LIB APP values your privacy. Your data is used exclusively for library operations, attendance tracking, and borrowing logistics.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fe',
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
    fontWeight: '800',
    color: '#1e1e2e',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ede9f6',
    padding: 16,
    marginBottom: 16,
  },
  privacyCard: {
    backgroundColor: '#faf9fe',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e1e2e',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#7c7c8a',
    marginBottom: 16,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#f4f1fa',
    borderRadius: 16,
    padding: 4,
    marginTop: 8,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  pillBtnActive: {
    backgroundColor: '#6C48C5',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c7c8a',
  },
  pillTextActive: {
    color: '#ffffff',
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
    color: '#1e1e2e',
  },
  separator: {
    height: 1,
    backgroundColor: '#f4f1fa',
    marginVertical: 4,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c7c8a',
    lineHeight: 20,
    marginTop: 8,
  }
});
