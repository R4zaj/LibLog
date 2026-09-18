import React, { useState, useEffect, useCallback } from 'react';
import { TextInput, TouchableOpacity, Dimensions, Modal, FlatList, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, ArrowUpRight, Search as SearchIcon, BookOpen, Clock, X, Heart } from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
import { useFavorites } from '../../context/FavoritesContext';
import type { LiteratureBook } from '../../types/api';

const { width } = Dimensions.get('window');

type BookCategory = 'Book' | 'Research' | 'Magazine';

// The catalog view adds display/derived fields (tags, availability color, filter category) on
// top of the raw LiteratureBook response for rendering. Book type is differentiated by label
// and icon only, per the One Accent Rule — no per-type color. `genre` has no dedicated
// category field server-side, so `category` buckets it by name for the filter tabs, the same
// substring convention this file already used before per-type color was removed.
interface CatalogBook extends LiteratureBook {
  tags: string[];
  avail: string;
  availColor: string;
  type: string;
  category: BookCategory;
}

const TAB_TO_CATEGORY: Record<string, BookCategory> = {
  Books: 'Book',
  Research: 'Research',
  Magazines: 'Magazine',
};

export default function Search() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>(['Algorithms', 'Nursing', 'Psychology']);
  const [recentItems, setRecentItems] = useState<CatalogBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<CatalogBook | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LiteratureBook[]>('/literatures/books');
      const formatted: CatalogBook[] = res.data.map((b) => ({
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
        availColor: b.available > 0 ? '#10b981' : '#ef4444',
        type: b.genre || 'Book',
        category: b.genre?.includes('Magazine') ? 'Magazine' : b.genre?.includes('Research') ? 'Research' : 'Book',
      }));
      setBooks(formatted);
      setFetchError(false);

      const counts: Record<string, number> = {};
      formatted.forEach((b) => {
        const tag = b.tags[0];
        if (tag && tag !== 'Unknown') counts[tag] = (counts[tag] || 0) + 1;
      });
      const popular = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map((e) => e[0]);
      if (popular.length > 0) setPopularSearches(popular);
    } catch (err) {
      console.error('Failed to fetch books', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, [fetchBooks]);

  const handleBookPress = async (book: CatalogBook) => {
    try {
      setSelectedBook(book);
      const newRecent = [book, ...recentItems.filter((item) => item.id !== book.id)].slice(0, 5);
      setRecentItems(newRecent);
      await AsyncStorage.setItem('@recent_books', JSON.stringify(newRecent));
    } catch (e) {
      console.error('Failed to save recent book', e);
    }
  };

  const tabs = ['All', 'Books', 'Research', 'Magazines'];

  const filteredBooks = books.filter(
    (b) =>
      (activeTab === 'All' || b.category === TAB_TO_CATEGORY[activeTab]) &&
      (b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags?.[0]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();
    books.forEach((b) => {
      if (b.title.toLowerCase().includes(query)) suggestions.add(b.title);
      if (b.author.toLowerCase().includes(query)) suggestions.add(b.author);
      if (b.tags?.[0]?.toLowerCase().includes(query)) suggestions.add(b.tags[0]);
    });
    return Array.from(suggestions).slice(0, 6);
  };

  const renderCatalogItem: ListRenderItem<CatalogBook> = ({ item }) => (
    <TouchableOpacity onPress={() => handleBookPress(item)} activeOpacity={0.7}>
      <XStack
        alignItems="center"
        paddingHorizontal="$5"
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
          backgroundColor="#faf9fe"
        >
          <BookOpen color="#6C48C5" size={24} opacity={0.8} />
        </YStack>
        <YStack flex={1}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <Text fontSize={18} fontWeight="600" color="#1e1e2e" marginBottom={3} flex={1} marginRight="$2">
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                toggleFavorite(item);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
              style={{ padding: 3 }}
            >
              <Heart
                color={isFavorite(item.id) ? '#ef4444' : '#cbd5e1'}
                size={18}
                fill={isFavorite(item.id) ? '#ef4444' : 'none'}
              />
            </TouchableOpacity>
          </XStack>
          <Text fontSize={14} fontWeight="500" color="#7c7c8a" marginBottom="$2">
            {item.author}
          </Text>
          <XStack alignItems="center" flexWrap="wrap" gap="$1.5">
            {item.tags?.slice(0, 2).map((tag: string, idx: number) => (
              <YStack
                key={idx}
                backgroundColor="#f3f4f6"
                paddingHorizontal="$2"
                paddingVertical={3}
                borderRadius={8}
              >
                <Text fontSize={12} color="#7c7c8a" fontWeight="500">
                  {tag}
                </Text>
              </YStack>
            ))}
            <XStack alignItems="center" marginLeft="auto">
              <View width={6} height={6} borderRadius={3} backgroundColor={item.availColor as any} marginRight="$1" />
              <Text fontSize={11} fontWeight="700" color={item.availColor as any}>
                {item.avail}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f1fa' }}>
      <Modal
        visible={!!selectedBook}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBook(null)}
      >
        <View flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center" padding="$4">
          <YStack backgroundColor="white" width="100%" maxWidth={400} borderRadius={24} padding="$5" elevation={5}>
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$4">
              <YStack flex={1} marginRight="$3">
                <Text fontSize={24} fontWeight="800" color="#1e1e2e" marginBottom="$1">
                  {selectedBook?.title}
                </Text>
                <Text fontSize={14} color="#7c7c8a">
                  By {selectedBook?.author}
                </Text>
              </YStack>
              <XStack gap="$2" alignItems="center">
                <TouchableOpacity
                  onPress={() => selectedBook && toggleFavorite(selectedBook)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={selectedBook && isFavorite(selectedBook.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <View backgroundColor={selectedBook && isFavorite(selectedBook.id) ? '#fef2f2' : '#f4f1fa'} padding="$2" borderRadius={12}>
                    <Heart
                      color={selectedBook && isFavorite(selectedBook.id) ? '#ef4444' : '#6C48C5'}
                      size={20}
                      fill={selectedBook && isFavorite(selectedBook.id) ? '#ef4444' : 'none'}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedBook(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <View backgroundColor="#f4f1fa" padding="$2" borderRadius={12}>
                    <X color="#6C48C5" size={20} />
                  </View>
                </TouchableOpacity>
              </XStack>
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
                  <Text fontSize={14} fontWeight="600" color={selectedBook?.condition === 'POOR' ? '#ef4444' : '#10b981'}>{selectedBook?.condition}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="#7c7c8a">Availability</Text>
                  <Text fontSize={14} fontWeight="600" color={selectedBook && selectedBook.available > 0 ? '#10b981' : '#ef4444'}>
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
      <YStack paddingTop="$4" paddingHorizontal="$5" paddingBottom="$4" backgroundColor="white">
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

      {/* Catalog — the only unbounded list here, so it's the one virtualized with FlatList */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCatalogItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <YStack>
            {/* Popular Tags */}
            <YStack paddingHorizontal="$5" marginTop="$4" marginBottom="$4">
              <XStack alignItems="center" marginBottom="$3">
                <ArrowUpRight color="#6C48C5" size={16} strokeWidth={2.5} style={{ marginRight: 4 }} />
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
                      minHeight: 48,
                      justifyContent: 'center',
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
                      justifyContent: 'center',
                      backgroundColor: isActive ? '#6C48C5' : 'white',
                      paddingHorizontal: 16,
                      minHeight: 48,
                      borderRadius: 12,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: isActive ? '#6C48C5' : '#f0eef5',
                    }}
                  >
                    {(tab === 'All' || tab === 'Books' || tab === 'Research') && (
                      <BookOpen color={isActive ? '#fff' : '#7c7c8a'} size={14} style={{ marginRight: 6 }} />
                    )}
                    <Text color={isActive ? 'white' : '#4b5563'} fontSize={14} fontWeight={isActive ? '700' : '500'}>
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
                        backgroundColor="#6C48C5"
                        position="relative"
                      >
                        <BookOpen color="#fff" size={32} opacity={0.6} />
                        <YStack
                          position="absolute"
                          top={8}
                          left={8}
                          right={40}
                          backgroundColor="white"
                          paddingHorizontal="$1.5"
                          paddingVertical={3}
                          borderRadius={6}
                          alignSelf="flex-start"
                        >
                          <Text fontSize={12} fontWeight="700" color="#7c7c8a" textTransform="uppercase" numberOfLines={1} ellipsizeMode="tail">
                            {item.type}
                          </Text>
                        </YStack>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            toggleFavorite(item);
                          }}
                          hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
                          accessibilityRole="button"
                          accessibilityLabel={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: 5,
                            borderRadius: 10,
                          }}
                        >
                          <Heart
                            color={isFavorite(item.id) ? '#ef4444' : '#9ca3af'}
                            size={13}
                            fill={isFavorite(item.id) ? '#ef4444' : 'none'}
                          />
                        </TouchableOpacity>
                      </YStack>
                      <Text fontSize={18} fontWeight="600" color="#1e1e2e" numberOfLines={2} marginBottom={2}>
                        {item.title}
                      </Text>
                      <Text fontSize={12} fontWeight="500" color="#9ca3af" numberOfLines={1}>
                        {item.author}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </YStack>
        }
        ListEmptyComponent={
          loading ? (
            <Text textAlign="center" marginTop="$5" color="#7c7c8a">
              Loading catalog...
            </Text>
          ) : fetchError ? (
            <YStack
              backgroundColor="#fef3f2"
              borderRadius={16}
              padding="$5"
              alignItems="center"
              borderWidth={1}
              borderColor="#fecaca"
              marginHorizontal="$5"
              gap="$2"
            >
              <AlertCircle color="#dc2626" size={28} />
              <Text color="#b91c1c" fontSize={14} fontWeight="500" textAlign="center">
                Couldn't load the catalog
              </Text>
              <TouchableOpacity
                onPress={fetchBooks}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
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
              padding="$5"
              alignItems="center"
              borderWidth={1}
              borderColor="#f0eef5"
              marginHorizontal="$5"
            >
              <BookOpen color="#9ca3af" size={32} strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <Text color="#9ca3af" fontSize={14} fontWeight="500">
                No books found
              </Text>
            </YStack>
          )
        }
      />
    </SafeAreaView>
  );
}
