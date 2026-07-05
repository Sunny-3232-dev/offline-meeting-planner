import React, { useState } from 'react';
import { ArrowRightIcon, ChevronLeftIcon, RefreshIcon, CopyIcon, CheckIcon } from './icons';

interface AnnouncementStepProps {
  announcement: string;
  tags: string[];
  onChange: (text: string) => void;
  /** feedbackが空文字の場合は初回生成（同条件での再生成）、それ以外は要望を反映して書き直す */
  onRegenerate: (feedback: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function AnnouncementStep({
  announcement,
  tags,
  onChange,
  onRegenerate,
  onNext,
  onBack,
}: AnnouncementStepProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [tagsCopied, setTagsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(announcement);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の環境では選択を促す
    }
  };

  const handleCopyTags = async () => {
    try {
      await navigator.clipboard.writeText(tags.join(' '));
      setTagsCopied(true);
      setTimeout(() => setTagsCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const handleRewrite = () => {
    onRegenerate(feedback);
    setFeedback('');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">詳細（公開情報）</h2>
      <p className="text-sm text-slate-500 mb-6">
        オフ会チャット作成フォームの「詳細（公開情報）」欄にそのまま貼れる文章を作りました。
        自分の言葉に直したいところは自由に編集してください。
      </p>

      {announcement ? (
        <>
          <div className="relative mb-4">
            <textarea
              value={announcement}
              onChange={(e) => onChange(e.target.value)}
              rows={20}
              aria-label="詳細（公開情報）"
              className="w-full px-4 py-4 text-sm leading-relaxed border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
            <button
              onClick={handleCopy}
              className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow transition-colors ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">{announcement.length}文字</p>

          {tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-700">適切なタグ</h3>
                <button
                  onClick={handleCopyTags}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tagsCopied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {tagsCopied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                  {tagsCopied ? 'コピーしました' : 'タグをコピー'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8">
            <label htmlFor="announcementFeedback" className="block text-xs font-semibold text-slate-600 mb-1.5">
              AIに書き直してほしい点を教えてください
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3" aria-label="おすすめの指示">
              {[
                'もっとカジュアルに',
                '絵文字を多めに',
                '絵文字を少なめに',
                'オラオラ系で熱く',
                '関西弁で親しみやすく',
                '自己紹介を手厚く',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFeedback((prev) => (prev ? `${prev}、${chip}` : chip))}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                >
                  ＋ {chip}
                </button>
              ))}
            </div>
            <textarea
              id="announcementFeedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="例: もっとカジュアルな文体にしてほしい／絵文字を減らしてほしい／自己紹介をもっと詳しく書いてほしい"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white mb-2"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                onClick={handleRewrite}
                disabled={!feedback.trim()}
                className="self-start inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow"
              >
                <RefreshIcon size={13} />
                この内容で書き直す
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center mb-8">
          <p className="text-sm text-slate-500 mb-4">まだ詳細（公開情報）の文章がありません</p>
          <button
            onClick={() => onRegenerate('')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            AIに書いてもらう
          </button>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ChevronLeftIcon size={16} />
          進行イメージに戻る
        </button>
        <button
          onClick={onNext}
          disabled={!announcement}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-600/20"
        >
          画像を用意する
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
