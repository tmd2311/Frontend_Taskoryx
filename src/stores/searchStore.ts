import { create } from 'zustand';
import type { SearchResult, User, SpringPage } from '../types';
import { searchService } from '../services/searchService';

interface SearchState {
  result: SearchResult | null;
  userSuggestions: SpringPage<User> | null;
  isLoading: boolean;
  isSearchingUsers: boolean;
  lastQuery: string;

  search: (q: string) => Promise<void>;
  /** Tìm user cho assign hoặc @mention */
  searchUsers: (keyword: string, page?: number) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  result: null,
  userSuggestions: null,
  isLoading: false,
  isSearchingUsers: false,
  lastQuery: '',

  search: async (q) => {
    if (!q.trim()) {
      set({ result: null, lastQuery: '' });
      return;
    }
    set({ isLoading: true, lastQuery: q });
    try {
      const result = await searchService.search({ q });
      set({ result, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  searchUsers: async (keyword, page = 0) => {
    if (!keyword.trim()) {
      set({ userSuggestions: null });
      return;
    }
    set({ isSearchingUsers: true });
    try {
      const page0 = await searchService.searchUsers({ keyword, page, size: 10 });
      set({ userSuggestions: page0, isSearchingUsers: false });
    } catch {
      set({ isSearchingUsers: false });
    }
  },

  clearResults: () => set({ result: null, userSuggestions: null, lastQuery: '' }),
}));
