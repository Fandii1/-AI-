import React from 'react';
import { NovelItem } from '../types';
import { NovelCard } from './NovelCard';
import { Book, Heart } from 'lucide-react';

interface NovelListProps {
  novels: NovelItem[];
  loading: boolean;
  genre: string;
  onSelectNovel: (novel: NovelItem) => void;
  favorites: NovelItem[];
}

export const NovelList: React.FC<NovelListProps> = ({ novels, loading, genre, onSelectNovel, favorites }) => {
  
  const isFavorite = (item: NovelItem) => {
      return favorites.some(f => f.title === item.title && f.author === item.author);
  };

  if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {[1,2,3,4].map(i => (
                <div key={i} className="h-48 bg-white rounded-xl border border-slate-100 animate-pulse p-5">
                   <div className="flex justify-between mb-4">
                      <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
                      <div className="h-6 w-10 bg-slate-200 rounded"></div>
                   </div>
                   <div className="h-4 w-full bg-slate-100 rounded mb-2"></div>
                   <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                </div>
            ))}
        </div>
      );
  }

  if (!loading && novels.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 mt-6">
             {genre === '收藏' ? (
                 <>
                    <Heart className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400">您还没有收藏任何小说</p>
                 </>
             ) : (
                 <>
                    <Book className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400">暂无推荐，点击“搜索”开始发现</p>
                 </>
             )}
        </div>
      );
  }

  return (
    <div className="mt-6">
       <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
             {genre === '收藏' ? <Heart className="w-5 h-5 mr-2 text-red-500" /> : <Book className="w-5 h-5 mr-2 text-purple-600" />}
             {genre}
          </h2>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full">
            {novels.length} 本
          </span>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {novels.map((item, idx) => (
             <NovelCard 
                key={`${item.title}-${idx}`} 
                item={item} 
                onSelect={onSelectNovel}
                isFavorite={isFavorite(item)}
             />
          ))}
       </div>
    </div>
  );
};