import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, Smartphone, Zap } from 'lucide-react-native';

export default function ReleaseNotesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <ArrowLeft color="#1e1e2e" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>What's New</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionTitle}>Version 1.1.0</Text>
          <Text style={styles.versionDate}>September 2026</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Sparkles color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>UI Harmonization</Text>
          <Text style={styles.cardBody}>
            We've overhauled the visual design using "The Reading Room" guidelines. Enjoy edge-to-edge layouts, softer colors, larger touch targets, and beautiful Lucide iconography.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Smartphone color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>Dynamic QR & Dock</Text>
          <Text style={styles.cardBody}>
            The floating navigation dock now intelligently hides when you scroll down to maximize screen space. Your ID QR code now automatically refreshes every 30 seconds for enhanced security.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Zap color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>Offline Resilience</Text>
          <Text style={styles.cardBody}>
            Encountering network issues? Our new error handling provides clear feedback and retry buttons instead of failing silently or logging you out incorrectly.
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
    paddingTop: 8,
  },
  versionContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  versionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e1e2e',
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ede9f6',
    padding: 20,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#faf9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1e2e',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c7c8a',
    lineHeight: 22,
  },
});
