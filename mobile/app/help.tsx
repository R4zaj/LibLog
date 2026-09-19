import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Info, QrCode } from 'lucide-react-native';

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <ArrowLeft color="#1e1e2e" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Guide</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <QrCode color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>Library Entry</Text>
          <Text style={styles.cardBody}>
            Tap your avatar in the top right corner of the dashboard to view your unique Library ID QR code. Scan this code at the entrance or front desk to check in.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <BookOpen color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>Borrowing Books</Text>
          <Text style={styles.cardBody}>
            Use the Search tab to find available literature. You can favorite books or check their real-time availability. To borrow, present the book and your ID QR code to the librarian.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Info color="#6C48C5" size={24} />
          </View>
          <Text style={styles.cardTitle}>Due Dates</Text>
          <Text style={styles.cardBody}>
            Monitor your "Due Soon" items on the dashboard. Overdue books will incur a penalty, which is reflected in your History feed. Return books by tapping "Return at the library" to open your QR scanner.
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
