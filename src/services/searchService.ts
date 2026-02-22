import api from './api';
import type { SearchResult, SearchParams, User, SpringPage, UserSearchParams } from '../types';

export const searchService = {
  /**
   * GET /search?q=
   * Tìm kiếm toàn cục – trả về { keyword, projects, users }
   * Lưu ý: API không trả tasks trong global search
   */
  search: async (params: SearchParams): Promise<SearchResult> => {
    const response: any = await api.get('/search', { params });
    return response.data ?? response;
  },

  /**
   * GET /users/search?keyword=&page=0&size=20
   * Tìm kiếm user để assign hoặc @mention
   * Params: keyword (không phải q), page, size
   */
  searchUsers: async (params: UserSearchParams): Promise<SpringPage<User>> => {
    const response: any = await api.get('/users/search', { params });
    return response.data ?? response;
  },
};
