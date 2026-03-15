
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { generatePromotion, generateSurveyPatterns } from '../services/geminiService';
import { extractWords } from '../utils/textProcessing';
import { SurveyPattern } from '../types';
import { MegaphoneIcon, ClipboardListIcon } from './icons';
import LoadingOverlay from './LoadingOverlay';

interface SupportHubProps {
  ensureKeySet: () => Promise<boolean>;
  onHandleApiError: (error: any) => void;
}

// --- Menu type definitions ---
type MenuId = 'promoter' | 'survey';

// --- Reusable sub-components (from existing tools) ---

const TweetCard: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const [copied, setCopied] = useState(false);
  const formattedText = useMemo(() => {
    return text.replace(/。(?!\n)/g, '。\n').trim();
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetUrl = `https://libecity.com/tweet/all?create=${encodeURIComponent(formattedText)}`;

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all w-full group">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-100">
        <span className="bg-stone-100 text-stone-500 text-xs font-bold px-3 py-1 rounded-full border border-stone-200">
          Pattern {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold px-4 py-2 rounded-full border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all flex items-center gap-2 shadow-sm">
            <span>🕊️</span> つぶやく
          </a>
          <button onClick={handleCopy}
            className={`text-xs font-bold px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
              copied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-800 text-white border-stone-800 hover:bg-stone-700 hover:border-stone-700 shadow-sm'
            }`}>
            {copied ? <><span>✅</span> コピー済</> : <><span>📋</span> コピー</>}
          </button>
        </div>
      </div>
      <div className="w-full bg-stone-50 rounded-xl p-4 text-sm md:text-base text-stone-700 leading-relaxed border border-stone-100 whitespace-pre-wrap select-text">
        {formattedText}
      </div>
    </div>
  );
};

const escapeString = (str: string): string => {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
};

const generateGasCode = (pattern: SurveyPattern): string => {
  const qCode = pattern.questions.map(q => {
    const cleanTitle = escapeString(q.title);
    const cleanHelp = q.helpText ? escapeString(q.helpText) : '';
    const helpLine = cleanHelp ? `.setHelpText('${cleanHelp}')` : '';
    const reqLine = q.required ? `.setRequired(true)` : `.setRequired(false)`;
    switch (q.type) {
      case 'TEXT':
        return `  form.addTextItem()\n    .setTitle('${cleanTitle}')\n    ${helpLine}\n    ${reqLine};`;
      case 'PARAGRAPH':
        return `  form.addParagraphTextItem()\n    .setTitle('${cleanTitle}')\n    ${helpLine}\n    ${reqLine};`;
      case 'RADIO': {
        const opts = q.options?.map(o => `'${escapeString(o)}'`).join(', ') || '';
        return `  form.addMultipleChoiceItem()\n    .setTitle('${cleanTitle}')\n    .setChoiceValues([${opts}])\n    ${helpLine}\n    ${reqLine};`;
      }
      case 'CHECKBOX': {
        const opts = q.options?.map(o => `'${escapeString(o)}'`).join(', ') || '';
        return `  form.addCheckboxItem()\n    .setTitle('${cleanTitle}')\n    .setChoiceValues([${opts}])\n    ${helpLine}\n    ${reqLine};`;
      }
    }
  }).join('\n\n');

  return `function createSurveyForm() {
  // 1. フォームを作成
  var form = FormApp.create('${escapeString(pattern.formTitle)}');
  form.setDescription('${escapeString(pattern.formDescription)}');

  // 2. 質問を追加
${qCode}

  // 3. URLをログに出力
  Logger.log('--------------------------------------------------');
  Logger.log('編集用URL (管理者用): ' + form.getEditUrl());
  Logger.log('回答用URL (公開用): ' + form.getPublishedUrl());
  Logger.log('--------------------------------------------------');
}`;
};

const CodeViewer: React.FC<{ pattern: SurveyPattern }> = ({ pattern }) => {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateGasCode(pattern), [pattern]);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div id="gas-code-section" className="mt-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-stone-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>📜</span> Google Apps Script (GAS)</h3>
            <p className="text-stone-400 text-xs mt-1">以下のコードをコピーして実行すると、Googleフォームが自動生成されます。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleCopy}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'}`}>
              {copied ? '✅ コピーしました' : '📋 コードをコピー'}
            </button>
            <a href="https://script.new" target="_blank" rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2">
              <span>🚀</span> GAS Editorを開く
            </a>
          </div>
        </div>
        <pre className="bg-black/50 p-5 rounded-xl text-xs md:text-sm font-mono overflow-x-auto text-blue-100 border border-white/10 custom-scrollbar max-h-[400px]">
          {code}
        </pre>
        <div className="mt-6 bg-stone-700/80 rounded-xl p-6 border border-stone-500 shadow-inner">
          <h4 className="font-bold text-lg text-white mb-3 flex items-center gap-2"><span>💡</span> 使い方ステップ</h4>
          <ol className="text-sm md:text-base text-stone-200 space-y-3 list-decimal list-inside leading-relaxed">
            <li>右上の<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「GAS Editorを開く」</span>ボタンを押してエディタを開く</li>
            <li>エディタにある既存のコードを消して、<span className="text-yellow-300 font-bold border-b border-yellow-300/50">コピーしたコードを貼り付け</span></li>
            <li>上のバーにある「保存（💾）」を押し、関数「createSurveyForm」を選択して<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「実行」</span></li>
            <li>権限の確認画面が出たら「権限を確認」→「続行」で許可する</li>
            <li>実行完了後、下の<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「実行ログ」</span>にアンケートのURLが表示されます</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const PatternCard: React.FC<{ pattern: SurveyPattern; isSelected: boolean; onSelect: () => void; headerRef: (el: HTMLDivElement | null) => void }> = ({ pattern, isSelected, onSelect, headerRef }) => {
  const styles = pattern.id === 'A'
    ? { accent: 'border-teal-200 bg-teal-50', icon: '🍃' }
    : pattern.id === 'B'
    ? { accent: 'border-blue-200 bg-blue-50', icon: '⚖️' }
    : { accent: 'border-purple-200 bg-purple-50', icon: '📊' };

  return (
    <div onClick={onSelect}
      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative h-full flex flex-col ${
        isSelected ? `${styles.accent} ring-2 ring-offset-2 ring-blue-400 shadow-md transform scale-[1.02]` : 'bg-white border-stone-100 hover:border-blue-200 hover:shadow-lg'
      }`}>
      <div ref={headerRef} data-role="card-header">
        <div className="flex justify-between items-start mb-3">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white shadow-sm border border-stone-100">{styles.icon}</span>
          {isSelected && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-in zoom-in">SELECTED</span>}
        </div>
        <h3 className="font-bold text-stone-800 text-lg mb-1">{pattern.name}</h3>
        <p className="text-xs text-stone-500 font-medium leading-relaxed mb-4">{pattern.description}</p>
      </div>
      <div className="space-y-3 pt-2 border-t border-stone-100">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex justify-between items-center mt-2">
          <span>Questions List</span>
          <span className="bg-stone-100 px-2 py-0.5 rounded-full text-stone-500">{pattern.questions.length}問</span>
        </p>
        <ul className="text-xs text-stone-600 space-y-2">
          {pattern.questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${q.required ? 'bg-rose-400' : 'bg-stone-300'}`}></span>
              <span className="leading-relaxed">{q.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// --- Icon background styles ---
const iconBgStyles: Record<string, string> = {
  orange: 'bg-orange-50 text-orange-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
};

const badgeStyles: Record<string, string> = {
  orange: 'bg-orange-50 text-orange-500 border-orange-200',
  blue: 'bg-blue-50 text-blue-500 border-blue-200',
  green: 'bg-green-50 text-green-500 border-green-200',
  purple: 'bg-purple-50 text-purple-500 border-purple-200',
};

// --- Main Component ---
const SupportHub: React.FC<SupportHubProps> = ({ ensureKeySet, onHandleApiError }) => {
  // Shared input
  const [serviceBody, setServiceBody] = useState('');

  // Tool-specific inputs
  const [serviceUrl, setServiceUrl] = useState('');
  const [priceHint, setPriceHint] = useState('');

  // Active menu & results
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);

  // Promoter results
  const [posts, setPosts] = useState<string[]>([]);

  // Survey results
  const [patterns, setPatterns] = useState<SurveyPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<SurveyPattern | null>(null);
  const [showCode, setShowCode] = useState(false);

  // Survey PatternCard ヘッダー高さ同期
  const surveyHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syncSurveyHeaders = useCallback(() => {
    const refs = surveyHeaderRefs.current.filter(Boolean) as HTMLDivElement[];
    if (refs.length < 2) return;
    refs.forEach(r => { r.style.minHeight = ''; });
    const heights = refs.map(r => r.offsetHeight);
    const max = Math.max(...heights);
    refs.forEach(r => { r.style.minHeight = `${max}px`; });
  }, []);
  useLayoutEffect(() => {
    if (patterns.length > 0) syncSurveyHeaders();
  });
  const setSurveyHeaderRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    surveyHeaderRefs.current[index] = el;
  }, []);

  // Loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState<MenuId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputWords = useMemo(() => extractWords(serviceBody), [serviceBody]);
  const hasInput = serviceBody.trim().length > 0;

  // Scroll to results when they appear (container内のみスクロール)
  useEffect(() => {
    if ((posts.length > 0 || patterns.length > 0) && resultRef.current && containerRef.current) {
      const container = containerRef.current;
      const target = resultRef.current;
      const targetTop = target.offsetTop - container.offsetTop;
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [posts, patterns]);

  const handleRunPromoter = async () => {
    if (!hasInput) return;

    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setIsLoading(true);
    setLoadingMenu('promoter');
    try {
      const data = await generatePromotion(serviceBody, serviceUrl);
      setPosts(data);
      setPatterns([]);
      setSelectedPattern(null);
      setShowCode(false);
      setActiveMenu('promoter');
    } catch (error) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
      setLoadingMenu(null);
    }
  };

  const handleRunSurvey = async () => {
    if (!hasInput) return;

    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setIsLoading(true);
    setLoadingMenu('survey');
    try {
      const data = await generateSurveyPatterns(serviceBody, priceHint);
      setPatterns(data);
      // デフォルトでパターンB（標準回答プラン）を選択し、コードも表示
      const defaultPattern = data.find(p => p.id === 'B') || data[1] || data[0];
      setSelectedPattern(defaultPattern);
      setShowCode(true);
      setPosts([]);
      setActiveMenu('survey');
    } catch (error) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
      setLoadingMenu(null);
    }
  };

  const handleGenerateCode = () => {
    if (selectedPattern) {
      setShowCode(true);
      setTimeout(() => {
        const el = document.getElementById('gas-code-section');
        if (el && containerRef.current) {
          const container = containerRef.current;
          const targetTop = el.offsetTop - container.offsetTop;
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Menu definitions (data-driven for future extensibility)
  const supportMenus = [
    {
      id: 'promoter' as MenuId,
      title: '宣伝文を作る',
      description: 'リベシティの文化に合う「前向き・丁寧・押しつけない」つぶやきを20本生成',
      icon: <MegaphoneIcon />,
      themeColor: 'orange',
      badge: 'Promoter',
      onRun: handleRunPromoter,
      extraInput: (
        <div className="flex-shrink-0 w-full md:w-auto">
          <input
            type="text"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            className="w-full md:w-64 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all"
            placeholder="サービスURL（任意）"
            disabled={!hasInput}
          />
        </div>
      ),
    },
    {
      id: 'survey' as MenuId,
      title: 'アンケートを作る',
      description: '購入者の声を集めるGoogleフォームアンケートを自動作成',
      icon: <ClipboardListIcon />,
      themeColor: 'blue',
      badge: 'Survey',
      onRun: handleRunSurvey,
      extraInput: (
        <div className="flex-shrink-0 w-full md:w-auto">
          <input
            type="text"
            value={priceHint}
            onChange={(e) => setPriceHint(e.target.value)}
            className="w-full md:w-40 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            placeholder="価格（任意）"
            disabled={!hasInput}
          />
        </div>
      ),
    },
  ];

  const hasResults = posts.length > 0 || patterns.length > 0;

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="p-6 md:p-10">

        {/* Header */}
        <div className="mb-8">
          <span className="text-purple-500 font-bold tracking-wider text-xs uppercase mb-1 block">Support Tools</span>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-800 tracking-tight">サポートメニュー</h2>
          <p className="text-stone-500 text-sm mt-2">サービス詳細を入力すると、各メニューが実行できます。</p>
        </div>

        {/* Shared Input */}
        <div className="mb-8">
          <label className="font-bold text-stone-700 block mb-2 flex justify-between items-end">
            <span>出品サービスページ本文</span>
            <span className="text-xs text-stone-400 font-normal">Creatorで作った「サービス詳細」などを貼り付け</span>
          </label>
          <textarea
            value={serviceBody}
            onChange={(e) => setServiceBody(e.target.value)}
            className="w-full p-5 rounded-2xl border border-stone-200 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-300 min-h-[180px] shadow-inner text-base leading-relaxed transition-all"
            placeholder="ここにサービス説明文を貼り付けてください..."
          />
          {hasInput && (
            <p className="text-xs text-green-600 mt-2 font-medium animate-in fade-in">入力済み - 以下のメニューを実行できます</p>
          )}
        </div>

        {/* Menu List */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">メニュー一覧</span>
            <div className="h-px bg-stone-200 flex-grow"></div>
          </div>

          <div className="bg-white border border-stone-100 ring-1 ring-black/[0.04] rounded-2xl overflow-hidden shadow-sm">
            {supportMenus.map((menu, index) => (
              <div
                key={menu.id}
                className={`transition-all duration-200 ${!hasInput ? 'opacity-50' : ''} ${index !== supportMenus.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 px-5 py-4">
                  {/* Icon + Text */}
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${iconBgStyles[menu.themeColor]}`}>
                      <div className="scale-90">{menu.icon}</div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-800 tracking-tight">{menu.title}</h4>
                        <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${badgeStyles[menu.themeColor]}`}>
                          {menu.badge}
                        </span>
                        {activeMenu === menu.id && hasResults && (
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">済</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{menu.description}</p>
                    </div>
                  </div>

                  {/* Extra Input + Run Button */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {menu.extraInput}
                    <button
                      onClick={menu.onRun}
                      disabled={!hasInput || isLoading}
                      className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                        hasInput && !isLoading
                          ? 'bg-stone-800 text-white hover:bg-stone-700 shadow-sm active:scale-95'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {loadingMenu === menu.id ? (
                        <><span className="animate-spin">⏳</span> 生成中...</>
                      ) : (
                        '実行'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {hasResults && (
          <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-4 px-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">結果</span>
              <div className="h-px bg-stone-200 flex-grow"></div>
            </div>

            {/* Promoter Results */}
            {activeMenu === 'promoter' && posts.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">生成されたつぶやき ({posts.length}本)</h3>
                    <p className="text-xs text-stone-500 mt-1">気に入ったものをコピー、または直接つぶやいてください。</p>
                  </div>
                </div>
                <div className="space-y-6 pb-12">
                  {posts.map((post, idx) => (
                    <TweetCard key={idx} text={post} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Survey Results */}
            {activeMenu === 'survey' && patterns.length > 0 && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">アンケート構成案 (3パターン)</h3>
                  <p className="text-xs text-stone-500 mt-1">目的に合うパターンを選んで、Googleフォーム作成コードを発行してください。</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">
                  {patterns.map((pattern, index) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      isSelected={selectedPattern?.id === pattern.id}
                      onSelect={() => setSelectedPattern(pattern)}
                      headerRef={setSurveyHeaderRef(index)}
                    />
                  ))}
                </div>
                <div className="flex justify-center mb-4">
                  <button
                    onClick={handleGenerateCode}
                    disabled={!selectedPattern}
                    className={`font-bold py-4 px-12 rounded-full shadow-xl transition-all flex items-center gap-2 transform ${
                      selectedPattern
                        ? 'bg-gradient-to-r from-stone-800 to-stone-700 text-white hover:scale-105 hover:shadow-2xl cursor-pointer'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed grayscale'
                    }`}
                  >
                    <span>💻</span> この構成でコードを生成する
                  </button>
                </div>
                {showCode && selectedPattern && <CodeViewer pattern={selectedPattern} />}
                <div className="pb-12"></div>
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">ノウハウ記事</span>
            <div className="h-px bg-stone-200 flex-grow"></div>
          </div>

          <div className="bg-white border border-stone-100 ring-1 ring-black/[0.04] rounded-2xl overflow-hidden shadow-sm">
            {[
              {
                title: '🦁▼稼ぎ方実践講座「価格の決め方」',
                description: 'ビジネスをやるときに悩むことランキング上位、いくらで売るか。',
                author: '学長マガジンチャット',
                category: '価格',
                url: 'https://libecity.com/room_list?room_id=President-Tweet&comment_id=nxfgYlqV2Eb3Lh2YOhPS',
              },
              {
                title: '🦁嫌われない宣伝方法の話〜上手に宣伝し〜や〜〜',
                description: '商品やサービスは作っただけじゃ売れへん！リベッターを活用した宣伝方法',
                author: '学長マガジンチャット',
                category: '宣伝',
                url: 'https://libecity.com/room_list?room_id=President-Tweet&comment_id=ifrXKHuX4QbUTwkPSG7Y',
              },
              {
                title: '【無料で使える！】スキルマーケットOnline構造診断ツール',
                description: '既に出している商品を「今後も出し続けるか、中身を見直すか」を判定してくれる診断ツール',
                author: 'おれんじ🍊スプシで稼ぐチャット管理人',
                category: '改善',
                url: 'https://library.libecity.com/articles/01KE4E7JX9ZR77663JV9JDW77T',
              },
              {
                title: '【売上120%UP】スキルマーケットで自分のサービスを改善する３つのポイント',
                description: 'サービスを出してみたけど中々売れない…そんなときに見直すべき３つのポイントと判断基準',
                author: 'みずの＠寄り添うWebデザイナー',
                category: '改善',
                url: 'https://library.libecity.com/articles/01HHE5SC4C5KE81R4AT2CZB25F',
              },
              {
                title: "リベシティプロフィールを『あなたらしい』文章にするコツと例文をご紹介",
                description: 'プロフィールに何を書けばいいか迷う方へ、項目ごとの書き方をご紹介',
                author: 'ベリー号🚢採用支援×HPライター',
                category: 'プロフィール',
                url: 'https://library.libecity.com/articles/01HKR0A1C9G6NMTDXKC18QVRD2',
              },
              {
                title: '信頼を貯めるリベプロフィールの書き方＊考え方を解説＊',
                description: '認知されているのに依頼が来ない…信頼につながるプロフィールの考え方',
                author: 'ベリー号🚢採用支援×HPライター',
                category: 'プロフィール',
                url: 'https://library.libecity.com/articles/01K1Z2F6Z0QPR83FPG558EP2PT',
              },
              {
                title: '【デザイン苦手でも大丈夫！】"見られるサムネイル"の作り方',
                description: 'Canva初心者さん向けに、出品用サムネイルの作り方を7ステップで解説',
                author: 'まい＠戦略企画×クリエイター',
                category: 'デザイン',
                url: 'https://library.libecity.com/articles/01JY8232SXV4X9QHDSG3DW15H2',
              },
              {
                title: '知ってもらわないとモノは売れない【人見知りさん必見！】oviceで認知活動',
                description: '話しかけるのが苦手ならoviceで話しかけてもらえばいい！を実践した認知活動の記録',
                author: 'パー子＠おしゃべりなお絵描き屋さん',
                category: '宣伝',
                url: 'https://library.libecity.com/articles/01JB6VCAG87W05WFBGMN27EP1V',
              },
            ].map((article, index, arr) => (
              <a
                key={index}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-stone-50 ${
                  index !== arr.length - 1 ? 'border-b border-stone-100' : ''
                }`}
              >
                <span className="shrink-0 mt-0.5 text-stone-300 text-sm">📄</span>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors leading-snug">{article.title}</h4>
                    <span className={`shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                      ({ '価格': 'bg-amber-50 text-amber-500 border-amber-200',
                         '宣伝': 'bg-orange-50 text-orange-500 border-orange-200',
                         '改善': 'bg-green-50 text-green-500 border-green-200',
                         'プロフィール': 'bg-blue-50 text-blue-500 border-blue-200',
                         'デザイン': 'bg-purple-50 text-purple-500 border-purple-200',
                      } as Record<string, string>)[article.category] || 'bg-stone-50 text-stone-400 border-stone-200'
                    }`}>{article.category}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 truncate">{article.description}</p>
                  <p className="text-[10px] text-stone-300 mt-1">by {article.author}</p>
                </div>
                <span className="shrink-0 mt-1 text-stone-300 group-hover:text-purple-400 transition-colors text-xs">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingOverlay
          message={loadingMenu === 'promoter'
            ? '困りごとに寄り添ってから、解決策をそっと添える形で。読んだ方が気持ちよく受け取れる文にしています。'
            : 'アンケート設問構成を3パターン設計しています...'}
          title={loadingMenu === 'promoter' ? '投稿のたたき台を20本用意しています' : 'アンケート設計中'}
          sourceWords={inputWords}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a29e; }
      `}</style>
    </div>
  );
};

export default SupportHub;
