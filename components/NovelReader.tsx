import React, { useState, useEffect, useRef } from 'react';
import { NovelDetail, NovelItem, NovelChapter, AppSettings } from '../types';
import { fetchChapterContent } from '../services/gemini';
import { ArrowLeft, BookOpen, Users, Sparkles, User, Star, ExternalLink, Loader2, Quote, List, ChevronRight, ChevronLeft, Bookmark, Heart, RotateCcw, Download, Database } from 'lucide-react';

interface NovelReaderProps {
  baseInfo: NovelItem; // Basic info to start with
  novel: NovelDetail | null; // Detailed info if fetched
  loading: boolean; // Loading state for initial detail fetch
  onBack: () => void;
  settings: AppSettings;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRefreshDetail: () => void; // Callback to force refresh details
}

type Tab = 'overview' | 'characters' | 'read';
type BatchSize = 10 | 20 | 50;

export const NovelReader: React.FC<NovelReaderProps> = ({ 
  baseInfo, 
  novel, 
  loading, 
  onBack, 
  settings,
  isFavorite,
  onToggleFavorite,
  onRefreshDetail
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Batch Reading State
  const [loadedChapters, setLoadedChapters] = useState<{chapter: NovelChapter, content: string, loading: boolean}[]>([]);
  const [batchSize, setBatchSize] = useState<BatchSize>(10);
  const [currentBatchStartIndex, setCurrentBatchStartIndex] = useState<number>(0);
  
  const [showCatalogue, setShowCatalogue] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Use the detailed item if available, otherwise base
  const displayItem = novel || baseInfo;
  
  const isCached = !!novel?.lastUpdated;

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Auto-restore reading progress when detailed info is loaded
  useEffect(() => {
    if (novel && novel.chapters && novel.chapters.length > 0 && activeTab === 'read' && loadedChapters.length === 0) {
        const savedProgress = localStorage.getItem(`read_progress_${baseInfo.title}_${baseInfo.author}`);
        let startIndex = 0;
        if (savedProgress) {
            try {
                const { chapterIndex } = JSON.parse(savedProgress);
                // Find index in array (chapterIndex might be 1-based index)
                const arrayIndex = novel.chapters.findIndex(c => c.index === chapterIndex);
                if (arrayIndex !== -1) startIndex = arrayIndex;
            } catch (e) {
                console.error(e);
            }
        }
        loadBatch(startIndex);
    }
  }, [novel, activeTab]);

  const saveProgress = (chapter: NovelChapter) => {
      localStorage.setItem(`read_progress_${baseInfo.title}_${baseInfo.author}`, JSON.stringify({
          chapterIndex: chapter.index,
          timestamp: Date.now()
      }));
  };

  const loadBatch = async (startIndex: number) => {
      if (!novel || !novel.chapters) return;
      
      setCurrentBatchStartIndex(startIndex);
      
      const endIndex = Math.min(startIndex + batchSize, novel.chapters.length);
      const batchChapters = novel.chapters.slice(startIndex, endIndex);

      // Initialize placeholders
      const initialState = batchChapters.map(ch => ({
          chapter: ch,
          content: getCachedChapterContent(ch) || "", // Try sync cache first
          loading: !hasCachedContent(ch)
      }));

      setLoadedChapters(initialState);
      
      // Save progress to the first chapter of the batch
      if (batchChapters.length > 0) {
          saveProgress(batchChapters[0]);
      }

      // Fetch missing content sequentially to avoid rate limits
      for (let i = 0; i < initialState.length; i++) {
          if (!isMounted.current) return;
          if (initialState[i].content) continue; // Skip if loaded from cache

          const item = initialState[i];
          try {
              // Mark specific chapter as loading (visual only, already set in init)
              
              const content = await fetchChapterContent(settings, baseInfo.title, baseInfo.author, item.chapter.title);
              
              if (isMounted.current) {
                  // Update state for this specific chapter
                  setLoadedChapters(prev => prev.map(p => 
                      p.chapter.index === item.chapter.index 
                      ? { ...p, content: content, loading: false } 
                      : p
                  ));
                  // Cache content
                  cacheChapterContent(item.chapter, content);
              }
          } catch (e) {
              if (isMounted.current) {
                   setLoadedChapters(prev => prev.map(p => 
                      p.chapter.index === item.chapter.index 
                      ? { ...p, content: "加载失败，请重试", loading: false } 
                      : p
                  ));
              }
          }
      }
      
      // Scroll to top
      if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
  };

  // Cache Helpers
  const getCacheKey = (ch: NovelChapter) => `chapter_content_${baseInfo.title}_${ch.index}`;
  const hasCachedContent = (ch: NovelChapter) => !!localStorage.getItem(getCacheKey(ch));
  const getCachedChapterContent = (ch: NovelChapter) => localStorage.getItem(getCacheKey(ch));
  const cacheChapterContent = (ch: NovelChapter, content: string) => {
      try {
          localStorage.setItem(getCacheKey(ch), content);
      } catch (e) {
          console.warn("Storage full, cannot cache chapter content");
      }
  }

  const handleNextBatch = () => {
      loadBatch(currentBatchStartIndex + batchSize);
  };
  
  const handlePrevBatch = () => {
      const nextStart = Math.max(0, currentBatchStartIndex - batchSize);
      loadBatch(nextStart);
  };
  
  const handleJumpToChapter = (indexInArray: number) => {
      setShowCatalogue(false);
      loadBatch(indexInArray);
      setActiveTab('read');
  };

  const hasPrev = currentBatchStartIndex > 0;
  const hasNext = novel && (currentBatchStartIndex + batchSize < novel.chapters.length);

  return (
    <div className="bg-white min-h-[85vh] h-[85vh] rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col relative animate-in slide-in-from-right duration-500">
      
      {/* Header */}
      <div className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 p-3 md:p-4 sticky top-0 z-20 flex items-center gap-3 md:gap-4 shrink-0 justify-between">
         <div className="flex items-center gap-2 overflow-hidden">
             <button 
               onClick={onBack}
               className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200 text-slate-500 shrink-0"
             >
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div className="min-w-0">
                 <h2 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                     {displayItem.title}
                     {isCached && <Database className="w-3 h-3 text-blue-500" />}
                 </h2>
                 <div className="flex items-center text-xs text-slate-500 space-x-2">
                     <span>{displayItem.author}</span>
                     {activeTab === 'read' && (
                         <>
                            <span className="hidden sm:inline">•</span>
                            <span className="font-medium text-purple-600 truncate">
                                正在阅读: {loadedChapters[0]?.chapter.title || "..."}
                            </span>
                         </>
                     )}
                 </div>
             </div>
         </div>
         
         <div className="flex items-center gap-1">
             <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-100'}`}
                title="收藏"
             >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
             </button>
             
             {activeTab === 'read' && (
                 <button 
                    onClick={() => setShowCatalogue(!showCatalogue)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${showCatalogue ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-600'}`}
                 >
                     <List className="w-5 h-5" />
                 </button>
             )}
         </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
         
         {/* Catalogue Sidebar */}
         {showCatalogue && activeTab === 'read' && (
             <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur flex flex-col animate-in fade-in duration-200">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-slate-800">目录 ({novel?.chapters?.length || 0}章)</h3>
                     <button onClick={() => setShowCatalogue(false)} className="p-2"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2">
                     {novel?.chapters?.map((chapter, index) => (
                         <button
                            key={chapter.index}
                            onClick={() => handleJumpToChapter(index)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm mb-1 transition-colors ${
                                currentBatchStartIndex <= index && index < currentBatchStartIndex + batchSize
                                ? 'bg-purple-50 text-purple-700 font-bold border border-purple-100' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                         >
                             {chapter.title}
                         </button>
                     ))}
                     {(!novel?.chapters || novel.chapters.length === 0) && (
                         <div className="text-center py-10 text-slate-400">目录加载中...</div>
                     )}
                 </div>
             </div>
         )}

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto scroll-smooth" ref={contentContainerRef}>
            {loading ? (
                 <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                     <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-600" />
                     <p className="animate-pulse">AI 正在获取全书目录...</p>
                     <p className="text-xs mt-2 text-slate-300">如果是初次加载，这可能需要一点时间</p>
                 </div>
             ) : (
                 <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-full flex flex-col">
                    
                    {/* Tabs Navigation */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-1 shrink-0 justify-between">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                概览
                            </button>
                            <button 
                                onClick={() => setActiveTab('characters')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'characters' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                角色
                            </button>
                            <button 
                                onClick={() => {
                                    setActiveTab('read');
                                    if (loadedChapters.length === 0 && novel?.chapters?.[0]) {
                                        loadBatch(0);
                                    }
                                }}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'read' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                阅读
                            </button>
                        </div>
                        
                        {activeTab === 'overview' && (
                             <button 
                                onClick={onRefreshDetail}
                                className="flex items-center px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="重新从网络获取详情"
                             >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                刷新信息
                             </button>
                        )}

                        {activeTab === 'read' && (
                             <div className="flex items-center gap-1 text-xs">
                                <span className="text-slate-400 hidden sm:inline">批量:</span>
                                {[10, 20, 50].map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setBatchSize(size as BatchSize)}
                                        className={`px-2 py-1 rounded border ${batchSize === size ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                             </div>
                        )}
                    </div>

                    {/* Tab: Overview */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">剧情简介</h3>
                                <p className="text-slate-700 leading-loose text-justify">{novel?.longSummary || baseInfo.description}</p>
                            </section>
                            
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">AI 导读</h3>
                                <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed border border-slate-100">
                                    {novel?.aiRetelling || "生成中..."}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Tab: Characters */}
                    {activeTab === 'characters' && (
                        <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {novel?.characters.map((char, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900">{char.name}</h4>
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{char.role}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{char.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab: Read (Batch Mode) */}
                    {activeTab === 'read' && (
                        <div className="animate-in fade-in duration-300 flex flex-col flex-1 pb-10">
                            {loadedChapters.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                                    <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                                    <p>请选择章节开始阅读</p>
                                    <button 
                                        onClick={() => {
                                            if (novel?.chapters?.[0]) loadBatch(0);
                                        }}
                                        className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold shadow-lg hover:bg-purple-700 transition-colors"
                                    >
                                        开始阅读 (第1-{Math.min(batchSize, novel?.chapters?.length || 0)}章)
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {/* Chapters List */}
                                    {loadedChapters.map((item, idx) => (
                                        <div key={item.chapter.index} className="min-h-[50vh]">
                                            <div className="mb-6 text-center border-b border-slate-100 pb-4 sticky top-0 bg-white/95 backdrop-blur py-2 z-10">
                                                <h3 className="text-lg font-serif font-bold text-slate-900">{item.chapter.title}</h3>
                                            </div>

                                            {item.loading ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-purple-500" />
                                                    <p className="text-xs">AI 正在获取本章内容...</p>
                                                </div>
                                            ) : (
                                                <article className="prose prose-slate prose-lg max-w-none font-serif leading-loose text-slate-800 text-justify px-2">
                                                    <div className="whitespace-pre-wrap">
                                                        {item.content}
                                                    </div>
                                                </article>
                                            )}
                                        </div>
                                    ))}

                                    {/* Batch Navigation */}
                                    <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                        <button 
                                            onClick={handlePrevBatch}
                                            disabled={!hasPrev}
                                            className="flex items-center px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-2" />
                                            上一组 ({batchSize}章)
                                        </button>
                                        
                                        <div className="text-xs text-slate-400">
                                            当前显示: {loadedChapters[0].chapter.index} - {loadedChapters[loadedChapters.length-1].chapter.index}
                                        </div>

                                        <button 
                                            onClick={handleNextBatch}
                                            disabled={!hasNext}
                                            className="flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-md"
                                        >
                                            下一组 ({batchSize}章)
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </button>
                                    </div>
                                    
                                    <p className="text-center text-[10px] text-slate-300 pb-6">
                                        内容缓存于本地，下次打开无需重新获取。
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                 </div>
             )}
         </div>
      </div>
    </div>
  );
};