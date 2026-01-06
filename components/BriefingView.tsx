
import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Copy, Check, Share2, Loader2, MessageSquare } from 'lucide-react';
import { AppStatus } from '../types';

interface BriefingViewProps {
  status: AppStatus;
  summary: string;
  onOpenShare: (content: string) => void;
}

export const BriefingView: React.FC<BriefingViewProps> = ({ 
  status, 
  summary,
  onOpenShare
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAnalyzing = status === AppStatus.ANALYZING;

  const handleShareImage = async () => {
    if (!contentRef.current) return;
    setIsGeneratingImage(true);

    try {
        // Dynamic import to reduce initial bundle size
        const html2canvas = (await import('html2canvas')).default;

        // Wait a bit to ensure fonts and UI render correctly
        await new Promise(resolve => setTimeout(resolve, 300));

        // Fixed width for the generated image to ensure consistent "Card" look
        // regardless of whether the user is on Mobile or Desktop.
        const EXPORT_WIDTH = 750; 

        const canvas = await html2canvas(contentRef.current, {
            scale: 2, // Retina resolution
            useCORS: true, // Handle cross-origin images if any
            allowTaint: true,
            backgroundColor: '#ffffff',
            // Force the canvas to be a specific width so text wraps nicely like a newspaper
            width: EXPORT_WIDTH, 
            windowWidth: EXPORT_WIDTH,
            scrollY: -window.scrollY, // Fix scroll issue
            logging: false,
            onclone: (clonedDoc) => {
                const element = clonedDoc.querySelector('.briefing-card') as HTMLElement;
                if (element) {
                    // Optimize styling for the static image
                    element.style.width = `${EXPORT_WIDTH}px`;
                    element.style.maxWidth = 'none';
                    element.style.margin = '0';
                    element.style.boxShadow = 'none';
                    element.style.borderRadius = '0';
                    element.style.border = 'none';
                    element.style.padding = '40px'; 
                    
                    // Hide interactive buttons in the clone
                    const btns = element.querySelector('.share-buttons');
                    if (btns) (btns as HTMLElement).style.display = 'none';

                    // Prevent Image Stretching
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

  // Basic Markdown-to-JSX renderer (lightweight)
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split by newlines to handle paragraphs
    return text.split('\n').map((line, index) => {
      // Headers (##)
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3 border-l-4 border-blue-500 pl-3">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-slate-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.substring(2);
          // Handle bolding within list items
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
      
      // Regular paragraphs with Bold support
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
            {status === AppStatus.READY && (
                <>
                <button 
                    onClick={() => onOpenShare(summary)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95"
                    title="自定义分享"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    编辑文案
                </button>
                <button 
                    onClick={handleShareImage}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                    title="生成长图"
                >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    {isGeneratingImage ? '生成中' : '存为长图'}
                </button>
                <span className="hidden md:flex bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    分析完成
                </span>
                </>
            )}
          </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-10 bg-white">
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
