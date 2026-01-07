
import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Share2, Loader2, MessageSquare, Headphones } from 'lucide-react';
import { AppStatus } from '../types';
import { PodcastPlayer } from './PodcastPlayer';

interface BriefingViewProps {
  status: AppStatus;
  summary: string;
  onOpenShare: (content: string) => void;
  onGeneratePodcast: () => void;
  podcastUrl: string | null;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ 
  status, 
  summary,
  onOpenShare,
  onGeneratePodcast,
  podcastUrl
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAnalyzing = status === AppStatus.ANALYZING;
  const isGeneratingPodcast = status === AppStatus.GENERATING_PODCAST;

  const handleShareImage = async () => {
    if (!contentRef.current) return;
    setIsGeneratingImage(true);

    try {
        const html2canvas = (await import('html2canvas')).default;
        await new Promise(resolve => setTimeout(resolve, 300));
        const EXPORT_WIDTH = 750; 

        const canvas = await html2canvas(contentRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: EXPORT_WIDTH, 
            windowWidth: EXPORT_WIDTH,
            scrollY: -window.scrollY,
            logging: false,
            onclone: (clonedDoc) => {
                const element = clonedDoc.querySelector('.briefing-card') as HTMLElement;
                if (element) {
                    element.style.width = `${EXPORT_WIDTH}px`;
                    element.style.maxWidth = 'none';
                    element.style.margin = '0';
                    element.style.boxShadow = 'none';
                    element.style.borderRadius = '0';
                    element.style.border = 'none';
                    element.style.padding = '40px'; 
                    
                    const btns = element.querySelector('.share-buttons');
                    if (btns) (btns as HTMLElement).style.display = 'none';

                    // Hide Podcast Player in image
                    const player = element.querySelector('.podcast-section');
                    if (player) (player as HTMLElement).style.display = 'none';

                    const images = element.querySelectorAll('img');
                    images.forEach((img: HTMLImageElement) => {
                         img.style.height = 'auto';
                         img.style.objectFit = 'contain';
                    });
                }
            }
        });

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = image;
        link.download = `MorningAI-Briefing-${dateStr}.png`;
        link.click();
    } catch (err) {
        console.error("Image generation failed", err);
        alert("生成图片失败，请重试");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3 border-l-4 border-blue-500 pl-3">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-slate-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.substring(2);
          const parts = content.split(/(\*\*.*?\*\*)/g);
          return (
              <li key={index} className="ml-4 list-disc text-slate-700 mb-1">
                 {parts.map((part, i) => {
                     if (part.startsWith('**') && part.endsWith('**')) {
                         return <strong key={i} className="text-slate-900 font-semibold">{part.slice(2, -2)}</strong>;
                     }
                     return part;
                 })}
              </li>
          );
      }
      if (line.trim() === '') return <br key={index} />;
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={index} className="mb-3 text-slate-700 leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-slate-900 font-semibold bg-slate-100 px-1 rounded">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  if (status === AppStatus.IDLE || status === AppStatus.FETCHING_NEWS) {
      return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 rotate-3 group-hover:rotate-6 transition-transform">
                      <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
                      AI 智能新闻分析师
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                     点击右上角的“生成简报”按钮，AI 将为您聚合分析国内外热点，并生成深度洞察报告。
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-900/5 transition-all duration-500 briefing-card"
        ref={contentRef}
    >
      
      {/* Header Section */}
      <div className="bg-slate-50/80 backdrop-blur p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 print:static">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <FileText className="w-5 h-5" />
             </div>
             <div>
                 <h3 className="font-bold text-slate-900 text-lg">AI 深度简报</h3>
                 <p className="text-xs text-slate-500 font-medium">Deep Insight Report</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2 share-buttons" data-html2canvas-ignore>
            {(status === AppStatus.READY || status === AppStatus.GENERATING_PODCAST) && (
                <>
                <button 
                    onClick={onGeneratePodcast}
                    disabled={isGeneratingPodcast || !!podcastUrl}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border ${
                        podcastUrl 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 cursor-default' 
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                    }`}
                >
                    {isGeneratingPodcast ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Headphones className="w-3.5 h-3.5" />
                    )}
                    {isGeneratingPodcast ? '生成中...' : (podcastUrl ? '播客已就绪' : '生成 AI 播客')}
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                <button 
                    onClick={() => onOpenShare(summary)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95"
                    title="自定义分享"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">编辑</span>
                </button>
                <button 
                    onClick={handleShareImage}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                    title="生成长图"
                >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">长图</span>
                </button>
                </>
            )}
          </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-10 bg-white">
        {/* Podcast Player Section */}
        {podcastUrl && (
            <div className="podcast-section mb-8 animate-in fade-in slide-in-from-top-4">
                <PodcastPlayer audioUrl={podcastUrl} />
            </div>
        )}

        {isAnalyzing ? (
            <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
                <div className="flex items-center space-x-4">
                     <div className="h-6 bg-slate-100 rounded w-48"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                </div>
                <div className="space-y-3 pt-4">
                     <div className="h-5 bg-slate-100 rounded w-32 mb-4"></div>
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                </div>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto">
                <article className="prose prose-slate prose-lg max-w-none">
                    {renderMarkdown(summary)}
                </article>
                
                {/* Watermark for image */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-slate-400" />
                         </div>
                         <span className="text-xs font-medium">Generated by Morning AI</span>
                    </div>
                    <span className="text-[10px]">{new Date().toLocaleDateString('zh-CN')}</span>
                </div>
            </div>
        )}
      </div>
      
      {/* Footer decoration */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80"></div>
    </div>
  );
};
