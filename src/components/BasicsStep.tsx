import React from 'react';
import { EventBasics, PlanIdea } from '../types';
import { DURATION_OPTIONS, OFFICIAL_OFFICES, officeLabel, PREFECTURES } from '../constants';
import { ArrowRightIcon, ChevronLeftIcon, RefreshIcon, SparklesIcon, AlertIcon } from './icons';

const ONLINE_PLACE_OPTIONS = ['oVice', 'その他オンライン'] as const;

// 開始時刻は15分刻みで選択（1分刻みの自由入力は違和感があるため）
const TIME_OPTIONS: string[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

/** 通常モードの開催場所プルダウン値から venueType を導出する */
function deriveVenueType(onlineTool: string): 'online' | 'offline' {
  return onlineTool === 'oVice' || onlineTool === 'その他オンライン' ? 'online' : 'offline';
}

/** 通常モードの venueDetail 合成ルール */
function composeNormalVenueDetail(onlineTool: string, onlineToolOther: string): string {
  if (!onlineTool) return '';
  const other = onlineToolOther.trim();
  if (deriveVenueType(onlineTool) === 'online') {
    return other ? `${onlineTool}（${other}）` : onlineTool;
  }
  // 都道府県
  return other ? `${onlineTool} ${other}` : onlineTool;
}

interface BasicsStepProps {
  basics: EventBasics;
  idea: PlanIdea | null;
  onChange: (basics: EventBasics) => void;
  onRegenerateTitles: () => void;
  onSuggestCapacity: () => void;
  suggestingCapacity: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function BasicsStep({
  basics,
  idea,
  onChange,
  onRegenerateTitles,
  onSuggestCapacity,
  suggestingCapacity,
  onNext,
  onBack,
}: BasicsStepProps) {
  const set = (patch: Partial<EventBasics>) => onChange({ ...basics, ...patch });

  const canProceed =
    basics.title.trim().length > 0 &&
    !!basics.date &&
    !!basics.startTime &&
    basics.venueDetail.trim().length > 0 &&
    basics.capacity >= 2;

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">オフ会の基本情報を決めましょう</h2>
      <p className="text-sm text-slate-500 mb-8">
        {idea ? `企画「${idea.title}」をもとに決めていきます。` : ''}
        日時と場所はあなたにしか決められない大事なポイントです。
      </p>

      <div className="space-y-8">
        {/* タイトル */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="eventTitle" className="text-sm font-semibold text-slate-700">
              タイトル <span className="text-red-500 text-xs">必須</span>
            </label>
            <button
              onClick={onRegenerateTitles}
              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 transition-colors"
            >
              <RefreshIcon size={13} />
              候補を出し直す
            </button>
          </div>
          <input
            id="eventTitle"
            type="text"
            value={basics.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="タイトルを入力、または下の候補から選択"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          {basics.titleCandidates.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {basics.titleCandidates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ title: t })}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    basics.title === t
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 日時 */}
        <section>
          <span className="block text-sm font-semibold text-slate-700 mb-1.5">
            日時 <span className="text-red-500 text-xs">必須</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="eventDate" className="block text-xs text-slate-500 mb-1">開催日</label>
              <input
                id="eventDate"
                type="date"
                value={basics.date}
                onChange={(e) => set({ date: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-xs text-slate-500 mb-1">開始時刻</label>
              <select
                id="startTime"
                value={basics.startTime}
                onChange={(e) => set({ startTime: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              >
                {/* 旧データ等で15分刻み以外の値が保存されている場合も表示できるようにする */}
                {basics.startTime && !TIME_OPTIONS.includes(basics.startTime) && (
                  <option value={basics.startTime}>{basics.startTime}</option>
                )}
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-xs text-slate-500 mb-1">開催時間</label>
              <select
                id="duration"
                value={basics.durationMinutes}
                onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d >= 60 ? `${Math.floor(d / 60)}時間${d % 60 ? `${d % 60}分` : ''}` : `${d}分`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 場所 */}
        <section>
          <span className="block text-sm font-semibold text-slate-700 mb-1.5">
            場所 <span className="text-red-500 text-xs">必須</span>
          </span>

          {/* 種類選択: 公式オフィス / 通常のオフ会・イベント */}
          <div className="flex flex-wrap gap-2 mb-2" role="radiogroup" aria-label="開催形態の種類">
            {([
              { official: true, label: '公式オフィスで開催するイベント' },
              { official: false, label: '通常のオフ会・イベント' },
            ]).map((v) => {
              const checked = v.official ? !!basics.officeKey : !basics.officeKey;
              return (
                <button
                  key={String(v.official)}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => {
                    if (v.official) {
                      // 公式オフィスを選んだら先頭のオフィスを仮選択し、場所欄も連動
                      const first = basics.officeKey || OFFICIAL_OFFICES[0].key;
                      set({
                        officeKey: first,
                        venueType: 'offline',
                        venueDetail: `リベシティ ${officeLabel(first)}`,
                        onlineTool: '',
                        onlineToolOther: '',
                      });
                    } else {
                      set({ officeKey: '', onlineTool: '', onlineToolOther: '', venueDetail: '' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    checked
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* 公式オフィスで開催するイベント */}
          {!!basics.officeKey && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="radiogroup" aria-label="オフィスを選択">
                {OFFICIAL_OFFICES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={basics.officeKey === o.key}
                    onClick={() => set({ officeKey: o.key, venueDetail: `リベシティ ${o.label}` })}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      basics.officeKey === o.key
                        ? 'bg-sky-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-sky-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-amber-700 flex items-start gap-1">
                <AlertIcon size={13} className="shrink-0 mt-0.5" />
                <span>公式オフィス開催は、チャット作成前に必ず<b>オフィスの予約</b>をお取りください（リベシティのオフ会作成フォームにも同じ注意があります）</span>
              </p>
            </div>
          )}

          {/* 通常のオフ会・イベント */}
          {!basics.officeKey && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 space-y-2">
              <select
                value={basics.onlineTool}
                aria-label="開催場所"
                onChange={(e) => {
                  const tool = e.target.value;
                  const venueType = tool ? deriveVenueType(tool) : basics.venueType;
                  set({
                    onlineTool: tool,
                    venueType,
                    venueDetail: composeNormalVenueDetail(tool, basics.onlineToolOther),
                  });
                }}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              >
                <option value="">選択してください</option>
                {ONLINE_PLACE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
              <input
                type="text"
                value={basics.onlineToolOther}
                onChange={(e) => {
                  const other = e.target.value;
                  set({
                    onlineToolOther: other,
                    venueDetail: composeNormalVenueDetail(basics.onlineTool, other),
                  });
                }}
                placeholder="例：市区町村"
                aria-label="開催場所の詳細"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              />
            </div>
          )}
        </section>

        {/* 定員 */}
        <section>
          <span className="block text-sm font-semibold text-slate-700 mb-1.5">
            定員（主催者含む） <span className="text-red-500 text-xs">必須</span>
          </span>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => set({ capacity: Math.max(2, basics.capacity - 1) })}
                className="px-4 py-2.5 text-slate-500 hover:bg-slate-50 text-lg font-bold"
                aria-label="定員を減らす"
              >
                −
              </button>
              <input
                type="number"
                min={2}
                max={50}
                value={basics.capacity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  set({ capacity: Math.min(50, Math.max(2, v)) });
                }}
                aria-label="定員を数値で入力"
                className="w-16 text-center text-sm font-bold text-slate-800 tabular-nums focus:outline-none"
              />
              <button
                type="button"
                onClick={() => set({ capacity: Math.min(50, basics.capacity + 1) })}
                className="px-4 py-2.5 text-slate-500 hover:bg-slate-50 text-lg font-bold"
                aria-label="定員を増やす"
              >
                ＋
              </button>
            </div>
            <span className="text-xs text-slate-500">人</span>
            <button
              type="button"
              onClick={onSuggestCapacity}
              disabled={suggestingCapacity}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              <SparklesIcon size={14} />
              {suggestingCapacity ? '考え中...' : 'AIに目安を聞く'}
            </button>
          </div>
          {basics.capacitySuggestion && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold mb-0.5">
                おすすめは {basics.capacitySuggestion.recommended}人（{basics.capacitySuggestion.min}〜
                {basics.capacitySuggestion.max}人）
              </p>
              <p>{basics.capacitySuggestion.reason}</p>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 mt-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ChevronLeftIcon size={16} />
          企画案に戻る
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-600/20"
        >
          進行イメージを作る
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
