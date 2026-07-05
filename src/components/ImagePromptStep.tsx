import React, { useState } from 'react';
import { IconPromptResult, ThumbnailAssets } from '../types';
import { ArrowRightIcon, ChevronLeftIcon, RefreshIcon, CopyIcon, CheckIcon, CircleCropIcon, ImageIcon, LightbulbIcon } from './icons';

interface ImagePromptStepProps {
  iconPrompt: IconPromptResult | null;
  thumbnailAssets: ThumbnailAssets | null;
  iconLoading: boolean;
  thumbnailLoading: boolean;
  onGenerateIcon: () => void;
  onGenerateThumbnail: () => void;
  onNext: () => void;
  onBack: () => void;
}

function CopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
      }`}
    >
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
      {copied ? 'コピーしました' : label}
    </button>
  );
}

/** ChatGPT / Gemini 起動リンク（既存ツールの導線を踏襲） */
function AiLauncherLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href="https://chatgpt.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-4 py-1.5 bg-white border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
      >
        ChatGPTを起動
      </a>
      <a
        href="https://gemini.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-4 py-1.5 bg-white border border-orange-200 rounded-full text-xs font-bold text-orange-700 hover:bg-orange-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
      >
        Geminiを起動
      </a>
    </div>
  );
}

function GeneratingCard({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center" role="status" aria-live="polite">
      <div className="flex justify-center mb-3">
        <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin-slow" aria-hidden="true" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default function ImagePromptStep({
  iconPrompt,
  thumbnailAssets,
  iconLoading,
  thumbnailLoading,
  onGenerateIcon,
  onGenerateThumbnail,
  onNext,
  onBack,
}: ImagePromptStepProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <h2 className="text-2xl font-bold text-slate-800">オフ会の画像を用意しましょう</h2>
        <AiLauncherLinks />
      </div>
      <p className="text-sm text-slate-500 mb-2">
        プロンプトは準備済みです。コピーして ChatGPT / Gemini に貼るだけで画像が作れます。
      </p>
      <p className="text-[11px] text-orange-600 font-bold mb-6">
        Geminiでは、🍌画像を作成と思考モードにする。
      </p>

      {/* チャットアイコン */}
      <section className="mb-8">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-700 mb-3"><CircleCropIcon size={19} className="text-sky-600" />チャットアイコン</h3>
        {!iconPrompt && iconLoading ? (
          <GeneratingCard label="チャットアイコン用プロンプトを作成中です...（このまま他の作業もできます）" />
        ) : iconPrompt ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700">チャットアイコン生成プロンプト</h4>
              <CopyButton text={iconPrompt.prompt} label="プロンプトをコピー" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap break-words mb-3">
              {iconPrompt.prompt}
            </p>
            {iconPrompt.styleNote && (
              <p className="text-xs text-slate-400 flex items-center gap-1"><LightbulbIcon size={13} className="shrink-0" />{iconPrompt.styleNote}</p>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={onGenerateIcon}
                disabled={iconLoading}
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 disabled:opacity-50 transition-colors"
              >
                <RefreshIcon size={13} />
                {iconLoading ? '作り直しています...' : 'プロンプトを作り直す'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500 mb-4">チャットアイコン用のプロンプトを作ります</p>
            <button
              onClick={onGenerateIcon}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              プロンプトを生成する
            </button>
          </div>
        )}
      </section>

      {/* 告知サムネイル */}
      <section className="mb-8">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-700 mb-3"><ImageIcon size={19} className="text-sky-600" />告知サムネイル</h3>
        {!thumbnailAssets && thumbnailLoading ? (
          <GeneratingCard label="サムネイル素材を作成中です...（このまま他の作業もできます）" />
        ) : thumbnailAssets ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700">サムネイル生成プロンプト</h4>
              <CopyButton text={thumbnailAssets.imagePrompt} label="プロンプトをコピー" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap break-words mb-3">
              {thumbnailAssets.imagePrompt}
            </p>
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <LightbulbIcon size={13} className="shrink-0" />
              キャッチーなタイトル・日時・場所は、この画像の中に文字として描き込まれる想定です
            </p>
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={onGenerateThumbnail}
                disabled={thumbnailLoading}
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 disabled:opacity-50 transition-colors"
              >
                <RefreshIcon size={13} />
                {thumbnailLoading ? '作り直しています...' : 'プロンプトを作り直す'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500 mb-4">
              イメージ図＋日時＋場所入りのサムネイル素材を作ります
            </p>
            <button
              onClick={onGenerateThumbnail}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              サムネイル素材を生成する
            </button>
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 mt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ChevronLeftIcon size={16} />
          詳細情報に戻る
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/20"
        >
          オフ会チャットを立ち上げる
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
