
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Newspaper, CheckCircle2, History as HistoryIcon, Globe, Cpu, TrendingUp, Hash, Edit3, AlertCircle, RefreshCw, Zap, Map, Coffee, Heart } from 'lucide-react';
import { fetchNewsByTopic, generateNewsBriefing } from './services/gemini';
import { NewsItem, AppStatus, DurationOption, AppSettings, DEFAULT_SETTINGS, BriefingSession, AppMode } from './types';
import { NewsTimeline } from './components/NewsTimeline';
import { BriefingView } from './components/BriefingView';
import { TravelView } from './components/TravelView';
import { SettingsModal } from './components/SettingsModal';
import { HistorySidebar } from './components/HistorySidebar';
import { ShareModal } from './components/ShareModal';

// Sub-topic mapping for granular fetching
const TOPIC_SUBDIVISIONS: Record<string, string[]> = {
    '推荐': [], // Dynamic based on user interests
    '综合': ['今日头条', '国际焦点', '国内要闻', '科技前沿', '财经热点'],
    '国内': ['时政要闻', '社会民生', '政策法规'],
    '国际': ['地缘政治', '外交动态', '海外突发'],
    '科技': ['人工智能', '互联网巨头', '硬科技', '生物医药'],
    '财经': ['股市行情', '宏观经济', '企业动态'],
};

