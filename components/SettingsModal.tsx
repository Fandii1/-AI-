
import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Globe, Search, Key, Cpu, ShieldCheck, Zap, Server, Heart } from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

const AVAILABLE_SOURCES = [
  "Google News",
  "Bing News",
  "Reuters",
  "Bloomberg",
  "TechCrunch",
  "Twitter/X",
  "Weibo",
  "Baidu",
  "Mainstream Media",
  "Official Government Sites"
];

const AVAILABLE_INTERESTS = [
  "科技", "财经", "国际", "国内", "娱乐", "体育", "军事", "健康", "文化", "教育"
];

const RECOMMENDED_GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (推荐 - 联网强)' },
  { value: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro Exp (强推理)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(currentSettings);
  const hasBuiltInKey = !!process.env.API_KEY;

  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSource = (source: string) => {
    setFormData(prev => {
      const sources = prev.searchSources || [];
      if (sources.includes(source)) {
        return { ...prev, searchSources: sources.filter(s => s !== source) };
      } else {
        return { ...prev, searchSources: [...sources, source] };
      }
    });
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => {
      const interests = prev.userInterests || [];
      if (interests.includes(interest)) {
        return { ...prev, userInterests: interests.filter(i => i !== interest) };
      } else {
        return { ...prev, userInterests: [...interests, interest] };
      }
    });
  };

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">个性化与设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Personalization Section */}
          <div className="space-y-4">
              <label className="text-sm font-bold text-slate-800 flex items-center">
                  <Heart className="w-4 h-4 mr-2 text-pink-500" />
                  我的兴趣偏好 (用于"推荐"频道)
              </label>
              <div className="flex flex-wrap gap-2">
                  {AVAILABLE_INTERESTS.map(interest => {
                      const isSelected = (formData.userInterests || []).includes(interest);
                      return (
                          <button
                              key={interest}
                              type="button"
                              onClick={() => toggleInterest(interest)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                  isSelected 
                                  ? 'bg-pink-50 border-pink-500 text-pink-700' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                          >
                              {interest}
                          </button>
                      );
                  })}
              </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Provider Selection */}
          <div className="space-y-4">
              <label className="text-sm font-bold text-slate-800 flex items-center">
                  <Cpu className="w-4 h-4 mr-2 text-blue-600" />
                  AI 服务提供商
              </label>
              <div className="grid grid-cols-2 gap-3">
                  <button
                      type="button"
                      onClick={() => {
                          handleChange('provider', 'gemini');
                          handleChange('model', 'gemini-2.0-flash');
                      }}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          formData.provider === 'gemini' 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                      <Zap className="w-5 h-5" />
                      <span>Gemini (官方)</span>
                      <span className="text-[10px] opacity-70 font-normal">支持 Google 实时搜索</span>
                  </button>
                  <button
                      type="button"
                      onClick={() => {
                          handleChange('provider', 'openai');
                          if (formData.baseUrl.includes('googleapis')) {
                              handleChange('baseUrl', 'https://api.openai.com/v1');
                              handleChange('model', 'gpt-4o');
                          }
                      }}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          formData.provider === 'openai' 
                          ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold ring-1 ring-purple-500' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                      <Server className="w-5 h-5" />
                      <span>自定义 / OpenAI</span>
                      <span className="text-[10px] opacity-70 font-normal">需使用联网模型(如 Perplexity)</span>
                  </button>
              </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Dynamic Configuration Fields */}
          <div className="space-y-5">
             
             {formData.provider === 'gemini' ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Gemini 模型</label>
                          <select
                            value={formData.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          >
                             {RECOMMENDED_GEMINI_MODELS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                             ))}
                          </select>
                      </div>
                 </div>
             ) : (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">API Base URL</label>
                         <input
                            type="text"
                            value={formData.baseUrl}
                            onChange={(e) => handleChange('baseUrl', e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                         />
                         <p className="text-[10px] text-slate-500">
                            支持完整地址 (如 /v1/chat/completions) 或域名 (如 https://api.deepseek.com)。
                         </p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">模型名称</label>
                         <input
                            type="text"
                            value={formData.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="sonar-reasoning-pro, gpt-4o..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                         />
                      </div>
                 </div>
             )}

             {/* API Key (Unified) */}
             <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">API Key</label>
                 </div>
                 <div className="relative">
                    <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder={hasBuiltInKey && formData.provider === 'gemini' ? "已内置 Gemini Key (可留空)" : "sk-..."}
                    className={`w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono ${
                        !formData.apiKey && hasBuiltInKey && formData.provider === 'gemini' ? 'border-green-300' : 'border-slate-300'
                    }`}
                    />
                    {!formData.apiKey && hasBuiltInKey && formData.provider === 'gemini' && (
                        <div className="absolute right-3 top-2.5 text-green-600">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    )}
                 </div>
             </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Search Sources Configuration */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-green-600" />
                    来源偏好
                </label>
                <span className="text-xs text-slate-400">已选 {formData.searchSources?.length || 0} 项</span>
             </div>
             
             <div className="grid grid-cols-2 gap-2.5">
                {AVAILABLE_SOURCES.map((source) => {
                  const isSelected = (formData.searchSources || []).includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      className={`flex items-center px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{source}</span>
                    </button>
                  );
                })}
             </div>
          </div>

        </form>

        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
            <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors font-medium"
            >
                <RotateCcw className="w-4 h-4" />
                重置
            </button>
            <button
                type="submit"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 active:scale-95"
            >
                <Save className="w-4 h-4" />
                保存
            </button>
        </div>
      </div>
    </div>
  );
};
