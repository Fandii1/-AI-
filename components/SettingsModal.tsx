import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Globe, Search } from 'lucide-react';
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(currentSettings);

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

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">系统设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">API 提供商</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('provider', 'gemini')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.provider === 'gemini'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => handleChange('provider', 'openai')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.provider === 'openai'
                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                }`}
              >
                OpenAI 兼容
              </button>
            </div>
          </div>

          {/* Config Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Base URL</label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => handleChange('baseUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">模型名称</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="gemini-2.0-flash"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* Search Sources Configuration */}
          <div className="pt-2 border-t border-slate-100">
             <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
                <Search className="w-4 h-4 mr-2" />
                搜索来源偏好 (多选)
             </label>
             <p className="text-xs text-slate-500 mb-3">
               选择您希望 AI 在搜集新闻时重点关注的平台或来源类型。AI 将尝试优先从这些来源获取信息。
             </p>
             <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SOURCES.map((source) => {
                  const isSelected = (formData.searchSources || []).includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      className={`flex items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Globe className={`w-3 h-3 mr-2 ${isSelected ? 'text-blue-300' : 'text-slate-400'}`} />
                      {source}
                    </button>
                  );
                })}
             </div>
          </div>

        </form>

        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
            <RotateCcw className="w-4 h-4" />
            恢复默认
            </button>
            <button
            type="submit"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/10 active:scale-95"
            >
            <Save className="w-4 h-4" />
            保存配置
            </button>
        </div>
      </div>
    </div>
  );
};