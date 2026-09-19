import React, { useState, useCallback } from 'react';
import { TouchableOpacity, ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Book, ChevronRight, Clock, Info } from 'lucide-react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../api';
import type { BorrowRecordWithBook } from '../../types/api';

export default function Borrowed() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [borrows, setBorrows] = useState<BorrowRecordWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchBorrows = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<BorrowRecordWithBook[]>(`/borrowing/user/${user?.id}/history`);
      setBorrows(res.data || []);
      setFetchError(false);
    } catch (e) {
      console.error('Failed to fetch borrows', e);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBorrows();
      }
    }, [user, fetchBorrows])
  );

  const now = new Date();
  // Same daysLeft formula index.tsx's dashboard preview uses (Math.ceil, negative once
  // overdue) — this screen previously used a different cutoff and could disagree with the
  // dashboard about whether the same record was "Due Today" or "Overdue".
  const daysLeftFor = (dueDate: string) =>
    Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const activeBorrows = borrows.filter((b) => b.status === 'BORROWED' || b.status === 'OVERDUE');
  const historyBorrows = borrows.filter((b) => b.status === 'RETURNED');
  const overdueCount = activeBorrows.filter(
    (b) => b.status === 'OVERDUE' || (b.due_date && daysLeftFor(b.due_date) < 0)
  ).length;

  const currentList = activeTab === 'active' ? activeBorrows : historyBorrows;

  const renderItem: ListRenderItem<BorrowRecordWithBook> = ({ item: record }) => {
    const isReturned = record.status === 'RETURNED';
    const daysLeft = daysLeftFor(record.due_date);
    const isOverdue = !isReturned && (record.status === 'OVERDUE' || daysLeft < 0);
    const isDueSoon = !isReturned && !isOverdue && (daysLeft === 0 || daysLeft === 1);
    const dueDateStr = new Date(record.due_date).toLocaleDateString();
    const borrowDateStr = new Date(record.borrow_date).toLocaleDateString();

    return (
      <YStack
        backgroundColor={isOverdue ? '#fef2f2' : 'white'}
        borderRadius={24}
        padding={16}
        marginBottom={12}
        borderWidth={1}
        borderColor={isOverdue ? '#fca5a5' : '#ede9f6'}
      >
        {/* Book Info */}
        <XStack marginBottom="$3">
          <YStack
            width={52}
            height={68}
            backgroundColor={isOverdue ? '#ef4444' : '#faf9fe'}
            borderRadius={10}
            justifyContent="center"
            alignItems="center"
            marginRight="$3"
          >
            <Book color={isOverdue ? '#fff' : '#6C48C5'} size={22} opacity={isOverdue ? 0.95 : 0.8} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="600" color={isOverdue ? '#991b1b' : '#1e1e2e'} marginBottom={3}>
              {record.book?.title}
            </Text>
            <Text fontSize={14} fontWeight="500" color={isOverdue ? '#b91c1c' : '#7c7c8a'} marginBottom="$2">
              {record.book?.author?.name || 'Unknown Author'}
            </Text>
            <Text fontSize={12} fontWeight="500" color="#7c7c8a">
              Borrowed: {borrowDateStr}  ·  <Text fontSize={12} color={isOverdue ? '#dc2626' : '#7c7c8a'} fontWeight={isOverdue ? '700' : '500'}>Due: {dueDateStr}</Text>
            </Text>
          </YStack>
        </XStack>

        {/* Footer */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingTop="$3"
          borderTopWidth={1}
          borderTopColor={isOverdue ? '#fee2e2' : '#f0eef5'}
        >
          {isReturned ? (
            <XStack
              alignItems="center"
              backgroundColor="#ecfdf5"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius={10}
            >
              <Clock color="#10b981" size={12} style={{ marginRight: 5 }} />
              <Text color="#10b981" fontWeight="700" fontSize={12}>
                Returned
              </Text>
            </XStack>
          ) : isOverdue ? (
            <XStack
              alignItems="center"
              backgroundColor="#fee2e2"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius={10}
              borderWidth={1}
              borderColor="#fca5a5"
            >
              <AlertCircle color="#dc2626" size={13} style={{ marginRight: 5 }} />
              <Text color="#dc2626" fontWeight="700" fontSize={12}>
                Overdue by {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''}
              </Text>
            </XStack>
          ) : isDueSoon ? (
            <XStack
              alignItems="center"
              backgroundColor="#fffbeb"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius={10}
              borderWidth={1}
              borderColor="#fde68a"
            >
              <Clock color="#b45309" size={12} style={{ marginRight: 5 }} />
              <Text color="#b45309" fontWeight="700" fontSize={12}>
                {daysLeft === 0 ? 'Due Today' : 'Due Tomorrow'}
              </Text>
            </XStack>
          ) : (
            <XStack
              alignItems="center"
              backgroundColor="#ecfdf5"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius={10}
            >
              <Clock color="#10b981" size={12} style={{ marginRight: 5 }} />
              <Text color="#10b981" fontWeight="700" fontSize={12}>
                {daysLeft} days left
              </Text>
            </XStack>
          )}

          {!isReturned && (
            <TouchableOpacity
              onPress={() => router.push('/scan')}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              accessibilityRole="button"
              accessibilityLabel="Return at the library — open your scan code"
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}
            >
              <Info color="#9ca3af" size={13} style={{ marginRight: 5 }} />
              <Text color="#9ca3af" fontWeight="500" fontSize={12}>
                Return at the library
              </Text>
              <ChevronRight color="#9ca3af" size={13} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </XStack>
      </YStack>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f1fa' }}>
      {/* Header */}
      <YStack paddingTop="$4" paddingHorizontal="$5" paddingBottom="$4" backgroundColor="white">
        <Text fontSize={24} fontWeight="800" color="#1e1e2e" marginBottom="$3">
          Borrowing
        </Text>

        {/* Tab Switcher */}
        <XStack backgroundColor="#f4f1fa" borderRadius={9999} padding={4} minHeight={48}>
          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: activeTab === 'active' ? '#6C48C5' : 'transparent',
            }}
          >
            <Text color={activeTab === 'active' ? 'white' : '#7c7c8a'} fontWeight="700" fontSize={14}>
              Active ({activeBorrows.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: activeTab === 'history' ? '#6C48C5' : 'transparent',
            }}
          >
            <Text color={activeTab === 'history' ? 'white' : '#7c7c8a'} fontWeight="700" fontSize={14}>
              History ({historyBorrows.length})
            </Text>
          </TouchableOpacity>
        </XStack>
      </YStack>

      <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 98 }}
        onRefresh={fetchBorrows}
        refreshing={isLoading && borrows.length > 0}
        ListHeaderComponent={
          <XStack marginBottom={16} gap={8} flexWrap="wrap">
            <XStack alignItems="center" backgroundColor="#faf9fe" paddingHorizontal={12} paddingVertical={6} borderRadius={9999} borderWidth={1} borderColor="#ede9f6">
              <View width={8} height={8} borderRadius={4} backgroundColor="#6C48C5" marginRight="$2" />
              <Text color="#4b5563" fontSize={13} fontWeight="600">
                {activeBorrows.length} Active
              </Text>
            </XStack>
            {overdueCount > 0 && (
              <XStack alignItems="center" backgroundColor="#fef2f2" paddingHorizontal={12} paddingVertical={6} borderRadius={9999} borderWidth={1} borderColor="#fca5a5">
                <View width={8} height={8} borderRadius={4} backgroundColor="#ef4444" marginRight="$2" />
                <Text color="#b91c1c" fontSize={13} fontWeight="700">
                  {overdueCount} Due
                </Text>
              </XStack>
            )}
            <XStack alignItems="center" backgroundColor="#ecfdf5" paddingHorizontal={12} paddingVertical={6} borderRadius={9999} borderWidth={1} borderColor="#6ee7b7">
              <View width={8} height={8} borderRadius={4} backgroundColor="#10b981" marginRight="$2" />
              <Text color="#047857" fontSize={13} fontWeight="600">
                {historyBorrows.length} Returned
              </Text>
            </XStack>
          </XStack>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#6C48C5" style={{ marginTop: 40 }} />
          ) : fetchError ? (
            <YStack
              backgroundColor="#fef3f2"
              borderRadius={16}
              padding="$6"
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="#fecaca"
              marginTop="$4"
              gap="$2"
            >
              <AlertCircle color="#dc2626" size={28} />
              <Text color="#b91c1c" fontSize={14} fontWeight="500" textAlign="center">
                Couldn't load your borrows
              </Text>
              <TouchableOpacity
                onPress={fetchBorrows}
                hitSlop={{ top: 15, bottom: 15, left: 16, right: 16 }}
                style={{ paddingVertical: 12, paddingHorizontal: 8 }}
              >
                <Text fontSize={12} color="#6C48C5" fontWeight="700">
                  Tap to retry
                </Text>
              </TouchableOpacity>
            </YStack>
          ) : (
            <YStack
              backgroundColor="white"
              borderRadius={16}
              padding="$6"
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="#f0eef5"
              marginTop="$4"
            >
              <Book color="#9ca3af" size={36} strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <Text color="#9ca3af" fontSize={15} fontWeight="600">
                {activeTab === 'active' ? 'No active borrows' : 'No return history'}
              </Text>
              <Text color="#c4c4cc" fontSize={12} marginTop="$1">
                {activeTab === 'active'
                  ? 'Borrow a book from the library to get started'
                  : 'Your returned books will appear here'}
              </Text>
            </YStack>
          )
        }
      />
    </SafeAreaView>
  );
}
