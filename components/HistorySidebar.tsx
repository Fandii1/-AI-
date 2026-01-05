import React from 'react';
import { X, Calendar, ChevronRight, Trash2, Tag } from 'lucide-react';
import { BriefingSession } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: BriefingSession[];
  onSelectSession: (session: BriefingSession) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  currentSessionId?: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
  currentSessionId
}) => {
  
  // Helper to render topics
  const renderTopics = (focus: string | string[]) => {
      let topics: string[] = [];
      if (Array.isArray(focus)) {
          topics = focus;
      } else if (typeof focus === 'string') {
          topics = [focus];
      }
      
      // Filter out '自定义' if strictly internal, but here we display it if it's the only one or actual value
      // usually we want to show real topics.
      if (topics.length === 0) return null;

      return (
          <div className="flex flex-wrap gap-1 mt-2">
            {topics.slice(0, 3).map((topic, idx) => (
               <span key={idx} className="inline-flex items-center text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  <Tag className="w-3 h-3 mr-1" />
                  {topic}
               </span>
            ))}
            {topics.length > 3 && (
                <span className="text-[10px] text-slate-400">+{topics.length - 3}</span>
            )}
          </div>
      );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h2 className="text-lg font-bold text-slate-800">往期回顾</h2>
                <p className="text-xs text-slate-500">{sessions.length} 份存档简报</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>暂无历史记录</p>
                </div>
            ) : (
                sessions.map((session) => (
                    <div 
                        key={session.id}
                        onClick={() => {
                            onSelectSession(session);
                            onClose();
                        }}
                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            currentSessionId === session.id 
                            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                            : 'bg-white border-slate-100 hover:border-blue-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {session.dateStr}
                            </span>
                            <button
                                onClick={(e) => onDeleteSession(session.id, e)}
                                className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除记录"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 mb-2 leading-snug">
                            {session.news[0]?.headline || "简报摘要"}
                        </h4>
                        
                        {renderTopics(session.focus)}
                        
                        <div className="flex justify-end mt-2">
                            <span className="flex items-center text-xs text-slate-400 group-hover:text-blue-600 transition-colors">
                                查看 <ChevronRight className="w-3 h-3 ml-0.5" />
                            </span>
                        </div>
                    </div>
                ))
            )}
          </div>

        </div>
      </div>
    </>
  );
};