import React from 'react';
import { SavedEvent } from '../types';
import { APP_NAME, APP_TAGLINE, MAX_SAVED_EVENTS } from '../constants';
import { formatDateJa } from '../utils/time';
import { ArrowRightIcon, RefreshIcon, TrashIcon, UserIcon, LightbulbIcon, CalendarIcon, ClockIcon, FileTextIcon, ImageIcon, MessagePlusIcon, MegaphoneIcon } from './icons';
import { EntakuProgress } from './Entaku';

interface HubProps {
  hasProgress: boolean;
  events: SavedEvent[];
  activeEventId: string | null;
  canCreate: boolean;
  onStart: () => void;
  onResume: () => void;
  onOpenEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const FLOW = [
  { Icon: UserIcon, title: 'プロフィール', desc: 'あなたの興味と開催したい場所を入力' },
  { Icon: LightbulbIcon, title: '企画案', desc: 'お金の5つのテーマ（貯める/稼ぐ/守る/増やす/使う）＋その他で提案。ピン留めして選べる' },
  { Icon: CalendarIcon, title: '基本情報', desc: 'タイトル・日時・場所・定員' },
  { Icon: ClockIcon, title: '進行イメージ', desc: '当日の大まかな流れ' },
  { Icon: FileTextIcon, title: '詳細情報', desc: 'そのまま貼れる公開情報の文章' },
  { Icon: ImageIcon, title: '画像', desc: 'アイコンとサムネのプロンプト' },
  { Icon: MessagePlusIcon, title: 'チャット作成', desc: '転記材料をコピーしてチャットを立ち上げる' },
  { Icon: MegaphoneIcon, title: '告知', desc: 'チャットURLを添えて支部チャット・つぶやきで広める' },
];

function eventTitle(ev: SavedEvent): string {
  return ev.snapshot.basics.title || ev.snapshot.idea?.title || '（タイトル未定）';
}

export default function Hub({
  hasProgress,
  events,
  activeEventId,
  canCreate,
  onStart,
  onResume,
  onOpenEvent,
  onDeleteEvent,
  onReset,
  onExport,
  onImport,
}: HubProps) {
  return (
    <div className="relative min-h-[70vh] flex flex-col items-center justify-center py-12 px-4">
      <div className="hub-hero-orb-1" aria-hidden="true" />
      <div className="hub-hero-orb-2" aria-hidden="true" />

      <div className="relative z-10 text-center max-w-2xl animate-fade-in">
        <div className="flex justify-center mb-4" aria-hidden="true"><EntakuProgress currentIdx={8} size={84} /></div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">{APP_NAME}</h1>
        <p className="text-slate-600 mb-2">{APP_TAGLINE}</p>
        <p className="text-sm text-slate-500 mb-8">
          「オフ会を開いてみたいけど、何から始めればいいかわからない」<br />
          そんなあなたの初主催を、企画から告知まで一緒に組み立てます。
        </p>

        {/* 保存済みのオフ会 */}
        {events.length > 0 && (
          <div className="mb-8 text-left">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-700">あなたのオフ会</h2>
              <p className="text-xs text-slate-400">{events.length} / {MAX_SAVED_EVENTS}件</p>
            </div>
            <div className="space-y-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 bg-white rounded-xl border p-3 ${
                    ev.id === activeEventId ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{eventTitle(ev)}</p>
                    <p className="text-xs text-slate-400">
                      {ev.snapshot.basics.date
                        ? `${formatDateJa(ev.snapshot.basics.date)} ${ev.snapshot.basics.startTime}〜`
                        : '日時未定'}
                      {ev.id === activeEventId ? '・編集中' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenEvent(ev.id)}
                    className="shrink-0 px-4 py-1.5 rounded-full bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
                  >
                    開く
                  </button>
                  <button
                    onClick={() => onDeleteEvent(ev.id)}
                    aria-label={`「${eventTitle(ev)}」を削除`}
                    className="shrink-0 p-2 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              オフ会が終了したら削除してください（最大{MAX_SAVED_EVENTS}件まで保存できます）
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 text-left">
          {FLOW.map((f, i) => (
            <div key={f.title} className="card-hover bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <f.Icon size={16} className="text-sky-600" />
                <span className="text-[11px] text-slate-400 font-semibold">STEP {i + 1}</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">{f.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {hasProgress && (
            <button
              onClick={onResume}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/20"
            >
              続きから再開する
              <ArrowRightIcon size={18} />
            </button>
          )}
          <button
            onClick={onStart}
            disabled={!canCreate}
            title={canCreate ? undefined : `保存できるオフ会は最大${MAX_SAVED_EVENTS}件です。終了したオフ会を削除してください`}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-colors ${
              hasProgress
                ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-600/20'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            新しいオフ会を企画する
            <ArrowRightIcon size={18} />
          </button>
          {hasProgress && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-300 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <RefreshIcon size={15} />
              すべて初期化
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          入力した内容はこのブラウザの中にだけ保存されます（サーバーには送信されません）
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            onClick={onExport}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 transition-colors"
          >
            バックアップを保存
          </button>
          <label className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 transition-colors cursor-pointer">
            バックアップを読み込む
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          ブラウザの変更・キャッシュ削除でデータは消えます。大事なオフ会はバックアップを保存しておいてください
        </p>
      </div>
    </div>
  );
}
