
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
// useLayoutEffect: 毎レンダー後にヘッダー高さをDOM直接操作で同期
import { generateSurveyPatterns } from '../services/geminiService';
import { extractWords } from '../utils/textProcessing';
import { SurveyPattern } from '../types';
import LoadingOverlay from './LoadingOverlay';

interface SurveyToolProps {
  ensureKeySet: () => Promise<boolean>;
  onHandleApiError: (error: any) => void;
}

const escapeString = (str: string): string => {
    return str
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/'/g, "\\'")   // Escape single quotes
        .replace(/\n/g, "\\n")  // Escape newlines
        .replace(/\r/g, "");    // Remove carriage returns
};

const generateGasCode = (pattern: SurveyPattern): string => {
  const qCode = pattern.questions.map(q => {
    let itemCode = '';
    const cleanTitle = escapeString(q.title);
    const cleanHelp = q.helpText ? escapeString(q.helpText) : '';
    const helpLine = cleanHelp ? `.setHelpText('${cleanHelp}')` : '';
    const reqLine = q.required ? `.setRequired(true)` : `.setRequired(false)`;

    switch (q.type) {
      case 'TEXT':
        itemCode = `  form.addTextItem()\n    .setTitle('${cleanTitle}')\n    ${helpLine}\n    ${reqLine};`;
        break;
      case 'PARAGRAPH':
        itemCode = `  form.addParagraphTextItem()\n    .setTitle('${cleanTitle}')\n    ${helpLine}\n    ${reqLine};`;
        break;
      case 'RADIO':
        const rOptions = q.options?.map(o => `'${escapeString(o)}'`).join(', ') || '';
        itemCode = `  form.addMultipleChoiceItem()\n    .setTitle('${cleanTitle}')\n    .setChoiceValues([${rOptions}])\n    ${helpLine}\n    ${reqLine};`;
        break;
      case 'CHECKBOX':
        const cOptions = q.options?.map(o => `'${escapeString(o)}'`).join(', ') || '';
        itemCode = `  form.addCheckboxItem()\n    .setTitle('${cleanTitle}')\n    .setChoiceValues([${cOptions}])\n    ${helpLine}\n    ${reqLine};`;
        break;
    }
    return itemCode;
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
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>📜</span> Google Apps Script (GAS)
                        </h3>
                        <p className="text-stone-400 text-xs mt-1">
                            以下のコードをコピーして実行すると、Googleフォームが自動生成されます。
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={handleCopy}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                                copied ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'
                            }`}
                        >
                            {copied ? '✅ コピーしました' : '📋 コードをコピー'}
                        </button>
                         <a 
                            href="https://script.new" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                        >
                            <span>🚀</span> GAS Editorを開く
                        </a>
                    </div>
                </div>

                <div className="relative group">
                    <pre className="bg-black/50 p-5 rounded-xl text-xs md:text-sm font-mono overflow-x-auto text-blue-100 border border-white/10 custom-scrollbar max-h-[400px]">
                        {code}
                    </pre>
                </div>

                <div className="mt-6 bg-stone-700/80 rounded-xl p-6 border border-stone-500 shadow-inner">
                    <h4 className="font-bold text-lg text-white mb-3 flex items-center gap-2">
                        <span>💡</span> 使い方ステップ
                    </h4>
                    <ol className="text-sm md:text-base text-stone-200 space-y-3 list-decimal list-inside leading-relaxed">
                        <li>右上の<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「GAS Editorを開く」</span>ボタンを押してエディタを開く</li>
                        <li>エディタにある既存のコードを消して、<span className="text-yellow-300 font-bold border-b border-yellow-300/50">コピーしたコードを貼り付け</span></li>
                        <li>上のバーにある「保存（💾）」を押し、関数「createSurveyForm」を選択して<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「実行」</span></li>
                        <li>権限の確認画面が出たら「承認」→「詳細」→「安全ではないページに移動」で許可する</li>
                        <li>実行完了後、下の<span className="text-yellow-300 font-bold border-b border-yellow-300/50">「実行ログ」</span>にアンケートのURLが表示されます✨</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

const PatternCard: React.FC<{
  pattern: SurveyPattern;
  isSelected: boolean;
  onSelect: () => void;
  headerRef: (el: HTMLDivElement | null) => void;
}> = ({ pattern, isSelected, onSelect, headerRef }) => {
    let accentColor = "";
    let icon = "";
    if (pattern.id === 'A') {
        accentColor = "border-teal-200 bg-teal-50";
        icon = "🍃";
    } else if (pattern.id === 'B') {
        accentColor = "border-blue-200 bg-blue-50";
        icon = "⚖️";
    } else {
        accentColor = "border-purple-200 bg-purple-50";
        icon = "📊";
    }

    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col ${
                isSelected
                ? `${accentColor} ring-2 ring-offset-2 ring-blue-400 shadow-md transform scale-[1.02]`
                : 'bg-white border-stone-100 hover:border-blue-200 hover:shadow-lg'
            }`}
        >
            <div ref={headerRef} data-role="card-header">
                <div className="flex justify-between items-start mb-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white shadow-sm border border-stone-100">
                        {icon}
                    </span>
                    {isSelected && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-in zoom-in">
                            SELECTED
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-stone-800 text-lg mb-1">{pattern.name}</h3>
                <p className="text-xs text-stone-500 font-medium leading-relaxed mb-4">
                    {pattern.description}
                </p>
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

const SurveyTool: React.FC<SurveyToolProps> = ({ ensureKeySet, onHandleApiError }) => {
  const [serviceBody, setServiceBody] = useState('');
  const [priceHint, setPriceHint] = useState('');
  const [patterns, setPatterns] = useState<SurveyPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<SurveyPattern | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 直接DOM操作でヘッダー高さを揃える（React stateを経由しない最も確実な方法）
  const syncHeaderHeights = useCallback(() => {
    const refs = headerRefs.current.filter(Boolean) as HTMLDivElement[];
    if (refs.length < 2) return;
    // 1. リセット（自然な高さに戻す）
    refs.forEach(r => { r.style.minHeight = ''; });
    // 2. 強制reflow → 自然な高さを計測
    const heights = refs.map(r => r.offsetHeight);
    const max = Math.max(...heights);
    // 3. 全ヘッダーに最大値を適用
    refs.forEach(r => { r.style.minHeight = `${max}px`; });
  }, []);

  // 毎レンダー後にヘッダー高さを同期（React再描画でstyleがリセットされても即修正）
  useLayoutEffect(() => {
    if (patterns.length > 0) syncHeaderHeights();
  });

  const setHeaderRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    headerRefs.current[index] = el;
  }, []);

  const inputWords = useMemo(() => extractWords(serviceBody), [serviceBody]);

  // パターン生成後にスクロール位置を最上部にリセット
  useEffect(() => {
    if (patterns.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [patterns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceBody.trim()) {
        alert("サービス内容を入力してください。");
        return;
    }

    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setIsLoading(true);
    try {
      const data = await generateSurveyPatterns(serviceBody, priceHint);
      setPatterns(data);
      // デフォルトでパターンB（標準回答プラン）を選択し、コードも表示
      const defaultPattern = data.find(p => p.id === 'B') || data[1] || data[0];
      setSelectedPattern(defaultPattern);
      setShowCode(true);
    } catch (error) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPattern = (pattern: SurveyPattern) => {
    setSelectedPattern(pattern);
  };

  const handleGenerateCode = () => {
    if (selectedPattern) {
        setShowCode(true);
        // Automatically scroll to code section
        setTimeout(() => {
            document.getElementById('gas-code-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-y-auto">
        {!patterns.length ? (
            <div className="p-6 md:p-12 flex-grow flex flex-col">
                <div className="mb-8">
                    <span className="text-blue-500 font-bold tracking-wider text-xs uppercase mb-1 block">Survey</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-stone-800">アンケート自動作成</h2>
                    <p className="text-stone-500 mt-2">
                        サービス内容を分析し、Googleフォームを自動生成するプログラムを作成します。<br/>
                        回答者の負担にならない、最適な設問リストを提案します。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col max-w-3xl mx-auto w-full">
                    <div className="space-y-2">
                        <label className="font-bold text-stone-700 block flex justify-between items-end">
                            <span>出品サービスページ本文</span>
                            <span className="text-xs text-stone-400 font-normal">Creatorで作った「サービス詳細」などを貼り付け</span>
                        </label>
                        <textarea 
                            value={serviceBody}
                            onChange={(e) => setServiceBody(e.target.value)}
                            className="w-full p-5 rounded-2xl border-stone-200 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-blue-200 min-h-[200px] shadow-inner text-base leading-relaxed"
                            placeholder="ここにサービス説明文を貼り付けてください..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-stone-700 block">価格（任意）</label>
                        <input 
                            type="text"
                            value={priceHint}
                            onChange={(e) => setPriceHint(e.target.value)}
                            className="w-full p-4 rounded-xl border-stone-200 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-blue-200"
                            placeholder="例：3,000円"
                        />
                        <p className="text-xs text-stone-400">※「適正価格」の設問を作成する際の参考にします。</p>
                    </div>
                    
                    <div className="flex-grow"></div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>🧠</span> アンケート案を考案する
                    </button>
                </form>
            </div>
        ) : (
            <div className="p-6 md:p-12 h-full flex flex-col overflow-y-auto custom-scrollbar">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">アンケート構成案 (3パターン)</h2>
                        <p className="text-xs text-stone-500 mt-1">目的に合うパターンを選んで、Googleフォーム作成コードを発行してください。</p>
                    </div>
                    <button 
                        onClick={() => { setPatterns([]); setShowCode(false); }} 
                        className="text-xs font-bold bg-white border border-stone-200 px-5 py-2.5 rounded-full hover:bg-stone-50 text-stone-600 transition-colors shadow-sm"
                    >
                        ↩ 入力に戻る
                    </button>
                 </div>

                 {/* Pattern Selection Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {patterns.map((pattern, index) => (
                        <PatternCard
                            key={pattern.id}
                            pattern={pattern}
                            isSelected={selectedPattern?.id === pattern.id}
                            onSelect={() => handleSelectPattern(pattern)}
                            headerRef={setHeaderRef(index)}
                        />
                    ))}
                 </div>

                 {/* Generate Button Area */}
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

                 {/* Code Viewer */}
                 {showCode && selectedPattern && (
                     <CodeViewer pattern={selectedPattern} />
                 )}
                 
                 <div className="pb-12"></div>
            </div>
        )}
        {isLoading && (
            <LoadingOverlay 
                message="アンケート設問構成を3パターン設計しています..." 
                title="アンケート設計中" 
                sourceWords={inputWords} 
            />
        )}
    </div>
  );
};

export default SurveyTool;
