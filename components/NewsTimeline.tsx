import React from 'react';
import { NewsItem } from '../types';
import { NewsCard } from './NewsCard';
import { Calendar } from 'lucide-react';

interface NewsTimelineProps {
  news: NewsItem[];
  loading: boolean;
}

export const NewsTimeline: React.FC<NewsTimelineProps> = ({ news, loading }) => {
  // Group by date
  const groupedNews = news.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedNews).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) {
      return (
        <div className="space-y-8 p-4">
             <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-6"></div>
             <div className="space-y-4">
                {[1,2,3].map(i => (
                    <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse"></div>
                ))}
             </div>
        </div>
      );
  }

  if (news.length === 0) {
      return (
        <div className="text-center py-20 text-slate-400">
             <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p>暂无新闻数据</p>
        </div>
      );
  }

  return (
    <div className="space-y-8 pb-12">
      {sortedDates.map((date) => (
        <div key={date} className="relative">
            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-4 mb-4 border-b border-slate-200/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center uppercase tracking-wider">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                    {date}
                </h3>
            </div>
            <div className="space-y-0 pl-2">
                {groupedNews[date].map((item, idx) => (
                    <NewsCard key={`${date}-${idx}`} item={item} />
                ))}
            </div>
        </div>
      ))}
    </div>
  );
};