
import React, { useState, useRef } from 'react';
import { MapPin, Utensils, Calendar, Wallet, Compass, Plane, Sparkles, Loader2, Search, Navigation, Share2 } from 'lucide-react';
import { TravelRequest, TravelType, AppStatus } from '../types';
import { generateLifestyleGuide } from '../services/gemini';
import html2canvas from 'html2canvas';

interface TravelViewProps {
  settings: any;
  onError: (msg: string) => void;
}

const INTEREST_TAGS = [
  '人文历史', '自然风光', '网红打卡', '特种兵', 
  '休闲度假', '亲子游', '探店', '夜生活', '户外徒步'
];

const FOOD_TAGS = [
  '地道老店', '街头小吃', '精致料理', '火锅', 
  '海鲜', '甜品咖啡', '辣味', '清淡'
];

export const TravelView: React.FC<TravelViewProps> = ({ settings, onError }) => {
  const [mode, setMode] = useState<TravelType>('PLAN');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<'budget' | 'standard' | 'luxury'>('standard');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<string>('');
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = async () => {
    if (!destination.trim()) {
      onError("请输入目的地");
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setResult('');
    
    try {
      const request: TravelRequest = {
        destination,
        type: mode,
        duration: days,
        budget,
        interests: selectedTags
      };

      const text = await generateLifestyleGuide(request, settings);
      setResult(text);
      setStatus(AppStatus.READY);
    } catch (e: any) {
      console.error(e);
      onError(e.message || "生成失败，请重试");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleShareImage = async () => {
    if (!resultRef.current) return;
    setIsGeneratingImage(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(resultRef.current, {
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY,
            logging: false,
        });

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = image;
        link.download = `${destination}-${mode}-${dateStr}.png`;
        link.click();
    } catch (err) {
        console.error("Image generation failed", err);
        onError("图片生成失败，请重试");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  // Enhanced Markdown Renderer to handle images
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Handle Headers
      if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3 border-l-4 border-teal-500 pl-3">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-bold text-slate-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      
      // Handle Images: ![alt](url)
      // We accept images even if they are not strictly on their own line if the regex matches, but prompt asks for own line.
      const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (imageMatch && line.trim().startsWith('![')) {
          const alt = imageMatch[1];
          const src = imageMatch[2];
          return (
              <div key={index} className="my-4 rounded-xl overflow-hidden shadow-md group relative bg-slate-100">
                  <img 
                      src={src} 
                      alt={alt} 
                      className="w-full h-48 md:h-64 object-cover hover:scale-105 transition-transform duration-700" 
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                      }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-white text-xs font-medium truncate">{alt}</p>
                  </div>
              </div>
          );
      }

      // Handle Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
         const content = line.substring(2);
         const parts = content.split(/(\*\*.*?\*\*)/g);
         return (
             <li key={index} className="ml-4 list-disc text-slate-700 mb-1">
                 {parts.map((part, i) => part.startsWith('**') ? <strong key={i} className="text-teal-700 font-semibold">{part.slice(2, -2)}</strong> : part)}
             </li>
         );
      }
      
      // Handle Breaklines
      if (line.trim() === '') return <br key={index} />;
      
      // Handle Paragraphs with Bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return <p key={index} className="mb-3 text-slate-700 leading-relaxed">{parts.map((part, i) => part.startsWith('**') ? <strong key={i} className="text-slate-900 font-semibold">{part.slice(2, -2)}</strong> : part)}</p>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero / Form Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none"></div>
           <h2 className="text-3xl font-bold mb-2 relative z-10">
             {mode === 'PLAN' ? 'AI 旅行规划师' : 'AI 美食雷达'}
           </h2>
           <p className="opacity-90 relative z-10">
             {mode === 'PLAN' ? '定制你的专属完美假期，避坑省心' : '搜罗全网最地道、最好吃的美味'}
           </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setMode('PLAN')}
            className={`flex-1 py-4 flex items-center justify-center font-bold text-sm transition-colors ${mode === 'PLAN' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Plane className="w-4 h-4 mr-2" />
            行程规划
          </button>
          <button 
            onClick={() => setMode('FOOD')}
            className={`flex-1 py-4 flex items-center justify-center font-bold text-sm transition-colors ${mode === 'FOOD' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Utensils className="w-4 h-4 mr-2" />
            美食探店
          </button>
        </div>

        {/* Input Form */}
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-teal-500" /> 
                你想去哪里？
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="例如：成都、京都、环球影城..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                <Wallet className="w-4 h-4 mr-1.5 text-teal-500" /> 
                预算偏好
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {(['budget', 'standard', 'luxury'] as const).map((b) => (
                   <button
                     key={b}
                     onClick={() => setBudget(b)}
                     className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${budget === b ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     {b === 'budget' ? '经济穷游' : b === 'standard' ? '舒适标准' : '奢华享受'}
                   </button>
                 ))}
              </div>
            </div>
          </div>

          {mode === 'PLAN' && (
             <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-teal-500" /> 
                  行程天数: <span className="ml-2 text-teal-600 text-lg">{days} 天</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-400 px-1">
                  <span>1天</span>
                  <span>15天</span>
                </div>
             </div>
          )}

          {/* Tags */}
          <div className="space-y-3">
             <label className="text-sm font-bold text-slate-700 flex items-center">
                <Compass className="w-4 h-4 mr-1.5 text-teal-500" /> 
                {mode === 'PLAN' ? '旅行风格 (多选)' : '口味偏好 (多选)'}
             </label>
             <div className="flex flex-wrap gap-2">
                {(mode === 'PLAN' ? INTEREST_TAGS : FOOD_TAGS).map(tag => (
                   <button
                     key={tag}
                     onClick={() => toggleTag(tag)}
                     className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                       selectedTags.includes(tag)
                       ? 'bg-teal-50 border-teal-500 text-teal-700'
                       : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                     }`}
                   >
                     {tag}
                   </button>
                ))}
             </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={status === AppStatus.ANALYZING}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === AppStatus.ANALYZING ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                正在全网搜索 {mode === 'PLAN' ? '最佳路线' : '美味餐厅'}...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                生成{mode === 'PLAN' ? '攻略' : '指南'}
              </>
            )}
          </button>

        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div ref={resultRef} className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
           <div className="bg-slate-50/80 backdrop-blur p-6 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between print:static">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${mode === 'PLAN' ? 'bg-gradient-to-br from-teal-400 to-emerald-500' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
                   {mode === 'PLAN' ? <Navigation className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                </div>
                <div>
                   <h3 className="font-bold text-slate-900 text-lg">
                     {mode === 'PLAN' ? `${destination} · 旅行攻略` : `${destination} · 觅食指南`}
                   </h3>
                   <p className="text-xs text-slate-500">基于实时搜索数据生成的建议</p>
                </div>
              </div>

              <div className="flex items-center gap-2" data-html2canvas-ignore>
                 <button 
                    onClick={handleShareImage}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    {isGeneratingImage ? '生成中' : '分享'}
                </button>
              </div>
           </div>
           
           <div className="p-8">
              <article className="prose prose-slate prose-lg max-w-none">
                 {renderMarkdown(result)}
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
           
           <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
        </div>
      )}

    </div>
  );
};
