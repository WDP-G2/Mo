import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1507514604110-ba3347c457f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

export function mapNewsArticle(article) {
  if (!article) return null;

  return {
    id: String(article.id || article._id),
    title: article.title || '',
    summary: article.summary || article.shortDescription || '',
    content: article.content || '',
    imageUrl: article.imageUrl || article.thumbnail || FALLBACK_THUMBNAIL,
    category: article.category || 'Tin tức',
    author: article.author || article.authorName || article.createdBy || 'Ban quản trị',
    publishedAt: article.publishedAt || article.createdAt,
    featured: Boolean(article.featured),
    status: article.status || 'published',
  };
}

export const newsService = {
  async list(params = {}) {
    const list = await apiRequest(ENDPOINTS.news.list, { params });
    return (Array.isArray(list) ? list : []).map(mapNewsArticle).filter(Boolean);
  },
};

