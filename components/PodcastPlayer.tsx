
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface PodcastPlayerProps {
  audioUrl: string | null;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => {
      setIsPlaying(false);
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xl border border-slate-700 mb-6 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[50px] opacity-20 pointer-events-none"></div>

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onEnded={handleEnded} 
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="flex items-center gap-5 relative z-10">
        <button 
          onClick={togglePlay}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-white hover:bg-blue-50 text-slate-900 pl-1'
          }`}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-7 h-7 fill-current" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider">
              AI Podcast
            </span>
            {isPlaying && (
              <div className="flex items-end gap-[2px] h-4">
                 <div className="w-1 bg-green-400 rounded-full animate-[music-bar_1s_ease-in-out_infinite]"></div>
                 <div className="w-1 bg-green-400 rounded-full animate-[music-bar_1.2s_ease-in-out_infinite]"></div>
                 <div className="w-1 bg-green-400 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]"></div>
                 <div className="w-1 bg-green-400 rounded-full animate-[music-bar_1.5s_ease-in-out_infinite]"></div>
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold truncate text-slate-100">AI 简报 · 每日播客</h3>
          <p className="text-xs text-slate-400 truncate">Powered by Aliyun Qwen-TTS</p>
        </div>

        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-500">
           <Volume2 className="w-5 h-5" />
        </div>
      </div>
      
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
};
