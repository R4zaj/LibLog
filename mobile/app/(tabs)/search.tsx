import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { Search as SearchIcon, BookOpen, Clock } from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View } from 'tamagui';
import api from '../../api';

const { width } = Dimensions.get('window');

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/literatures/books');
        const formatted = res.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          tags: [b.genre, b.condition || 'GOOD'],
          avail: b.available > 0 ? `${b.available}/${b.total}` : 'Out',
          availColor: b.available > 0 ? '#22c55e' : '#ef4444',
          typeColor: b.genre?.includes('Magazine') ? '#f97316' : b.genre?.includes('Research') ? '#3b82f6' : '#8b5cf6',
        }));
        setBooks(formatted);
      } catch (err) {
        console.error('Failed to fetch books', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const popularSearches = ['Algorithms', 'Deep Learning', 'Database', 'Nursing', 'Psychology', 'Clean Code'];
  const tabs = ['All', 'Books', 'Research', 'Magazines'];

  const recentItems = [
    { id: 1, title: 'Scientific American', author: 'Springer Nature', type: 'magazine', coverColor: '#ef4444' },
    { id: 2, title: 'National Geographic March 2026', author: 'National Geographic Society', type: 'magazine', coverColor: '#6C48C5' },
    { id: 3, title: 'Time Magazine Spring 2026', author: 'Time USA, LLC', type: 'magazine', coverColor: '#6C48C5' },
  ];

  const filteredBooks = books.filter(
    (b: any) =>
      (activeTab === 'All' || b.tags?.[0]?.includes(activeTab)) &&
      b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <YStack flex={1} backgroundColor="#f4f1fa">
      {/* Header */}
      <YStack paddingTop={52} paddingHorizontal="$5" paddingBottom="$4" backgroundColor="white">
        <Text fontSize={24} fontWeight="800" color="#1e1e2e" marginBottom="$3">
          Search Catalog
        </Text>
        <XStack
          alignItems="center"
          backgroundColor="#faf9fe"
          borderRadius={16}
          paddingHorizontal="$4"
          height={48}
          borderWidth={1}
          borderColor="#ede9f6"
        >
          <SearchIcon color="#9ca3af" size={20} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#1e1e2e' }}
            placeholder="Search books, research, magazines..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </XStack>
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack paddingBottom="$8">
          {/* Popular Tags */}
          <YStack paddingHorizontal="$5" marginTop="$4" marginBottom="$4">
            <XStack alignItems="center" marginBottom="$3">
              <Text color="#6C48C5" fontWeight="800" marginRight="$1">↗</Text>
              <Text fontSize={11} fontWeight="700" color="#7c7c8a" letterSpacing={1}>
                POPULAR
              </Text>
            </XStack>
            <XStack flexWrap="wrap" gap="$2">
              {popularSearches.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSearchQuery(tag)}
                  style={{
                    backgroundColor: '#faf9fe',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#ede9f6',
                  }}
                >
                  <Text color="#6C48C5" fontSize={13} fontWeight="500">
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>
          </YStack>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 16 }}
            style={{ marginBottom: 20 }}
          >
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isActive ? '#6C48C5' : 'white',
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 12,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: isActive ? '#6C48C5' : '#f0eef5',
                  }}
                >
                  {(tab === 'All' || tab === 'Books' || tab === 'Research') && (
                    <BookOpen color={isActive ? '#fff' : '#7c7c8a'} size={14} style={{ marginRight: 6 }} />
                  )}
                  <Text
                    color={isActive ? 'white' : '#4b5563'}
                    fontSize={14}
                    fontWeight={isActive ? '700' : '500'}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Recently Viewed */}
          <YStack paddingHorizontal="$5" marginBottom="$5">
            <XStack alignItems="center" marginBottom="$3">
              <Clock color="#6C48C5" size={16} />
              <Text fontSize={16} fontWeight="700" color="#1e1e2e" marginLeft="$2">
                Recently Viewed
              </Text>
            </XStack>
          </YStack>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 16 }}
            style={{ marginBottom: 24 }}
          >
            {recentItems.map((item) => (
              <YStack key={item.id} width={120} marginRight="$4">
                <YStack
                  height={160}
                  borderRadius={16}
                  justifyContent="center"
                  alignItems="center"
                  marginBottom="$2"
                  backgroundColor={item.coverColor as any}
                  position="relative"
                >
                  <BookOpen color="#fff" size={32} opacity={0.6} />
                  <YStack
                    position="absolute"
                    top={8}
                    left={8}
                    backgroundColor="white"
                    paddingHorizontal="$1.5"
                    paddingVertical={2}
                    borderRadius={8}
                  >
                    <Text fontSize={9} fontWeight="700" color="#7c7c8a" textTransform="uppercase">
                      {item.type}
                    </Text>
                  </YStack>
                </YStack>
                <Text fontSize={13} fontWeight="700" color="#1e1e2e" numberOfLines={2} marginBottom={2}>
                  {item.title}
                </Text>
                <Text fontSize={11} color="#9ca3af" numberOfLines={1}>
                  {item.author}
                </Text>
              </YStack>
            ))}
          </ScrollView>

          {/* Catalog List */}
          <YStack paddingHorizontal="$5">
            {loading ? (
              <Text textAlign="center" marginTop="$5" color="#7c7c8a">
                Loading catalog...
              </Text>
            ) : filteredBooks.length === 0 ? (
              <YStack
                backgroundColor="white"
                borderRadius={16}
                padding="$5"
                alignItems="center"
                borderWidth={1}
                borderColor="#f0eef5"
              >
                <Text fontSize={32} marginBottom="$2">📚</Text>
                <Text color="#9ca3af" fontSize={14} fontWeight="500">
                  No books found
                </Text>
              </YStack>
            ) : (
              filteredBooks.map((item: any) => (
                <XStack
                  key={item.id}
                  alignItems="center"
                  paddingVertical="$3.5"
                  borderBottomWidth={1}
                  borderBottomColor="#f0eef5"
                >
                  <YStack
                    width={56}
                    height={56}
                    borderRadius={14}
                    justifyContent="center"
                    alignItems="center"
                    marginRight="$3"
                    backgroundColor={
                      item.typeColor === '#f97316'
                        ? '#fff7ed'
                        : item.typeColor === '#3b82f6'
                        ? '#eff6ff'
                        : '#faf5ff'
                    }
                  >
                    <BookOpen color={item.typeColor} size={24} opacity={0.8} />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color="#1e1e2e" marginBottom={3}>
                      {item.title}
                    </Text>
                    <Text fontSize={13} color="#7c7c8a" marginBottom="$2">
                      {item.author}
                    </Text>
                    <XStack alignItems="center" flexWrap="wrap" gap="$1.5">
                      {item.tags?.slice(0, 2).map((tag: string, idx: number) => (
                        <YStack
                          key={idx}
                          backgroundColor={idx === 0 ? item.typeColor + '18' as any : '#f3f4f6'}
                          paddingHorizontal="$2"
                          paddingVertical={3}
                          borderRadius={8}
                        >
                          <Text
                            fontSize={11}
                            color={idx === 0 ? item.typeColor : '#7c7c8a'}
                            fontWeight={idx === 0 ? '700' : '400'}
                          >
                            {tag}
                          </Text>
                        </YStack>
                      ))}
                      <XStack alignItems="center" marginLeft="auto">
                        <View
                          width={6}
                          height={6}
                          borderRadius={3}
                          backgroundColor={item.availColor}
                          marginRight="$1"
                        />
                        <Text fontSize={11} fontWeight="700" color={item.availColor}>
                          {item.avail}
                        </Text>
                      </XStack>
                    </XStack>
                  </YStack>
                </XStack>
              ))
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
