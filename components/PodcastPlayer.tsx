import React, { useState, useEffect } from 'react';
import { Play, Square, Volume2, Radio } from 'lucide-react';
import { audioController } from '../services/audioUtils';

interface PodcastPlayerProps {
  audioBase64: string | null;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ audioBase64 }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      audioController.stop();
    };
  }, []);

  const togglePlay = () => {
    if (!audioBase64) return;
    
    if (isPlaying) {
      audioController.stop();
      setIsPlaying(false);
    } else {
      audioController.playPCM(audioBase64, () => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  if (!audioBase64) return null;

  return (
    <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xl border border-slate-700 mb-6 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[50px] opacity-20 pointer-events-none"></div>

      <div className="flex items-center gap-5 relative z-10">
        <button 
          onClick={togglePlay}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white hover:bg-blue-50 text-slate-900 pl-1'
          }`}
        >
          {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-7 h-7 fill-current" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider">
              AI Podcast
            </span>
            {isPlaying && (
              <div className="flex items-end gap-[2px] h-4">
                 <div className="w-1 bg-green-400 rounded-full bar"></div>
                 <div className="w-1 bg-green-400 rounded-full bar"></div>
                 <div className="w-1 bg-green-400 rounded-full bar"></div>
                 <div className="w-1 bg-green-400 rounded-full bar"></div>
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold truncate text-slate-100">每日热点速览</h3>
          <p className="text-xs text-slate-400 truncate">AI 智能主播 • 实时生成</p>
        </div>

        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-500">
           <Volume2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};