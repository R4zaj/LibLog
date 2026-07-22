import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Book, Clock, RotateCcw } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import api from '../../api';

export default function Borrowed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [borrows, setBorrows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBorrows();
      }
    }, [user])
  );

  const fetchBorrows = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/borrowing/user/${user?.id}/history`);
      setBorrows(res.data || []);
    } catch (e) {
      console.log('Failed to fetch borrows', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeBorrows = borrows.filter(b => b.status === 'BORROWED' || b.status === 'OVERDUE');
  const historyBorrows = borrows.filter(b => b.status === 'RETURNED');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Borrowing</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active ({activeBorrows.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History ({historyBorrows.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.dot, { backgroundColor: '#6C48C5' }]} />
            <Text style={styles.summaryText}>{activeBorrows.length} Active</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.summaryText}>{historyBorrows.length} Returned</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#6C48C5" style={{ marginTop: 40 }} />
        ) : (
          (activeTab === 'active' ? activeBorrows : historyBorrows).map((record: any, index: number) => {
            const isOverdue = record.status === 'OVERDUE';
            const isReturned = record.status === 'RETURNED';
            const dueDateStr = new Date(record.due_date).toLocaleDateString();
            const borrowDateStr = new Date(record.borrow_date).toLocaleDateString();
            const daysLeft = Math.ceil((new Date(record.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

            return (
              <View key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.bookCover}><Book color="#fff" size={24} opacity={0.5} /></View>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{record.book?.title}</Text>
                    <Text style={styles.bookAuthor}>{record.book?.author?.name || 'Unknown Author'}</Text>
                    <Text style={styles.dates}>Borrowed: {borrowDateStr}   Due: {dueDateStr}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  {isReturned ? (
                    <View style={styles.daysLeftBadge}>
                      <Clock color="#166534" size={12} style={{ marginRight: 4 }} />
                      <Text style={styles.daysLeftText}>Returned</Text>
                    </View>
                  ) : (
                    <View style={[styles.daysLeftBadge, isOverdue ? {backgroundColor: '#fee2e2'} : {}]}>
                      <Clock color={isOverdue ? "#991b1b" : "#166534"} size={12} style={{ marginRight: 4 }} />
                      <Text style={[styles.daysLeftText, isOverdue ? {color: '#991b1b'} : {}]}>
                        {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                      </Text>
                    </View>
                  )}
                  {!isReturned && (
                    <TouchableOpacity style={styles.actionButton}>
                      <RotateCcw color="#6C48C5" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.actionButtonText}>Return</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        
        {!isLoading && (activeTab === 'active' ? activeBorrows : historyBorrows).length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#9ca3af', fontSize: 16 }}>No records found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6', marginHorizontal: 4 },
  activeTab: { backgroundColor: '#f3e8ff' },
  tabText: { color: '#6b7280', fontWeight: 'bold' },
  activeTabText: { color: '#6C48C5' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', marginBottom: 20 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  summaryText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#c084fc' },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  bookCover: { width: 60, height: 80, backgroundColor: '#1e3a8a', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  dates: { fontSize: 12, color: '#9ca3af' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  daysLeftBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  daysLeftText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  actionButtonText: { color: '#6C48C5', fontWeight: 'bold', fontSize: 14 },
});
