// リベシティのオフ会作成はチャット一覧画面のモーダルから行う（専用URLなし・2026-07確認）。
// 「＋チャット作成」→「オフ会チャットを新規作成」で作成フォームが開く。
export const LIBECITY_EVENT_CREATE_URL = 'https://libecity.com/room_list';

export const APP_NAME = 'オフ会Creator';
export const APP_TAGLINE = 'はじめてのオフ会主催を、企画から告知まで背中を押す';

export const DURATION_OPTIONS = [60, 90, 120, 150, 180] as const;

// 企画案のピン留め上限（多すぎると選びにくくなるため）
export const MAX_PINNED_IDEAS = 4;

// 保存できるオフ会の最大数
export const MAX_SAVED_EVENTS = 4;

// リベシティ公式オフィス（14拠点）の定義
export interface LibeOffice {
  key: string;
  name: string;
  address: string;
}

export const LIBE_OFFICES: LibeOffice[] = [
  { key: 'sapporo', name: '札幌オフィス', address: 'リベシティ札幌オフィス' },
  { key: 'sendai', name: '仙台オフィス', address: 'リベシティ仙台オフィス' },
  { key: 'chiba', name: '千葉オフィス', address: 'リベシティ千葉オフィス' },
  { key: 'tokyo', name: '東京オフィス', address: 'リベシティ東京オフィス' },
  { key: 'yokohama', name: '横浜オフィス', address: 'リベシティ横浜オフィス' },
  { key: 'shizuoka', name: '静岡オフィス', address: 'リベシティ静岡オフィス' },
  { key: 'nagoya', name: '名古屋オフィス', address: 'リベシティ名古屋オフィス' },
  { key: 'kyoto', name: '京都オフィス', address: 'リベシティ京都オフィス' },
  { key: 'osaka', name: '大阪オフィス', address: 'リベシティ大阪オフィス' },
  { key: 'kobe', name: '神戸オフィス', address: 'リベシティ神戸オフィス' },
  { key: 'hiroshima', name: '広島オフィス', address: 'リベシティ広島オフィス' },
  { key: 'takamatsu', name: '高松オフィス', address: 'リベシティ高松オフィス' },
  { key: 'fukuoka', name: '福岡オフィス', address: 'リベシティ福岡オフィス' },
  { key: 'okinawa', name: '沖縄オフィス', address: 'リベシティ沖縄オフィス' },
];

export interface OfficialOffice {
  key: string;
  label: string;
  address: string;
}

export const OFFICIAL_OFFICES: OfficialOffice[] = LIBE_OFFICES.map(office => ({
  key: office.key,
  label: office.name,
  address: office.address
}));

export function officeLabel(key: string): string {
  const office = OFFICIAL_OFFICES.find((o) => o.key === key);
  return office ? office.label : '';
}

// 支部チャットの定義
export interface BranchChat {
  id: string;
  name: string;
  roomId: string;
  keywords: string[];
}

export const BRANCH_CHATS: BranchChat[] = [
  { id: 'hokkaido', name: '北海道支部', roomId: 'hokkaido_branch', keywords: ['北海道', '札幌', '旭川', '函館'] },
  { id: 'tohoku', name: '東北支部', roomId: 'tohoku_branch', keywords: ['青森', '岩手', '宮城', '仙台', '秋田', '山形', '福島'] },
  { id: 'kanto', name: '関東支部', roomId: 'kanto_branch', keywords: ['東京', '神奈川', '横浜', '川崎', '埼玉', '千葉', '茨城', '栃木', '群馬', '関東'] },
  { id: 'koshinetsu', name: '甲信越支部', roomId: 'koshinetsu_branch', keywords: ['山梨', '長野', '新潟'] },
  { id: 'hokuriku', name: '北陸支部', roomId: 'hokuriku_branch', keywords: ['富山', '石川', '金沢', '福井'] },
  { id: 'tokai', name: '東海支部', roomId: 'tokai_branch', keywords: ['愛知', '名古屋', '岐阜', '静岡', '三重', '東海'] },
  { id: 'kinki', name: '近畿支部', roomId: 'kinki_branch', keywords: ['大阪', '兵庫', '神戸', '京都', '滋賀', '奈良', '和歌山', '近畿', '関西'] },
  { id: 'chugoku', name: '中国支部', roomId: 'chugoku_branch', keywords: ['鳥取', '島根', '岡山', '広島', '山口'] },
  { id: 'shikoku', name: '四国支部', roomId: 'shikoku_branch', keywords: ['徳島', '香川', '高松', '愛媛', '高知'] },
  { id: 'kyushu', name: '九州支部', roomId: 'kyushu_branch', keywords: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島'] },
  { id: 'okinawa', name: '沖縄支部', roomId: 'okinawa_branch', keywords: ['沖縄', '那覇'] },
];

export function branchChatUrl(id: string): string {
  return 'https://libecity.com/room_list';
}

export function guessBranch(region?: string): BranchChat | null {
  if (!region) return null;
  const normalized = region.toLowerCase();
  for (const branch of BRANCH_CHATS) {
    if (branch.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return branch;
    }
  }
  return null;
}