function App() {
  const [appMode, setAppMode] = useState<AppMode>(AppMode.NEWS);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [loadingText, setLoadingText] = useState<string>("准备就绪");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Progress State
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [activeSegment, setActiveSegment] = useState<string>("");
  
  // Options
  const [duration, setDuration] = useState<DurationOption>('medium');
  
  // Topic Selection State
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['推荐']);
  const [customFocusInput, setCustomFocusInput] = useState('');
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Determine if we have a valid key for the current provider
  const effectiveKey = settings.apiKey || 
                       (settings.provider === 'gemini' ? process.env.API_KEY : 
                       (settings.provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : 
                       (settings.provider === 'tongyi' ? process.env.TONGYI_API_KEY : '')));

  const hasValidSetup = !!effectiveKey;

  const [history, setHistory] = useState<BriefingSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedSettings = localStorage.getItem('ai_brief_settings');
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            // Merge with default to ensure new fields like userInterests exist
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    } 

    const storedHistory = localStorage.getItem('ai_brief_history');
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory);
        setHistory(parsedHistory);
        if (parsedHistory.length > 0) {
            loadSession(parsedHistory[0]);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ai_brief_settings', JSON.stringify(newSettings));
    if (status === AppStatus.ERROR) {
        setErrorMsg(null);
        setStatus(AppStatus.IDLE);
    }
  };

  const handleOpenShare = (content: string) => {
      setShareContent(content);
      setIsShareModalOpen(true);
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
      setNews(session.news);
      setSummaryText(session.summary);
      setDuration(session.durationOption);
      
      let topics: string[] = [];
      if (Array.isArray(session.focus)) {
          topics = session.focus;
      } else if (typeof session.focus === 'string') {
          topics = [session.focus as string];
      } else {
          topics = ['推荐'];
      }
      setSelectedTopics(topics);

      setCurrentSessionId(session.id);
      setStatus(AppStatus.READY);
      setErrorMsg(null);
      setCompletedTasks(0);
      setTotalTasks(0);
      setAppMode(AppMode.NEWS); // Force switch to news mode when loading history
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

      if (topicId === '推荐' || topicId === '综合') {
          setSelectedTopics([topicId]);
          return;
      }

      let newTopics = [...selectedTopics];
      
      // Remove exclusive tabs
      newTopics = newTopics.filter(t => t !== '综合' && t !== '推荐');

      if (newTopics.includes(topicId)) {
          newTopics = newTopics.filter(t => t !== topicId);
      } else {
          newTopics.push(topicId);
      }

      if (newTopics.length === 0) {
          newTopics = ['推荐'];
      }

      setSelectedTopics(newTopics);
  };

  const handleStartBriefing = async () => {
    try {
      setErrorMsg(null);
      setNews([]);
      setSummaryText("");
      setCurrentSessionId(undefined); 
      setCompletedTasks(0);
      
      let requestedTopics = [...selectedTopics];
      
      // If "For You" (Recommend) is selected, inject user interests
      if (requestedTopics.includes('推荐')) {
          const interests = settings.userInterests && settings.userInterests.length > 0 
                            ? settings.userInterests 
                            : ['综合热点']; // Default fallback
          // Replace '推荐' with actual interests for processing
          requestedTopics = requestedTopics.filter(t => t !== '推荐');
          requestedTopics.push(...interests);
      }

      if (isCustomInputVisible && customFocusInput.trim()) {
          if (!requestedTopics.includes(customFocusInput.trim())) {
              requestedTopics.push(customFocusInput.trim());
          }
      }
      
      if (!effectiveKey) {
          throw new Error("请先在设置中配置 API Key。");
      }

      // --- Granular Segment Logic ---
      setStatus(AppStatus.FETCHING_NEWS);
      
      // Breakdown topics into smaller chunks for parallel fetching and UI updates
      let searchSegments: string[] = [];
      
      requestedTopics.forEach(mainTopic => {
          if (TOPIC_SUBDIVISIONS[mainTopic] && TOPIC_SUBDIVISIONS[mainTopic].length > 0) {
              searchSegments.push(...TOPIC_SUBDIVISIONS[mainTopic]);
          } else {
              searchSegments.push(mainTopic);
          }
      });
      
      // Deduplicate
      searchSegments = [...new Set(searchSegments)];
      setTotalTasks(searchSegments.length);

      // Execute fetches
      const fetchPromises = searchSegments.map(async (topic) => {
          try {
              setActiveSegment(topic);
              const items = await fetchNewsByTopic(settings, topic);
              
              // Incrementally update UI
              setCompletedTasks(prev => prev + 1);
              if (items.length > 0) {
                  setNews(prev => {
                      const existingHeadlines = new Set(prev.map(n => n.headline));
                      const newItems = items.filter(n => !existingHeadlines.has(n.headline));
                      // Sort by date desc just in case
                      return [...prev, ...newItems].sort((a,b) => b.date.localeCompare(a.date));
                  });
              }
              return items;
          } catch (e) {
              console.error(`Error fetching topic ${topic}`, e);
              setCompletedTasks(prev => prev + 1);
              return [];
          }
      });

      setLoadingText("正在启动并行搜索矩阵...");
      
      const results = await Promise.all(fetchPromises);
      const allNews = results.flat();

      if (allNews.length === 0) {
          throw new Error("未能获取任何新闻。请检查 API Key、网络或更换模型。");
      }

      // Scroll to bottom to show news appearing
      if(bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Step 3: Generate Summary
      setStatus(AppStatus.ANALYZING);
      setActiveSegment("AI 深度聚合分析");
      setLoadingText("正在进行全量深度分析...");
      
      // Use original selected topics for context in prompt, but if it was '推荐', use '个人定制推荐'
      const promptTopics = selectedTopics.includes('推荐') ? ['个人定制推荐', ...settings.userInterests] : requestedTopics;
      const text = await generateNewsBriefing(allNews, duration, settings, promptTopics);
      setSummaryText(text);

      setStatus(AppStatus.READY);
      setLoadingText("完成");
      
      saveToHistory(allNews, text, duration, selectedTopics);

    } catch (err: any) {
      console.error(err);
      const msg = err.message || JSON.stringify(err);
      let userMsg = "出错了，请稍后重试。";
      
      if (msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("401")) {
         userMsg = "鉴权失败：API Key 无效。请检查设置。";
      } else if (msg.includes("500")) {
          userMsg = "AI 服务暂时繁忙 (500)，请稍后重试。";
      } else {
         userMsg = `出错了: ${msg.substring(0, 100)}`;
      }
      
      setErrorMsg(userMsg);
      setStatus(AppStatus.ERROR);
    }
  };

  const getStatusText = () => {
      if (status === AppStatus.FETCHING_NEWS) {
          const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return `搜索中 (${percent}%)`;
      }
      if (status === AppStatus.ANALYZING) return "正在撰写...";
      return "生成深度简报";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 pb-20">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={settings}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        defaultText={shareContent}
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
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90 transition-all duration-300">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2 rounded-lg text-white shadow-lg shadow-slate-900/20">
                  <Newspaper className="w-5 h-5" />
                </div>
                
                {/* Mode Switcher */}
                <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setAppMode(AppMode.NEWS)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${appMode === AppMode.NEWS ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Newspaper className="w-3.5 h-3.5" />
                        新闻简报
                    </button>
                    <button 
                        onClick={() => setAppMode(AppMode.TRAVEL)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${appMode === AppMode.TRAVEL ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Map className="w-3.5 h-3.5" />
                        生活探索
                    </button>
                </div>
                {/* Mobile Title */}
                <h1 className="md:hidden text-lg font-bold tracking-tight text-slate-900">
                    早安 AI
                </h1>
            </div>

            <div className="flex items-center gap-2">
                 
                 {/* Mobile Mode Toggle (Simple) */}
                 <button className="md:hidden p-2 text-slate-500" onClick={() => setAppMode(prev => prev === AppMode.NEWS ? AppMode.TRAVEL : AppMode.NEWS)}>
                     {appMode === AppMode.NEWS ? <Map className="w-5 h-5" /> : <Newspaper className="w-5 h-5" />}
                 </button>

                 <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 transition-colors relative"
                    title="往期回顾"
                 >
                    <HistoryIcon className="w-5 h-5" />
                    {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white"></span>}
                 </button>

                 <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={`p-2 hover:bg-slate-100 rounded-full transition-colors ${
                        hasValidSetup ? 'text-green-600' : 'text-slate-400'
                    }`}
                    title="API 设置"
                 >
                    {hasValidSetup ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                 </button>

                 {appMode === AppMode.NEWS && (
                 <>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <button 
                        onClick={handleStartBriefing}
                        disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap overflow-hidden relative"
                    >
                    {status === AppStatus.FETCHING_NEWS && (
                            <div className="absolute left-0 bottom-0 h-1 bg-blue-400 transition-all duration-300" style={{ width: `${(completedTasks / totalTasks) * 100}%` }}></div>
                    )}
                    
                    {status === AppStatus.IDLE || status === AppStatus.READY || status === AppStatus.ERROR ? (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">生成深度简报</span>
                            <span className="sm:hidden">生成</span>
                        </>
                    ) : (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span className="min-w-[80px] text-center">{getStatusText()}</span>
                        </>
                    )}
                    </button>
                 </>
                 )}
            </div>
          </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        
        {appMode === AppMode.TRAVEL ? (
            <TravelView 
                settings={settings} 
                onError={(msg) => { setErrorMsg(msg); setStatus(AppStatus.ERROR); }}
                onOpenShare={handleOpenShare}
            />
        ) : (
        <>
            {/* News Controls Bar */}
            <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 overflow-hidden">
                
                <div className="flex-1 w-full md:w-auto overflow-x-auto scrollbar-hide flex items-center p-1 gap-1">
                    {[
                        { id: '推荐', icon: Heart, label: '推荐', color: 'text-pink-500' },
                        { id: '综合', icon: Globe, label: '综合 (全网)' },
                        { id: '国内', icon: Hash, label: '国内' },
                        { id: '国际', icon: Globe, label: '国际' },
                        { id: '科技', icon: Cpu, label: '科技' },
                        { id: '财经', icon: TrendingUp, label: '财经' },
                        { id: '自定义', icon: Edit3, label: '自定义' },
                    ].map((item) => {
                        const isSelected = item.id === '自定义' 
                            ? isCustomInputVisible 
                            : selectedTopics.includes(item.id);

                        return (
                            <button
                                key={item.id}
                                onClick={() => toggleTopic(item.id)}
                                disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                                className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                isSelected
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <item.icon className={`w-3.5 h-3.5 mr-2 ${!isSelected && item.color ? item.color : ''}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

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
                            {opt === 'short' ? '精简' : opt === 'medium' ? '标准' : '深度'}
                        </button>
                    ))}
                </div>
            </div>

            {isCustomInputVisible && (
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
                    <button onClick={handleStartBriefing} className="text-sm underline font-semibold hover:text-red-700">重试</button>
                </div>
            )}

            {/* Live Status Indicator (Shown during fetching) */}
            {status === AppStatus.FETCHING_NEWS && (
                <div className="mb-6 flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white border border-blue-100 shadow-lg shadow-blue-500/10 px-5 py-3 rounded-full flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">
                            正在搜索：
                            <span className="text-slate-900 font-bold ml-1">{activeSegment || '初始化...'}</span>
                        </span>
                        <span className="text-xs text-slate-400 border-l border-slate-200 pl-3">
                            {completedTasks} / {totalTasks}
                        </span>
                    </div>
                </div>
            )}

            {/* Layout: Vertical Stack */}
            <div className="flex flex-col gap-8">
            
            {/* 1. Briefing Section (Top) */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <BriefingView 
                    status={status}
                    summary={summaryText}
                    onOpenShare={handleOpenShare}
                />
            </section>

            {/* 2. News Timeline Section (Bottom) */}
            {(status === AppStatus.READY || status === AppStatus.FETCHING_NEWS || status === AppStatus.ANALYZING || news.length > 0) && (
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                                实时情报流
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-slate-500 text-sm">
                                    {new Date().toLocaleDateString('zh-CN')} 
                                </p>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                    共 {news.length} 条
                                </span>
                            </div>
                        </div>
                        {status === AppStatus.FETCHING_NEWS && (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        )}
                    </div>
                    
                    <NewsTimeline 
                        news={news} 
                        loading={status === AppStatus.FETCHING_NEWS && news.length === 0} 
                    />
                    
                    {/* Scroll Anchor */}
                    <div ref={bottomRef}></div>
                </section>
            )}

            </div>
        </>
        )}
      </div>
    </div>
  );
}

export default App;
