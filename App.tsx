import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Newspaper, Settings, CheckCircle2, History as HistoryIcon, Globe, Cpu, TrendingUp, Hash, Edit3 } from 'lucide-react';
import { fetchDailyNews, generateNewsBriefing } from './services/gemini';
import { NewsItem, AppStatus, DurationOption, AppSettings, DEFAULT_SETTINGS, BriefingSession } from './types';
import { NewsTimeline } from './components/NewsTimeline';
import { BriefingView } from './components/BriefingView';
import { SettingsModal } from './components/SettingsModal';
import { HistorySidebar } from './components/HistorySidebar';

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Options
  const [duration, setDuration] = useState<DurationOption>('medium');
  
  // Topic Selection State
  // We use an array to support multi-select. Default to ['综合'].
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['综合']);
  const [customFocusInput, setCustomFocusInput] = useState('');
  // 'isCustomInputVisible' determines if the input box is shown, 
  // usually when user wants to add custom topics.
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasApiKey, setHasApiKey] = useState(false);

  // History State
  const [history, setHistory] = useState<BriefingSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  // Load settings and history on mount
  useEffect(() => {
    // Settings
    const storedSettings = localStorage.getItem('ai_brief_settings');
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            // Merge with default to ensure new fields (like searchSources) exist
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
        const parsedHistory = JSON.parse(storedHistory);
        setHistory(parsedHistory);
        // Automatically load the latest session if available
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
    setHasApiKey(!!newSettings.apiKey);
    localStorage.setItem('ai_brief_settings', JSON.stringify(newSettings));
    if (status === AppStatus.ERROR) {
        setErrorMsg(null);
        setStatus(AppStatus.IDLE);
    }
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
      
      // Load Focus
      // Backward compatibility: if session.focus is string, convert to array
      let topics: string[] = [];
      if (Array.isArray(session.focus)) {
          topics = session.focus;
      } else if (typeof session.focus === 'string') {
          // Legacy check
          if (['综合', '科技', '财经', '国内', '国际'].includes(session.focus as string)) {
              topics = [session.focus as string];
          } else {
              // It was a custom topic
              topics = [session.focus as string];
              setCustomFocusInput(session.focus as string);
              setIsCustomInputVisible(true);
          }
      } else {
          topics = ['综合'];
      }
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
      // Logic: 
      // 1. If "自定义" is clicked, toggle input visibility.
      // 2. If '综合' is clicked, clear others and set '综合' (Exclusive mode usually expected for 'General', but let's allow mixing if user wants, 
      //    though 'General' usually implies everything. Let's make '综合' mutually exclusive for better UX).
      // 3. If other specific topics are clicked, toggle them. If '综合' was selected, unselect it.
      
      if (topicId === '自定义') {
          setIsCustomInputVisible(!isCustomInputVisible);
          return;
      }

      if (topicId === '综合') {
          setSelectedTopics(['综合']);
          return;
      }

      // Specific topic clicked
      let newTopics = [...selectedTopics];
      
      // Remove '综合' if present
      if (newTopics.includes('综合')) {
          newTopics = newTopics.filter(t => t !== '综合');
      }

      if (newTopics.includes(topicId)) {
          newTopics = newTopics.filter(t => t !== topicId);
      } else {
          newTopics.push(topicId);
      }

      // If nothing selected, revert to '综合'
      if (newTopics.length === 0) {
          newTopics = ['综合'];
      }

      setSelectedTopics(newTopics);
  };

  const handleStartBriefing = async () => {
    try {
      setErrorMsg(null);
      setNews([]);
      setSummaryText("");
      setCurrentSessionId(undefined); 
      
      // Prepare final topic list including custom input
      let finalTopics = [...selectedTopics];
      if (isCustomInputVisible && customFocusInput.trim()) {
          // Add custom input to list if not already there (loosely)
          if (!finalTopics.includes(customFocusInput.trim())) {
              finalTopics.push(customFocusInput.trim());
          }
      }
      
      // Step 1: Fetch News
      setStatus(AppStatus.FETCHING_NEWS);
      
      if (!settings.apiKey) {
          if (settings.provider === 'gemini' && (window as any).aistudio?.hasSelectedApiKey) {
             if (await (window as any).aistudio.hasSelectedApiKey()) {
                 // Good
             } else {
                 throw new Error("请在设置中配置 API Key。");
             }
          } else if (!process.env.API_KEY) {
               throw new Error("请在设置中配置 API Key。");
          }
      }

      const newsItems = await fetchDailyNews(settings, finalTopics);
      setNews(newsItems);

      if (newsItems.length === 0) {
          throw new Error("未找到相关新闻，或解析失败，请重试。");
      }

      // Step 2: Generate Summary (Briefing)
      setStatus(AppStatus.ANALYZING);
      const text = await generateNewsBriefing(newsItems, duration, settings, finalTopics);
      setSummaryText(text);

      setStatus(AppStatus.READY);
      
      // Save only if successful
      saveToHistory(newsItems, text, duration, finalTopics);

    } catch (err: any) {
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
  };

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
                <div className="bg-slate-900 p-2 rounded-lg text-white shadow-lg shadow-slate-900/20">
                  <Newspaper className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden md:block">
                    早安 AI 简报
                </h1>
            </div>

            <div className="flex items-center gap-2">
                 
                 {/* Action Buttons */}
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
                        hasApiKey ? 'text-green-600' : 'text-slate-400'
                    }`}
                    title="API 设置"
                 >
                    {hasApiKey ? <CheckCircle2 className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                 </button>

                 <div className="h-6 w-px bg-slate-200 mx-1"></div>

                 <button 
                    onClick={handleStartBriefing}
                    disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap"
                 >
                   {status === AppStatus.IDLE || status === AppStatus.READY || status === AppStatus.ERROR ? (
                       <>
                         <Sparkles className="w-4 h-4 mr-2" />
                         <span className="hidden sm:inline">生成深度简报</span>
                         <span className="sm:hidden">生成</span>
                       </>
                   ) : (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         <span>分析中...</span>
                       </>
                   )}
                 </button>
            </div>
          </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        
        {/* Controls Bar */}
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 overflow-hidden">
            
            {/* Topic Selector */}
            <div className="flex-1 w-full md:w-auto overflow-x-auto scrollbar-hide flex items-center p-1 gap-1">
                {[
                    { id: '综合', icon: Globe, label: '综合' },
                    { id: '国内', icon: Hash, label: '国内' },
                    { id: '国际', icon: Globe, label: '国际' },
                    { id: '科技', icon: Cpu, label: '科技' },
                    { id: '财经', icon: TrendingUp, label: '财经' },
                    { id: '自定义', icon: Edit3, label: '自定义' },
                ].map((item) => {
                    // Check if selected
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
                })}
            </div>

            {/* Duration Selector (Right side) */}
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

        {/* Custom Input Expandable */}
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

        {/* Layout: Vertical Stack */}
        <div className="flex flex-col gap-8">
          
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
                        <h2 className="text-xl font-bold text-slate-900">新闻素材源</h2>
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

        </div>
      </div>
    </div>
  );
}

export default App;