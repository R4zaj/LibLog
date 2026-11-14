import React, { useState, useCallback, useRef } from 'react';
import { TouchableOpacity, ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Book, ChevronRight, Clock, Info, QrCode, BookX, Wind } from 'lucide-react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../api';
import { TabBarVisibilityContext } from './_layout';
import type { BorrowRecordWithBook, UserPenaltiesResponse } from '../../types/api';

export default function Borrowed() {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [borrows, setBorrows] = useState<BorrowRecordWithBook[]>([]);
  const [penaltySummary, setPenaltySummary] = useState<UserPenaltiesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const insets = useSafeAreaInsets();
  
  const { setTabBarVisible, setBorrowCount } = React.useContext(TabBarVisibilityContext);
  const lastOffsetY = useRef(0);

  const fetchBorrows = useCallback(async () => {
    try {
      setIsLoading(true);
      const [res, penRes] = await Promise.all([
        api.get<BorrowRecordWithBook[]>(`/borrowing/user/${user?.id}/history`),
        api.get<UserPenaltiesResponse>(`/borrowing/user/${user?.id}/penalties`).catch(() => ({ data: null }))
      ]);
      const list = res.data || [];
      setBorrows(list);
      const activeBookIds = new Set(
        list
          .filter((b) => b.status === 'BORROWED' || b.status === 'OVERDUE')
          .map((b) => b.book_id)
      );
      setBorrowCount(activeBookIds.size);
      if (penRes.data) setPenaltySummary(penRes.data);
      setFetchError(false);
    } catch (e) {
      console.error('Failed to fetch borrows', e);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, setBorrowCount]);

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

  const uniqueByBookId = (list: BorrowRecordWithBook[]) => {
    const seen = new Set();
    return list.filter((b) => {
      if (seen.has(b.book_id)) return false;
      seen.add(b.book_id);
      return true;
    });
  };

  const activeBorrows = uniqueByBookId(borrows.filter((b) => b.status === 'BORROWED' || b.status === 'OVERDUE'));
  const historyBorrows = uniqueByBookId(borrows.filter((b) => b.status === 'RETURNED'));
  const overdueCount = activeBorrows.filter(
    (b) => b.status === 'OVERDUE' || (b.due_date && daysLeftFor(b.due_date) < 0)
  ).length;

  const dailyRate = penaltySummary?.rules?.penalty_fee_per_day ?? 5.0;
  const totalUnpaid = penaltySummary?.totalUnpaid ?? 0;

  const currentList = activeTab === 'active' ? activeBorrows : historyBorrows;

  const renderItem = ({ item: record, index }: { item: BorrowRecordWithBook; index: number }) => {
    const isReturned = record.status === 'RETURNED';
    const daysLeft = daysLeftFor(record.due_date);
    const isOverdue = !isReturned && (record.status === 'OVERDUE' || daysLeft < 0);
    const isDueSoon = !isReturned && !isOverdue && (daysLeft === 0 || daysLeft === 1);
    const dueDateStr = new Date(record.due_date).toLocaleDateString();
    const borrowDateStr = new Date(record.borrow_date).toLocaleDateString();
    const isLast = index === currentList.length - 1;
    const pInfo = record.penalty_info;
    const itemRate = pInfo?.daily_rate ?? dailyRate;
    const overdueDays = pInfo && pInfo.days_overdue > 0 ? pInfo.days_overdue : Math.max(1, Math.abs(daysLeft));
    const overdueFee = pInfo && pInfo.amount > 0 ? pInfo.amount : overdueDays * itemRate;

    return (
      <YStack
        backgroundColor={theme.card}
        borderBottomWidth={isLast ? 0 : 1}
        borderBottomColor={theme.border}
      >
        {/* Book Info */}
        <XStack padding={16} marginBottom={!isReturned ? 0 : "$2"}>
          <YStack
            width={64}
            height={84}
            backgroundColor={theme.background}
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
            marginRight="$3"
          >
            <Book color={isOverdue ? '#ef4444' : theme.primary} size={22} opacity={isOverdue ? 0.95 : 0.8} />
          </YStack>
          <YStack flex={1} justifyContent="center">
            <Text fontSize={18} fontWeight="600" color={theme.text} marginBottom={3} numberOfLines={2}>
              {record.book?.title}
            </Text>
            <Text fontSize={14} fontWeight="500" color={theme.textSecondary} marginBottom="$1.5" numberOfLines={1}>
              {record.book?.author?.name || 'Unknown Author'}
            </Text>
            <Text fontSize={12} fontWeight="500" color={theme.textSecondary} marginBottom={isReturned ? "$2" : 2}>
              Borrowed: {borrowDateStr}
            </Text>
            {!isReturned && (
              <Text fontSize={12} fontWeight="500" color={theme.textSecondary} marginBottom="$2">
                Due: {dueDateStr} • Overdue fee: ₱{itemRate.toFixed(2)}/day
              </Text>
            )}
            
            <XStack flexWrap="wrap" gap="$2">
              {isReturned ? (
                <>
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
                  {pInfo && pInfo.amount > 0 && (
                    <XStack
                      alignItems="center"
                      backgroundColor={pInfo.status === 'UNPAID' ? '#fef2f2' : '#f1f5f9'}
                      paddingHorizontal="$3"
                      paddingVertical="$1.5"
                      borderRadius={10}
                    >
                      <Text
                        color={pInfo.status === 'UNPAID' ? '#ef4444' : '#475569'}
                        fontWeight="700"
                        fontSize={12}
                      >
                        {pInfo.status === 'UNPAID'
                          ? `Unpaid Fee: ₱${pInfo.amount.toFixed(2)}`
                          : `Paid Fee: ₱${pInfo.amount.toFixed(2)}`}
                      </Text>
                    </XStack>
                  )}
                </>
              ) : isOverdue ? (
                <>
                  <XStack
                    alignItems="center"
                    backgroundColor="#fef2f2"
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    borderRadius={10}
                  >
                    <Text color="#ef4444" fontWeight="700" fontSize={12}>
                      Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                    </Text>
                  </XStack>
                  <XStack
                    alignItems="center"
                    backgroundColor="#fff1f2"
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    borderRadius={10}
                  >
                    <Text color="#be123c" fontWeight="800" fontSize={12}>
                      Penalty: ₱{overdueFee.toFixed(2)}
                    </Text>
                  </XStack>
                </>
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
              backgroundColor: theme.pillContainer,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
            }}
          >
            <QrCode color={theme.primary} size={16} style={{ marginRight: 8 }} />
            <Text color={theme.primary} fontSize={12} fontWeight="500">
              Present your QR code at the desk to return.
            </Text>
          </TouchableOpacity>
        )}
      </YStack>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pillContainer }}>
      {/* Header */}
      <YStack paddingTop="$4" paddingHorizontal="$5" paddingBottom="$4" backgroundColor={theme.card}>
        <Text fontSize={24} fontWeight="800" color={theme.text} marginBottom="$2">
          {activeTab === 'active' 
            ? `You have ${activeBorrows.length} active borrow${activeBorrows.length === 1 ? '' : 's'}${overdueCount > 0 ? `. ${overdueCount} need${overdueCount === 1 ? 's' : ''} attention.` : '.'}`
            : `You have ${historyBorrows.length} past borrow${historyBorrows.length === 1 ? '' : 's'}.`}
        </Text>

        {/* Penalty Fee Summary Strip */}
        <XStack
          alignItems="center"
          backgroundColor={totalUnpaid > 0 ? '#fef2f2' : '#f8fafc'}
          borderColor={totalUnpaid > 0 ? '#fecaca' : '#e2e8f0'}
          borderWidth={1}
          borderRadius={12}
          paddingHorizontal="$3"
          paddingVertical="$2"
          marginBottom="$3"
          gap="$2"
        >
          <AlertCircle color={totalUnpaid > 0 ? '#dc2626' : '#64748b'} size={15} />
          <Text
            color={totalUnpaid > 0 ? '#b91c1c' : '#475569'}
            fontSize={12}
            fontWeight={totalUnpaid > 0 ? '700' : '600'}
            flex={1}
          >
            {totalUnpaid > 0
              ? `Unpaid Penalty: ₱${totalUnpaid.toFixed(2)} • Overdue rate: ₱${dailyRate.toFixed(2)}/day`
              : `Library overdue penalty fee: ₱${dailyRate.toFixed(2)}/day`}
          </Text>
        </XStack>

        {/* Tab Switcher */}
        <XStack backgroundColor={theme.pillContainer} borderRadius={9999} padding={4} minHeight={48}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('active');
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: activeTab === 'active' ? theme.primary : 'transparent',
            }}
          >
            <Text color={activeTab === 'active' ? theme.card : theme.textSecondary} fontWeight={activeTab === 'active' ? '700' : '500'} fontSize={13}>
              Active ({activeBorrows.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('history');
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: activeTab === 'history' ? theme.primary : 'transparent',
            }}
          >
            <Text color={activeTab === 'history' ? theme.card : theme.textSecondary} fontWeight={activeTab === 'history' ? '700' : '500'} fontSize={13}>
              History ({historyBorrows.length})
            </Text>
          </TouchableOpacity>
        </XStack>
      </YStack>

      <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => renderItem({ item, index })}
        showsVerticalScrollIndicator={false}
        style={{ paddingHorizontal: 20, paddingTop: 16 }}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 98 },
          currentList.length > 0 && {
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
          }
        ]}
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
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
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
                <Text fontSize={12} color={theme.primary} fontWeight="700">
                  Tap to retry
                </Text>
              </TouchableOpacity>
            </YStack>
          ) : (
            <YStack padding={32} alignItems="center" justifyContent="center" flex={1} marginTop={40}>
              <Wind color={theme.textSecondary} size={48} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary, textAlign: 'center' }}>
                {activeTab === 'active' ? 'No active borrows found' : 'No past borrows found'}
              </Text>
            </YStack>
          )
        }
      />
    </SafeAreaView>
  );
}
