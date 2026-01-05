import React from 'react';
import { FileText, Mic, Sparkles } from 'lucide-react';
import { AppStatus } from '../types';
import { PodcastPlayer } from './PodcastPlayer';

interface BriefingViewProps {
  status: AppStatus;
  summary: string;
  audioData: string | null;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ 
  status, 
  summary, 
  audioData
}) => {
  
  const hasContent = status === AppStatus.READY || status === AppStatus.GENERATING_AUDIO;
  const isAnalyzing = status === AppStatus.ANALYZING;
  const isGeneratingAudio = status === AppStatus.GENERATING_AUDIO;

  if (status === AppStatus.IDLE || status === AppStatus.FETCHING_NEWS) {
      return (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 sticky top-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative group">
                  <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Mic className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity z-10" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 mb-2">等待生成播客</h3>
              <p className="text-sm opacity-60 max-w-[200px] mx-auto leading-relaxed">
                AI 将分析新闻并为您录制专属的早安简报
              </p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] sticky top-24 ring-1 ring-slate-900/5">
      
      {/* Audio Player Section */}
      <div className="bg-slate-50 p-6 border-b border-slate-100">
          {audioData ? (
             <PodcastPlayer audioBase64={audioData} />
          ) : (
             <div className="bg-white border border-slate-200 p-5 rounded-xl mb-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                    {isGeneratingAudio ? (
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Sparkles className="w-5 h-5 text-slate-300" />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                        {isGeneratingAudio ? "正在生成语音..." : "准备中..."}
                    </h3>
                    <p className="text-xs text-slate-500">
                        {isGeneratingAudio ? "AI 正在朗读新闻稿" : "等待文稿生成完毕"}
                    </p>
                </div>
             </div>
          )}
          
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
              <span>简报文稿</span>
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
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                    {summary}
                </div>
            </article>
        )}
      </div>

      <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-[10px] text-slate-400 shrink-0">
          Powered by Gemini 2.0 Flash & Gemini TTS
      </div>
    </div>
  );
};