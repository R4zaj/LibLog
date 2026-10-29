import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TextInput, TouchableOpacity, Dimensions, FlatList, ListRenderItem } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowUpRight, Search as SearchIcon, BookOpen, Clock, X, Heart } from 'lucide-react-native';
import { YStack, XStack, Text, ScrollView, View } from 'tamagui';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
import { useFavorites } from '../../context/FavoritesContext';
import { BookDetailModal } from '../../components/BookDetailModal';
import { TabBarVisibilityContext } from './_layout';
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
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>(['Algorithms', 'Nursing', 'Psychology']);
  const [recentItems, setRecentItems] = useState<CatalogBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<CatalogBook | null>(null);
  const insets = useSafeAreaInsets();
  
  const { setTabBarVisible } = React.useContext(TabBarVisibilityContext);
  const lastOffsetY = useRef(0);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LiteratureBook[]>('/literatures/books');
      const formatted: CatalogBook[] = (res.data || [])
        .filter((b) => !b.is_archived)
        .map((b) => ({
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
        library_use_only: Boolean(b.library_use_only),
        tags: b.library_use_only ? [b.genre, b.condition || 'GOOD', 'Library Use Only'] : [b.genre, b.condition || 'GOOD'],
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

  const renderCatalogItem = ({ item, index }: { item: CatalogBook; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === filteredBooks.length - 1;

    return (
    <TouchableOpacity onPress={() => handleBookPress(item)} activeOpacity={0.7} style={{ paddingHorizontal: 20 }}>
      <XStack
        alignItems="center"
        backgroundColor={theme.card}
        padding={16}
        borderLeftWidth={1}
        borderRightWidth={1}
        borderTopWidth={isFirst ? 1 : 0}
        borderBottomWidth={1}
        borderBottomColor={isLast ? theme.border : theme.border}
        borderLeftColor={theme.border}
        borderRightColor={theme.border}
        borderTopColor={theme.border}
        borderTopLeftRadius={isFirst ? 24 : 0}
        borderTopRightRadius={isFirst ? 24 : 0}
        borderBottomLeftRadius={isLast ? 24 : 0}
        borderBottomRightRadius={isLast ? 24 : 0}
      >
        <YStack
          width={72}
          height={96}
          borderRadius={12}
          borderWidth={1}
          borderColor={theme.border}
          justifyContent="center"
          alignItems="center"
          marginRight="$3"
          backgroundColor={theme.background}
        >
          <BookOpen color={theme.primary} size={24} />
        </YStack>
        <YStack flex={1}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <Text fontSize={18} fontWeight="600" color={theme.text} marginBottom={3} flex={1} marginRight="$2" numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite(item);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
              style={{ padding: 3, minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end', marginTop: -12, marginRight: -12 }}
            >
              <Heart
                color={isFavorite(item.id) ? '#ef4444' : '#cbd5e1'}
                size={18}
                fill={isFavorite(item.id) ? '#ef4444' : 'none'}
              />
            </TouchableOpacity>
          </XStack>
          <Text fontSize={14} fontWeight="500" color={theme.textSecondary} marginBottom="$2" numberOfLines={1}>
            {item.author}
          </Text>
          <XStack alignItems="center" flexWrap="wrap" gap={8}>
            <Text fontSize={12} fontWeight="500" color={theme.textSecondary}>
              {item.tags?.slice(0, 2).join(', ')}
            </Text>
            <Text fontSize={12} color="#d1d5db">•</Text>
            <XStack alignItems="center" gap={4}>
              <View width={6} height={6} borderRadius={3} backgroundColor={item.available > 0 ? '#10b981' : '#ef4444'} />
              <Text fontSize={12} fontWeight="500" color={theme.textSecondary}>
                {item.available > 0 ? `${item.available} of ${item.total} Available` : 'Out'}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </TouchableOpacity>
  );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pillContainer }}>
      <BookDetailModal
        isOpen={!!selectedBook}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        isFavorite={selectedBook ? isFavorite(selectedBook.id) : false}
        onToggleFavorite={() => selectedBook && toggleFavorite(selectedBook)}
      />

      {/* Header */}
      <YStack paddingTop="$4" paddingHorizontal="$5" paddingBottom="$4" backgroundColor={theme.card}>
        <Text fontSize={24} fontWeight="800" color={theme.text} marginBottom="$3">
          Search Catalog
        </Text>
        <XStack
          alignItems="center"
          backgroundColor={theme.background}
          borderRadius={16}
          paddingHorizontal="$4"
          height={48}
          borderWidth={1}
          borderColor={theme.border}
        >
          <SearchIcon color={theme.textSecondary} size={20} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: theme.text }}
            placeholder="Search books, research, magazines..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </XStack>
      </YStack>

      {/* Auto-Suggestions */}
      {searchQuery.length > 0 && (
        <YStack backgroundColor={theme.card} paddingHorizontal="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor={theme.border} zIndex={10}>
          {getSuggestions().map((suggestion, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSearchQuery(suggestion)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.pillContainer }}
            >
              <XStack alignItems="center">
                <SearchIcon color={theme.textSecondary} size={16} style={{ marginRight: 10 }} />
                <Text color={theme.text} fontSize={15} fontWeight="500">{suggestion}</Text>
              </XStack>
            </TouchableOpacity>
          ))}
          {getSuggestions().length === 0 && (
            <Text color={theme.textSecondary} fontSize={14} paddingVertical={12}>No suggestions found</Text>
          )}
        </YStack>
      )}

      {/* Catalog — the only unbounded list here, so it's the one virtualized with FlatList */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => renderCatalogItem({ item, index })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 98 }}
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
        ListHeaderComponent={
          <YStack>
            {/* Unified Filter System */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              style={{ marginBottom: 20, marginTop: 16 }}
            >
              {tabs.map((tab, idx) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={`tab-${idx}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(tab);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? theme.primary : theme.background,
                      paddingHorizontal: 16,
                      minHeight: 36,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: isActive ? theme.primary : theme.border,
                    }}
                  >
                    {(tab === 'All' || tab === 'Books' || tab === 'Research') && (
                      <BookOpen color={isActive ? theme.card : theme.textSecondary} size={14} style={{ marginRight: 6 }} />
                    )}
                    <Text color={isActive ? theme.card : theme.textSecondary} fontSize={14} fontWeight={isActive ? '600' : '500'}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {popularSearches.map((tag, idx) => (
                <TouchableOpacity
                  key={`tag-${idx}`}
                  onPress={() => setSearchQuery(tag)}
                  style={{
                    backgroundColor: theme.background,
                    paddingHorizontal: 16,
                    minHeight: 36,
                    justifyContent: 'center',
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text color={theme.primary} fontSize={14} fontWeight="500">
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recently Viewed */}
            {recentItems.length > 0 && (
              <YStack paddingHorizontal="$5" marginBottom="$5">
                <XStack alignItems="center" marginBottom="$3">
                  <Clock color={theme.primary} size={16} />
                  <Text fontSize={18} fontWeight="600" color={theme.text} marginLeft="$2">
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
                        backgroundColor={theme.primary}
                        position="relative"
                      >
                        <BookOpen color={theme.pillTextActive} size={32} opacity={0.6} />
                        <YStack
                          position="absolute"
                          top={8}
                          left={8}
                          right={40}
                          backgroundColor={theme.card}
                          paddingHorizontal="$1.5"
                          paddingVertical={3}
                          borderRadius={6}
                          alignSelf="flex-start"
                        >
                          <Text fontSize={12} fontWeight="700" color={theme.textSecondary} textTransform="uppercase" numberOfLines={1} ellipsizeMode="tail">
                            {item.type}
                          </Text>
                        </YStack>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            toggleFavorite(item);
                          }}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          accessibilityRole="button"
                          accessibilityLabel={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: 5,
                            borderRadius: 10,
                            minHeight: 48,
                            minWidth: 48,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Heart
                            color={isFavorite(item.id) ? '#ef4444' : theme.textSecondary}
                            size={18}
                            fill={isFavorite(item.id) ? '#ef4444' : 'none'}
                          />
                        </TouchableOpacity>
                      </YStack>
                      <Text fontSize={18} fontWeight="600" color={theme.text} numberOfLines={2} marginBottom={2}>
                        {item.title}
                      </Text>
                      <Text fontSize={12} fontWeight="500" color={theme.textSecondary} numberOfLines={1}>
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
            <YStack backgroundColor={theme.card} borderRadius={24} borderWidth={1} borderColor={theme.border} marginHorizontal={20} overflow="hidden">
              {[1, 2, 3, 4].map((i) => (
                <XStack key={i} alignItems="center" padding={16} borderBottomWidth={i !== 4 ? 1 : 0} borderBottomColor={theme.border}>
                  <YStack width={72} height={96} borderRadius={12} backgroundColor={theme.pillContainer} marginRight="$3" />
                  <YStack flex={1} gap={8}>
                    <YStack height={16} width="80%" backgroundColor={theme.pillContainer} borderRadius={4} />
                    <YStack height={14} width="50%" backgroundColor={theme.pillContainer} borderRadius={4} />
                    <YStack height={12} width="30%" backgroundColor={theme.pillContainer} borderRadius={4} marginTop={8} />
                  </YStack>
                </XStack>
              ))}
            </YStack>
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
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text fontSize={12} color={theme.primary} fontWeight="700">
                  Tap to retry
                </Text>
              </TouchableOpacity>
            </YStack>
          ) : (
            <YStack
              backgroundColor={theme.card}
              borderRadius={16}
              padding="$5"
              alignItems="center"
              borderWidth={1}
              borderColor={theme.border}
              marginHorizontal="$5"
            >
              <BookOpen color={theme.textSecondary} size={32} strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <Text color={theme.textSecondary} fontSize={14} fontWeight="500">
                No books found
              </Text>
            </YStack>
          )
        }
      />
    </SafeAreaView>
  );
}
