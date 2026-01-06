import React from 'react';
import { NewsItem } from '../types';
import { ExternalLink } from 'lucide-react';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <div className="group relative bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 ml-8">
      {/* Timeline dot */}
      <div className="absolute -left-[39px] top-6 w-4 h-4 rounded-full bg-slate-50 border-4 border-slate-300 group-hover:border-blue-500 group-hover:scale-110 transition-all z-10"></div>
      
      {/* Connecting line for dot to card */}
      <div className="absolute -left-[23px] top-[29px] w-[23px] h-[2px] bg-slate-200 group-hover:bg-blue-200 transition-colors"></div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
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
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-50">
          {item.sources.slice(0, 2).map((source, idx) => (
            <a 
              key={idx}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded-md"
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