import React, { useState, useCallback } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Book, Clock, RotateCcw, AlertCircle } from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View } from 'tamagui';
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

  const now = new Date();
  const activeBorrows = borrows.filter((b) => b.status === 'BORROWED' || b.status === 'OVERDUE');
  const historyBorrows = borrows.filter((b) => b.status === 'RETURNED');
  const overdueCount = activeBorrows.filter(
    (b) => b.status === 'OVERDUE' || (b.due_date && new Date(b.due_date).getTime() <= now.getTime())
  ).length;

  const currentList = activeTab === 'active' ? activeBorrows : historyBorrows;

  return (
    <YStack flex={1} backgroundColor="#f4f1fa">
      {/* Header */}
      <YStack paddingTop={52} paddingHorizontal="$5" paddingBottom="$4" backgroundColor="white">
        <Text fontSize={24} fontWeight="800" color="#1e1e2e" marginBottom="$3">
          Borrowing
        </Text>

        {/* Tab Switcher */}
        <XStack gap="$2">
          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            style={{
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              borderRadius: 12,
              backgroundColor: activeTab === 'active' ? '#6C48C5' : '#faf9fe',
              borderWidth: 1,
              borderColor: activeTab === 'active' ? '#6C48C5' : '#ede9f6',
            }}
          >
            <Text
              color={activeTab === 'active' ? 'white' : '#6C48C5'}
              fontWeight="700"
              fontSize={14}
            >
              Active ({activeBorrows.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={{
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              borderRadius: 12,
              backgroundColor: activeTab === 'history' ? '#6C48C5' : '#faf9fe',
              borderWidth: 1,
              borderColor: activeTab === 'history' ? '#6C48C5' : '#ede9f6',
            }}
          >
            <Text
              color={activeTab === 'history' ? 'white' : '#6C48C5'}
              fontWeight="700"
              fontSize={14}
            >
              History ({historyBorrows.length})
            </Text>
          </TouchableOpacity>
        </XStack>
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal="$5" paddingTop="$4" paddingBottom="$8">
          {/* Summary */}
          <XStack marginBottom="$4" gap="$4" flexWrap="wrap">
            <XStack alignItems="center">
              <View width={8} height={8} borderRadius={4} backgroundColor="#6C48C5" marginRight="$2" />
              <Text color="#7c7c8a" fontSize={13} fontWeight="600">
                {activeBorrows.length} Active
              </Text>
            </XStack>
            {overdueCount > 0 && (
              <XStack alignItems="center">
                <View width={8} height={8} borderRadius={4} backgroundColor="#ef4444" marginRight="$2" />
                <Text color="#ef4444" fontSize={13} fontWeight="700">
                  {overdueCount} Due
                </Text>
              </XStack>
            )}
            <XStack alignItems="center">
              <View width={8} height={8} borderRadius={4} backgroundColor="#22c55e" marginRight="$2" />
              <Text color="#7c7c8a" fontSize={13} fontWeight="600">
                {historyBorrows.length} Returned
              </Text>
            </XStack>
          </XStack>

          {isLoading ? (
            <ActivityIndicator size="large" color="#6C48C5" style={{ marginTop: 40 }} />
          ) : currentList.length === 0 ? (
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
              <Text fontSize={36} marginBottom="$3">📚</Text>
              <Text color="#9ca3af" fontSize={15} fontWeight="600">
                {activeTab === 'active' ? 'No active borrows' : 'No return history'}
              </Text>
              <Text color="#c4c4cc" fontSize={12} marginTop="$1">
                {activeTab === 'active'
                  ? 'Borrow a book from the library to get started'
                  : 'Your returned books will appear here'}
              </Text>
            </YStack>
          ) : (
            currentList.map((record: any, index: number) => {
              const itemDueDate = new Date(record.due_date);
              const isReturned = record.status === 'RETURNED';
              // Check if book is due or overdue
              const isDue = !isReturned && (record.status === 'OVERDUE' || itemDueDate.getTime() <= now.getTime());
              const dueDateStr = itemDueDate.toLocaleDateString();
              const borrowDateStr = new Date(record.borrow_date).toLocaleDateString();

              // Days calculations
              const diffMs = now.getTime() - itemDueDate.getTime();
              const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              const daysLeft = Math.max(0, Math.ceil((itemDueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));

              return (
                <YStack
                  key={index}
                  backgroundColor={isDue ? '#fef2f2' : 'white'}
                  borderRadius={20}
                  padding="$4"
                  marginBottom="$3"
                  borderWidth={isDue ? 1.5 : 1}
                  borderColor={isDue ? '#fca5a5' : '#f0eef5'}
                  borderLeftWidth={4}
                  borderLeftColor={isDue ? '#ef4444' : isReturned ? '#22c55e' : '#6C48C5'}
                >
                  {/* Book Info */}
                  <XStack marginBottom="$3">
                    <YStack
                      width={52}
                      height={68}
                      backgroundColor={isDue ? '#ef4444' : '#1e3a8a'}
                      borderRadius={10}
                      justifyContent="center"
                      alignItems="center"
                      marginRight="$3"
                    >
                      <Book color="#fff" size={22} opacity={isDue ? 0.95 : 0.5} />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize={15} fontWeight="700" color={isDue ? '#991b1b' : '#1e1e2e'} marginBottom={3}>
                        {record.book?.title}
                      </Text>
                      <Text fontSize={13} color={isDue ? '#b91c1c' : '#7c7c8a'} marginBottom="$2">
                        {record.book?.author?.name || 'Unknown Author'}
                      </Text>
                      <Text fontSize={11} color="#7c7c8a">
                        Borrowed: {borrowDateStr}  ·  <Text fontSize={11} color={isDue ? '#dc2626' : '#7c7c8a'} fontWeight={isDue ? '700' : '400'}>Due: {dueDateStr}</Text>
                      </Text>
                    </YStack>
                  </XStack>

                  {/* Footer */}
                  <XStack
                    justifyContent="space-between"
                    alignItems="center"
                    paddingTop="$3"
                    borderTopWidth={1}
                    borderTopColor={isDue ? '#fee2e2' : '#f0eef5'}
                  >
                    {isReturned ? (
                      <XStack
                        alignItems="center"
                        backgroundColor="#ecfdf5"
                        paddingHorizontal="$3"
                        paddingVertical="$1.5"
                        borderRadius={10}
                      >
                        <Clock color="#059669" size={12} style={{ marginRight: 5 }} />
                        <Text color="#059669" fontWeight="700" fontSize={12}>
                          Returned
                        </Text>
                      </XStack>
                    ) : isDue ? (
                      <XStack
                        alignItems="center"
                        backgroundColor="#fee2e2"
                        paddingHorizontal="$3"
                        paddingVertical="$1.5"
                        borderRadius={10}
                        borderWidth={1}
                        borderColor="#fca5a5"
                      >
                        <AlertCircle
                          color="#dc2626"
                          size={13}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          color="#dc2626"
                          fontWeight="700"
                          fontSize={12}
                        >
                          Due For -{daysOverdue} days
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
                        <Clock
                          color="#059669"
                          size={12}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          color="#059669"
                          fontWeight="700"
                          fontSize={12}
                        >
                          {daysLeft} days left
                        </Text>
                      </XStack>
                    )}

                    {!isReturned && (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: isDue ? '#fee2e2' : 'transparent',
                        }}
                      >
                        <RotateCcw color={isDue ? '#dc2626' : '#6C48C5'} size={14} style={{ marginRight: 5 }} />
                        <Text color={isDue ? '#dc2626' : '#6C48C5'} fontWeight="700" fontSize={13}>
                          Return
                        </Text>
                      </TouchableOpacity>
                    )}
                  </XStack>
                </YStack>
              );
            })
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
