import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Search as SearchIcon, BookOpen, Clock, X } from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';

const { width } = Dimensions.get('window');

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularSearches, setPopularSearches] = useState<string[]>(['Algorithms', 'Nursing', 'Psychology']);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/literatures/books');
        const formatted = res.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          lccn: b.lccn,
          year: b.year,
          shelf: b.shelf,
          total: b.total,
          available: b.available,
          condition: b.condition,
          genre: b.genre,
          tags: [b.genre, b.condition || 'GOOD'],
          avail: b.available > 0 ? `${b.available}/${b.total}` : 'Out',
          availColor: b.available > 0 ? '#22c55e' : '#ef4444',
          typeColor: b.genre?.includes('Magazine') ? '#f97316' : b.genre?.includes('Research') ? '#3b82f6' : '#8b5cf6',
          coverColor: b.genre?.includes('Magazine') ? '#ef4444' : b.genre?.includes('Research') ? '#3b82f6' : '#6C48C5',
          type: b.genre || 'Book'
        }));
        setBooks(formatted);
        
        const counts: Record<string, number> = {};
        formatted.forEach((b: any) => {
          const tag = b.tags[0];
          if (tag && tag !== 'Unknown') counts[tag] = (counts[tag] || 0) + 1;
        });
        const popular = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(e => e[0]);
        if (popular.length > 0) setPopularSearches(popular);
      } catch (err) {
        console.error('Failed to fetch books', err);
      } finally {
        setLoading(false);
      }
    };

    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem('@recent_books');
        if (stored) setRecentItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load recent books', e);
      }
    };

    fetchBooks();
    loadRecent();
  }, []);

  const handleBookPress = async (book: any) => {
    try {
      setSelectedBook(book);
      const newRecent = [book, ...recentItems.filter(item => item.id !== book.id)].slice(0, 5);
      setRecentItems(newRecent);
      await AsyncStorage.setItem('@recent_books', JSON.stringify(newRecent));
    } catch (e) {
      console.error('Failed to save recent book', e);
    }
  };

  const tabs = ['All', 'Books', 'Research', 'Magazines'];

  const filteredBooks = books.filter(
    (b: any) =>
      (activeTab === 'All' || b.tags?.[0]?.includes(activeTab)) &&
      (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       b.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
       b.tags?.[0]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();
    books.forEach(b => {
      if (b.title.toLowerCase().includes(query)) suggestions.add(b.title);
      if (b.author.toLowerCase().includes(query)) suggestions.add(b.author);
      if (b.tags?.[0]?.toLowerCase().includes(query)) suggestions.add(b.tags[0]);
    });
    return Array.from(suggestions).slice(0, 6);
  };

  return (
    <YStack flex={1} backgroundColor="#f4f1fa">
      <Modal
        visible={!!selectedBook}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedBook(null)}
      >
        <View flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center" padding="$4">
          <YStack backgroundColor="white" width="100%" maxWidth={400} borderRadius={24} padding="$5" elevation={5}>
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$4">
              <YStack flex={1} marginRight="$3">
                <Text fontSize={20} fontWeight="800" color="#1e1e2e" marginBottom="$1">
                  {selectedBook?.title}
                </Text>
                <Text fontSize={14} color="#7c7c8a">
                  By {selectedBook?.author}
                </Text>
              </YStack>
              <TouchableOpacity onPress={() => setSelectedBook(null)}>
                <View backgroundColor="#f4f1fa" padding="$2" borderRadius={12}>
                  <X color="#6C48C5" size={20} />
                </View>
              </TouchableOpacity>
            </XStack>

            <ScrollView maxHeight={300} showsVerticalScrollIndicator={false}>
              <YStack gap="$3" marginBottom="$4">
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Genre</Text>
                  <Text fontSize={14} fontWeight="600" color="#1e1e2e">{selectedBook?.genre}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Shelf</Text>
                  <Text fontSize={14} fontWeight="600" color="#1e1e2e">{selectedBook?.shelf}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Condition</Text>
                  <Text fontSize={14} fontWeight="600" color={selectedBook?.condition === 'POOR' ? '#ef4444' : '#22c55e'}>{selectedBook?.condition}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Availability</Text>
                  <Text fontSize={14} fontWeight="600" color={selectedBook?.available > 0 ? '#22c55e' : '#ef4444'}>
                    {selectedBook?.available} / {selectedBook?.total}
                  </Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Year</Text>
                  <Text fontSize={14} fontWeight="600" color="#1e1e2e">{selectedBook?.year}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">ISBN</Text>
                  <Text fontSize={14} fontWeight="600" color="#1e1e2e">{selectedBook?.isbn}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Call No. / LCCN</Text>
                  <Text fontSize={14} fontWeight="600" color="#1e1e2e">{selectedBook?.lccn}</Text>
                </XStack>
              </YStack>
            </ScrollView>

            <YStack backgroundColor="#f9f8fc" padding="$3" borderRadius={12} borderWidth={1} borderColor="#ede9f6" alignItems="center">
              <Text fontSize={13} color="#6C48C5" fontWeight="600" textAlign="center">
                Kindly find the book to scan its qr to borrow
              </Text>
            </YStack>
          </YStack>
        </View>
      </Modal>

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

      {/* Auto-Suggestions */}
      {searchQuery.length > 0 && (
        <YStack backgroundColor="white" paddingHorizontal="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor="#ede9f6" zIndex={10}>
          {getSuggestions().map((suggestion, idx) => (
            <TouchableOpacity 
              key={idx} 
              onPress={() => setSearchQuery(suggestion)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f1fa' }}
            >
              <XStack alignItems="center">
                <SearchIcon color="#9ca3af" size={16} style={{ marginRight: 10 }} />
                <Text color="#1e1e2e" fontSize={15} fontWeight="500">{suggestion}</Text>
              </XStack>
            </TouchableOpacity>
          ))}
          {getSuggestions().length === 0 && (
             <Text color="#9ca3af" fontSize={14} paddingVertical={12}>No suggestions found</Text>
          )}
        </YStack>
      )}

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
          {recentItems.length > 0 && (
            <YStack paddingHorizontal="$5" marginBottom="$5">
              <XStack alignItems="center" marginBottom="$3">
                <Clock color="#6C48C5" size={16} />
                <Text fontSize={16} fontWeight="700" color="#1e1e2e" marginLeft="$2">
                  Recently Viewed
                </Text>
              </XStack>
            </YStack>
          )}

          {recentItems.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 16 }}
              style={{ marginBottom: 24 }}
            >
              {recentItems.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleBookPress(item)} activeOpacity={0.8}>
                  <YStack width={120} marginRight="$4">
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
                        right={8}
                        backgroundColor="white"
                        paddingHorizontal="$1.5"
                        paddingVertical={3}
                        borderRadius={6}
                        alignSelf="flex-start"
                      >
                        <Text fontSize={9} fontWeight="800" color="#7c7c8a" textTransform="uppercase" numberOfLines={1} ellipsizeMode="tail">
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
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

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
                <TouchableOpacity key={item.id} onPress={() => handleBookPress(item)} activeOpacity={0.7}>
                  <XStack
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
                </TouchableOpacity>
              ))
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
