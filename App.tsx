
import React, { useState, useEffect } from 'react';
import { ToolType } from './types';
import Hub from './components/Hub';
import CreatorTool from './components/CreatorTool';
import PromoterTool from './components/PromoterTool';
import SurveyTool from './components/SurveyorTool';
import SupportHub from './components/SupportHub';

const getEnvApiKey = (): string => {
  try {
    return process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  } catch {
    return "";
  }
};

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.TOP);

  // ツール切り替え時にスクロール位置をトップにリセット
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTool]);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        try {
          const selected = await Promise.race([
            aistudio.hasSelectedApiKey(),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 5000)
            ),
          ]);
          setHasKey(selected);
        } catch (err) {
          console.warn("API key check failed or timed out:", err);
          setHasKey(false);
        }
      } else if (getEnvApiKey()) {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  // ensureKeySet: Google AI Studio ではセッションから自動的にキーが利用可能
  // ダイアログ表示なしに、常に認証済み状態で動作
  const ensureKeySet = async (): Promise<boolean> => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      // Google AI Studio 環境 - セッションから自動的にキーが利用可能
      // ダイアログ表示は行わない
      return true;
    } else if (getEnvApiKey()) {
      // 開発環境で環境変数からキーを取得
      return true;
    } else {
      // キーがない環境（初期状態など）
      return false;
    }
  };

  const handleApiError = (error: any) => {
    console.error(error);
    const msg = error.message || "";
    if (msg.includes("Requested entity was not found")) {
      setHasKey(false);
      alert("APIのセッションが無効になった可能性があります。ページを再読み込みしてください。");
    } else {
      alert("エラーが発生しました。しばらくしてから再度お試しください。");
    }
  };

  const renderTool = () => {
    switch (currentTool) {
      case ToolType.CREATOR:
        return <CreatorTool ensureKeySet={ensureKeySet} onHandleApiError={handleApiError} />;
      case ToolType.SUPPORT:
        return <SupportHub ensureKeySet={ensureKeySet} onHandleApiError={handleApiError} />;
      case ToolType.PROMOTER:
        return <PromoterTool ensureKeySet={ensureKeySet} onHandleApiError={handleApiError} />;
      case ToolType.SURVEY:
        return <SurveyTool ensureKeySet={ensureKeySet} onHandleApiError={handleApiError} />;
      case ToolType.TOP:
      default:
        return <Hub onSelectTool={setCurrentTool} />;
    }
  };

  const getToolName = () => {
    switch (currentTool) {
      case ToolType.CREATOR: return "Creator";
      case ToolType.SUPPORT: return "サポートメニュー";
      case ToolType.PROMOTER: return "Promoter";
      case ToolType.SURVEY: return "アンケート作成";
      default: return "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12 font-sans relative">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 relative z-50 transition-all">
        <div 
          className="text-center md:text-left cursor-pointer group"
          onClick={() => setCurrentTool(ToolType.TOP)}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600">Skill Market</span>
            <span className="block md:inline md:ml-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600">
              Creator Pro
            </span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
             {currentTool === ToolType.TOP ? (
               <p className="text-stone-400 md:text-stone-500 font-medium tracking-wide text-xs md:text-sm group-hover:text-rose-500 transition-colors">
                  出品から集客まで。あなたのスキルマーケット活動をトータルサポート。
               </p>
             ) : (
                <div className="flex items-center gap-2">
                    <span className="bg-stone-100 text-stone-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Active Tool
                    </span>
                    <p className="text-stone-600 font-bold text-lg">{getToolName()}</p>
                </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
            {currentTool !== ToolType.TOP && (
                <button 
                  onClick={() => setCurrentTool(ToolType.TOP)}
                  className="bg-white text-stone-500 border border-stone-200 hover:bg-stone-50 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold transition-all shadow-sm"
                >
                    ↩ Topへ戻る
                </button>
            )}
          <a 
            href="https://library.libecity.com/articles/01KD26FQVJ9VJNH99JBJ9F3TGS" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50/50 hover:bg-rose-50 px-3 md:px-4 py-2 md:py-2.5 rounded-full border border-rose-100 transition-all shadow-sm shrink-0"
          >
            <span>📖</span> 使い方
          </a>
          {/* APIキー設定ボタン（現在無効化中・将来復活の可能性あり）
          <button
            type="button"
            onClick={handleOpenKeySelection}
            className={`text-[10px] md:text-xs font-bold flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full border transition-all cursor-pointer relative z-50 ${
              hasKey
                ? 'text-stone-400 hover:text-stone-600 bg-white/50 hover:bg-white border-stone-200/50 hover:border-stone-200'
                : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-sm'
            }`}
          >
            <span>{hasKey ? '⚙️' : '✨'}</span> {hasKey ? 'キー設定' : 'APIキー設定'}
          </button>
          */}
        </div>
      </header>

      <main className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden min-h-[500px] md:min-h-[600px] border border-white ring-1 ring-stone-100 relative flex flex-col z-10 transition-all">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-orange-100/40 to-rose-100/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-purple-100/40 to-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex-grow w-full flex flex-col">
          {renderTool()}
        </div>
      </main>

      <footer className="mt-12 md:mt-16 pb-8">
        <p className="text-center text-stone-400 text-[10px] md:text-sm font-medium italic">Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;
