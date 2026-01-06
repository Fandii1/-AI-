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
    // Safety check for date, default to a generic "Recent" key if absolutely missing (shouldn't happen with normalizeDate)
    const date = item.date || '未知日期';
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);

  // Sort dates descending with safety check for NaNs
  const sortedDates = Object.keys(groupedNews).sort((a, b) => {
      const timeA = new Date(a).getTime();
      const timeB = new Date(b).getTime();
      
      // Handle invalid dates by pushing them to the end
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      
      return timeB - timeA;
  });

  const formatDateZH = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr; // Fallback to raw string if parsing fails
        
        const today = new Date();
        const isToday = d.getDate() === today.getDate() && 
                        d.getMonth() === today.getMonth() && 
                        d.getFullYear() === today.getFullYear();
        
        // Full Chinese Date Format: 2024年5月20日 星期一
        const datePart = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        
        return isToday ? `今天 · ${datePart}` : datePart;
    } catch {
        return dateStr;
    }
  };

  if (loading) {
      return (
        <div className="space-y-8 p-4">
             <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6"></div>
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
        <div key={date} className="relative animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Date Header */}
            <div className="sticky top-0 z-10 py-4 mb-4">
                 <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/50 -mx-4 px-4 sm:mx-0 sm:px-0"></div>
                 <h3 className="relative text-base font-bold text-slate-900 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">
                        <Calendar className="w-4 h-4" />
                    </span>
                    {formatDateZH(date)}
                </h3>
            </div>
            
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-slate-200/50 z-0"></div>

            <div className="space-y-6 pl-2 relative z-0">
                {groupedNews[date].map((item, idx) => (
                    <div 
                        key={`${date}-${item.headline}-${idx}`} 
                        className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards hover:translate-x-1 transition-transform" 
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <NewsCard item={item} />
                    </div>
                ))}
            </div>
        </div>
      ))}
    </div>
  );
};