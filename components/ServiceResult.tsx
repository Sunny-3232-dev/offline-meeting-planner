
import React, { useState, useMemo } from 'react';
import { getThumbnailPrompt } from '../services/geminiService';
import { SkillIdea } from '../types';

interface ServiceResultProps {
  idea: SkillIdea;
  content: string;
  thumbnailUrl?: string;
  onGenerateImage: () => void;
  isHighQuality: boolean;
  setIsHighQuality: (value: boolean) => void;
  onReset: (e?: React.MouseEvent) => void;
  onBack: () => void;
}

const parseServiceContent = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n');
  
  const getValue = (key: string) => {
    const regex = new RegExp(`^${key}[:：]\\s*(.*)$`, 'm');
    const match = normalized.match(regex);
    return match ? match[1].trim() : '';
  };

  const category = getValue('カテゴリ');
  const subCategory = getValue('サブカテゴリ');
  const title = getValue('タイトル');
  const catchphrase = getValue('キャッチコピー');

  const policyMarker = '⚠️キャンセル時の注意事項';
  const skillsMarker = '🎯出品者スキル';
  const templateMarker = '📝依頼テンプレート';

  const detailHeaderMatch = normalized.match(/^サービス詳細[（(].*[）)].*$/m);
  const detailStart = detailHeaderMatch
    ? detailHeaderMatch.index! + detailHeaderMatch[0].length
    : (normalized.indexOf('キャッチコピー') !== -1
        ? normalized.indexOf('\n', normalized.indexOf('キャッチコピー'))
        : 0);

  const policyIdx = normalized.indexOf(policyMarker);
  const skillsIdx = normalized.indexOf(skillsMarker);
  const templateIdx = normalized.indexOf(templateMarker);

  const detailEnd = [policyIdx, skillsIdx, templateIdx]
    .filter(i => i !== -1)
    .sort((a, b) => a - b)[0] || normalized.length;

  const detail = normalized.substring(detailStart, detailEnd).trim();

  let policy = '';
  if (policyIdx !== -1) {
    const end = [skillsIdx, templateIdx].filter(i => i !== -1 && i > policyIdx).sort((a, b) => a - b)[0] || normalized.length;
    policy = normalized.substring(policyIdx + policyMarker.length, end).trim();
  }

  let skills = '';
  if (skillsIdx !== -1) {
    const end = (templateIdx !== -1 && templateIdx > skillsIdx) ? templateIdx : normalized.length;
    skills = normalized.substring(skillsIdx + skillsMarker.length, end).trim();
  }

  let template = '';
  if (templateIdx !== -1) {
    template = normalized.substring(templateIdx + templateMarker.length).trim();
  }

  return { title, catchphrase, category, subCategory, detail, policy, skills, template };
};

const CopySection: React.FC<{ title: string; content: string; icon: string }> = ({ title, content, icon }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  if (!content) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-stone-700 flex items-center gap-2 text-sm">
          <span className="text-lg">{icon}</span> {title}
        </h4>
        <button type="button" onClick={handleCopy} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${copied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}>
          {copied ? '✅ コピー済' : '📋 コピー'}
        </button>
      </div>
      <div className="bg-stone-50/50 rounded-xl p-4 text-stone-600 text-sm whitespace-pre-wrap border border-stone-100/50 leading-relaxed">{content}</div>
    </div>
  );
};

