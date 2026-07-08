export enum AppStep {
  HUB = 'HUB',
  PROFILE = 'PROFILE',
  IDEAS = 'IDEAS',
  BASICS = 'BASICS',
  SCHEDULE = 'SCHEDULE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  IMAGE_PROMPTS = 'IMAGE_PROMPTS',
  CHAT_SETUP = 'CHAT_SETUP',
  SHARE = 'SHARE',
}

export interface OrganizerProfile {
  /** お名前（ニックネーム）。任意だが推奨入力 */
  organizerName: string;
  selfIntro: string;
  interests: string;
  /** どこで開催したいか: 対面 or オンライン（必須選択） */
  venuePreference: 'offline' | 'online';
  /** 対面の場合の開催したいエリア（例: 関東（東京）。オンライン時は空でよい） */
  desiredArea: string;
  /** 既に企画が決まっている場合のテーマ（任意。入力があれば後続はこれに沿う） */
  plannedTheme: string;
}

/** 企画案に紐づく「軽いMVV」= 会のコンセプト */
export interface IdeaConcept {
  purpose: string; // この会の目的（軽いミッション）
  persona: string; // 来てほしい人の具体像（ペルソナ）
  cherish: string[]; // 会で大切にしたいこと（2〜3個）
}

export type IdeaCategory = 'save' | 'earn' | 'protect' | 'grow' | 'use' | 'other';

// 旧カテゴリ値(classic/niche)や未知値を安全に正規化する。未知は 'other'
export function normalizeIdeaCategory(cat: string | undefined | null): IdeaCategory {
  const valid: IdeaCategory[] = ['save', 'earn', 'protect', 'grow', 'use', 'other'];
  return valid.includes(cat as IdeaCategory) ? (cat as IdeaCategory) : 'other';
}

export interface PlanIdea extends IdeaConcept {
  id: string;
  category: IdeaCategory;
  title: string;
  summary: string;
  venueHint: string;
  recommendedCapacity: number;
  firstTimerFriendlyPoint: string;
}

export type VenueType = 'online' | 'offline';

export interface CapacitySuggestion {
  recommended: number;
  min: number;
  max: number;
  reason: string;
}

export interface EventBasics {
  title: string;
  titleCandidates: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  venueType: VenueType;
  /** オフライン時: リベシティ公式オフィスで開催する場合のオフィスkey（''=公式オフィス以外） */
  officeKey: string;
  venueDetail: string;
  capacity: number;
  capacitySuggestion: CapacitySuggestion | null;
  /** オンライン時の開催ツール: 'oVice' | 'Zoom' | 'Google Meet' | 'Teams' | 'other' | '' */
  onlineTool: string;
  /** onlineTool === 'other' のときの自由入力 */
  onlineToolOther: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

/** チャットアイコンのスタイル候補（3方向。プロンプトはコード側テンプレートで組み立てる） */
export interface IconStyleCandidate {
  key: 'text' | 'motif' | 'clay';
  label: string;
  /** このスタイルの完成プロンプト全文 */
  prompt: string;
}

export interface IconPromptResult {
  /** アイコンに載せる短いワード */
  word: string;
  /** オフ会を象徴するモチーフ（motif/clayスタイルで使用） */
  motif: string;
  /** プレビュー表示用の絵文字1つ */
  emoji: string;
  /** スタイル別のプロンプト候補（3件） */
  candidates: IconStyleCandidate[];
  styleNote: string;
}

export interface ThumbnailAssets {
  imagePrompt: string;
}

export interface ShareTexts {
  regionalChat: string;
  tweet: string;
}

/** generateAnnouncement の戻り値（本文＋タグ） */
export interface AnnouncementResult {
  body: string;
  tags: string[];
}

/** 作業中オフ会のスナップショット（最大4件までHubに保存） */
export interface EventSnapshot {
  idea: PlanIdea | null;
  concept: IdeaConcept | null;
  basics: EventBasics;
  schedule: ScheduleItem[];
  announcement: string;
  eventTags: string[];
  iconPrompt: IconPromptResult | null;
  thumbnailAssets: ThumbnailAssets | null;
  shareTexts: ShareTexts | null;
  offkaiChatUrl: string;
  maxReached: AppStep;
  /** 生成物が「どの上流入力から作られたか」の指紋。前工程の変更検知に使う */
  scheduleSourceKey: string;
  imagesSourceKey: string;
  announcementSourceKey: string;
  shareSourceKey: string;
  /** 詳細（公開情報）の「書き直してほしい点」の蓄積履歴（オフ会ごと） */
  announcementFeedbackHistory: string[];
  /** 進行イメージの「作り直してほしい点」の蓄積履歴（オフ会ごと） */
  scheduleFeedbackHistory: string[];
}

export interface SavedEvent {
  id: string;
  updatedAt: number;
  snapshot: EventSnapshot;
}
