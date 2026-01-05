import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Newspaper, Settings, CheckCircle2, History as HistoryIcon, Globe, Cpu, TrendingUp, Hash, Edit3, BookOpen, Sword, Heart, Ghost, Smile, Gift } from 'lucide-react';
import { fetchDailyNews, generateNewsBriefing, fetchPopularNovels, fetchNovelDetail } from './services/gemini';
import { NewsItem, NovelItem, NovelDetail, AppStatus, DurationOption, AppSettings, DEFAULT_SETTINGS, BriefingSession, AppMode } from './types';
import { NewsTimeline } from './components/NewsTimeline';
import { BriefingView } from './components/BriefingView';
import { NovelList } from './components/NovelList';
import { NovelReader } from './components/NovelReader';
import { SettingsModal } from './components/SettingsModal';
import { HistorySidebar } from './components/HistorySidebar';

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // Data State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [novels, setNovels] = useState<NovelItem[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Novel Detail State
  const [selectedNovel, setSelectedNovel] = useState<NovelItem | null>(null);
  const [novelDetail, setNovelDetail] = useState<NovelDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  
  // Favorites State
  const [favorites, setFavorites] = useState<NovelItem[]>([]);
  
  // Mode & Options
  const [appMode, setAppMode] = useState<AppMode>('news');
  const [duration, setDuration] = useState<DurationOption>('medium');
  
  // News Topic Selection
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['综合']);
  const [customFocusInput, setCustomFocusInput] = useState('');
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  // Novel Genre Selection
  const [novelGenre, setNovelGenre] = useState<string>('全部');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasApiKey, setHasApiKey] = useState(false);

  // History State
  const [history, setHistory] = useState<BriefingSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  // Load settings, history and favorites on mount
  useEffect(() => {
    // Settings
    const storedSettings = localStorage.getItem('ai_brief_settings');
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            if (parsed.apiKey) setHasApiKey(true);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    } else if (process.env.API_KEY) {
        setSettings(prev => ({ ...prev, apiKey: process.env.API_KEY || '' }));
        setHasApiKey(true);
    }

    // History
    const storedHistory = localStorage.getItem('ai_brief_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {}
    }

    // Favorites
    const storedFavs = localStorage.getItem('novel_favorites');
    if (storedFavs) {
        try {
            setFavorites(JSON.parse(storedFavs));
        } catch (e) {}
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setHasApiKey(!!newSettings.apiKey);
    localStorage.setItem('ai_brief_settings', JSON.stringify(newSettings));
    if (status === AppStatus.ERROR) {
        setErrorMsg(null);
        setStatus(AppStatus.IDLE);
    }
  };

  const handleToggleFavorite = (item: NovelItem) => {
      let newFavs: NovelItem[] = [];
      const exists = favorites.find(f => f.title === item.title && f.author === item.author);
      if (exists) {
          newFavs = favorites.filter(f => !(f.title === item.title && f.author === item.author));
      } else {
          newFavs = [item, ...favorites];
      }
      setFavorites(newFavs);
      localStorage.setItem('novel_favorites', JSON.stringify(newFavs));
  };

  const saveToHistory = (newsItems: NewsItem[], summary: string, dur: DurationOption, topics: string[]) => {
      const newSession: BriefingSession = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateStr: new Date().toLocaleDateString('zh-CN'),
          news: newsItems,
          summary: summary,
          durationOption: dur,
          focus: topics
      };
      
      const updatedHistory = [newSession, ...history];
      setHistory(updatedHistory);
      setCurrentSessionId(newSession.id);
      localStorage.setItem('ai_brief_history', JSON.stringify(updatedHistory));
  };

  const loadSession = (session: BriefingSession) => {
      setAppMode('news'); // History only supports news for now
      setNews(session.news);
      setSummaryText(session.summary);
      setDuration(session.durationOption);
      
      let topics: string[] = Array.isArray(session.focus) ? session.focus : [session.focus || '综合'];
      setSelectedTopics(topics);

      setCurrentSessionId(session.id);
      setStatus(AppStatus.READY);
      setErrorMsg(null);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem('ai_brief_history', JSON.stringify(updated));
      
      if (currentSessionId === id) {
          if (updated.length > 0) {
              loadSession(updated[0]);
          } else {
              setNews([]);
              setSummaryText("");
              setStatus(AppStatus.IDLE);
              setCurrentSessionId(undefined);
          }
      }
  };

  const toggleTopic = (topicId: string) => {
      if (topicId === '自定义') {
          setIsCustomInputVisible(!isCustomInputVisible);
          return;
      }
      if (topicId === '综合') {
          setSelectedTopics(['综合']);
          return;
      }
      let newTopics = [...selectedTopics];
      if (newTopics.includes('综合')) newTopics = newTopics.filter(t => t !== '综合');
      if (newTopics.includes(topicId)) {
          newTopics = newTopics.filter(t => t !== topicId);
      } else {
          newTopics.push(topicId);
      }
      if (newTopics.length === 0) newTopics = ['综合'];
      setSelectedTopics(newTopics);
  };

  const handleStart = async () => {
    if (appMode === 'news') {
        await handleStartBriefing();
    } else {
        await handleFetchNovels();
    }
  };

  const checkApiKey = async () => {
      if (!settings.apiKey) {
          if (settings.provider === 'gemini' && (window as any).aistudio?.hasSelectedApiKey) {
             if (await (window as any).aistudio.hasSelectedApiKey()) {
                 return;
             }
          }
          if (!process.env.API_KEY) {
               throw new Error("请在设置中配置 API Key。");
          }
      }
  };

  const handleFetchNovels = async () => {
      if (novelGenre === '收藏') {
          // Local favorites mode, no fetch needed
          setNovels(favorites);
          setStatus(AppStatus.READY);
          return;
      }

      try {
          setErrorMsg(null);
          setNovels([]);
          setSelectedNovel(null); 
          setStatus(AppStatus.FETCHING_NEWS);
          
          await checkApiKey();

          const items = await fetchPopularNovels(settings, novelGenre);
          setNovels(items);
          
          if (items.length === 0) {
              throw new Error("未找到相关小说，请重试。");
          }
          
          setStatus(AppStatus.READY);

      } catch (err: any) {
          handleError(err);
      }
  };

  const handleSelectNovel = async (novel: NovelItem, forceRefresh = false) => {
      setSelectedNovel(novel);
      setNovelDetail(null);
      setIsFetchingDetail(true);
      setErrorMsg(null);

      // Cache Check
      const cacheKey = `novel_cache_${novel.title}_${novel.author}`;
      const cached = localStorage.getItem(cacheKey);

      if (!forceRefresh && cached) {
          try {
              const detail = JSON.parse(cached);
              setNovelDetail(detail);
              setIsFetchingDetail(false);
              return;
          } catch(e) {
              console.warn("Cache invalid");
          }
      }

      try {
          await checkApiKey();
          const detail = await fetchNovelDetail(settings, novel);
          // Save to cache
          const detailWithTs = { ...detail, lastUpdated: Date.now() };
          localStorage.setItem(cacheKey, JSON.stringify(detailWithTs));
          
          setNovelDetail(detailWithTs);
      } catch (err: any) {
          handleError(err);
      } finally {
          setIsFetchingDetail(false);
      }
  };

  const handleStartBriefing = async () => {
    try {
      setErrorMsg(null);
      setNews([]);
      setSummaryText("");
      setCurrentSessionId(undefined); 
      
      let finalTopics = [...selectedTopics];
      if (isCustomInputVisible && customFocusInput.trim()) {
          if (!finalTopics.includes(customFocusInput.trim())) {
              finalTopics.push(customFocusInput.trim());
          }
      }
      
      setStatus(AppStatus.FETCHING_NEWS);
      await checkApiKey();

      const newsItems = await fetchDailyNews(settings, finalTopics);
      setNews(newsItems);

      if (newsItems.length === 0) {
          throw new Error("未找到相关新闻，或解析失败，请重试。");
      }

      setStatus(AppStatus.ANALYZING);
      const text = await generateNewsBriefing(newsItems, duration, settings, finalTopics);
      setSummaryText(text);

      setStatus(AppStatus.READY);
      
      saveToHistory(newsItems, text, duration, finalTopics);

    } catch (err: any) {
      handleError(err);
    }
  };

  const handleError = (err: any) => {
      console.error(err);
      const msg = err.message || JSON.stringify(err);
      let userMsg = "出错了，请稍后重试。";
      
      if (msg.includes("API key") || msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("401")) {
         userMsg = "鉴权失败：API Key 无效。请检查设置。";
         setHasApiKey(false);
      } else if (msg.includes("500") || msg.includes("Internal Server Error")) {
          userMsg = "AI 服务暂时繁忙 (500)，请稍后重试。";
      } else {
         userMsg = `出错了: ${msg.substring(0, 100)}`;
      }
      
      setErrorMsg(userMsg);
      setStatus(AppStatus.ERROR);
  }

  // Update novel list if in 'Favorites' mode when favorites change
  useEffect(() => {
      if (novelGenre === '收藏' && appMode === 'novel') {
          setNovels(favorites);
      }
  }, [favorites, novelGenre, appMode]);

  // Define controls based on mode
  const newsTopics = [
        { id: '综合', icon: Globe, label: '综合' },
        { id: '国内', icon: Hash, label: '国内' },
        { id: '国际', icon: Globe, label: '国际' },
        { id: '科技', icon: Cpu, label: '科技' },
        { id: '财经', icon: TrendingUp, label: '财经' },
        { id: '自定义', icon: Edit3, label: '自定义' },
  ];

  const novelGenres = [
        { id: '全部', icon: BookOpen, label: '全部' },
        { id: '收藏', icon: Heart, label: '收藏' },
        { id: '免费', icon: Gift, label: '免费' },
        { id: '玄幻', icon: Sword, label: '玄幻' },
        { id: '言情', icon: Heart, label: '言情' },
        { id: '悬疑', icon: Ghost, label: '悬疑' },
        { id: '都市', icon: Smile, label: '都市' },
        { id: '科幻', icon: Cpu, label: '科幻' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 pb-20">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={settings}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={history}
        onSelectSession={loadSession}
        onDeleteSession={deleteSession}
        currentSessionId={currentSessionId}
      />

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg text-white shadow-lg transition-colors ${appMode === 'news' ? 'bg-slate-900 shadow-slate-900/20' : 'bg-purple-600 shadow-purple-600/20'}`}>
                   {appMode === 'news' ? <Newspaper className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden md:block">
                    {appMode === 'news' ? '早安 AI 简报' : '热门小说发现'}
                </h1>
                
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg ml-2 md:ml-6">
                    <button 
                        onClick={() => { setAppMode('news'); setSelectedNovel(null); }}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            appMode === 'news' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        新闻
                    </button>
                    <button 
                        onClick={() => { setAppMode('novel'); }}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            appMode === 'novel' 
                            ? 'bg-white text-purple-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        小说
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                 
                 {appMode === 'news' && (
                     <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 transition-colors relative"
                        title="往期回顾"
                     >
                        <HistoryIcon className="w-5 h-5" />
                        {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white"></span>}
                     </button>
                 )}

                 <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={`p-2 hover:bg-slate-100 rounded-full transition-colors ${
                        hasApiKey ? 'text-green-600' : 'text-slate-400'
                    }`}
                    title="API 设置"
                 >
                    {hasApiKey ? <CheckCircle2 className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                 </button>

                 <div className="h-6 w-px bg-slate-200 mx-1"></div>

                 {/* Only show main action button if not in detailed novel view */}
                 {!selectedNovel && (
                    <button 
                        onClick={handleStart}
                        disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR && !(appMode === 'novel' && novelGenre === '收藏')}
                        className={`${appMode === 'news' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'} text-white px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap`}
                    >
                    {status === AppStatus.IDLE || status === AppStatus.READY || status === AppStatus.ERROR ? (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">{appMode === 'news' ? '生成简报' : '发现小说'}</span>
                            <span className="sm:hidden">{appMode === 'news' ? '生成' : '搜索'}</span>
                        </>
                    ) : (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>运行中...</span>
                        </>
                    )}
                    </button>
                 )}
            </div>
          </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        
        {/* Controls Bar (Hide when reading a novel) */}
        {!selectedNovel && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 overflow-hidden animate-in fade-in slide-in-from-top-4">
                
                {/* Topic/Genre Selector */}
                <div className="flex-1 w-full md:w-auto overflow-x-auto scrollbar-hide flex items-center p-1 gap-1">
                    {appMode === 'news' ? (
                        // NEWS TOPICS
                        newsTopics.map((item) => {
                            const isSelected = item.id === '自定义' 
                                ? isCustomInputVisible 
                                : selectedTopics.includes(item.id);

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleTopic(item.id)}
                                    disabled={status === AppStatus.FETCHING_NEWS || status === AppStatus.ANALYZING}
                                    className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                    isSelected
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >
                                    <item.icon className="w-3.5 h-3.5 mr-2" />
                                    {item.label}
                                </button>
                            );
                        })
                    ) : (
                        // NOVEL GENRES
                        novelGenres.map((item) => {
                            const isSelected = novelGenre === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setNovelGenre(item.id)}
                                    disabled={status === AppStatus.FETCHING_NEWS}
                                    className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                    isSelected
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                                    }`}
                                >
                                    <item.icon className="w-3.5 h-3.5 mr-2" />
                                    {item.label}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Duration Selector (Only for News) */}
                {appMode === 'news' && (
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 mx-2 mb-2 md:mb-0">
                        {(['short', 'medium', 'long'] as DurationOption[]).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setDuration(opt)}
                                disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    duration === opt 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {opt === 'short' ? '1分钟' : opt === 'medium' ? '3分钟' : '5分钟'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Custom Input Expandable (News Only) */}
        {appMode === 'news' && isCustomInputVisible && !selectedNovel && (
            <div className="mb-6 -mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                    <Edit3 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="输入额外想关注的主题（例如：人工智能、欧洲杯）" 
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={customFocusInput}
                        onChange={(e) => setCustomFocusInput(e.target.value)}
                    />
                </div>
            </div>
        )}

        {status === AppStatus.ERROR && (
            <div className="mb-8 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-sm font-medium">{errorMsg}</span>
                </div>
                <button onClick={handleStart} className="text-sm underline font-semibold hover:text-red-700">重试</button>
            </div>
        )}

        {/* Layout: Content Switching */}
        <div className="flex flex-col gap-8">
          
          {appMode === 'news' ? (
              <>
                {/* 1. Briefing Section (Top) */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <BriefingView 
                        status={status}
                        summary={summaryText}
                    />
                </section>

                {/* 2. News Timeline Section (Bottom) */}
                {(status === AppStatus.READY || status === AppStatus.FETCHING_NEWS || status === AppStatus.ANALYZING || news.length > 0) && (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">新闻时间轴</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-slate-500 text-sm flex items-center gap-1">
                                        {selectedTopics.join('、')}
                                        {isCustomInputVisible && customFocusInput && ` + ${customFocusInput}`}
                                    </p>
                                    {status === AppStatus.READY && (
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                            {news.length} 篇
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <NewsTimeline 
                            news={news} 
                            loading={status === AppStatus.FETCHING_NEWS} 
                        />
                    </section>
                )}
              </>
          ) : (
              // NOVEL MODE
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                 {selectedNovel ? (
                     <NovelReader 
                        baseInfo={selectedNovel} 
                        novel={novelDetail}
                        loading={isFetchingDetail}
                        onBack={() => setSelectedNovel(null)}
                        settings={settings}
                        isFavorite={favorites.some(f => f.title === selectedNovel.title && f.author === selectedNovel.author)}
                        onToggleFavorite={() => handleToggleFavorite(selectedNovel)}
                        onRefreshDetail={() => handleSelectNovel(selectedNovel, true)}
                     />
                 ) : (
                    <NovelList 
                        novels={novels}
                        loading={status === AppStatus.FETCHING_NEWS}
                        genre={novelGenre}
                        onSelectNovel={handleSelectNovel}
                        favorites={favorites}
                    />
                 )}
              </section>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;