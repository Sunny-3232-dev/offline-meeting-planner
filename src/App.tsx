import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AppStep,
  OrganizerProfile,
  IdeaConcept,
  PlanIdea,
  EventBasics,
  ScheduleItem,
  IconPromptResult,
  ThumbnailAssets,
  ShareTexts,
  EventSnapshot,
  SavedEvent,
} from './types';
import type { AnnouncementResult } from './types';
import {
  saveToStorage,
  loadFromStorage,
  clearAllStorage,
  createDebouncedStorage,
} from './utils/storage';
import { APP_NAME } from './constants';
import Hub from './components/Hub';
import ProfileInput from './components/ProfileInput';
import IdeasStep from './components/IdeasStep';
import BasicsStep from './components/BasicsStep';
import ScheduleStep from './components/ScheduleStep';
import AnnouncementStep from './components/AnnouncementStep';
import ImagePromptStep from './components/ImagePromptStep';
import ChatSetupStep from './components/ChatSetupStep';
import ShareStep from './components/ShareStep';
import {
  generatePlanIdeas,
  generateTitleCandidates,
  suggestCapacity,
  generateSchedule,
  generateAnnouncement,
  generateIconPrompt,
  generateThumbnailAssets,
  generateShareTexts,
} from './services/geminiService';
import { computeTimeRanges, formatDateJa } from './utils/time';
import { MAX_PINNED_IDEAS, MAX_SAVED_EVENTS } from './constants';
import StepIndicator, { stepOrder } from './components/StepIndicator';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { KeyIcon } from './components/icons';
import { EntakuLogo } from './components/Entaku';
import { confirmDialog, ConfirmDialogHost } from './utils/confirmDialog';

const INITIAL_PROFILE: OrganizerProfile = {
  selfIntro: '',
  interests: '',
  venuePreference: 'offline',
  desiredArea: '',
  plannedTheme: '',
  hostingConcern: '',
};

const INITIAL_BASICS: EventBasics = {
  title: '',
  titleCandidates: [],
  date: '',
  startTime: '19:00',
  durationMinutes: 120,
  venueType: 'offline',
  officeKey: '',
  venueDetail: '',
  capacity: 6,
  capacitySuggestion: null,
  onlineTool: '',
  onlineToolOther: '',
};

/** 旧バージョンの保存データにofficeKey等が無くても壊れないようにマージする */
function migrateBasics(stored: Partial<EventBasics> | null): EventBasics {
  return { ...INITIAL_BASICS, ...(stored || {}) };
}

/** 旧バージョンの保存データ（region）を新フィールド（desiredArea/venuePreference）へ移行する */
function migrateProfile(stored: (Partial<OrganizerProfile> & { region?: string }) | null): OrganizerProfile {
  if (!stored) return INITIAL_PROFILE;
  const { region, ...rest } = stored;
  const migrated: OrganizerProfile = { ...INITIAL_PROFILE, ...rest };
  if (region && !migrated.desiredArea) {
    migrated.desiredArea = region;
  }
  return migrated;
}

// ── 前工程の変更検知（指紋） ──────────────────────────
// 各生成物が「どの上流入力から作られたか」を文字列化し、次に進む前に
// 現在の上流入力と食い違っていないかを比較する。食い違っていれば
// 「作り直しますか？」と確認する。
function basicsFingerprint(basics: EventBasics): string {
  return JSON.stringify({
    title: basics.title,
    date: basics.date,
    startTime: basics.startTime,
    durationMinutes: basics.durationMinutes,
    venueType: basics.venueType,
    officeKey: basics.officeKey,
    venueDetail: basics.venueDetail,
    capacity: basics.capacity,
    onlineTool: basics.onlineTool,
    onlineToolOther: basics.onlineToolOther,
  });
}
function conceptFingerprint(concept: IdeaConcept | null): string {
  return concept ? JSON.stringify(concept) : '';
}
function scheduleFingerprint(schedule: ScheduleItem[]): string {
  return schedule.map((s) => `${s.title}|${s.durationMinutes}`).join(',');
}
function basicsConceptFingerprint(basics: EventBasics, concept: IdeaConcept | null): string {
  return `${basicsFingerprint(basics)}|${conceptFingerprint(concept)}`;
}
function announcementSourceFingerprint(
  basics: EventBasics,
  concept: IdeaConcept | null,
  schedule: ScheduleItem[]
): string {
  return `${basicsFingerprint(basics)}|${conceptFingerprint(concept)}|${scheduleFingerprint(schedule)}`;
}
function shareSourceFingerprint(basics: EventBasics, announcement: string, desiredArea: string): string {
  return `${basicsFingerprint(basics)}|${announcement}|${desiredArea}`;
}

