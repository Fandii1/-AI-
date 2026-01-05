import React from 'react';
import { FileText, Sparkles, Quote } from 'lucide-react';
import { AppStatus } from '../types';

interface BriefingViewProps {
  status: AppStatus;
  summary: string;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ 
  status, 
  summary, 
}) => {
  
  const isAnalyzing = status === AppStatus.ANALYZING;

  // Idle state design for top layout
  if (status === AppStatus.IDLE || status === AppStatus.FETCHING_NEWS) {
      return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 rotate-3 group-hover:rotate-6 transition-transform">
                      <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
                      今日 AI 简报准备中
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                     点击右上角的“生成简报”按钮，AI 将为您聚合分析全球热点，生成专属的早安简报。
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-900/5 transition-all duration-500">
      
      {/* Header Section */}
      <div className="bg-slate-50/80 backdrop-blur p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <FileText className="w-5 h-5" />
             </div>
             <div>
                 <h3 className="font-bold text-slate-900 text-lg">智能简报核心</h3>
                 <p className="text-xs text-slate-500 font-medium">AI Generated Insight</p>
             </div>
          </div>
          
          {status === AppStatus.READY && (
             <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Analysis Complete
             </span>
          )}
      </div>

      {/* Script Content */}
      <div className="p-6 md:p-10 bg-white">
        {isAnalyzing ? (
            <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-8"></div>
                <div className="space-y-4">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                </div>
                <div className="space-y-4 pt-4">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                </div>
            </div>
        ) : (
            <div className="relative max-w-4xl mx-auto">
                <Quote className="absolute -left-8 -top-4 w-12 h-12 text-slate-100 -z-10" />
                <article className="prose prose-slate prose-lg max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium font-serif">
                        {summary}
                    </div>
                </article>
            </div>
        )}
      </div>
      
      {/* Footer decoration */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80"></div>
    </div>
  );
};