
import React from 'react';
import { ToolType } from '../types';
import { PenIcon, ArrowRightIcon } from './icons';

interface HubProps {
  onSelectTool: (tool: ToolType) => void;
}

// --- Components ---

const CapabilityChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-[10px] md:text-[11px] font-bold text-stone-600 tracking-wide">
    {label}
  </span>
);

const ToolCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  themeColor: 'rose' | 'orange' | 'blue' | 'purple';
  onClick: () => void;
  badge?: string;
  featured?: boolean;
  capabilities?: string[];
}> = ({ title, description, icon, themeColor, onClick, badge, featured, capabilities }) => {

  const themeStyles: Record<string, any> = {
    rose: {
      bgIcon: 'bg-rose-50 text-rose-600',
      badge: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
      badgeSub: 'bg-rose-50 text-rose-600 border-rose-200',
      btnPrimary: 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-200',
      btnGhost: 'text-stone-600 border-stone-200 hover:bg-stone-50',
    },
    purple: {
      bgIcon: 'bg-purple-50 text-purple-600',
      badge: 'bg-purple-500 text-white shadow-sm shadow-purple-200',
      badgeSub: 'bg-purple-50 text-purple-600 border-purple-200',
      btnPrimary: 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-200',
      btnGhost: 'text-stone-600 border-stone-200 hover:bg-stone-50',
    },
    orange: {
      bgIcon: 'bg-orange-50 text-orange-600',
      badge: 'bg-orange-500 text-white shadow-sm shadow-orange-200',
      badgeSub: 'bg-orange-50 text-orange-600 border-orange-200',
      btnGhost: 'text-stone-600 border-stone-200 hover:bg-stone-50',
    },
    blue: {
      bgIcon: 'bg-blue-50 text-blue-600',
      badge: 'bg-blue-500 text-white shadow-sm shadow-blue-200',
      badgeSub: 'bg-blue-50 text-blue-600 border-blue-200',
      btnGhost: 'text-stone-600 border-stone-200 hover:bg-stone-50',
    }
  };

  const styles = themeStyles[themeColor];

  const containerClasses = featured
    ? 'flex-col md:flex-row items-start md:items-center p-6 md:p-8 gap-6 md:gap-8 rounded-[2rem] bg-white border border-stone-100 ring-1 ring-black/[0.04] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)]'
    : 'flex-row items-start gap-5 p-5 md:p-6 rounded-[1.5rem] bg-white border border-stone-100 ring-1 ring-black/[0.04] shadow-sm hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] h-full';

  const CtaButton = featured ? (
    <div className={`flex items-center gap-2 px-7 py-3 rounded-full font-bold text-xs md:text-sm transition-all active:scale-95 ${styles.btnPrimary} w-full md:w-auto justify-center md:justify-start whitespace-nowrap`}>
      <span>作成を始める</span>
      <span className="opacity-70 group-hover:translate-x-0.5 transition-transform"><ArrowRightIcon /></span>
    </div>
  ) : (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${styles.btnGhost} bg-stone-50 group-hover:bg-white`}>
      <span>開く</span>
      <span className="opacity-40 group-hover:translate-x-0.5 transition-transform group-hover:opacity-100 text-stone-800">→</span>
    </div>
  );

  return (
    <button
      onClick={onClick}
      className={`group relative flex text-left w-full overflow-hidden transition-all duration-300 ease-out
        hover:scale-[1.005]
        ${containerClasses}`}
    >
      <div className={`absolute -right-10 -bottom-10 opacity-[0.03] transform group-hover:scale-105 transition-transform duration-1000 pointer-events-none grayscale ${featured ? 'scale-125' : 'scale-110'}`}>
         <div className="w-48 h-48 text-black fill-current">{icon}</div>
      </div>

      <div className={`shrink-0 flex items-center justify-center rounded-[1.2rem] transition-colors duration-300 border border-black/[0.02] ${styles.bgIcon}
        ${featured ? 'w-16 h-16 md:w-20 md:h-20' : 'w-14 h-14'}
      `}>
        <div className={`${featured ? 'scale-125' : 'scale-110'}`}>{icon}</div>
      </div>

      <div className="relative z-10 flex-grow flex flex-col items-start w-full min-w-0">
        {badge && (
          <div className="mb-2">
            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full border ${featured ? `${styles.badge} border-transparent` : styles.badgeSub}`}>
              {badge}
            </span>
          </div>
        )}
        <h3 className={`font-bold text-stone-900 tracking-tight leading-tight group-hover:text-black transition-colors
          ${featured ? 'text-2xl md:text-3xl mb-2.5' : 'text-lg mb-1.5'}
        `}>{title}</h3>
        <p className={`font-medium leading-relaxed tracking-normal
          ${featured ? 'text-stone-600 text-sm md:text-[15px] mb-4 max-w-lg' : 'text-stone-600 text-[12px] md:text-[13px] mb-3'}
        `}>{description}</p>

        {featured && capabilities && (
          <div className="flex flex-wrap gap-2 mb-0 md:mb-0">
            {capabilities.map(cap => <CapabilityChip key={cap} label={cap} />)}
          </div>
        )}

        {featured && (
          <div className="mt-6 w-full md:hidden">{CtaButton}</div>
        )}
        {!featured && (
          <div className="mt-auto w-full flex justify-start">{CtaButton}</div>
        )}
      </div>

      {featured && (
        <div className="hidden md:block shrink-0 ml-4">{CtaButton}</div>
      )}
    </button>
  );
};

