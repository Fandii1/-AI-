import React from 'react';
import { NovelItem } from '../types';
import { BookOpen, User, Tag, Star, ChevronRight, Heart, Database } from 'lucide-react';

interface NovelCardProps {
  item: NovelItem;
  onSelect: (item: NovelItem) => void;
  isFavorite: boolean;
}

export const NovelCard: React.FC<NovelCardProps> = ({ item, onSelect, isFavorite }) => {
  // Check if this novel is in local cache (just a quick check based on key existence)
  const isCached = !!localStorage.getItem(`novel_cache_${item.title}_${item.author}`);

  return (
    <div 
      onClick={() => onSelect(item)}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-purple-200 transition-all flex flex-col h-full group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      {/* Indicators */}
      <div className="absolute top-3 right-3 flex gap-1 z-20">
         {isCached && (
             <div className="bg-blue-100 text-blue-600 p-1 rounded-full" title="已缓存，可直接查看">
                <Database className="w-3 h-3" />
             </div>
         )}
         {isFavorite && (
             <div className="bg-red-100 text-red-500 p-1 rounded-full">
                <Heart className="w-3 h-3 fill-current" />
             </div>
         )}
      </div>

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="pr-8">
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-purple-700 transition-colors line-clamp-1" title={item.title}>
            {item.title}
          </h3>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <User className="w-3 h-3 mr-1" />
            <span>{item.author}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className={`px-1.5 py-0.5 rounded ${item.status === '完结' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {item.status}
            </span>
          </div>
        </div>
        {item.rating && item.rating !== '-' && (
            <div className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                {item.rating}
            </div>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1 leading-relaxed relative z-10">
        {item.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto relative z-10">
         <div className="flex gap-2 overflow-hidden">
            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs truncate">
                <Tag className="w-3 h-3 mr-1" />
                {item.genre}
            </span>
            {item.platform && item.platform !== 'Unknown' && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-600 text-xs truncate">
                   {item.platform}
                </span>
            )}
         </div>
         <span className="p-1.5 rounded-full bg-slate-50 group-hover:bg-purple-600 group-hover:text-white transition-colors text-slate-400">
             <ChevronRight className="w-4 h-4" />
         </span>
      </div>
    </div>
  );
};