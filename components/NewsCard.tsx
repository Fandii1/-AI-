import React from 'react';
import { NewsItem } from '../types';
import { ExternalLink } from 'lucide-react';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <div className="group relative bg-white pl-6 pb-6 pt-2 border-l-2 border-slate-200 hover:border-blue-500 transition-colors">
      {/* Timeline dot */}
      <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-slate-200 group-hover:border-blue-500 transition-colors"></div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
          {item.category}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2 leading-snug group-hover:text-blue-700 transition-colors">
        {item.headline}
      </h3>
      
      <p className="text-slate-600 text-sm mb-3 leading-relaxed">
        {item.summary}
      </p>
      
      {item.sources && item.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.sources.slice(0, 1).map((source, idx) => (
            <a 
              key={idx}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 px-2 py-1 rounded"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              <span className="truncate max-w-[150px]">{source.title}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};