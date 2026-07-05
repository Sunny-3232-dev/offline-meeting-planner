import React from 'react';
import { OrganizerProfile } from '../types';
import { ArrowRightIcon } from './icons';

interface ProfileInputProps {
  profile: OrganizerProfile;
  onChange: (profile: OrganizerProfile) => void;
  onNext: () => void;
}

const REGION_EXAMPLES = ['北海道', '東北', '関東', '中部', '関西', '中国', '四国', '九州・沖縄', 'オンライン中心'];

export default function ProfileInput({ profile, onChange, onNext }: ProfileInputProps) {
  const canProceed = profile.selfIntro.trim().length >= 10 && profile.interests.trim().length >= 2;

  const set = (patch: Partial<OrganizerProfile>) => onChange({ ...profile, ...patch });

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">あなたのことを教えてください</h2>
      <p className="text-sm text-slate-500 mb-8">
        入力内容をもとに、あなたに合ったオフ会をAIが一緒に考えます。リベシティのプロフィール文を貼り付けてもOKです。
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="selfIntro" className="block text-sm font-semibold text-slate-700 mb-1.5">
            自己紹介 <span className="text-red-500 text-xs">必須</span>
          </label>
          <textarea
            id="selfIntro"
            value={profile.selfIntro}
            onChange={(e) => set({ selfIntro: e.target.value })}
            rows={6}
            placeholder="例: 会社員をしながら副業でブログを書いています。リベシティ歴1年。人と話すのは好きですが、大人数を仕切るのは苦手です…"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <p className="mt-1 text-xs text-slate-400">10文字以上。リベシティのプロフィールの貼り付けでも大丈夫です</p>
        </div>

        <div>
          <label htmlFor="interests" className="block text-sm font-semibold text-slate-700 mb-1.5">
            興味・好きなこと <span className="text-red-500 text-xs">必須</span>
          </label>
          <textarea
            id="interests"
            value={profile.interests}
            onChange={(e) => set({ interests: e.target.value })}
            rows={3}
            placeholder="例: カフェ巡り、読書、投資の話、ボードゲーム、朝活"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-semibold text-slate-700 mb-1.5">
            住んでいる地域
          </label>
          <input
            id="region"
            type="text"
            value={profile.region}
            onChange={(e) => set({ region: e.target.value })}
            placeholder="例: 関東（東京）"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REGION_EXAMPLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set({ region: r })}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  profile.region === r
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="hostingConcern" className="block text-sm font-semibold text-slate-700 mb-1.5">
            初主催で不安なこと <span className="text-slate-400 text-xs">任意</span>
          </label>
          <textarea
            id="hostingConcern"
            value={profile.hostingConcern}
            onChange={(e) => set({ hostingConcern: e.target.value })}
            rows={2}
            placeholder="例: 人が集まらなかったらどうしよう、当日の進行がうまくできるか心配"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <p className="mt-1 text-xs text-slate-400">書いておくと、不安に寄り添った企画・進行になります</p>
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-600/20"
        >
          企画案を出してもらう
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
