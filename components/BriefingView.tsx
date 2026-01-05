import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
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

  if (status === AppStatus.IDLE || status === AppStatus.FETCHING_NEWS) {
      return (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 sticky top-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative group">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <FileText className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity z-10" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 mb-2">等待生成简报</h3>
              <p className="text-sm opacity-60 max-w-[200px] mx-auto leading-relaxed">
                AI 将分析新闻并为您撰写专属的早安简报
              </p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] sticky top-24 ring-1 ring-slate-900/5">
      
      {/* Header Section */}
      <div className="bg-slate-50 p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                 <Sparkles className="w-4 h-4" />
             </div>
             <div>
                 <h3 className="font-bold text-slate-800 text-sm">AI 智能简报</h3>
                 <p className="text-xs text-slate-500">Gemini 2.0 Flash 实时生成</p>
             </div>
          </div>
          
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider mt-2">
              <span>简报内容</span>
              {status === AppStatus.READY && <span className="text-green-600">已完成</span>}
          </div>
      </div>

      {/* Script Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth custom-scrollbar">
        {isAnalyzing ? (
            <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                </div>
            </div>
        ) : (
            <article className="prose prose-slate prose-sm max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium font-serif">
                    {summary}
                </div>
            </article>
        )}
      </div>

      <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-[10px] text-slate-400 shrink-0">
          Powered by Gemini 2.0 Flash
      </div>
    </div>
  );
};