const ServiceResult: React.FC<ServiceResultProps> = ({
  idea, content, thumbnailUrl, onGenerateImage, isHighQuality, setIsHighQuality, onReset, onBack
}) => {
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<'standard' | 'simple' | 'watercolor' | 'pop' | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<'standard' | 'simple' | 'watercolor' | 'pop' | null>(null);
  const [showTip, setShowTip] = useState(false);

  const parsed = useMemo(() => parseServiceContent(content), [content]);

  const promptCtx = useMemo(() => ({ ...idea, generatedContent: content }), [idea, content]);
  const standardPrompt = useMemo(() => getThumbnailPrompt(promptCtx, true, 'standard'), [promptCtx]);
  const simplePrompt = useMemo(() => getThumbnailPrompt(promptCtx, true, 'simple'), [promptCtx]);
  const watercolorPrompt = useMemo(() => getThumbnailPrompt(promptCtx, true, 'watercolor'), [promptCtx]);
  const popPrompt = useMemo(() => getThumbnailPrompt(promptCtx, true, 'pop'), [promptCtx]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsAllCopied(true);
      setTimeout(() => setIsAllCopied(false), 2000);
    });
  };

  const handleCopyPrompt = (version: 'standard' | 'simple' | 'watercolor' | 'pop') => {
    const promptMap = { standard: standardPrompt, simple: simplePrompt, watercolor: watercolorPrompt, pop: popPrompt };
    navigator.clipboard.writeText(promptMap[version]).then(() => {
      setCopiedVersion(version);
      setTimeout(() => setCopiedVersion(null), 2000);
    });
  };

  const handleDownloadImage = () => {
    if (!thumbnailUrl) return;
    
    // サービスタイトルをファイル名に使用（OSで禁止されている文字をサニタイズ）
    const safeTitle = (parsed.title || idea.title || 'service')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
    
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    link.download = `${safeTitle}-thumbnail.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 md:p-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <span className="text-rose-500 font-bold tracking-wider text-xs uppercase mb-1 block">Step 3</span>
          <h2 className="text-3xl font-bold text-stone-800 tracking-tight">出品用テキストが完成しました</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="bg-white text-stone-600 border border-stone-200 py-2.5 px-5 rounded-full font-bold text-xs hover:bg-stone-50">一覧へ戻る</button>
          <button onClick={handleCopyAll} className={`py-2.5 px-6 rounded-full font-bold text-xs transition-all ${isAllCopied ? 'bg-green-500 text-white' : 'bg-stone-800 text-white hover:bg-stone-700'}`}>
            {isAllCopied ? '✅ コピー完了' : '📄 全文コピー'}
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Next Steps Guide */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h4 className="text-orange-900 font-black text-2xl mb-8 flex items-center gap-3">
              <span className="bg-white p-2.5 rounded-2xl shadow-sm text-2xl">✨</span> 
              次のステップ！出品まであと少し！
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Step 1: Integrated Action */}
              <div className="bg-white/60 p-6 rounded-3xl border border-white flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-orange-200">1</div>
                <h5 className="font-bold text-orange-900 mb-2">情報を登録</h5>
                <p className="text-orange-800/70 text-[13px] leading-relaxed mb-4">
                  各項目の「コピー」ボタンで内容を保存し、出品画面の入力欄に貼り付けます。
                </p>
                <div className="w-full mb-4">
                  <button
                    onClick={() => setShowTip(!showTip)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    <span>💡</span> 貼り付け方のコツ <span className={`transition-transform duration-200 ${showTip ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {showTip && (
                    <div className="mt-2 bg-white/80 rounded-xl p-3 text-left text-[11px] text-orange-800/80 leading-relaxed space-y-1.5 border border-orange-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p><span className="font-bold text-orange-600">1.</span> 下のリンクを<span className="font-bold">右クリック</span>→「分割ビューで開く」</p>
                      <p><span className="font-bold text-orange-600">2.</span> 左に出品画面、右にこの画面を並べて表示</p>
                      <p><span className="font-bold text-orange-600">3.</span> 各項目の「コピー」→ 出品画面に貼り付け</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto">
                  <a
                    href="https://skill.libecity.com/services/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-2 bg-white border border-rose-200 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover:shadow active:scale-95"
                  >
                    スキルマーケット出品画面へ
                  </a>
                </div>
              </div>

              {/* Step 2: Thumbnail */}
              <div className="bg-white/60 p-6 rounded-3xl border border-white flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-orange-200">2</div>
                <h5 className="font-bold text-orange-900 mb-2">画像準備</h5>
                <div className="text-orange-800/70 text-[13px] leading-relaxed space-y-1">
                  <p className="flex items-center gap-1 justify-center"><span>🎨</span> <span>プロンプトをコピーしてGeminiで生成</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-8">
            {/* Thumbnail Section */}
            <div className="w-full space-y-4">
              {/* サムネイル生成UI（現在無効化中・将来復活の可能性あり）
              {thumbnailUrl ? (
                <div className="relative group rounded-[2rem] overflow-hidden shadow-lg border border-stone-100 bg-stone-50 max-w-3xl mx-auto">
                  <img src={thumbnailUrl} className="w-full object-cover aspect-[3/2]" alt="Thumbnail" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="flex gap-3">
                      <button onClick={handleDownloadImage} className="bg-rose-500 text-white hover:bg-rose-600 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl flex items-center gap-2">
                        <span>📥</span> 保存する
                      </button>
                      <button onClick={onGenerateImage} className="bg-white text-stone-800 hover:bg-rose-50 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl">
                        🔄 作り直す
                      </button>
                    </div>
                    <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white text-xs w-full max-w-xs">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative flex items-center">
                          <input type="checkbox" checked={isHighQuality} onChange={e => setIsHighQuality(e.target.checked)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-stone-600 rounded-full peer peer-checked:bg-rose-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                        </div>
                        <span className="font-bold">{isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}</span>
                      </label>
                      <p className="text-[10px] opacity-70 mt-1 leading-tight">
                        {isHighQuality
                          ? '※高品質モデルはご自身のAPIキー（有料プロジェクト）の設定が必要です。画像内にタイトルやコピーが含まれます。'
                          : '※標準モデルは高速に生成されます。画像内に文字は含まれません。'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div onClick={onGenerateImage} className="w-full max-w-3xl aspect-[3/2] rounded-[2rem] bg-stone-100 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-200 hover:border-rose-300 transition-all group">
                    <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🖼️</span>
                    <span className="font-bold text-stone-700 text-xl group-hover:text-rose-500">サムネイル画像を作成</span>
                    <span className="text-sm text-stone-400 mt-2">サービスに合った画像を自動で生成します</span>
                  </div>
                  <div className="w-full max-lg flex flex-col items-center space-y-4">
                    <div className="flex flex-col items-center text-center">
                      <label className="inline-flex items-center cursor-pointer px-8 py-3 bg-white rounded-full border border-stone-200 shadow-sm hover:shadow transition-all group mb-2">
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" checked={isHighQuality} onChange={(e) => setIsHighQuality(e.target.checked)} />
                          <div className="w-14 h-7 bg-stone-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-purple-500 transition-all"></div>
                          <div className="absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-7 shadow-sm"></div>
                        </div>
                        <span className="ml-4 font-bold text-stone-600 group-hover:text-stone-800 text-sm">{isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}</span>
                      </label>
                      <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                        {isHighQuality
                          ? '高品質モデルはご自身のAPIキー設定が必要です。高解像度かつ正確な文字配置が可能です。'
                          : '標準モデルは高速に生成されます。画像内に文字は含まれません。'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              */}
            </div>

            {/* Content Cards */}
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-stone-700 flex items-center gap-2 text-sm mb-4"><span className="text-lg">📂</span> カテゴリ・サブカテゴリ</h4>
                <div className="bg-stone-50/50 rounded-xl p-5 text-stone-600 text-sm border border-stone-100 flex items-center gap-3">
                  <span className="font-bold text-stone-800">{parsed.category || '未設定'}</span>
                  <span className="text-stone-300">/</span>
                  <span className="text-stone-500">{parsed.subCategory || '未設定'}</span>
                </div>
              </div>
              <CopySection title="タイトル" content={parsed.title} icon="🏷️" />
              <CopySection title="キャッチコピー" content={parsed.catchphrase} icon="🎣" />
              <CopySection title="サービス詳細" content={parsed.detail} icon="📝" />
              <CopySection title="キャンセル時の注意事項" content={parsed.policy} icon="⚠️" />
              <CopySection title="スキル" content={parsed.skills} icon="🎯" />
              <CopySection title="依頼テンプレート" content={parsed.template} icon="📋" />

              {/* Prompt Area */}
              <div className="bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden p-6 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-1.5 bg-gradient-to-tr from-orange-400 via-rose-400 to-purple-400 rounded-2xl blur opacity-20"></div>
                      <div className="relative bg-white p-2 rounded-xl border border-stone-100 shadow-sm flex items-center justify-center w-10 h-10">
                        <span className="text-xl">🎨</span>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-stone-700">画像生成プロンプト</h5>
                      <p className="text-[10px] text-orange-600 font-bold leading-tight">Geminiでは、🍌画像を作成と思考モードにする。</p>
                    </div>
                  </div>
                  <a
                    href="https://gemini.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-5 py-2 bg-white border border-orange-200 rounded-full text-xs font-bold text-orange-700 hover:bg-orange-50 transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                  >
                    Geminiを起動
                  </a>
                </div>

                {/* Standard Prompt Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h6 className="text-sm font-bold text-stone-700">標準版プロンプト</h6>
                      <p className="text-xs text-stone-500 mt-0.5">プロフェッショナルで洗練されたデザイン。信頼感と上質な印象。</p>
                    </div>
                    <svg viewBox="0 0 600 400" className="w-[100px] shrink-0 rounded-md block border border-stone-100">
                      <defs>
                        <linearGradient id="stdBg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#1e293b"/>
                          <stop offset="100%" stopColor="#334155"/>
                        </linearGradient>
                      </defs>
                      <rect fill="url(#stdBg)" width="600" height="400" rx="12"/>
                      <rect x="0" y="0" width="600" height="4" rx="2" fill="#3b82f6" opacity="0.7"/>
                      <rect x="150" y="120" width="300" height="40" rx="6" fill="#fff" opacity="0.95"/>
                      <rect x="180" y="185" width="240" height="18" rx="4" fill="#fff" opacity="0.35"/>
                      <rect x="245" y="230" width="110" height="4" rx="2" fill="#3b82f6" opacity="0.6"/>
                      <rect x="30" y="360" width="50" height="3" rx="1.5" fill="#475569" opacity="0.3"/>
                      <rect x="520" y="360" width="50" height="3" rx="1.5" fill="#475569" opacity="0.3"/>
                      <rect x="30" y="30" width="50" height="3" rx="1.5" fill="#475569" opacity="0.3"/>
                      <rect x="520" y="30" width="50" height="3" rx="1.5" fill="#475569" opacity="0.3"/>
                    </svg>
                    <button
                      onClick={() => handleCopyPrompt('standard')}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all shrink-0 ${
                        copiedVersion === 'standard'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-stone-800 text-white hover:bg-stone-700 shadow-sm'
                      }`}
                    >
                      {copiedVersion === 'standard' ? '✅ コピー済' : '📋 コピー'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'standard' ? null : 'standard')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <span className={`transition-transform duration-200 ${expandedPrompt === 'standard' ? 'rotate-180' : ''}`}>▾</span>
                    プロンプトを表示
                  </button>
                  {expandedPrompt === 'standard' && (
                    <pre className="text-xs font-mono text-stone-500 bg-stone-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-stone-100 overflow-y-auto max-h-[200px] custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      {standardPrompt}
                    </pre>
                  )}
                </div>

                {/* Simple Prompt Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h6 className="text-sm font-bold text-stone-700">シンプル版プロンプト</h6>
                      <p className="text-xs text-stone-500 mt-0.5">詳細なレイアウト指示。丸みのあるビジネスデザイン。</p>
                    </div>
                    <svg viewBox="0 0 600 400" className="w-[100px] shrink-0 rounded-md block border border-stone-100">
                      <rect fill="#fafaf9" width="600" height="400" rx="12"/>
                      <rect fill="none" stroke="#e7e5e4" strokeWidth="2.5" x="8" y="8" width="584" height="384" rx="8"/>
                      <path d="M120,55 Q300,25 480,55" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5"/>
                      <rect x="225" y="35" width="150" height="20" rx="10" fill="#bfdbfe" opacity="0.6"/>
                      <ellipse cx="300" cy="155" rx="170" ry="40" fill="#e0f2fe" stroke="#93c5fd" strokeWidth="1"/>
                      <circle cx="120" cy="300" r="55" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5"/>
                      <circle cx="120" cy="288" r="16" fill="#bbf7d0"/>
                      <path d="M90,325 Q120,310 150,325" fill="#bbf7d0" opacity="0.5"/>
                      <ellipse cx="420" cy="270" rx="110" ry="22" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1"/>
                      <ellipse cx="420" cy="330" rx="110" ry="22" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1"/>
                      <rect x="30" y="388" width="540" height="5" rx="2.5" fill="#e7e5e4"/>
                    </svg>
                    <button
                      onClick={() => handleCopyPrompt('simple')}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all shrink-0 ${
                        copiedVersion === 'simple'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-stone-800 text-white hover:bg-stone-700 shadow-sm'
                      }`}
                    >
                      {copiedVersion === 'simple' ? '✅ コピー済' : '📋 コピー'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'simple' ? null : 'simple')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <span className={`transition-transform duration-200 ${expandedPrompt === 'simple' ? 'rotate-180' : ''}`}>▾</span>
                    プロンプトを表示
                  </button>
                  {expandedPrompt === 'simple' && (
                    <pre className="text-xs font-mono text-stone-500 bg-stone-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-stone-100 overflow-y-auto max-h-[200px] custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      {simplePrompt}
                    </pre>
                  )}
                </div>

                {/* Watercolor Prompt Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h6 className="text-sm font-bold text-stone-700">水彩画版プロンプト</h6>
                      <p className="text-xs text-stone-500 mt-0.5">手書き風の柔らかなタッチ。親しみやすく温かい印象。</p>
                    </div>
                    <svg viewBox="0 0 600 400" className="w-[100px] shrink-0 rounded-md block border border-stone-100">
                      <rect fill="#fefbf6" width="600" height="400" rx="12"/>
                      <circle cx="420" cy="100" r="100" fill="#fbcfe8" opacity="0.25"/>
                      <circle cx="480" cy="220" r="80" fill="#c4b5fd" opacity="0.2"/>
                      <circle cx="380" cy="280" r="70" fill="#a5f3fc" opacity="0.2"/>
                      <circle cx="520" cy="160" r="55" fill="#fda4af" opacity="0.18"/>
                      <circle cx="350" cy="140" r="45" fill="#bae6fd" opacity="0.18"/>
                      <circle cx="460" cy="320" r="50" fill="#d9f99d" opacity="0.15"/>
                      <rect x="40" y="70" width="200" height="28" rx="5" fill="#78716c" opacity="0.5"/>
                      <rect x="40" y="120" width="170" height="14" rx="3" fill="#a8a29e" opacity="0.35"/>
                      <rect x="40" y="148" width="185" height="14" rx="3" fill="#a8a29e" opacity="0.35"/>
                      <rect x="40" y="176" width="150" height="14" rx="3" fill="#a8a29e" opacity="0.35"/>
                      <rect x="40" y="204" width="165" height="14" rx="3" fill="#a8a29e" opacity="0.3"/>
                      <circle cx="50" cy="340" r="8" fill="#f9a8d4" opacity="0.4"/>
                      <circle cx="78" cy="355" r="6" fill="#c4b5fd" opacity="0.35"/>
                      <circle cx="105" cy="338" r="7" fill="#a5f3fc" opacity="0.35"/>
                      <circle cx="60" cy="370" r="5" fill="#fda4af" opacity="0.3"/>
                    </svg>
                    <button
                      onClick={() => handleCopyPrompt('watercolor')}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all shrink-0 ${
                        copiedVersion === 'watercolor'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-stone-800 text-white hover:bg-stone-700 shadow-sm'
                      }`}
                    >
                      {copiedVersion === 'watercolor' ? '✅ コピー済' : '📋 コピー'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'watercolor' ? null : 'watercolor')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <span className={`transition-transform duration-200 ${expandedPrompt === 'watercolor' ? 'rotate-180' : ''}`}>▾</span>
                    プロンプトを表示
                  </button>
                  {expandedPrompt === 'watercolor' && (
                    <pre className="text-xs font-mono text-stone-500 bg-stone-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-stone-100 overflow-y-auto max-h-[200px] custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      {watercolorPrompt}
                    </pre>
                  )}
                </div>

                {/* Pop & Friendly Prompt Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h6 className="text-sm font-bold text-stone-700">ポップ＆フレンドリー版プロンプト</h6>
                      <p className="text-xs text-stone-500 mt-0.5">鮮やかな多色使いとポップアート感。楽しくフレンドリーな印象。</p>
                    </div>
                    <svg viewBox="0 0 600 400" className="w-[100px] shrink-0 rounded-md block border border-stone-100">
                      <defs>
                        <linearGradient id="popBg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fef08a"/>
                          <stop offset="50%" stopColor="#fdba74"/>
                          <stop offset="100%" stopColor="#f9a8d4"/>
                        </linearGradient>
                        <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                          <circle cx="3" cy="3" r="1.5" fill="#fff" opacity="0.35"/>
                        </pattern>
                      </defs>
                      <rect fill="url(#popBg)" width="600" height="400" rx="12"/>
                      <rect fill="url(#dots)" width="600" height="400" rx="12"/>
                      <line x1="0" y1="400" x2="600" y2="0" stroke="#fff" strokeWidth="40" opacity="0.12"/>
                      <rect x="30" y="50" width="220" height="36" rx="18" fill="#fff" opacity="0.9"/>
                      <rect x="30" y="100" width="160" height="24" rx="12" fill="#fff" opacity="0.7"/>
                      <rect x="30" y="136" width="140" height="24" rx="12" fill="#fff" opacity="0.7"/>
                      <rect x="30" y="172" width="150" height="24" rx="12" fill="#fff" opacity="0.7"/>
                      <rect x="340" y="60" width="120" height="140" rx="12" fill="#a78bfa" opacity="0.5" transform="rotate(-8 400 130)"/>
                      <rect x="380" y="80" width="120" height="140" rx="12" fill="#38bdf8" opacity="0.5" transform="rotate(5 440 150)"/>
                      <rect x="420" y="100" width="120" height="140" rx="12" fill="#34d399" opacity="0.5" transform="rotate(-3 480 170)"/>
                      <polygon points="520,40 528,60 548,60 532,72 538,92 520,80 502,92 508,72 492,60 512,60" fill="#facc15" opacity="0.7"/>
                      <polygon points="280,300 286,316 304,316 290,326 295,342 280,332 265,342 270,326 256,316 274,316" fill="#fb923c" opacity="0.6"/>
                      <circle cx="50" cy="340" r="20" fill="#f472b6" opacity="0.4"/>
                      <circle cx="550" cy="350" r="15" fill="#a78bfa" opacity="0.4"/>
                    </svg>
                    <button
                      onClick={() => handleCopyPrompt('pop')}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all shrink-0 ${
                        copiedVersion === 'pop'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-stone-800 text-white hover:bg-stone-700 shadow-sm'
                      }`}
                    >
                      {copiedVersion === 'pop' ? '✅ コピー済' : '📋 コピー'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === 'pop' ? null : 'pop')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <span className={`transition-transform duration-200 ${expandedPrompt === 'pop' ? 'rotate-180' : ''}`}>▾</span>
                    プロンプトを表示
                  </button>
                  {expandedPrompt === 'pop' && (
                    <pre className="text-xs font-mono text-stone-500 bg-stone-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-stone-100 overflow-y-auto max-h-[200px] custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      {popPrompt}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceResult;
