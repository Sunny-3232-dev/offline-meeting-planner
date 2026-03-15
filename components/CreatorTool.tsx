
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserInput, SkillIdea, Step } from '../types';
import { generateIdeas, generateServicePage, generateThumbnail } from '../services/geminiService';
import { extractWords } from '../utils/textProcessing';
import InputForm from './InputForm';
import IdeaList from './IdeaList';
import ServiceResult from './ServiceResult';
import LoadingOverlay from './LoadingOverlay';

const STORAGE_KEY_IDEAS = "skill_market_ideas";
const STORAGE_KEY_INPUT = "skill_market_raw_input";

interface CreatorToolProps {
  ensureKeySet: () => Promise<boolean>;
  onHandleApiError: (error: any) => void;
}

const CreatorTool: React.FC<CreatorToolProps> = ({ ensureKeySet, onHandleApiError }) => {
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [ideas, setIdeas] = useState<SkillIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<SkillIdea | null>(null);
  const [serviceText, setServiceText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [loadingTitle, setLoadingTitle] = useState<string>("AIが思考中...");

  const [isHighQuality, setIsHighQuality] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [rawInputText, setRawInputText] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // ステップ変更時にスクロール位置を最上部にリセット
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [step]);

  useEffect(() => {
    const savedIdeas = localStorage.getItem(STORAGE_KEY_IDEAS);
    const savedInput = localStorage.getItem(STORAGE_KEY_INPUT);
    if (savedInput) setRawInputText(savedInput);
    
    if (savedIdeas) {
      try {
        const parsed = JSON.parse(savedIdeas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIdeas(parsed);
          setStep(Step.IDEAS);
        }
      } catch (e) {
        console.error("Failed to parse saved ideas", e);
      }
    }
  }, []);

  const saveIdeasToStorage = (data: SkillIdea[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(data));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn("Storage quota exceeded. Attempting to save without image data.");
        try {
          const reducedData = data.map(item => ({ ...item, thumbnailUrl: undefined }));
          localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(reducedData));
          setIdeas(reducedData);
          alert("ストレージ容量がいっぱいになったため、画像データを削除して保存しました。");
        } catch (innerE) {
          console.error("Critical storage failure. Clearing ideas from storage.", innerE);
          localStorage.removeItem(STORAGE_KEY_IDEAS);
        }
      } else {
        console.error("Failed to save to localStorage", e);
      }
    }
  };

  const inputWords = useMemo(() => extractWords(rawInputText), [rawInputText]);

  const handleStartIdeaGeneration = async (input: UserInput) => {
    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setRawInputText(input.rawText);
    try {
      localStorage.setItem(STORAGE_KEY_INPUT, input.rawText);
    } catch (e) {
      console.warn("Failed to save raw input to storage", e);
    }
    
    setIsLoading(true);
    setLoadingTitle("AIが思考中...");
    setLoadingMessage("あなたの情報を分析し、最適なアイデアを練り上げています...");
    try {
      const result = await generateIdeas(input);
      setIdeas(result);
      saveIdeasToStorage(result);
      setStep(Step.IDEAS);
    } catch (error: any) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdea = async (idea: SkillIdea) => {
    if (idea.generatedContent) {
      setSelectedIdea(idea);
      setServiceText(idea.generatedContent);
      setStep(Step.DETAIL);
      window.scrollTo(0, 0);
      return;
    }

    const keyReady = await ensureKeySet();
    if (!keyReady) return;

    setSelectedIdea(idea);
    setStep(Step.GENERATING_DETAIL);
    setIsLoading(true);
    setLoadingTitle(`「${idea.title}」`);
    setLoadingMessage("このアイデアの出品ページを構成しています...");
    
    try {
      const pageText = await generateServicePage(idea);
      const updatedIdeas = ideas.map(i => 
        i.id === idea.id ? { ...i, generatedContent: pageText } : i
      );
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
      setServiceText(pageText);
      setStep(Step.DETAIL);
      window.scrollTo(0, 0);
    } catch (error: any) {
      setStep(Step.IDEAS);
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIdea = (e: React.MouseEvent, ideaId: string) => {
    e.stopPropagation();
    if (confirm("このアイデアを削除しますか？")) {
      const updatedIdeas = ideas.filter(i => i.id !== ideaId);
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
    }
  };

  const handleGenerateThumbnailImage = async (forceQuality?: boolean) => {
    if (!selectedIdea) return;
    const useQuality = forceQuality ?? isHighQuality;

    if (useQuality) {
      const keyReady = await ensureKeySet();
      if (!keyReady) return;
    }
    
    setIsLoading(true);
    setLoadingTitle("サムネイル生成中...");
    setLoadingMessage("サービスに最適な画像を生成しています...");

    try {
      const imageUrl = await generateThumbnail(selectedIdea, useQuality);
      const updatedIdeas = ideas.map(i => 
        i.id === selectedIdea.id ? { ...i, thumbnailUrl: imageUrl } : i
      );
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
      setSelectedIdea(prev => prev ? ({ ...prev, thumbnailUrl: imageUrl }) : null);
    } catch (error: any) {
      onHandleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceReset = () => {
    localStorage.removeItem(STORAGE_KEY_IDEAS);
    localStorage.removeItem(STORAGE_KEY_INPUT);
    
    setIdeas([]);
    setRawInputText("");
    setStep(Step.INPUT);
    setServiceText("");
    setSelectedIdea(null);
    setShowResetConfirm(false);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div ref={containerRef} className="relative h-full flex flex-col overflow-y-auto">
          {step === Step.INPUT && (
            <>
               <div className="px-6 md:px-10 lg:px-12 pt-6">
                 <button onClick={() => setShowResetConfirm(true)} className="text-xs text-stone-400 hover:text-rose-500 underline decoration-stone-200">
                    履歴を消去してリセット
                 </button>
               </div>
               <InputForm onSubmit={handleStartIdeaGeneration} />
            </>
          )}
          {step === Step.IDEAS && (
            <IdeaList 
              ideas={ideas} 
              onSelect={handleSelectIdea} 
              onDelete={handleDeleteIdea}
              onBack={forceReset}
            />
          )}
          {step === Step.DETAIL && selectedIdea && (
            <ServiceResult 
              idea={selectedIdea}
              content={serviceText} 
              thumbnailUrl={selectedIdea?.thumbnailUrl}
              onGenerateImage={() => handleGenerateThumbnailImage()}
              isHighQuality={isHighQuality}
              setIsHighQuality={setIsHighQuality}
              onReset={() => setShowResetConfirm(true)}
              onBack={() => setStep(Step.IDEAS)}
            />
          )}
      </div>

      {showResetConfirm && createPortal(
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md z-[9999] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 max-w-md w-full shadow-2xl border border-white flex flex-col items-center text-center my-auto">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-inner">
              🗑️
            </div>
            <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tight">最初からやり直しますか？</h3>
            <p className="text-stone-500 mb-10 leading-relaxed font-medium">
              Creatorツールの全てのデータ（履歴・画像）を消去して初期状態に戻しますか？<br/>
              <span className="text-rose-500 text-sm font-bold mt-2 inline-block">※この操作は取り消せません。</span>
            </p>
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={forceReset}
                className="w-full py-4.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95"
              >
                はい、データを消去
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-4 px-6 rounded-2xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isLoading && <LoadingOverlay message={loadingMessage} title={loadingTitle} sourceWords={inputWords} />}
    </>
  );
};

export default CreatorTool;
