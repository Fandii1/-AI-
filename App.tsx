import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Radio, Key, CheckCircle2 } from 'lucide-react';
import { fetchDailyNews, generateNewsBriefing } from './services/gemini';
import { NewsItem, AppStatus, DurationOption } from './types';
import { NewsTimeline } from './components/NewsTimeline';
import { BriefingView } from './components/BriefingView';

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationOption>('medium');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // 1. Check Environment Variable (Standard Deployment)
      // Note: In Vite/Webpack setup, ensure process.env.API_KEY is defined
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }

      // 2. Check AI Studio Environment (Project IDX)
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();
  }, []);

  const handleApiKeySelect = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
       try {
         await (window as any).aistudio.openSelectKey();
         setHasApiKey(true);
         if (status === AppStatus.ERROR) {
            setErrorMsg(null);
            setStatus(AppStatus.IDLE);
         }
       } catch (e) {
         console.error("API Key selection failed", e);
       }
    } else {
        // Feedback for standard deployment
        if (process.env.API_KEY) {
             alert("API Key 已通过环境变量配置 (Connected via Environment Variable)。");
        } else {
             alert("请在您的部署设置中添加环境变量 'API_KEY' (Please configure 'API_KEY' in your deployment environment settings like Vercel/Netlify)。");
        }
    }
  };

  const handleStartBriefing = async () => {
    try {
      setErrorMsg(null);
      setNews([]);
      setSummaryText("");
      
      // Step 1: Fetch News
      setStatus(AppStatus.FETCHING_NEWS);
      const newsItems = await fetchDailyNews();
      setNews(newsItems);

      if (newsItems.length === 0) {
          throw new Error("未找到相关新闻，请重试。");
      }

      // Step 2: Generate Summary (Briefing)
      setStatus(AppStatus.ANALYZING);
      const text = await generateNewsBriefing(newsItems, duration);
      setSummaryText(text);

      setStatus(AppStatus.READY);

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "";
      let userMsg = "出错了，请稍后重试。";
      
      if (msg.includes("API key") || msg.includes("403") || msg.includes("UNAUTHENTICATED")) {
         userMsg = "API Key 无效或未设置。请检查环境变量或点击右上角设置。";
         if (!process.env.API_KEY) {
             setHasApiKey(false);
         }
      } else {
         userMsg = `出错了: ${msg}`;
      }
      
      setErrorMsg(userMsg);
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-lg text-white">
                  <Radio className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden md:block">
                    早安 AI 简报
                </h1>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                 {/* Duration Selector */}
                 <div className="flex items-center bg-slate-100 rounded-full p-1">
                    {(['short', 'medium', 'long'] as DurationOption[]).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setDuration(opt)}
                            disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                duration === opt 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {opt === 'short' ? '简短' : opt === 'medium' ? '标准' : '深度'}
                        </button>
                    ))}
                 </div>

                 <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                 <button
                    onClick={handleApiKeySelect}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                        hasApiKey 
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                    title={hasApiKey ? "API Key 已连接" : "检查 API Key"}
                 >
                    {hasApiKey ? <CheckCircle2 className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                    <span className="text-xs font-medium hidden sm:inline">
                        {hasApiKey ? "已连接" : "设置 Key"}
                    </span>
                 </button>

                 <button 
                    onClick={handleStartBriefing}
                    disabled={status !== AppStatus.IDLE && status !== AppStatus.READY && status !== AppStatus.ERROR}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {status === AppStatus.IDLE || status === AppStatus.READY || status === AppStatus.ERROR ? (
                       <>
                         <Sparkles className="w-4 h-4 mr-2" />
                         生成简报
                       </>
                   ) : (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         处理中...
                       </>
                   )}
                 </button>
            </div>
          </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Error Message */}
        {status === AppStatus.ERROR && (
            <div className="mb-8 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                <span className="text-sm">{errorMsg}</span>
                <button onClick={handleStartBriefing} className="text-sm underline font-semibold hover:text-red-700">重试</button>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Timeline */}
          <div className="lg:col-span-7">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">今日头条</h2>
                <p className="text-slate-500 text-sm mt-1">汇集全球实时热点</p>
            </div>
            
            <NewsTimeline 
                news={news} 
                loading={status === AppStatus.FETCHING_NEWS} 
            />
          </div>

          {/* Right Column: Briefing View (Sticky) */}
          <div className="lg:col-span-5 relative">
             <BriefingView 
                status={status}
                summary={summaryText}
             />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;