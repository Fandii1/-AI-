
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultText: string;
  title?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  defaultText,
  title = "分享内容"
}) => {
  const [text, setText] = useState(defaultText);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setText(defaultText);
  }, [isOpen, defaultText]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQQShare = () => {
      const shareUrl = `http://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}&desc=${encodeURIComponent(text.substring(0, 100))}...`;
      window.open(shareUrl, '_blank');
  };
  
  const handleWeiboShare = () => {
      const shareUrl = `http://service.weibo.com/share/share.php?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(text.substring(0, 140))}`;
      window.open(shareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col border border-slate-100">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <h2 className="text-lg font-bold text-slate-800">自定义分享</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">编辑分享文案</label>
                <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="在此编辑分享内容..."
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${copied ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                 >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制文本 (微信)'}
                 </button>
                 
                 <div className="flex gap-2">
                     <button 
                        onClick={handleQQShare}
                        className="flex-1 flex flex-col items-center justify-center bg-[#12B7F5]/10 hover:bg-[#12B7F5]/20 text-[#12B7F5] rounded-xl transition-colors border border-[#12B7F5]/20"
                        title="分享到 QQ"
                     >
                        <MessageCircle className="w-5 h-5 mb-1" />
                        <span className="text-xs font-bold">QQ</span>
                     </button>
                      <button 
                        onClick={handleWeiboShare}
                        className="flex-1 flex flex-col items-center justify-center bg-[#E6162D]/10 hover:bg-[#E6162D]/20 text-[#E6162D] rounded-xl transition-colors border border-[#E6162D]/20"
                        title="分享到微博"
                     >
                        <ExternalLink className="w-5 h-5 mb-1" />
                        <span className="text-xs font-bold">微博</span>
                     </button>
                 </div>
            </div>
            
            <p className="text-xs text-center text-slate-400 mt-2">
                微信分享请点击“复制文本”，然后粘贴给好友或朋友圈。
            </p>
        </div>
      </div>
    </div>
  );
};