// --- Support Tools Icon ---
const SupportToolsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const Hub: React.FC<HubProps> = ({ onSelectTool }) => {
  return (
    <div className="p-4 md:p-8 animate-in fade-in zoom-in duration-700 h-full flex flex-col items-center overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-6 w-full max-w-4xl my-auto">

        {/* Creator (Hero Section) */}
        <div className="w-full">
            <ToolCard
                title="出品アイデアを作る"
                description="あなたの「好き・得意」を分析。出品アイデアからサムネイルプロンプトまで、一括で生成します。"
                icon={<PenIcon />}
                themeColor="rose"
                onClick={() => onSelectTool(ToolType.CREATOR)}
                badge="Creator"
                featured={true}
                capabilities={["アイデア提案", "タイトル・本文執筆", "画像生成"]}
            />
        </div>

        {/* Section Divider */}
        <div className="flex items-center gap-3 py-2 mt-2 px-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Support Tools</span>
            <div className="h-px bg-stone-200 flex-grow"></div>
        </div>

        {/* Support Tools (Single Card) */}
        <div className="w-full">
            <ToolCard
                title="サポートメニュー"
                description="宣伝文の作成、アンケート作成など。サービス詳細を一度入力すれば、複数のメニューを実行できます。"
                icon={<SupportToolsIcon />}
                themeColor="purple"
                onClick={() => onSelectTool(ToolType.SUPPORT)}
                badge="Support"
                capabilities={["宣伝文作成", "アンケート作成"]}
            />
        </div>

        {/* Disclaimer Section */}
        <div className="mt-2 px-5 py-5 md:px-6 bg-white border border-stone-100 rounded-2xl shadow-sm">
           <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-3">
             <span className="text-stone-400 text-sm">🛡️</span>
             <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">免責事項</h3>
           </div>
           <div className="text-[10px] text-stone-400 leading-relaxed text-justify md:text-left space-y-2">
             <p>本サービスが生成するコンテンツ（アイデア、文章、画像等）はAIによって自動生成されたものであり、正確性や有用性を保証するものではありません。</p>
             <p>High Quality画像の生成にはAPIキーの設定が必要です。</p>
             <p>実際のスキルマーケットに出品する際は、必ずご自身で内容を確認・修正し、各プラットフォームの規約を遵守してください。</p>
           </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a29e; }
      `}</style>
    </div>
  );
};

export default Hub;