function getAutoApiKey(): string {
  if (typeof window !== 'undefined' && (window as any).aistudio?.apiKey) {
    return (window as any).aistudio.apiKey;
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
}

/** 保存済みステップが現在のフローに存在するか検証（旧MVVステップ等からの移行用） */
function loadValidStep(key: string, fallback: AppStep): AppStep {
  const stored = loadFromStorage<AppStep>(key);
  return stored && Object.values(AppStep).includes(stored) ? stored : fallback;
}

function AppContent() {
  const [step, setStep] = useState<AppStep>(() => loadValidStep('step', AppStep.HUB));
  const [maxReached, setMaxReached] = useState<AppStep>(
    () => loadValidStep('maxReached', AppStep.PROFILE)
  );
  const [apiKey, setApiKey] = useState<string>(() => {
    // ユーザーが手動で保存したキーを最優先（AI Studioの自動注入キーより上位）
    const stored = loadFromStorage<string>('apiKey');
    const auto = getAutoApiKey();
    return stored || auto || '';
  });
  const [hasStoredApiKey, setHasStoredApiKey] = useState<boolean>(
    () => !!loadFromStorage<string>('apiKey')
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const apiKeyPanelRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSourceText, setLoadingSourceText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<OrganizerProfile>(
    () => migrateProfile(loadFromStorage<OrganizerProfile>('profile'))
  );
  const [concept, setConcept] = useState<IdeaConcept | null>(
    () => loadFromStorage<IdeaConcept>('concept')
  );
  const [planIdeas, setPlanIdeas] = useState<PlanIdea[]>(
    () => loadFromStorage<PlanIdea[]>('planIdeas') || []
  );
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(
    () => loadFromStorage<string>('selectedIdeaId')
  );
  const [pinnedIds, setPinnedIds] = useState<string[]>(
    () => loadFromStorage<string[]>('pinnedIdeaIds') || []
  );
  // 確定した企画（企画案リストと切り離して保持。オフ会切替後もリスト再生成に影響されない）
  const [activeIdea, setActiveIdea] = useState<PlanIdea | null>(
    () => loadFromStorage<PlanIdea>('activeIdea')
  );
  // 保存済みオフ会（最大MAX_SAVED_EVENTS件）と、いま編集中のオフ会ID
  const [events, setEvents] = useState<SavedEvent[]>(
    () => loadFromStorage<SavedEvent[]>('events') || []
  );
  const [activeEventId, setActiveEventId] = useState<string | null>(
    () => loadFromStorage<string>('activeEventId')
  );
  const [basics, setBasics] = useState<EventBasics>(
    () => migrateBasics(loadFromStorage<EventBasics>('basics'))
  );
  const [schedule, setSchedule] = useState<ScheduleItem[]>(
    () => loadFromStorage<ScheduleItem[]>('schedule') || []
  );
  const [announcement, setAnnouncement] = useState<string>(
    () => loadFromStorage<string>('announcement') || ''
  );
  const [eventTags, setEventTags] = useState<string[]>(
    () => loadFromStorage<string[]>('eventTags') || []
  );
  const [iconPrompt, setIconPrompt] = useState<IconPromptResult | null>(
    () => loadFromStorage<IconPromptResult>('iconPrompt')
  );
  const [thumbnailAssets, setThumbnailAssets] = useState<ThumbnailAssets | null>(
    () => loadFromStorage<ThumbnailAssets>('thumbnailAssets')
  );
  const [shareTexts, setShareTexts] = useState<ShareTexts | null>(
    () => loadFromStorage<ShareTexts>('shareTexts')
  );
  const [offkaiChatUrl, setOffkaiChatUrl] = useState<string>(
    () => loadFromStorage<string>('offkaiChatUrl') || ''
  );
  // 各生成物の「生成時点の上流入力」指紋（前工程の変更検知用）
  const [scheduleSourceKey, setScheduleSourceKey] = useState<string>(
    () => loadFromStorage<string>('scheduleSourceKey') || ''
  );
  const [imagesSourceKey, setImagesSourceKey] = useState<string>(
    () => loadFromStorage<string>('imagesSourceKey') || ''
  );
  const [announcementSourceKey, setAnnouncementSourceKey] = useState<string>(
    () => loadFromStorage<string>('announcementSourceKey') || ''
  );
  const [shareSourceKey, setShareSourceKey] = useState<string>(
    () => loadFromStorage<string>('shareSourceKey') || ''
  );

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  // Close API key dropdown on outside click / Esc
  useEffect(() => {
    if (!showApiKeyInput) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (apiKeyPanelRef.current && !apiKeyPanelRef.current.contains(e.target as Node)) {
        setShowApiKeyInput(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowApiKeyInput(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showApiKeyInput]);

  // Debounced storage writers for frequently-modified states
  const debouncedProfileRef = useRef<ReturnType<typeof createDebouncedStorage<OrganizerProfile>> | null>(null);
  const debouncedAnnouncementRef = useRef<ReturnType<typeof createDebouncedStorage<string>> | null>(null);
  const debouncedBasicsRef = useRef<ReturnType<typeof createDebouncedStorage<EventBasics>> | null>(null);
  const debouncedScheduleRef = useRef<ReturnType<typeof createDebouncedStorage<ScheduleItem[]>> | null>(null);

  useEffect(() => {
    if (!debouncedProfileRef.current) {
      debouncedProfileRef.current = createDebouncedStorage('profile', 800);
      debouncedAnnouncementRef.current = createDebouncedStorage('announcement', 800);
      debouncedBasicsRef.current = createDebouncedStorage('basics', 800);
      debouncedScheduleRef.current = createDebouncedStorage('schedule', 800);
    }
    debouncedProfileRef.current?.save(profile);
  }, [profile]);
  useEffect(() => { debouncedAnnouncementRef.current?.save(announcement); }, [announcement]);
  useEffect(() => { debouncedBasicsRef.current?.save(basics); }, [basics]);
  useEffect(() => { debouncedScheduleRef.current?.save(schedule); }, [schedule]);

  // Persist (immediate for less-frequently-modified states)
  useEffect(() => { saveToStorage('step', step); }, [step]);
  useEffect(() => { saveToStorage('maxReached', maxReached); }, [maxReached]);
  useEffect(() => { saveToStorage('concept', concept); }, [concept]);
  useEffect(() => { saveToStorage('planIdeas', planIdeas); }, [planIdeas]);
  useEffect(() => { saveToStorage('selectedIdeaId', selectedIdeaId); }, [selectedIdeaId]);
  useEffect(() => { saveToStorage('pinnedIdeaIds', pinnedIds); }, [pinnedIds]);
  useEffect(() => { saveToStorage('activeIdea', activeIdea); }, [activeIdea]);
  useEffect(() => { saveToStorage('iconPrompt', iconPrompt); }, [iconPrompt]);
  useEffect(() => { saveToStorage('thumbnailAssets', thumbnailAssets); }, [thumbnailAssets]);
  useEffect(() => { saveToStorage('shareTexts', shareTexts); }, [shareTexts]);
  useEffect(() => { saveToStorage('offkaiChatUrl', offkaiChatUrl); }, [offkaiChatUrl]);
  useEffect(() => { saveToStorage('eventTags', eventTags); }, [eventTags]);
  useEffect(() => { saveToStorage('events', events); }, [events]);
  useEffect(() => { saveToStorage('activeEventId', activeEventId); }, [activeEventId]);
  useEffect(() => { saveToStorage('scheduleSourceKey', scheduleSourceKey); }, [scheduleSourceKey]);
  useEffect(() => { saveToStorage('imagesSourceKey', imagesSourceKey); }, [imagesSourceKey]);
  useEffect(() => { saveToStorage('announcementSourceKey', announcementSourceKey); }, [announcementSourceKey]);
  useEffect(() => { saveToStorage('shareSourceKey', shareSourceKey); }, [shareSourceKey]);

  // 編集中のオフ会スナップショットを保存済みイベントに同期
  useEffect(() => {
    if (!activeEventId) return;
    const snapshot: EventSnapshot = {
      idea: activeIdea,
      concept,
      basics,
      schedule,
      announcement,
      eventTags,
      iconPrompt,
      thumbnailAssets,
      shareTexts,
      offkaiChatUrl,
      maxReached,
      scheduleSourceKey,
      imagesSourceKey,
      announcementSourceKey,
      shareSourceKey,
    };
    setEvents((prev) =>
      prev.map((ev) => (ev.id === activeEventId ? { ...ev, updatedAt: Date.now(), snapshot } : ev))
    );
  }, [activeEventId, activeIdea, concept, basics, schedule, announcement, eventTags, iconPrompt, thumbnailAssets, shareTexts, offkaiChatUrl, maxReached, scheduleSourceKey, imagesSourceKey, announcementSourceKey, shareSourceKey]);

  const goToStep = useCallback((next: AppStep) => {
    setStep(next);
    setMaxReached((prev) => (stepOrder(next) > stepOrder(prev) ? next : prev));
  }, []);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed) return;
    saveToStorage('apiKey', trimmed);
    setApiKey(trimmed);
    setHasStoredApiKey(true);
    setApiKeyDraft('');
    setShowApiKeyInput(false);
  };

  const handleClearApiKey = () => {
    saveToStorage('apiKey', '');
    localStorage.removeItem('offkai-creator-apiKey');
    const auto = getAutoApiKey();
    setApiKey(auto);
    setHasStoredApiKey(false);
    setApiKeyDraft('');
  };

  /** 編集中オフ会のワークスペースだけを空にする（プロフィール・企画案リストは残す） */
  const clearWorkspace = useCallback(() => {
    setActiveEventId(null);
    setActiveIdea(null);
    setConcept(null);
    setSelectedIdeaId(null);
    setBasics(INITIAL_BASICS);
    setSchedule([]);
    setAnnouncement('');
    setEventTags([]);
    setIconPrompt(null);
    setThumbnailAssets(null);
    setShareTexts(null);
    setOffkaiChatUrl('');
    setMaxReached(AppStep.PROFILE);
    setScheduleSourceKey('');
    setImagesSourceKey('');
    setAnnouncementSourceKey('');
    setShareSourceKey('');
  }, []);

  const handleReset = useCallback(async () => {
    const ok = await confirmDialog(
      '入力した内容・生成結果に加えて、保存済みのオフ会もすべて削除して初期化します。よろしいですか？'
    );
    if (!ok) return;
    const storedKey = loadFromStorage<string>('apiKey');
    clearAllStorage();
    if (storedKey) saveToStorage('apiKey', storedKey);
    setProfile(INITIAL_PROFILE);
    setPlanIdeas([]);
    setPinnedIds([]);
    setEvents([]);
    clearWorkspace();
    setStep(AppStep.PROFILE);
  }, [clearWorkspace]);

  /** 新しいオフ会の企画を開始（保存枠が埋まっている場合は開始できない） */
  const startNewEvent = useCallback(() => {
    if (events.length >= MAX_SAVED_EVENTS) {
      setError(
        `保存できるオフ会は最大${MAX_SAVED_EVENTS}件です。終了したオフ会をトップ画面で削除してから、新しいオフ会を企画してください。`
      );
      return;
    }
    clearWorkspace();
    setStep(AppStep.PROFILE);
  }, [events.length, clearWorkspace]);

  /** 保存済みオフ会を開いて編集を再開する */
  const openEvent = useCallback((id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const s = ev.snapshot;
    setActiveEventId(id);
    setActiveIdea(s.idea);
    setConcept(s.concept);
    setSelectedIdeaId(s.idea?.id || null);
    setBasics(migrateBasics(s.basics));
    setSchedule(s.schedule || []);
    setAnnouncement(s.announcement || '');
    setEventTags(s.eventTags || []);
    setIconPrompt(s.iconPrompt);
    setThumbnailAssets(s.thumbnailAssets);
    setShareTexts(s.shareTexts);
    setOffkaiChatUrl(s.offkaiChatUrl || '');
    setMaxReached(s.maxReached || AppStep.BASICS);
    setScheduleSourceKey(s.scheduleSourceKey || '');
    setImagesSourceKey(s.imagesSourceKey || '');
    setAnnouncementSourceKey(s.announcementSourceKey || '');
    setShareSourceKey(s.shareSourceKey || '');
    setStep(s.maxReached || AppStep.BASICS);
  }, [events]);

  /** 保存済みオフ会を削除する（終了したオフ会の後片付け用） */
  const deleteEvent = useCallback(async (id: string) => {
    const ev = events.find((e) => e.id === id);
    const title = ev?.snapshot.basics.title || ev?.snapshot.idea?.title || 'このオフ会';
    const ok = await confirmDialog(`「${title}」を削除しますか？（元に戻せません）`);
    if (!ok) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (activeEventId === id) clearWorkspace();
  }, [events, activeEventId, clearWorkspace]);

  const hasProgress =
    !!profile.selfIntro || !!concept || planIdeas.length > 0 || schedule.length > 0;

  /** APIキー未設定なら鍵パネルを開いてfalseを返す */
  const ensureApiKey = useCallback((): boolean => {
    if (apiKey) return true;
    setError('Gemini APIキーが設定されていません。画面右上の鍵アイコンから設定してください。');
    setShowApiKeyInput(true);
    return false;
  }, [apiKey]);

  const [suggestingCapacity, setSuggestingCapacity] = useState(false);

  const runGenerateTitles = useCallback(async (confirmedConcept?: IdeaConcept, ideaOverride?: PlanIdea) => {
    const useConcept = confirmedConcept || concept;
    const useIdea = ideaOverride || activeIdea;
    if (!ensureApiKey() || !useConcept || !useIdea) return;
    setLoading(true);
    setLoadingMessage('タイトル候補を考えています...');
    setLoadingSourceText(`${useIdea.title} ${useIdea.summary}`);
    setError(null);
    try {
      const titles = await generateTitleCandidates(apiKey, useConcept, useIdea);
      setBasics((prev) => ({
        ...prev,
        titleCandidates: titles,
        title: prev.title || titles[0] || prev.title,
      }));
    } catch (e: any) {
      setError(e?.message || 'タイトル候補の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiKey, concept, activeIdea, ensureApiKey]);

  const runSuggestCapacity = useCallback(async () => {
    if (!ensureApiKey() || !activeIdea) return;
    setSuggestingCapacity(true);
    setError(null);
    try {
      const suggestion = await suggestCapacity(apiKey, activeIdea, basics);
      setBasics((prev) => ({
        ...prev,
        capacitySuggestion: suggestion,
        capacity: suggestion.recommended,
      }));
    } catch (e: any) {
      setError(e?.message || '定員の提案に失敗しました。');
    } finally {
      setSuggestingCapacity(false);
    }
  }, [apiKey, activeIdea, basics, ensureApiKey]);

  const runGenerateSchedule = useCallback(async (opts?: { confirm?: boolean }) => {
    if (!ensureApiKey() || !concept || !activeIdea) return;
    if (opts?.confirm && schedule.length > 0) {
      const ok = await confirmDialog('進行イメージをAIで作り直すと、いまの編集内容は上書きされます。よろしいですか？');
      if (!ok) return;
    }
    setLoading(true);
    setLoadingMessage('タイムスケジュールを組み立てています...');
    setLoadingSourceText(`${basics.title} ${basics.durationMinutes}分 ${basics.capacity}人`);
    setError(null);
    try {
      const items = await generateSchedule(apiKey, basics, concept, activeIdea);
      setSchedule(items.map((i) => ({ ...i, id: crypto.randomUUID() })));
      setScheduleSourceKey(basicsConceptFingerprint(basics, concept));
    } catch (e: any) {
      setError(e?.message || '進行イメージの生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiKey, concept, activeIdea, basics, schedule.length, ensureApiKey]);

  const runGenerateAnnouncement = useCallback(async (feedback: string) => {
    if (!ensureApiKey() || !concept || !activeIdea) return;
    if (announcement) {
      const ok = await confirmDialog('詳細（公開情報）をAIで書き直すと、いまの編集内容は上書きされます。よろしいですか？');
      if (!ok) return;
    }
    setLoading(true);
    setLoadingMessage('詳細（公開情報）の文章を書いています...');
    setLoadingSourceText(`${basics.title} ${concept.purpose} ${concept.persona}`);
    setError(null);
    try {
      const result: AnnouncementResult = await generateAnnouncement(
        apiKey,
        profile,
        concept,
        basics,
        schedule,
        formatDateJa(basics.date),
        computeTimeRanges(basics.startTime, schedule),
        feedback
      );
      setAnnouncement(result.body);
      setEventTags(result.tags);
      setAnnouncementSourceKey(announcementSourceFingerprint(basics, concept, schedule));
    } catch (e: any) {
      setError(e?.message || '詳細（公開情報）の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiKey, profile, concept, activeIdea, basics, schedule, announcement, ensureApiKey]);

  // 画像プロンプトは待ち時間を作らないため、グローバルオーバーレイを使わず
  // バックグラウンドで生成する（BASICS完了時に先行生成を開始）。
  const [iconLoading, setIconLoading] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);

  const runGenerateIconPrompt = useCallback(async (opts?: { silent?: boolean }) => {
    if (!concept || !activeIdea || iconLoading) return;
    if (opts?.silent) {
      if (!apiKey) return;
    } else if (!ensureApiKey()) {
      return;
    }
    setIconLoading(true);
    if (!opts?.silent) setError(null);
    try {
      setIconPrompt(await generateIconPrompt(apiKey, concept, activeIdea, basics));
      setImagesSourceKey(basicsConceptFingerprint(basics, concept));
    } catch (e: any) {
      // 先行生成の失敗は黙って見送る（画像ステップで手動生成できる）
      if (!opts?.silent) setError(e?.message || 'アイコンプロンプトの生成に失敗しました。');
    } finally {
      setIconLoading(false);
    }
  }, [apiKey, concept, activeIdea, basics, iconLoading, ensureApiKey]);

  const runGenerateThumbnail = useCallback(async (opts?: { silent?: boolean }) => {
    if (!concept || !activeIdea || thumbLoading) return;
    if (opts?.silent) {
      if (!apiKey) return;
    } else if (!ensureApiKey()) {
      return;
    }
    setThumbLoading(true);
    if (!opts?.silent) setError(null);
    try {
      setThumbnailAssets(
        await generateThumbnailAssets(apiKey, concept, activeIdea, basics, formatDateJa(basics.date))
      );
      setImagesSourceKey(basicsConceptFingerprint(basics, concept));
    } catch (e: any) {
      if (!opts?.silent) setError(e?.message || 'サムネイル素材の生成に失敗しました。');
    } finally {
      setThumbLoading(false);
    }
  }, [apiKey, concept, activeIdea, basics, thumbLoading, ensureApiKey]);

  const runGenerateShareTexts = useCallback(async () => {
    if (!ensureApiKey() || !announcement) return;
    setLoading(true);
    setLoadingMessage('チャット・つぶやき用の文章を書いています...');
    setLoadingSourceText(announcement.slice(0, 200));
    setError(null);
    try {
      setShareTexts(
        await generateShareTexts(apiKey, announcement, basics, profile.desiredArea, formatDateJa(basics.date))
      );
      setShareSourceKey(shareSourceFingerprint(basics, announcement, profile.desiredArea));
    } catch (e: any) {
      setError(e?.message || '展開用文章の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiKey, announcement, basics, profile.desiredArea, ensureApiKey]);

  const runGenerateIdeas = useCallback(async () => {
    if (!ensureApiKey()) return;
    setLoading(true);
    setLoadingMessage('企画のアイデアを考えています...');
    setLoadingSourceText(`${profile.selfIntro} ${profile.interests}`);
    setError(null);
    try {
      const ideas = await generatePlanIdeas(apiKey, profile);
      // ピン留めした案は再生成後も残す
      setPlanIdeas((prev) => [...prev.filter((i) => pinnedIds.includes(i.id)), ...ideas]);
      setSelectedIdeaId((prev) => (prev && pinnedIds.includes(prev) ? prev : null));
      goToStep(AppStep.IDEAS);
    } catch (e: any) {
      setError(e?.message || '企画案の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiKey, profile, pinnedIds, ensureApiKey, goToStep]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PINNED_IDEAS) return prev; // 上限到達時は無視
      return [...prev, id];
    });
  }, []);

  const renderStep = () => {
    switch (step) {
      case AppStep.HUB:
        return (
          <Hub
            hasProgress={hasProgress}
            events={events}
            activeEventId={activeEventId}
            canCreate={events.length < MAX_SAVED_EVENTS}
            onStart={startNewEvent}
            onResume={() => setStep(maxReached)}
            onOpenEvent={openEvent}
            onDeleteEvent={deleteEvent}
            onReset={handleReset}
          />
        );
      case AppStep.PROFILE:
        return (
          <ProfileInput
            profile={profile}
            onChange={setProfile}
            // 2回目以降に押しても常に初期化・再生成する（古い企画案を暗黙に使い回さない）
            onNext={runGenerateIdeas}
          />
        );
      case AppStep.IDEAS:
        return (
          <IdeasStep
            ideas={planIdeas}
            selectedIdeaId={selectedIdeaId}
            pinnedIds={pinnedIds}
            plannedTheme={profile.plannedTheme}
            onSelect={setSelectedIdeaId}
            onTogglePin={togglePin}
            onRegenerate={runGenerateIdeas}
            onProceed={async (idea) => {
              // 保存枠の空きを確認（編集中のオフ会があればその枠を使う）
              if (!activeEventId && events.length >= MAX_SAVED_EVENTS) {
                setError(
                  `保存できるオフ会は最大${MAX_SAVED_EVENTS}件です。トップ画面で終了したオフ会を削除してから進めてください。`
                );
                return;
              }
              // 既存オフ会の企画を「別の案」に変更しようとしている場合、
              // 下流の生成物がすべて作り直し対象になることを確認する
              const isIdeaChange = !!activeEventId && activeIdea && activeIdea.id !== idea.id;
              const hasDownstream =
                schedule.length > 0 || !!announcement || !!iconPrompt || !!thumbnailAssets || !!shareTexts;
              if (isIdeaChange && hasDownstream) {
                const ok = await confirmDialog(
                  '企画を変更すると、進行イメージ・詳細情報・画像・告知文をすべて作り直すことになります。よろしいですか？'
                );
                if (!ok) return;
              }
              // コンセプト（軽いMVV）は企画案から自動で引き継ぐ（編集UIは出さない）
              const derivedConcept = {
                purpose: idea.purpose,
                persona: idea.persona,
                cherish: idea.cherish,
              };
              setSelectedIdeaId(idea.id);
              setActiveIdea(idea);
              setConcept(derivedConcept);
              if (isIdeaChange) {
                // 企画が変わったので下流の生成物をすべて空にし、作り直しの土台を作る
                setBasics((prev) => ({ ...prev, titleCandidates: [], capacitySuggestion: null }));
                setSchedule([]);
                setAnnouncement('');
                setEventTags([]);
                setIconPrompt(null);
                setThumbnailAssets(null);
                setShareTexts(null);
                setScheduleSourceKey('');
                setImagesSourceKey('');
                setAnnouncementSourceKey('');
                setShareSourceKey('');
              }
              if (!activeEventId) {
                // 新規オフ会の開始時のみ、プロフィールの開催希望をbasics.venueTypeへ反映する
                // （既存オフ会を編集中の場合は上書きしない）
                setBasics((prev) => ({ ...prev, venueType: profile.venuePreference }));
                // ここで初めて「1件のオフ会」として保存枠を確保する
                const id = crypto.randomUUID();
                setEvents((prev) => [
                  ...prev,
                  {
                    id,
                    updatedAt: Date.now(),
                    snapshot: {
                      idea,
                      concept: derivedConcept,
                      basics,
                      schedule,
                      announcement,
                      eventTags,
                      iconPrompt,
                      thumbnailAssets,
                      shareTexts,
                      offkaiChatUrl,
                      maxReached,
                      scheduleSourceKey: '',
                      imagesSourceKey: '',
                      announcementSourceKey: '',
                      shareSourceKey: '',
                    },
                  },
                ]);
                setActiveEventId(id);
              }
              goToStep(AppStep.BASICS);
              // タイトル候補が未生成なら自動で提案
              if (basics.titleCandidates.length === 0 || isIdeaChange) runGenerateTitles(derivedConcept, idea);
            }}
            onBack={() => setStep(AppStep.PROFILE)}
          />
        );
      case AppStep.BASICS:
        return (
          <BasicsStep
            basics={basics}
            idea={activeIdea}
            onChange={setBasics}
            onRegenerateTitles={() => runGenerateTitles()}
            onSuggestCapacity={runSuggestCapacity}
            suggestingCapacity={suggestingCapacity}
            onNext={async () => {
              // 基本情報を変更した後だと、既存の進行イメージ・画像は前提が食い違っている可能性がある
              const currentKey = basicsConceptFingerprint(basics, concept);
              const scheduleStale =
                schedule.length > 0 && scheduleSourceKey !== '' && currentKey !== scheduleSourceKey;
              const imagesStale =
                (!!iconPrompt || !!thumbnailAssets) && imagesSourceKey !== '' && currentKey !== imagesSourceKey;
              if (scheduleStale || imagesStale) {
                const parts = [scheduleStale && '進行イメージ', imagesStale && '画像'].filter(Boolean);
                const ok = await confirmDialog(`基本情報が変更されています。${parts.join('・')}を作り直しますか？`);
                if (ok) {
                  if (scheduleStale) runGenerateSchedule();
                  if (imagesStale) {
                    runGenerateIconPrompt({ silent: true });
                    runGenerateThumbnail({ silent: true });
                  }
                } else {
                  // 作り直さない場合は「確認済み」として記録し、以後の誤検知を防ぐ
                  if (scheduleStale) setScheduleSourceKey(currentKey);
                  if (imagesStale) setImagesSourceKey(currentKey);
                }
              } else {
                if (schedule.length === 0) runGenerateSchedule();
                // 画像プロンプトはここで材料が揃うので先行生成しておく（画像ステップで待たせない）
                if (!iconPrompt) runGenerateIconPrompt({ silent: true });
                if (!thumbnailAssets) runGenerateThumbnail({ silent: true });
              }
              goToStep(AppStep.SCHEDULE);
            }}
            onBack={() => setStep(AppStep.IDEAS)}
          />
        );
      case AppStep.SCHEDULE:
        return (
          <ScheduleStep
            schedule={schedule}
            basics={basics}
            onChange={setSchedule}
            onRegenerate={() => runGenerateSchedule({ confirm: true })}
            onNext={async () => {
              // 基本情報・進行イメージを変更した後だと、既存の詳細文は前提が食い違っている可能性がある
              const currentKey = announcementSourceFingerprint(basics, concept, schedule);
              const stale =
                !!announcement && announcementSourceKey !== '' && currentKey !== announcementSourceKey;
              if (stale) {
                const ok = await confirmDialog(
                  '基本情報・進行イメージが変更されています。詳細（公開情報）を作り直しますか？'
                );
                if (ok) {
                  runGenerateAnnouncement('');
                } else {
                  setAnnouncementSourceKey(currentKey);
                }
              } else if (!announcement) {
                runGenerateAnnouncement('');
              }
              goToStep(AppStep.ANNOUNCEMENT);
            }}
            onBack={() => setStep(AppStep.BASICS)}
          />
        );
      case AppStep.ANNOUNCEMENT:
        return (
          <AnnouncementStep
            announcement={announcement}
            tags={eventTags}
            onChange={setAnnouncement}
            onRegenerate={runGenerateAnnouncement}
            onNext={() => {
              goToStep(AppStep.IMAGE_PROMPTS);
              // 先行生成が失敗していた場合のフォールバック（バックグラウンドで再試行）
              if (!iconPrompt) runGenerateIconPrompt({ silent: true });
              if (!thumbnailAssets) runGenerateThumbnail({ silent: true });
            }}
            onBack={() => setStep(AppStep.SCHEDULE)}
          />
        );
      case AppStep.IMAGE_PROMPTS:
        return (
          <ImagePromptStep
            iconPrompt={iconPrompt}
            thumbnailAssets={thumbnailAssets}
            iconLoading={iconLoading}
            thumbnailLoading={thumbLoading}
            onGenerateIcon={() => runGenerateIconPrompt()}
            onGenerateThumbnail={() => runGenerateThumbnail()}
            onNext={() => goToStep(AppStep.CHAT_SETUP)}
            onBack={() => setStep(AppStep.ANNOUNCEMENT)}
          />
        );
      case AppStep.CHAT_SETUP:
        return (
          <ChatSetupStep
            basics={basics}
            announcement={announcement}
            eventTags={eventTags}
            onNext={async () => {
              // 詳細（公開情報）を書き直した後だと、既存の展開用文章は前提が食い違っている可能性がある
              const currentKey = shareSourceFingerprint(basics, announcement, profile.desiredArea);
              const stale = !!shareTexts && shareSourceKey !== '' && currentKey !== shareSourceKey;
              if (stale) {
                const ok = await confirmDialog('詳細（公開情報）が変更されています。展開用の文章を作り直しますか？');
                if (ok) {
                  runGenerateShareTexts();
                } else {
                  setShareSourceKey(currentKey);
                }
              } else if (!shareTexts) {
                runGenerateShareTexts();
              }
              goToStep(AppStep.SHARE);
            }}
            onBack={() => setStep(AppStep.IMAGE_PROMPTS)}
          />
        );
      case AppStep.SHARE:
        return (
          <ShareStep
            shareTexts={shareTexts}
            basics={basics}
            region={profile.desiredArea}
            offkaiChatUrl={offkaiChatUrl}
            onChangeChatUrl={setOffkaiChatUrl}
            onGenerate={runGenerateShareTexts}
            onBack={() => setStep(AppStep.CHAT_SETUP)}
            onFinish={() => setStep(AppStep.HUB)}
          />
        );
      default:
        // 各ステップはP3以降で実装
        return (
          <div className="max-w-2xl mx-auto py-16 text-center animate-fade-in">
            <p className="text-slate-500 text-sm mb-6">このステップは準備中です（{step}）</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep(AppStep.HUB)}
                className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                トップへ戻る
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen font-body" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(AppStep.HUB)}
            className="flex items-center gap-2 text-slate-800 font-bold hover:opacity-80 transition-opacity"
          >
            <EntakuLogo size={20} />
            {APP_NAME}
          </button>

          <div className="relative" ref={apiKeyPanelRef}>
            <button
              onClick={() => setShowApiKeyInput((v) => !v)}
              className={`p-2 rounded-full transition-colors ${
                apiKey ? 'text-sky-600 hover:bg-sky-50' : 'text-red-500 hover:bg-red-50'
              }`}
              title="Gemini APIキー設定"
              aria-label="Gemini APIキー設定"
            >
              <KeyIcon size={18} />
            </button>
            {showApiKeyInput && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-50">
                <p className="text-sm font-semibold text-slate-700 mb-1">Gemini APIキー</p>
                <p className="text-xs text-slate-500 mb-3">
                  {apiKey
                    ? hasStoredApiKey
                      ? '手動設定のキーを使用中です。'
                      : '自動取得したキーを使用中です。別のキーを使う場合は下に入力してください。'
                    : 'キーが見つかりません。Gemini APIキーを入力してください。'}
                </p>
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 mb-2"
                />
                <div className="flex justify-end gap-2">
                  {hasStoredApiKey && (
                    <button
                      onClick={handleClearApiKey}
                      className="px-3 py-1.5 text-xs rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      保存したキーを削除
                    </button>
                  )}
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyDraft.trim()}
                    className="px-4 py-1.5 text-xs rounded-full bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-40 transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {step !== AppStep.HUB && (
          <div className="max-w-4xl mx-auto px-4">
            <StepIndicator current={step} maxReached={maxReached} onNavigate={setStep} />
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-sm font-bold"
              aria-label="エラーを閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 pb-16">{renderStep()}</main>

      {loading && <LoadingOverlay message={loadingMessage} sourceText={loadingSourceText} />}
      <ConfirmDialogHost />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
