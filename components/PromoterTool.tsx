
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generatePromotion } from '../services/geminiService';
import { extractWords } from '../utils/textProcessing';
import LoadingOverlay from './LoadingOverlay';

interface PromoterToolProps {
  ensureKeySet: () => Promise<boolean>;
  onHandleApiError: (error: any) => void;
}

// TweetCard component - module scope (prevents remount on parent re-render)
const TweetCard: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const [copied, setCopied] = useState(false);
  
  // 句点で改行を入れるフォーマット処理
  const formattedText = useMemo(() => {
      // 既に改行がある場合は重複を避けるため、単純な置換の後に連続する改行を整理する
      return text
          .replace(/。(?!\n)/g, '。\n') // 後ろに改行がない「。」に改行を追加
          .trim();
  }, [text]);

  const handleCopy = () => {
      navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const tweetUrl = `https://libecity.com/tweet/all?create=${encodeURIComponent(formattedText)}`;

  return (
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all w-full group">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-100">
              <span className="bg-stone-100 text-stone-500 text-xs font-bold px-3 py-1 rounded-full border border-stone-200">
                  Pattern {index + 1}
              </span>
              <div className="flex items-center gap-2">
                  <a
                      href={tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold px-4 py-2 rounded-full border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all flex items-center gap-2 shadow-sm"
                  >
                      <span>🕊️</span> つぶやく
                  </a>
                  <button 
                      onClick={handleCopy}
                      className={`text-xs font-bold px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
                          copied 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-stone-800 text-white border-stone-800 hover:bg-stone-700 hover:border-stone-700 shadow-sm'
                      }`}
                  >
                      {copied ? (
                          <><span>✅</span> コピー済</>
                      ) : (
                          <><span>📋</span> コピー</>
                      )}
                  </button>
              </div>
          </div>
          <div className="relative">
              <div 
                  className="w-full bg-stone-50 rounded-xl p-4 text-sm md:text-base text-stone-700 leading-relaxed border border-stone-100 outline-none focus:ring-2 focus:ring-orange-100/50 whitespace-pre-wrap select-text"
              >
                  {formattedText}
              </div>
          </div>
      </div>
  );
};

const PromoterTool: React.FC<PromoterToolProps> = ({ ensureKeySet, onHandleApiError }) => {
  const [serviceBody, setServiceBody] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [posts, setPosts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputWords = useMemo(() => extractWords(serviceBody), [serviceBody]);

  // 投稿生成後にスクロール位置を最上部にリセット
  useEffect(() => {
    if (posts.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [posts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceBody.trim()) {
        alert("サービス本文を入力してください。");
        return;
    }

    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setIsLoading(true);
    try {
      const data = await generatePromotion(serviceBody, serviceUrl);
      setPosts(data);
    } catch (error) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-y-auto">
        {posts.length === 0 ? (
            <div className="p-6 md:p-12 flex-grow flex flex-col">
                <div className="mb-8">
                    <span className="text-orange-500 font-bold tracking-wider text-xs uppercase mb-1 block">Promoter</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-stone-800">リベシティつぶやき作成</h2>
                    <p className="text-stone-500 mt-2">
                        サービス本文から、リベシティの文化に合う「前向き・丁寧・押しつけない」つぶやきを20本生成します。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col max-w-3xl mx-auto w-full">
                    <div className="space-y-2">
                        <label className="font-bold text-stone-700 block flex justify-between items-end">
                            <span>出品サービスページ本文</span>
                            <span className="text-xs text-stone-400 font-normal">Creatorで作った「サービス詳細」などを貼り付け</span>
                        </label>
                        <textarea 
                            value={serviceBody}
                            onChange={(e) => setServiceBody(e.target.value)}
                            className="w-full p-5 rounded-2xl border-stone-200 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-orange-200 min-h-[250px] shadow-inner text-base leading-relaxed"
                            placeholder="ここにサービス説明文を貼り付けてください..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-stone-700 block">出品サービスURL（任意）</label>
                        <input 
                            type="text"
                            value={serviceUrl}
                            onChange={(e) => setServiceUrl(e.target.value)}
                            className="w-full p-4 rounded-xl border-stone-200 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-orange-200"
                            placeholder="https://skill.libecity.com/services/..."
                        />
                        <p className="text-xs text-stone-400">※URLは広告感が出ないよう、20本中7本程度に控えめに挿入されます。</p>
                    </div>
                    
                    <div className="flex-grow"></div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>📣</span> つぶやきを20本生成する
                    </button>
                </form>
            </div>
        ) : (
            <div className="p-6 md:p-12 h-full flex flex-col">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">生成されたつぶやき (20本)</h2>
                        <p className="text-xs text-stone-500 mt-1">気に入ったものをコピー、または直接つぶやいてください。</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setPosts([])} 
                            className="text-xs font-bold bg-white border border-stone-200 px-5 py-2.5 rounded-full hover:bg-stone-50 text-stone-600 transition-colors shadow-sm"
                        >
                            ↩ 入力に戻る
                        </button>
                    </div>
                 </div>
                 
                 <div className="overflow-y-auto -mx-6 px-6 pb-6 custom-scrollbar">
                     <div className="max-w-4xl mx-auto space-y-6 pb-12">
                        {posts.map((post, idx) => (
                            <TweetCard key={idx} text={post} index={idx} />
                        ))}
                     </div>
                 </div>
            </div>
        )}
        {isLoading && (
            <LoadingOverlay 
                message="困りごとに寄り添ってから、解決策をそっと添える形で。読んだ方が気持ちよく受け取れる文にしています。" 
                title="投稿のたたき台を20本用意しています" 
                sourceWords={inputWords} 
            />
        )}
    </div>
  );
};

export default PromoterTool;
