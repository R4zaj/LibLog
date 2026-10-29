import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Heart, X, MapPin, CheckCircle2, BookOpen, QrCode, ArrowLeft, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiteratureBook, UserPenaltiesResponse } from '../types/api';
import { useAuth } from '../context/AuthContext';
import api from '../api';

let cachedDailyPenaltyRate: number | null = null;

interface BookDetailModalProps {
  isOpen: boolean;
  book: LiteratureBook | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  penaltyPerDay?: number;
}

export function BookDetailModal({
  isOpen,
  book,
  onClose,
  isFavorite,
  onToggleFavorite,
  penaltyPerDay,
}: BookDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [fetchedRate, setFetchedRate] = useState<number | null>(cachedDailyPenaltyRate);

  useEffect(() => {
    if (typeof penaltyPerDay === 'number' && penaltyPerDay > 0) {
      cachedDailyPenaltyRate = penaltyPerDay;
      setFetchedRate(penaltyPerDay);
      return;
    }
    if (!isOpen || cachedDailyPenaltyRate !== null || !user?.id) return;
    let active = true;
    api
      .get<UserPenaltiesResponse>(`/borrowing/user/${user.id}/penalties`)
      .then((res) => {
        const rate = res.data?.rules?.penalty_fee_per_day;
        if (typeof rate === 'number' && rate > 0) {
          cachedDailyPenaltyRate = rate;
          if (active) setFetchedRate(rate);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, penaltyPerDay, user?.id]);

  const effectivePenaltyRate =
    typeof penaltyPerDay === 'number' && penaltyPerDay > 0
      ? penaltyPerDay
      : fetchedRate ?? 5.0;

  if (!book) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
              
              {/* Cover Placeholder Hero Well */}
              <View style={styles.coverWell}>
                <View style={styles.topPillsRow}>
                  <View style={styles.pillBadge}>
                    <Text style={styles.genreText} numberOfLines={1}>{book.genre || 'Book'}</Text>
                  </View>
                  {book.library_use_only && (
                    <View style={[styles.pillBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                      <Text style={[styles.genreText, { color: '#b45309' }]}>In Circulation • Library Use Only</Text>
                    </View>
                  )}
                  {book.is_archived && (
                    <View style={[styles.pillBadge, { backgroundColor: '#fee2e2' }]}>
                      <Text style={[styles.genreText, { color: '#dc2626' }]}>Archived</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.rightActions}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <View style={[styles.actionChip, isFavorite && { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Heart
                        color={isFavorite ? '#ef4444' : '#6C48C5'}
                        size={20}
                        fill={isFavorite ? '#ef4444' : 'none'}
                      />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <View style={styles.actionChip}>
                      <ArrowLeft color="#6C48C5" size={20} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.iconDisc}>
                  <BookOpen size={32} color="#6C48C5" strokeWidth={2} />
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
                {/* Title Block */}
                <View style={styles.titleBlock}>
                  <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.author} numberOfLines={1}>By {book.author}</Text>
                </View>

                {/* 3-Pill Status Grid */}
                <View style={styles.statusGrid}>
                  <View style={styles.statusMiniCard}>
                    <MapPin color="#6C48C5" size={16} style={{ marginBottom: 4 }} />
                    <Text style={styles.statusValue} numberOfLines={1}>{book.shelf || 'N/A'}</Text>
                    <Text style={styles.statusLabel}>Shelf</Text>
                  </View>
                  <View style={styles.statusMiniCard}>
                    <CheckCircle2 color={book.condition === 'POOR' ? '#ef4444' : '#10b981'} size={16} style={{ marginBottom: 4 }} />
                    <Text style={[styles.statusValue, { color: book.condition === 'POOR' ? '#ef4444' : '#10b981' }]} numberOfLines={1}>{book.condition || 'GOOD'}</Text>
                    <Text style={styles.statusLabel}>Condition</Text>
                  </View>
                  <View style={styles.statusMiniCard}>
                    <BookOpen color={book.available > 0 ? '#10b981' : '#ef4444'} size={16} style={{ marginBottom: 4 }} />
                    <Text style={[styles.statusValue, { color: book.available > 0 ? '#10b981' : '#ef4444' }]} numberOfLines={1}>
                      {book.available}/{book.total}
                    </Text>
                    <Text style={styles.statusLabel}>Copies</Text>
                  </View>
                </View>

                {/* Secondary Identifiers Tray */}
                <View style={styles.secondaryTray}>
                  <View style={styles.secondaryRow}>
                    <Text style={styles.secondaryLabel}>Published Year</Text>
                    <Text style={styles.secondaryValue}>{book.year}</Text>
                  </View>
                  <View style={styles.secondaryDivider} />
                  <View style={styles.secondaryRow}>
                    <Text style={styles.secondaryLabel}>ISBN</Text>
                    <Text style={styles.secondaryValue}>{book.isbn}</Text>
                  </View>
                  <View style={styles.secondaryDivider} />
                  <View style={styles.secondaryRow}>
                    <Text style={styles.secondaryLabel}>Call No. / LCCN</Text>
                    <Text style={styles.secondaryValue}>{book.lccn}</Text>
                  </View>
                  {!book.library_use_only && !book.is_archived && (
                    <>
                      <View style={styles.secondaryDivider} />
                      <View style={styles.secondaryRow}>
                        <Text style={styles.secondaryLabel}>Overdue Penalty</Text>
                        <Text style={[styles.secondaryValue, { color: '#dc2626', fontWeight: '700' }]}>
                          ₱{effectivePenaltyRate.toFixed(2)} / day
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Footer Action Card */}
                {book.is_archived ? (
                  <View style={[styles.footerActionCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <View style={[styles.qrChip, { backgroundColor: '#fee2e2' }]}>
                      <Archive color="#dc2626" size={24} />
                    </View>
                    <Text style={[styles.footerActionText, { color: '#b91c1c' }]}>
                      This book has been archived and is not available for borrowing.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.footerActionCard}>
                    <View style={styles.qrChip}>
                      <QrCode color="#6C48C5" size={24} />
                    </View>
                    <Text style={styles.footerActionText}>
                      {book.library_use_only
                        ? 'In Circulation: Library use only. Locate on shelf to read inside the library (cannot be taken outside).'
                        : 'Locate this book on its shelf and scan its QR barcode to borrow.'}
                    </Text>
                  </View>
                )}
              </ScrollView>
              
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ede9f6',
    padding: 20,
    elevation: 6,
    boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.06)',
  },
  coverWell: {
    width: '100%',
    height: 180,
    backgroundColor: '#faf9fe',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ede9f6',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f4f1fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPillsRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  pillBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#ede9f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genrePill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ffffff',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#ede9f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '60%',
  },
  genreText: {
    color: '#6C48C5',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede9f6',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  titleBlock: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e1e2e',
    marginBottom: 4,
    lineHeight: 30,
  },
  author: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  statusMiniCard: {
    flex: 1,
    backgroundColor: '#faf9fe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ede9f6',
    padding: 10,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1e2e',
    marginBottom: 2,
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
  },
  secondaryTray: {
    backgroundColor: '#faf9fe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7c7c8a',
  },
  secondaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e2e',
  },
  secondaryDivider: {
    height: 1,
    backgroundColor: '#ede9f6',
    marginVertical: 12,
  },
  footerActionCard: {
    backgroundColor: '#f4f1fa',
    borderWidth: 1,
    borderColor: '#ede9f6',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  footerActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6C48C5',
    lineHeight: 18,
  },
});
