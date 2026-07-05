import React, { useState, useMemo } from 'react';
import { ShareTexts, EventBasics } from '../types';
import { BRANCH_CHATS, branchChatUrl, guessBranch } from '../constants';
import { ChevronLeftIcon, RefreshIcon, CopyIcon, CheckIcon, SendIcon, KanpaiIcon } from './icons';

/** つぶやき本文 + オフ会チャットURL（任意）を結合して最終テキストを得る */
function buildTweetText(body: string, chatUrl: string): string {
  const url = chatUrl.trim();
  return url ? `${body.trim()}\n${url}` : body.trim();
}

/** 本文 + URL（任意）を改行2つで結合する（支部チャット向けの長文用） */
function appendUrl(text: string, url: string): string {
  const trimmedUrl = url.trim();
  return trimmedUrl ? `${text.trim()}\n\n${trimmedUrl}` : text.trim();
}

/** 本文プリセット済みのつぶやき作成画面URL（既存ツールと同じ導線） */
function buildLibetterUrl(text: string): string {
  return `https://libecity.com/tweet/all?create=${encodeURIComponent(text)}`;
}

interface ShareStepProps {
  shareTexts: ShareTexts | null;
  basics: EventBasics;
  region: string;
  offkaiChatUrl: string;
  onChangeChatUrl: (url: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  onFinish: () => void;
}

function CopyCard({
  title,
  hint,
  text,
}: {
  title: string;
  hint: string;
  text: string;
}) {
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-3">{hint}</p>
      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

export default function ShareStep({
  shareTexts,
  basics,
  region,
  offkaiChatUrl,
  onChangeChatUrl,
  onGenerate,
  onBack,
  onFinish,
}: ShareStepProps) {
  const tweetFinal = shareTexts ? buildTweetText(shareTexts.tweet, offkaiChatUrl) : '';

  // 支部チャット: プロフィールの地域から自動推定し、手動でも選べる
  const guessed = useMemo(() => guessBranch(region), [region]);
  const [branchId, setBranchId] = useState<string>(guessed?.id || '');
  const branch = BRANCH_CHATS.find((b) => b.id === branchId) || null;

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">告知しましょう</h2>
      <p className="text-sm text-slate-500 mb-6">
        支部チャットとつぶやきで、作成したオフ会チャットへの参加を呼びかけましょう。
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <label htmlFor="offkaiChatUrl" className="block text-xs font-semibold text-slate-700 mb-1">
          作成したオフ会チャットのURL（つぶやきに自動で添付されます）
        </label>
        <input
          id="offkaiChatUrl"
          type="url"
          value={offkaiChatUrl}
          onChange={(e) => onChangeChatUrl(e.target.value)}
          placeholder="https://libecity.com/room_list?room_id=..."
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      {shareTexts ? (
        <div className="space-y-4 mb-8">
          {/* 支部チャットの選択と直リンク */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-sm font-bold text-slate-700">投稿先の支部チャット</h3>
              {branch && (
                <a
                  href={branchChatUrl(branch.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                >
                  <SendIcon size={13} />
                  {branch.name}チャットを開く
                </a>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              {guessed ? `プロフィールの地域から「${guessed.name}」を推定しました。違う場合は選び直してください。` : 'お住まいの地域の公式支部チャットを選んでください。'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BRANCH_CHATS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  aria-pressed={branchId === b.id}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    branchId === b.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <CopyCard
            title={`${branch ? branch.name : `${region || '地域'}支部`}チャット向け`}
            hint="上のボタンで支部チャットを開き、この文章を貼り付けてください（オフ会チャットのリンクも自動で末尾に付きます）"
            text={appendUrl(shareTexts.regionalChat, offkaiChatUrl)}
          />

          {/* つぶやき: すぐ呟ける導線 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-700">つぶやき向け</h3>
              <a
                href={buildLibetterUrl(tweetFinal)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
              >
                <SendIcon size={13} />
                この内容でつぶやく
              </a>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              ボタンを押すと、本文が入力済みのつぶやき画面が開きます
              {offkaiChatUrl ? '（前のステップで入力したオフ会チャットURLも自動で結合）' : '（オフ会チャットURLは前のステップで入力できます）'}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">
              {tweetFinal}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {tweetFinal.length}文字
            </p>
          </div>

          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors"
          >
            <RefreshIcon size={13} />
            文章を作り直す
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center mb-8">
          <p className="text-sm text-slate-500 mb-4">支部チャット用・つぶやき用の文章を作ります</p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            展開用の文章を生成する
          </button>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ChevronLeftIcon size={16} />
          チャット作成に戻る
        </button>
        <button
          onClick={onFinish}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <KanpaiIcon size={17} />
          これで準備完了！
        </button>
      </div>
    </div>
  );
}
