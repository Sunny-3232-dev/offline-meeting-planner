import React from 'react';
import { PlanIdea, IdeaCategory, normalizeIdeaCategory } from '../types';
import { MAX_PINNED_IDEAS } from '../constants';
import { ArrowRightIcon, ChevronLeftIcon, RefreshIcon, CheckIcon, LanternIcon, UserIcon, MapPinIcon, SproutIcon, GroupIcon, BookOpenIcon, PenToolIcon, KeyIcon, KanpaiIcon } from './icons';

interface IdeasStepProps {
  ideas: PlanIdea[];
  selectedIdeaId: string | null;
  pinnedIds: string[];
  /** プロフィールで指定されたテーマ（空なら王道系・テーマ系を提案した旨の説明文になる） */
  plannedTheme?: string;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRegenerate: () => void;
  /** カードのダブルクリック or 下部ボタンで、その企画に決めて基本情報へ */
  onProceed: (idea: PlanIdea) => void;
  onBack: () => void;
}

const CATEGORY_META: Record<IdeaCategory, { label: string; Icon: React.ComponentType<{ className?: string; size?: number }>; desc: string; bg: string; border: string; accent: string }> = {
  save: {
    label: '貯める',
    Icon: BookOpenIcon,
    desc: '家計管理・固定費・ライフプランでお金を貯める会',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    accent: 'text-emerald-700',
  },
  earn: {
    label: '稼ぐ',
    Icon: PenToolIcon,
    desc: '副業・IT・スキルで収入を増やす会',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-700',
  },
  protect: {
    label: '守る',
    Icon: KeyIcon,
    desc: '保険・税金・詐欺回避でお金を守る会',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    accent: 'text-sky-700',
  },
  grow: {
    label: '増やす',
    Icon: SproutIcon,
    desc: '新NISA・投資でお金を増やす会',
    bg: 'bg-green-50',
    border: 'border-green-200',
    accent: 'text-green-700',
  },
  use: {
    label: '使う',
    Icon: KanpaiIcon,
    desc: 'ランチ・BBQ・旅行などお金を使って楽しむ会',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    accent: 'text-rose-700',
  },
  other: {
    label: 'その他',
    Icon: GroupIcon,
    desc: 'お金の5つに属さない、雑談・交流など気軽に集まる会',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    accent: 'text-slate-600',
  },
};

const CATEGORY_ORDER: IdeaCategory[] = ['save', 'earn', 'protect', 'grow', 'use', 'other'];

