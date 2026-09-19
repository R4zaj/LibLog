import React, { useState, useCallback, useRef } from 'react';
import { TouchableOpacity, ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Book, ChevronRight, Clock, Info, QrCode } from 'lucide-react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../api';
import { TabBarVisibilityContext } from './_layout';
import type { BorrowRecordWithBook } from '../../types/api';

export default function Borrowed() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [borrows, setBorrows] = useState<BorrowRecordWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const insets = useSafeAreaInsets();
  
  const { setTabBarVisible } = React.useContext(TabBarVisibilityContext);
  const lastOffsetY = useRef(0);

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
        backgroundColor="white"
        borderRadius={24}
        marginBottom={12}
        borderWidth={1}
        borderColor="#ede9f6"
        style={{ boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.03)' }}
        elevation={2}
      >
        {/* Book Info */}
        <XStack padding={16} marginBottom={!isReturned ? 0 : "$2"}>
          <YStack
            width={64}
            height={84}
            backgroundColor="#faf9fe"
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
            marginRight="$3"
          >
            <Book color={isOverdue ? '#ef4444' : '#6C48C5'} size={22} opacity={isOverdue ? 0.95 : 0.8} />
          </YStack>
          <YStack flex={1} justifyContent="center">
            <Text fontSize={18} fontWeight="600" color="#1e1e2e" marginBottom={3} numberOfLines={2}>
              {record.book?.title}
            </Text>
            <Text fontSize={14} fontWeight="500" color="#4b5563" marginBottom="$2" numberOfLines={1}>
              {record.book?.author?.name || 'Unknown Author'}
            </Text>
            <Text fontSize={12} fontWeight="500" color="#7c7c8a" marginBottom="$2">
              Borrowed: {borrowDateStr}
            </Text>
            
            <XStack>
              {isReturned ? (
                <XStack
                  alignItems="center"
                  backgroundColor="#ecfdf5"
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  borderRadius={10}
                >
                  <Text color="#10b981" fontWeight="700" fontSize={12}>
                    Returned
                  </Text>
                </XStack>
              ) : isOverdue ? (
                <XStack
                  alignItems="center"
                  backgroundColor="#fef2f2"
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  borderRadius={10}
                >
                  <Text color="#ef4444" fontWeight="700" fontSize={12}>
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
                >
                  <Text color="#fbbf24" fontWeight="700" fontSize={12}>
                    Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
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
                  <Text color="#10b981" fontWeight="700" fontSize={12}>
                    Due in {daysLeft} days
                  </Text>
                </XStack>
              )}
            </XStack>
          </YStack>
        </XStack>

        {!isReturned && (
          <TouchableOpacity
            onPress={() => router.push('/scan')}
            style={{
              backgroundColor: '#f4f1fa',
              borderTopWidth: 1,
              borderColor: '#ede9f6',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
            }}
          >
            <QrCode color="#6C48C5" size={16} style={{ marginRight: 8 }} />
            <Text color="#6C48C5" fontSize={12} fontWeight="500">
              Present your QR code at the desk to return.
            </Text>
          </TouchableOpacity>
        )}
      </YStack>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f1fa' }}>
      {/* Header */}
      <YStack paddingTop="$4" paddingHorizontal="$5" paddingBottom="$4" backgroundColor="white">
        <Text fontSize={24} fontWeight="800" color="#1e1e2e" marginBottom="$3">
          {activeBorrows.length === 0 
            ? "You have no active borrows." 
            : `You have ${activeBorrows.length} active borrow${activeBorrows.length === 1 ? '' : 's'}.${overdueCount > 0 ? ` ${overdueCount} need${overdueCount === 1 ? 's' : ''} your attention.` : ''}`}
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
            <Text color={activeTab === 'active' ? 'white' : '#7c7c8a'} fontWeight={activeTab === 'active' ? '700' : '500'} fontSize={13}>
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
            <Text color={activeTab === 'history' ? 'white' : '#7c7c8a'} fontWeight={activeTab === 'history' ? '700' : '500'} fontSize={13}>
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
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          if (offsetY <= 0) {
            setTabBarVisible(true);
          } else if (offsetY > lastOffsetY.current + 10) {
            setTabBarVisible(false);
          } else if (offsetY < lastOffsetY.current - 10) {
            setTabBarVisible(true);
          }
          lastOffsetY.current = offsetY;
        }}
        scrollEventThrottle={16}
        onRefresh={fetchBorrows}
        refreshing={isLoading && borrows.length > 0}
        ListHeaderComponent={null}
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
