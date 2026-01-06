
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, ExternalLink, Link as LinkIcon, Edit3 } from 'lucide-react';

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
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setText(defaultText);
  }, [isOpen, defaultText]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100 transform transition-all scale-100">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700">编辑分享文案</label>
                    <span className="text-xs text-slate-400 font-mono">{text.length} 字</span>
                </div>
                <div className="relative">
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none custom-scrollbar"
                        placeholder="在此编辑分享内容..."
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                         <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                copied 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                         >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? '已复制' : '复制全文'}
                         </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
                 <button 
                    onClick={handleCopyLink}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all gap-2 group"
                 >
                    <div className={`p-2 rounded-full transition-all ${linkCopied ? 'bg-green-100 text-green-600' : 'bg-white text-slate-500 group-hover:text-blue-600'}`}>
                        {linkCopied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </div>
                    <span className="text-xs font-bold">{linkCopied ? '已复制链接' : '复制链接'}</span>
                 </button>

                 <button 
                    onClick={handleQQShare}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#12B7F5]/10 hover:border-[#12B7F5]/20 hover:text-[#12B7F5] transition-all gap-2 group"
                 >
                    <div className="p-2 bg-white rounded-full text-slate-500 group-hover:text-[#12B7F5] transition-all">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">分享到 QQ</span>
                 </button>

                 <button 
                    onClick={handleWeiboShare}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#E6162D]/10 hover:border-[#E6162D]/20 hover:text-[#E6162D] transition-all gap-2 group"
                 >
                     <div className="p-2 bg-white rounded-full text-slate-500 group-hover:text-[#E6162D] transition-all">
                        <ExternalLink className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">分享到微博</span>
                 </button>
            </div>
            
            <div className="bg-blue-50/50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600/80">
                    💡 提示：微信分享请点击“复制全文”，然后粘贴给好友。
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