function IdeaCard({
  idea,
  isSelected,
  isPinned,
  pinDisabled,
  meta,
  onSelect,
  onTogglePin,
  onProceed,
}: {
  idea: PlanIdea;
  isSelected: boolean;
  isPinned: boolean;
  pinDisabled: boolean;
  meta: { bg: string; border: string };
  onSelect: () => void;
  onTogglePin: () => void;
  onProceed: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onDoubleClick={onProceed}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onProceed();
        if (e.key === ' ') { e.preventDefault(); onSelect(); }
      }}
      title="クリックで選択 / ダブルクリックでこの企画に決めて次へ"
      className={`card-hover relative cursor-pointer select-none text-left rounded-2xl border-2 p-4 ${meta.bg} ${
        isSelected ? 'border-sky-500 ring-2 ring-sky-200' : meta.border
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (!pinDisabled) onTogglePin(); }}
        onDoubleClick={(e) => e.stopPropagation()}
        disabled={pinDisabled}
        aria-label={isPinned ? 'ピン留めを外す' : 'ピン留めする'}
        aria-pressed={isPinned}
        title={
          isPinned
            ? 'ピン留めを外す'
            : pinDisabled
              ? `ピン留めは最大${MAX_PINNED_IDEAS}件までです`
              : '気になったらピン留め（再生成しても残ります）'
        }
        className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all ${
          isPinned
            ? 'bg-amber-100 text-amber-600 shadow'
            : pinDisabled
              ? 'bg-white/50 text-slate-300 opacity-40 cursor-not-allowed'
              : 'bg-white/80 text-slate-400 opacity-70 hover:opacity-100 hover:text-amber-500'
        }`}
      >
        <LanternIcon size={16} lit={isPinned} />
      </button>

      <div className="flex items-start gap-2 mb-1.5 pr-7">
        {isSelected && (
          <span className="shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white">
            <CheckIcon size={12} />
          </span>
        )}
        <p className="font-bold text-sm text-slate-800 leading-snug">{idea.title}</p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed mb-2">{idea.summary}</p>
      <dl className="space-y-1 text-[11px] text-slate-500">
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-slate-400"><UserIcon size={13} /></dt>
          <dd>{idea.persona}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-slate-400"><MapPinIcon size={13} /></dt>
          <dd>{idea.venueHint}・目安 {idea.recommendedCapacity}人</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-slate-400"><SproutIcon size={13} /></dt>
          <dd>{idea.firstTimerFriendlyPoint}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function IdeasStep({
  ideas,
  selectedIdeaId,
  pinnedIds,
  plannedTheme,
  onSelect,
  onTogglePin,
  onRegenerate,
  onProceed,
  onBack,
}: IdeasStepProps) {
  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId) || null;
  const pinnedIdeas = ideas.filter((i) => pinnedIds.includes(i.id));
  const pinLimitReached = pinnedIds.length >= MAX_PINNED_IDEAS;

  const renderCard = (idea: PlanIdea) => (
    <React.Fragment key={idea.id}>
    <IdeaCard
      idea={idea}
      isSelected={selectedIdeaId === idea.id}
      isPinned={pinnedIds.includes(idea.id)}
      pinDisabled={pinLimitReached && !pinnedIds.includes(idea.id)}
      meta={CATEGORY_META[normalizeIdeaCategory(idea.category)]}
      onSelect={() => onSelect(idea.id)}
      onTogglePin={() => onTogglePin(idea.id)}
      onProceed={() => onProceed(idea)}
    />
    </React.Fragment>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">どのオフ会を開いてみますか？</h2>
      <p className="text-sm text-slate-500 mb-1">
        {plannedTheme && plannedTheme.trim()
          ? `テーマ「${plannedTheme}」に沿った企画案を提案しました。`
          : 'あなたのプロフィールをもとに、お金の5つのテーマ（貯める・稼ぐ・守る・増やす・使う）と、その他の会を提案しました。'}
      </p>
      <p className="text-xs text-slate-400 mb-6">
        気になった案は灯マークでピン留め（最大{MAX_PINNED_IDEAS}件・「別の案を出す」でも消えません）／ カードを<b>ダブルクリック</b>するとその企画に決めて次へ進みます
      </p>

      {/* ピン留め */}
      {pinnedIdeas.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500" aria-hidden="true"><LanternIcon size={17} lit /></span>
            <h3 className="font-bold text-amber-700">ピン留め</h3>
            <p className="text-xs text-slate-400">{pinnedIdeas.length} / {MAX_PINNED_IDEAS}件</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{pinnedIdeas.map(renderCard)}</div>
        </section>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat];
        const items = ideas.filter((i) => normalizeIdeaCategory(i.category) === cat && !pinnedIds.includes(i.id));
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <meta.Icon size={19} className={meta.accent} />
              <h3 className={`font-bold ${meta.accent}`}>{meta.label}</h3>
              <p className="text-xs text-slate-400">{meta.desc}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(renderCard)}</div>
          </section>
        );
      })}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 mt-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <ChevronLeftIcon size={16} />
            プロフィールに戻る
          </button>
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshIcon size={15} />
            別の案を出す（ピン留めは残ります）
          </button>
        </div>
        <button
          onClick={() => selectedIdea && onProceed(selectedIdea)}
          disabled={!selectedIdea}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-600/20"
        >
          この企画で基本情報へ
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
