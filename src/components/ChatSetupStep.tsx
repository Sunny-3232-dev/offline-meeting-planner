import React from 'react';
import { EventBasics } from '../types';
import { LIBECITY_EVENT_CREATE_URL } from '../constants';
import { ArrowRightIcon, ChevronLeftIcon, SendIcon } from './icons';

interface ChatSetupStepProps {
  basics: EventBasics;
  offkaiChatUrl: string;
  onChangeChatUrl: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ChatSetupStep({
  basics,
  offkaiChatUrl,
  onChangeChatUrl,
  onNext,
  onBack,
}: ChatSetupStepProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">オフ会チャットを立ち上げましょう</h2>
      <p className="text-sm text-slate-500 mb-6">
        リベシティにオフ会チャットを作成し、そのURLを控えておくと、次の告知ステップでつぶやきに自動で添付できます。
      </p>

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mb-4">
        <p className="text-xs text-sky-700 mb-3">
          リベシティのチャット一覧を開き、左下の「＋チャット作成」→「オフ会チャットを新規作成」を選ぶと作成フォームが開きます。
          「{basics.title}」のタイトル・日時・定員と、「詳細（公開情報）」ステップで作った文章を詳細欄にそのまま転記できます
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
        <div className="mt-4 pt-4 border-t border-sky-200/60">
          <label htmlFor="offkaiChatUrl" className="block text-xs font-semibold text-sky-800 mb-1">
            作成したオフ会チャットのURL（次の告知ステップでつぶやきに自動で添付されます）
          </label>
          <input
            id="offkaiChatUrl"
            type="url"
            value={offkaiChatUrl}
            onChange={(e) => onChangeChatUrl(e.target.value)}
            placeholder="https://libecity.com/room_list?room_id=..."
            className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
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
