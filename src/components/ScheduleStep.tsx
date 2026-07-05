import React, { useState } from 'react';
import { ScheduleItem, EventBasics } from '../types';
import { computeTimeRanges, totalDuration } from '../utils/time';
import { ArrowRightIcon, ChevronLeftIcon, RefreshIcon, PlusIcon, TrashIcon } from './icons';

interface ScheduleStepProps {
  schedule: ScheduleItem[];
  basics: EventBasics;
  onChange: (schedule: ScheduleItem[]) => void;
  /** feedbackが空文字の場合は同条件での作り直し、それ以外は要望を反映して作り直す */
  onRegenerate: (feedback: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function newItem(): ScheduleItem {
  return { id: crypto.randomUUID(), title: '', description: '', durationMinutes: 10 };
}

export default function ScheduleStep({
  schedule,
  basics,
  onChange,
  onRegenerate,
  onNext,
  onBack,
}: ScheduleStepProps) {
  const ranges = computeTimeRanges(basics.startTime, schedule);
  const total = totalDuration(schedule);
  const diff = total - basics.durationMinutes;
  const [feedback, setFeedback] = useState('');

  const handleRegenerate = () => {
    onRegenerate(feedback);
    setFeedback('');
  };

  const update = (id: string, patch: Partial<ScheduleItem>) => {
    onChange(schedule.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= schedule.length) return;
    const next = [...schedule];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };

  const remove = (id: string) => onChange(schedule.filter((s) => s.id !== id));

  const insertAfter = (idx: number) => {
    const next = [...schedule];
    next.splice(idx + 1, 0, newItem());
    onChange(next);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">当日の進行イメージ</h2>
      <p className="text-sm text-slate-500 mb-6">
        時間を変えたり、項目を入れ替えたり、自由に調整してください。開始時刻（{basics.startTime}）からの時刻は自動で計算されます。
      </p>

      {schedule.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center mb-6">
          <p className="text-sm text-slate-500 mb-4">まだ進行イメージがありません</p>
          <button
            onClick={() => onRegenerate('')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            AIに進行イメージを作ってもらう
          </button>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {schedule.map((item, idx) => (
            <div key={item.id} className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* 時刻・時間 */}
                <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:w-32 shrink-0">
                  <span className="text-xs font-bold text-sky-700 tabular-nums whitespace-nowrap">
                    {ranges[idx]}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      step={5}
                      value={item.durationMinutes}
                      onChange={(e) => update(item.id, { durationMinutes: Math.max(1, Number(e.target.value) || 1) })}
                      aria-label="所要時間（分）"
                      className="w-20 text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-slate-50 tabular-nums"
                    />
                    <span className="text-xs text-slate-500">分</span>
                  </div>
                </div>

                {/* タイトル・説明 */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => update(item.id, { title: e.target.value })}
                    placeholder="項目名（例: 自己紹介タイム）"
                    aria-label={`項目${idx + 1}のタイトル`}
                    className="w-full text-sm font-semibold text-slate-800 border-b border-transparent hover:border-slate-200 focus:border-sky-400 focus:outline-none bg-transparent py-0.5"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => update(item.id, { description: e.target.value })}
                    placeholder="進行メモ（任意）"
                    rows={1}
                    aria-label={`項目${idx + 1}の説明`}
                    className="w-full text-xs text-slate-500 border-b border-transparent hover:border-slate-200 focus:border-sky-400 focus:outline-none bg-transparent resize-none py-0.5"
                  />
                </div>

                {/* 操作 */}
                <div className="flex sm:flex-col items-center gap-1 shrink-0">
                  <div className="flex sm:flex-row gap-1">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="上へ移動"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 transition-colors"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === schedule.length - 1}
                      aria-label="下へ移動"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 transition-colors"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      aria-label="この項目を削除"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon size={14} />
                    </button>
                    <button
                      onClick={() => insertAfter(idx)}
                      aria-label="この下に項目を追加"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                    >
                      <PlusIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {schedule.length > 0 && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium mb-6 ${
            diff === 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : diff > 0
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
          role="status"
        >
          合計 {total}分 / 予定 {basics.durationMinutes}分
          {diff === 0 ? '（ぴったり！）' : diff > 0 ? `（${diff}分オーバー）` : `（あと${-diff}分空きあり）`}
        </div>
      )}

      {schedule.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8">
          <label htmlFor="scheduleFeedback" className="block text-xs font-semibold text-slate-600 mb-1.5">
            AIに作り直してほしい点を教えてください
          </label>
          <textarea
            id="scheduleFeedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="例: もっとカジュアルに／休憩を1つ増やして／自己紹介を長めに"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white mb-2"
          />
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <RefreshIcon size={13} />
            AIで作り直す
          </button>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <ChevronLeftIcon size={16} />
            基本情報に戻る
          </button>
        </div>
        <button
          onClick={onNext}
          disabled={schedule.length === 0}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-600/20"
        >
          詳細（公開情報）を作る
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
