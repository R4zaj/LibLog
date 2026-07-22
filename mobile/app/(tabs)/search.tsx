import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Search as SearchIcon, BookOpen, Clock, X } from 'lucide-react-native';
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
          typeColor: b.genre?.includes('Magazine') ? '#f97316' : b.genre?.includes('Research') ? '#3b82f6' : '#8b5cf6'
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

  const filteredBooks = books.filter((b: any) => 
    (activeTab === 'All' || b.tags?.[0]?.includes(activeTab)) &&
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Catalog</Text>
        <View style={styles.searchBar}>
          <SearchIcon color="#9ca3af" size={20} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search books, research, magazines..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.popularSection}>
          <View style={styles.sectionHeaderRow}>
            <TrendingUpIcon />
            <Text style={styles.sectionTitleSmall}>POPULAR</Text>
          </View>
          <View style={styles.popularTags}>
            {popularSearches.map((tag, idx) => (
              <TouchableOpacity key={idx} style={styles.popTagBtn}>
                <Text style={styles.popTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsContainer} contentContainerStyle={{ paddingRight: 16 }}>
          {tabs.map((tab, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'All' && <SearchIcon color={activeTab === tab ? '#fff' : '#6b7280'} size={14} style={{ marginRight: 6 }} />}
              {tab === 'Books' && <BookOpen color={activeTab === tab ? '#fff' : '#6b7280'} size={14} style={{ marginRight: 6 }} />}
              {tab === 'Research' && <BookOpen color={activeTab === tab ? '#fff' : '#6b7280'} size={14} style={{ marginRight: 6 }} />}
              <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeaderRow2}>
          <Clock color="#6C48C5" size={16} />
          <Text style={styles.sectionTitleMd}>Recently Viewed</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll} contentContainerStyle={{ paddingRight: 16 }}>
          {recentItems.map(item => (
            <View key={item.id} style={styles.recentCard}>
              <View style={[styles.recentCover, { backgroundColor: item.coverColor }]}>
                <BookOpen color="#fff" size={32} opacity={0.6} />
                <View style={styles.recentTypeTag}><Text style={styles.recentTypeTagText}>{item.type}</Text></View>
              </View>
              <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.recentAuthor} numberOfLines={1}>{item.author}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Catalog List */}
        <View style={styles.catalogList}>
          {loading ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#6b7280' }}>Loading catalog...</Text>
          ) : filteredBooks.map((item: any) => (
            <View key={item.id} style={styles.catalogItem}>
              <View style={[styles.catCover, { backgroundColor: item.typeColor === '#f97316' ? '#fff1f2' : item.typeColor === '#3b82f6' ? '#eff6ff' : '#f3e8ff' }]}>
                <BookOpen color={item.typeColor} size={28} opacity={0.8} />
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catTitle}>{item.title}</Text>
                <Text style={styles.catAuthor}>{item.author}</Text>
                <View style={styles.catTagsRow}>
                  {item.tags?.slice(0,2).map((tag: string, idx: number) => (
                    <View key={idx} style={[styles.catTag, idx === 0 && { backgroundColor: item.typeColor + '20' }]}>
                      <Text style={[styles.catTagText, idx === 0 && { color: item.typeColor, fontWeight: 'bold' }]}>{tag}</Text>
                    </View>
                  ))}
                  <View style={styles.catAvail}>
                    <View style={[styles.availDot, { backgroundColor: item.availColor }]} />
                    <Text style={[styles.availText, { color: item.availColor }]}>{item.avail}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const TrendingUpIcon = () => (
  <Text style={{ color: '#6C48C5', marginRight: 4, fontWeight: 'bold' }}>↗</Text>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#e5e7eb', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  
  scrollContent: { paddingBottom: 40 },
  popularSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', letterSpacing: 1 },
  popularTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popTagBtn: { backgroundColor: '#fcfaff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#f3e8ff' },
  popTagText: { color: '#6C48C5', fontSize: 13, fontWeight: '500' },

  filterTabsContainer: { paddingLeft: 16, marginBottom: 24 },
  filterTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterTabActive: { backgroundColor: '#6C48C5' },
  filterTabText: { color: '#4b5563', fontSize: 14, fontWeight: '500' },
  filterTabTextActive: { color: '#fff', fontWeight: 'bold' },

  sectionHeaderRow2: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  sectionTitleMd: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginLeft: 8 },

  recentScroll: { paddingLeft: 16, marginBottom: 24 },
  recentCard: { width: 120, marginRight: 16 },
  recentCover: { height: 160, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative' },
  recentTypeTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  recentTypeTagText: { fontSize: 9, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  recentTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  recentAuthor: { fontSize: 11, color: '#9ca3af' },

  catalogList: { paddingHorizontal: 16 },
  catalogItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catCover: { width: 64, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catInfo: { flex: 1 },
  catTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  catAuthor: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  catTagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  catTag: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  catTagText: { fontSize: 11, color: '#6b7280' },
  catAvail: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  availDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  availText: { fontSize: 11, fontWeight: 'bold' },
});
