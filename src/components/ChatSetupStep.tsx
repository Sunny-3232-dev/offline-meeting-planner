import React, { useState } from 'react';
import { EventBasics } from '../types';
import { LIBECITY_EVENT_CREATE_URL, LIBECITY_OFFLINE_EVENT_FAQ_URL, officeLabel } from '../constants';
import { formatEventDateJa } from '../utils/time';
import { ArrowRightIcon, ChevronLeftIcon, SendIcon, CopyIcon, CheckIcon } from './icons';

interface ChatSetupStepProps {
  basics: EventBasics;
  announcement: string;
  eventTags: string[];
  onNext: () => void;
  onBack: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
        copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
      }`}
    >
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
      {copied ? 'コピーしました' : 'コピー'}
    </button>
  );
}

function CopyField({
  label,
  value,
  longText = false,
  hideCopyButton = false,
}: {
  label: string;
  value: string;
  longText?: boolean;
  hideCopyButton?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-700">{label}</h3>
        {!hideCopyButton && <CopyButton text={value} />}
      </div>
      <p
        className={`text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 whitespace-pre-wrap break-words ${
          longText ? 'max-h-64 overflow-y-auto' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** タグを1つずつクリックでコピーできるチップ */
function TagChip({ tag }: { tag: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
      {copied ? 'コピーしました' : tag}
    </button>
  );
}

function TagsField({ tags }: { tags: string[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-700">タグ</h3>
        <span className="text-[11px] text-slate-400">クリックで1つずつコピー</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <React.Fragment key={`${tag}-${i}`}>
            <TagChip tag={tag} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ChatSetupStep({
  basics,
  announcement,
  eventTags,
  onNext,
  onBack,
}: ChatSetupStepProps) {
  const isOfficialOffice = !!basics.officeKey;
  const isOnline = basics.venueType === 'online';

  const placeLabel = basics.officeKey ? officeLabel(basics.officeKey) : basics.venueDetail.trim();
  const datePart = formatEventDateJa(basics.date);
  const roomName = [datePart, basics.title].filter(Boolean).join(' ') + (placeLabel ? `＠${placeLabel}` : '');

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">オフ会チャットを立ち上げましょう</h2>
      <p className="text-sm text-slate-500 mb-6">
        リベシティのオフ会チャット作成フォームへ転記する材料をここに集めました。各項目をコピーしてフォームに貼り付けてください。
      </p>

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mb-6">
        <p className="text-xs text-sky-700 mb-3">
          リベシティのチャット一覧を開き、左下の「＋チャット作成」→「オフ会チャットを新規作成」を選ぶと作成フォームが開きます。
          （「イベント・オフ会カレンダーに登録する」にチェックを入れるとイベント案内にも載ります）。
        </p>
        <a
          href={LIBECITY_EVENT_CREATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
        >
          <SendIcon size={15} />
          リベシティでオフ会チャットを作成する
        </a>
        <div className="mt-3 text-xs text-sky-600/70">
          <p>
            画面を左右に2分割し、左に「オフ会プランナー」、右にリベシティのチャット作成フォームを並べると、左から右へコピー＆ペーストでスムーズに転記できます。
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer font-semibold text-sky-700 hover:text-sky-800">
              画面2分割のやり方を見る
            </summary>
            <div className="mt-2 space-y-2 text-sky-700/80">
              <ol className="list-decimal list-inside space-y-0.5">
                <li>上の「リベシティでオフ会チャットを作成する」ボタンを<b>右クリック</b>します。</li>
                <li>出てきたメニューから<b>「分割画面で開く」</b>（ブラウザの画面分割）を選びます。</li>
                <li>すると画面の右側にリベシティのチャット作成フォームが並び、左に「オフ会プランナー」が残ります。左から右へそのままコピー＆ペーストで転記できます。</li>
              </ol>
              <p className="text-[11px]">
                ※右クリックメニューに分割の項目が出ないブラウザの場合は、同じく右クリック →「リンクを新しいウィンドウで開く」で別ウィンドウにし、2つのウィンドウを画面の左右の端までドラッグすると横並びにできます。
              </p>
            </div>
          </details>
        </div>
        <p className="mt-3 text-xs text-sky-600/70">
          オフ会について分からないことがあったら、
          <a
            href={LIBECITY_OFFLINE_EVENT_FAQ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-800"
          >
            リベシティ公式FAQ（オフ会・オフラインイベント）
          </a>
          もチェックしてみてください。
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <CopyField label="オフ会チャットルーム名" value={roomName} />
        <CopyField label="定員" value={`${basics.capacity}`} hideCopyButton />
        <CopyField
          label="日時"
          value={`${datePart} ${basics.startTime}〜（${basics.durationMinutes}分）`}
          hideCopyButton
        />
        <CopyField label="場所" value={placeLabel || '（未入力）'} hideCopyButton />
        <TagsField tags={eventTags} />
        <div>
          <CopyField label="詳細（公開）情報" value={announcement} longText />
          <p className="mt-1.5 text-[11px] text-slate-400 px-1">
            💡 詳細情報の右側あたりに画像を1枚添えると、パッと見て楽しそうなオフ会に見えますよ
          </p>
        </div>

        {/* チャット参加者への限定公開情報 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">チャット参加者への限定公開情報</h3>
          {isOnline ? (
            <p className="text-xs text-slate-400">オンライン開催のため特にありません</p>
          ) : isOfficialOffice ? (
            <p className="text-xs text-slate-400">
              公式オフィス開催のため、限定公開情報は特にありません（必要なら当日の集合場所メモなどを）
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-end mb-2">
                <CopyButton text={'開催場所：\n（場所が確定したら、オフ会会場の詳細はこの限定公開情報へ記載しましょう）'} />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
                開催場所：{'\n'}
                （場所が確定したら、オフ会会場の詳細はこの限定公開情報へ記載しましょう）
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ChevronLeftIcon size={16} />
          画像に戻る
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/20"
        >
          告知へ進む
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
