import React from 'react';
import { Volume2, FileText } from 'lucide-react';
import { AppStatus } from '../types';

interface BriefingViewProps {
  status: AppStatus;
  summary: string;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ 
  status, 
  summary, 
}) => {
  
  const hasContent = status === AppStatus.READY;
  const isGenerating = status === AppStatus.ANALYZING;

  if (status === AppStatus.IDLE || status === AppStatus.FETCHING_NEWS) {
      return (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 opacity-20" />
              </div>
              <p>智能简报尚未生成</p>
              <p className="text-sm mt-2 opacity-60">点击生成按钮开始分析</p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] sticky top-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shrink-0 relative overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
        
        <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold mb-1">AI 智能简报</h2>
                <div className="flex items-center text-xs text-slate-400 space-x-2">
                    <span className={`w-2 h-2 rounded-full ${hasContent ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                    <span>{hasContent ? '已生成' : '正在撰写中...'}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth custom-scrollbar">
        {isGenerating ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
            </div>
        ) : (
            <article className="prose prose-slate prose-sm md:prose-base max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {summary}
                </div>
            </article>
        )}
      </div>

      <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-xs text-slate-400 shrink-0">
          内容由 AI 生成，仅供参考
      </div>
    </div>
  );
};