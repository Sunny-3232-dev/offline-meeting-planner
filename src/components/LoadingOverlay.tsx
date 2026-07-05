import React, { useEffect, useMemo, useState } from 'react';
import { EntakuLoading } from './Entaku';

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
  /** 旧API互換のため受け取るが、現デザインでは使用しない */
  sourceText?: string;
}

// フェーズ別のフレーバーテキスト（メッセージ本文から推定して切り替え）
const PHASES: { keywords: string[]; flavorTexts: string[] }[] = [
  {
    keywords: ['企画', 'アイデア'],
    flavorTexts: [
      'あなたに合うオフ会を考えています',
      '王道系・ニッチ系を出しています',
      '初主催でもやりやすい形を選んでいます',
    ],
  },
  {
    keywords: ['タイトル', '定員', '人数'],
    flavorTexts: ['参加したくなるタイトルを考えています', 'ちょうどいい人数を見積もっています'],
  },
  {
    keywords: ['スケジュール', '進行', 'タイムテーブル'],
    flavorTexts: [
      '当日の流れを組み立てています',
      '自己紹介や歓談の時間を配分しています',
      '無理のない進行を設計しています',
    ],
  },
  {
    keywords: ['詳細', '告知', '案内', 'チャット', 'つぶやき'],
    flavorTexts: [
      '参加したくなる文章を書いています',
      'あなたの言葉で案内を仕上げています',
      '読みやすい形に整えています',
    ],
  },
  {
    keywords: ['アイコン', 'サムネイル', '画像'],
    flavorTexts: ['オフ会の顔になるアイコンを構想しています', 'サムネイルの構図を考えています'],
  },
];

const DEFAULT_FLAVORS = ['オフ会Creatorが考えています', 'もう少しだけお待ちください'];

export default function LoadingOverlay({
  message = 'オフ会Creatorが考えています...',
  subMessage = 'しばらくお待ちください',
}: LoadingOverlayProps) {
  const flavorTexts = useMemo(() => {
    const phase = PHASES.find((p) => p.keywords.some((kw) => message.includes(kw)));
    return phase?.flavorTexts || DEFAULT_FLAVORS;
  }, [message]);

  const [flavorIndex, setFlavorIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFlavorIndex((prev) => (prev + 1) % flavorTexts.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [flavorTexts.length]);

  const displaySubMessage =
    subMessage !== 'しばらくお待ちください' ? subMessage : flavorTexts[flavorIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
      role="progressbar"
      aria-label="コンテンツ生成中"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="animate-fade-in bg-white rounded-2xl shadow-2xl px-10 py-9 max-w-sm w-full text-center"
        role="status"
        aria-label="ローディング表示"
      >
        {/* 円卓を、灯りがひとまわり */}
        <div className="flex justify-center mb-4">
          <EntakuLoading size={92} />
        </div>
        <p className="text-base font-bold text-slate-800">{message}</p>
        <p
          className="mt-1.5 text-sm text-slate-500"
          key={flavorIndex}
          style={{ animation: 'fade-in 0.5s ease-in-out' }}
        >
          {displaySubMessage}
        </p>
      </div>
    </div>
  );
}
