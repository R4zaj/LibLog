import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface FavoriteBook {
  id: number | string;
  title: string;
  author: string;
  genre?: string;
  shelf?: string;
  available?: number;
  total?: number;
  condition?: string;
  year?: number | string;
  isbn?: string;
  lccn?: string;
  tags?: string[];
  typeColor?: string;
  coverColor?: string;
  type?: string;
  favoritedAt?: number;
}

interface FavoritesContextType {
  favorites: FavoriteBook[];
  isFavorite: (id: number | string) => boolean;
  toggleFavorite: (book: any) => Promise<boolean>;
  addFavorite: (book: any) => Promise<void>;
  removeFavorite: (id: number | string) => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `@favorites_${user?.id || 'guest'}`;

  // Load favorites when user or storage key changes
  useEffect(() => {
    let isMounted = true;
    const loadFavorites = async () => {
      try {
        setIsLoading(true);
        const stored = await AsyncStorage.getItem(storageKey);
        if (isMounted) {
          if (stored) {
            setFavorites(JSON.parse(stored));
          } else {
            setFavorites([]);
          }
        }
      } catch (err) {
        console.error('Failed to load favorite books:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFavorites();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const isFavorite = (id: number | string) => {
    return favorites.some((item) => String(item.id) === String(id));
  };

  const addFavorite = async (book: any) => {
    if (isFavorite(book.id)) return;
    const cleanBook: FavoriteBook = {
      id: book.id,
      title: book.title || 'Untitled Book',
      author: book.author || 'Unknown Author',
      genre: book.genre || book.type || 'Book',
      shelf: book.shelf || 'Main Section',
      available: typeof book.available === 'number' ? book.available : 0,
      total: typeof book.total === 'number' ? book.total : 1,
      condition: book.condition || 'GOOD',
      year: book.year || '',
      isbn: book.isbn || '',
      lccn: book.lccn || '',
      tags: book.tags || [book.genre || 'Book'],
      typeColor: book.typeColor || '#8b5cf6',
      coverColor: book.coverColor || '#6C48C5',
      type: book.type || book.genre || 'Book',
      favoritedAt: Date.now(),
    };

    const updated = [cleanBook, ...favorites];
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save favorites to storage:', err);
    }
  };

  const removeFavorite = async (id: number | string) => {
    const updated = favorites.filter((item) => String(item.id) !== String(id));
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to remove favorite from storage:', err);
    }
  };

  const toggleFavorite = async (book: any): Promise<boolean> => {
    if (isFavorite(book.id)) {
      await removeFavorite(book.id);
      return false;
    } else {
      await addFavorite(book);
      return true;
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}
