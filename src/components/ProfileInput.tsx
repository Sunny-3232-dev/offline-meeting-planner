import React from 'react';
import { OrganizerProfile, VenueType } from '../types';
import { ArrowRightIcon } from './icons';

interface ProfileInputProps {
  profile: OrganizerProfile;
  onChange: (profile: OrganizerProfile) => void;
  onNext: () => void;
}

export default function ProfileInput({ profile, onChange, onNext }: ProfileInputProps) {
  const canProceed = profile.selfIntro.trim().length >= 10;

  const set = (patch: Partial<OrganizerProfile>) => onChange({ ...profile, ...patch });

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">あなたのことを教えてください</h2>
      <p className="text-sm text-slate-500 mb-8">
        入力内容をもとに、あなたに合ったオフ会をAIが一緒に考えます。リベシティのプロフィール文を貼り付けてもOKです。
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="organizerName" className="block text-sm font-semibold text-slate-700 mb-1.5">
            お名前（ニックネーム） <span className="text-slate-400 text-xs">任意</span>
          </label>
          <input
            id="organizerName"
            type="text"
            value={profile.organizerName}
            onChange={(e) => set({ organizerName: e.target.value })}
            placeholder="例: リーマンくん、両子ママ"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <p className="mt-1 text-xs text-slate-400">告知文・つぶやきの自己紹介で主催者名として使われます</p>
        </div>

        <div>
          <label htmlFor="selfIntro" className="block text-sm font-semibold text-slate-700 mb-1.5">
            自己紹介・プロフィール <span className="text-red-500 text-xs">必須</span>
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
            興味・好きなこと <span className="text-slate-400 text-xs">任意</span>
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
          <span className="block text-sm font-semibold text-slate-700 mb-1.5">
            どこで開催したいですか？ <span className="text-red-500 text-xs">必須</span>
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="開催したい場所">
            {([
              { type: 'offline' as VenueType, label: '対面（オフライン）' },
              { type: 'online' as VenueType, label: 'オンライン' },
            ]).map((v) => (
              <button
                key={v.type}
                type="button"
                role="radio"
                aria-checked={profile.venuePreference === v.type}
                onClick={() => set({ venuePreference: v.type })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  profile.venuePreference === v.type
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="plannedTheme" className="block text-sm font-semibold text-slate-700 mb-1.5">
            既に企画が決まっていますか？ <span className="text-slate-400 text-xs">任意</span>
          </label>
          <input
            id="plannedTheme"
            type="text"
            value={profile.plannedTheme}
            onChange={(e) => set({ plannedTheme: e.target.value })}
            placeholder="例: お茶会、AI勉強会、家計管理。空欄ならAIが企画案をゼロから提案します"
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
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
