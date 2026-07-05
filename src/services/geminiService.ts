import { GoogleGenAI } from '@google/genai';
import type {
  OrganizerProfile,
  IdeaConcept,
  PlanIdea,
  IdeaCategory,
  VenueType,
  CapacitySuggestion,
  EventBasics,
  ScheduleItem,
  IconPromptResult,
  ThumbnailAssets,
  ShareTexts,
  AnnouncementResult,
} from '../types';
import { syncTimetableSection } from '../utils/time';

const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function getClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

// プロフィール由来の表記ゆれを正規化（全プロンプトに適用）
const TEXT_REPLACEMENTS: [RegExp, string][] = [
  [/リベ大/g, 'リベシティ'],
];

function normalizePrompt(text: string): string {
  return TEXT_REPLACEMENTS.reduce((t, [pattern, replacement]) => t.replace(pattern, replacement), text);
}

function classifyError(error: any): { type: 'rate-limit' | 'auth' | 'network' | 'timeout' | 'unknown'; message: string } {
  const errorStr = error?.message || String(error);
  const status = error?.status || error?.code;

  if (status === 429 || errorStr.includes('quota') || errorStr.includes('rate limit')) {
    return {
      type: 'rate-limit',
      message:
        'APIの利用上限に達しました。しばらく待ってから再実行するか、画面右上の鍵アイコンから別のGemini APIキーを設定して再実行してください。',
    };
  }
  if (status === 401 || status === 403 || errorStr.includes('API key') || errorStr.includes('unauthorized')) {
    return {
      type: 'auth',
      message:
        'APIキーが無効です。画面右上の鍵アイコンからGemini APIキーを設定し直してください。',
    };
  }
  if (error?.name === 'AbortError' || errorStr.includes('timeout')) {
    return { type: 'timeout', message: 'リクエストがタイムアウトしました。接続を確認して再度お試しください。' };
  }
  if (!navigator.onLine || errorStr.includes('network') || errorStr.includes('fetch')) {
    return { type: 'network', message: 'ネットワーク接続を確認してください。' };
  }
  return { type: 'unknown', message: errorStr || 'AIとの通信中にエラーが発生しました。' };
}

async function callGemini(apiKey: string, prompt: string, retryCount = 0): Promise<string> {
  try {
    const client = getClient(apiKey);
    const response = await client.models.generateContent({
      model: MODEL,
      contents: normalizePrompt(prompt),
    });
    const text = response.text;
    if (!text) throw new Error('AIからの応答がありませんでした');
    return text;
  } catch (error: any) {
    const classification = classifyError(error);

    // Retry only on transient network errors (NOT on rate-limit, which would burn quota)
    if (classification.type === 'network' && retryCount < MAX_RETRIES) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGemini(apiKey, prompt, retryCount + 1);
    }

    throw new Error(classification.message);
  }
}

function repairTruncatedJSON(jsonStr: string): string {
  let s = jsonStr.trim();
  s = s.replace(/,\s*$/, '');

  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  if (inString) s += '"';
  while (braces > 0) { s += '}'; braces--; }
  while (brackets > 0) { s += ']'; brackets--; }

  return s;
}

function extractJSON(text: string): any {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const start = jsonStr.indexOf('{');
    const startArr = jsonStr.indexOf('[');
    const idx = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
    if (idx === -1) throw new Error('AIの応答からJSONを解析できませんでした');
    const sub = jsonStr.slice(idx);
    try {
      return JSON.parse(sub);
    } catch {
      const repaired = repairTruncatedJSON(sub);
      try {
        return JSON.parse(repaired);
      } catch {
        throw new Error('AIの応答が途中で切れたため、JSONを解析できませんでした。再度お試しください。');
      }
    }
  }
}

export { callGemini, extractJSON };

/** 画像生成プロンプトの書き出しを既存ツールと同じ「プロのデザイナー」宣言に揃える */
const DESIGNER_PREFIX = 'あなたはプロのデザイナーです。';
function ensureDesignerPrefix(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.startsWith(DESIGNER_PREFIX) ? trimmed : `${DESIGNER_PREFIX}${trimmed}`;
}

/** コンセプト（軽いMVV）をプロンプト用テキストに整形 */
function conceptLines(concept: IdeaConcept): string {
  return [
    `- 会の目的: ${concept.purpose}`,
    `- 来てほしい人（ペルソナ）: ${concept.persona}`,
    `- 大切にしたいこと: ${concept.cherish.join(' / ')}`,
  ].join('\n');
}

/** 主催者名（自己紹介・つぶやき等）をプロンプトに渡す際の共通指示文。
 * 主催者は本人なので、自分の名前に「さん」を付けない（一人称）。
 * 参加者・他者には従来通り敬称OK。 */
function organizerNameDirective(organizerName: string): string {
  if (!organizerName || !organizerName.trim()) {
    return '- 主催者名: 未記入（名前は無理に入れず、自然な一人称の自己紹介にすること）';
  }
  return `- 主催者名: ${organizerName}（主催者本人です。自己紹介・呼びかけでは一人称として名前を使い、「${organizerName}です」のように書くこと。自分の名前に「さん」など敬称は絶対に付けないこと。参加者や他の人を指す場合は従来通り敬称を使ってよい）`;
}

/** オンラインツール選択に応じた開催場所ラベル（詳細文・スケジュール等の表示に使う） */
export function venueLabelOf(basics: EventBasics): string {
  if (basics.venueType !== 'online') return basics.venueDetail;
  if (!basics.onlineTool) return 'オンライン';
  const toolName = basics.onlineTool === 'other' ? basics.onlineToolOther : basics.onlineTool;
  return toolName ? `オンライン（${toolName}）` : 'オンライン';
}

// ============================================================
// 1. generatePlanIdeas — 企画案（王道系/テーマ系 各10件・並列生成。テーマ指定時は5件のみ）
//    各案にペルソナ＋軽いMVV（目的・大切にしたいこと）を内包
// ============================================================
const IDEA_CATEGORIES: { id: IdeaCategory; label: string; direction: string }[] = [
  {
    id: 'classic',
    label: '王道系',
    direction:
      'リベシティで普段からよく開かれている定番のオフ会。参加者がイメージしやすく人が集まりやすい会（例: 雑談会、交流会、勉強会、もくもく作業会、ランチ会、飲み会、カフェ会、朝活、読書会、散歩会）',
  },
  {
    id: 'niche',
    label: 'テーマ系',
    direction:
      '主催者の趣味・専門・経験を活かした特定テーマの会。刺さる人には強く刺さる会（例: 特定テーマの勉強会・体験会、マニアックな趣味の会、特定の悩みを語る会）',
  },
];

const IDEAS_PER_CATEGORY = 10;
const THEME_IDEAS_COUNT = 5;

/** venuePreference に応じた開催形態の前提をプロンプトに追加するための文言 */
function venuePreferenceDirective(profile: OrganizerProfile): string {
  if (profile.venuePreference === 'online') {
    return '- 開催形態: オンライン開催が前提です。venueHintは必ず「オンライン」とだけ書いてください。Zoom・oVice等の具体的なツール名は絶対に書かないでください。';
  }
  return '- 開催形態: 対面（オフライン）開催が前提です。venueHintは対面の具体的な場所（例: 駅近カフェ、居酒屋、公園）にしてください。';
}

async function generateIdeasForCategory(
  apiKey: string,
  profile: OrganizerProfile,
  category: { id: IdeaCategory; label: string; direction: string }
): Promise<PlanIdea[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、「${category.label}」のオフ会企画案を${IDEAS_PER_CATEGORY}件提案してください。

## ${category.label}とは
${category.direction}

## 主催者プロフィール
- 自己紹介: ${profile.selfIntro}
- 興味・好きなこと: ${profile.interests}
- 開催したいエリア: ${profile.desiredArea || '未記入'}
${venuePreferenceDirective(profile)}
- 初主催への不安: ${profile.hostingConcern || '特になし'}

## 各フィールドの意味
- title: 企画名（30文字以内。参加者が内容をイメージできる具体的な名前）
- summary: どんな会か（80文字以内）
- persona: 来てほしい人の具体像・ペルソナ（50文字以内）
- purpose: この会の目的をひとことで（40文字以内。会の「軽いミッション」にあたるもの）
- cherish: 会で大切にしたいこと2〜3個（各15文字以内。例:「全員が話せる」「否定しない」）
- venueHint: 向いている開催形態（30文字以内）
- recommendedCapacity: 目安の定員（主催者含む人数。初主催なら4〜8人を中心に）
- firstTimerFriendlyPoint: 初主催でもやりやすい理由（60文字以内）

## 注意事項
- 初主催者が「これならできそう」と思える、運営が簡単な企画を優先すること
- 会場手配・機材・事前準備のハードルが高い企画は避けること
- ${IDEAS_PER_CATEGORY}件はテーマ・時間帯にバリエーションを持たせること
- 主催者の興味・得意を反映しつつ、王道系では誰でも参加しやすい定番の形を大事にすること
- personaとpurposeは企画ごとに具体的に変えること（汎用文の使い回しをしない）

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  {
    "title": "...",
    "summary": "...",
    "persona": "...",
    "purpose": "...",
    "cherish": ["...", "..."],
    "venueHint": "...",
    "recommendedCapacity": 6,
    "firstTimerFriendlyPoint": "..."
  }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.ideas || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('企画案の生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      id: crypto.randomUUID(),
      category: category.id,
      title: String(i.title || ''),
      summary: String(i.summary || ''),
      persona: String(i.persona || ''),
      purpose: String(i.purpose || ''),
      cherish: Array.isArray(i.cherish) ? i.cherish.map(String).slice(0, 3) : [],
      venueHint: String(i.venueHint || ''),
      recommendedCapacity: Number(i.recommendedCapacity) || 6,
      firstTimerFriendlyPoint: String(i.firstTimerFriendlyPoint || ''),
    }));
}

/** 主催者が既にテーマを決めている場合: そのテーマに沿った企画案を5件だけ生成 */
async function generateThemedIdeas(apiKey: string, profile: OrganizerProfile): Promise<PlanIdea[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
主催者は既にテーマを決めています: ${profile.plannedTheme}。
このテーマを具体化した企画案を${THEME_IDEAS_COUNT}件提案してください。

## 主催者プロフィール
- 自己紹介: ${profile.selfIntro}
- 興味・好きなこと: ${profile.interests}
- 開催したいエリア: ${profile.desiredArea || '未記入'}
${venuePreferenceDirective(profile)}
- 初主催への不安: ${profile.hostingConcern || '特になし'}

## 各フィールドの意味
- title: 企画名（30文字以内。参加者が内容をイメージできる具体的な名前）
- summary: どんな会か（80文字以内）
- persona: 来てほしい人の具体像・ペルソナ（50文字以内）
- purpose: この会の目的をひとことで（40文字以内。会の「軽いミッション」にあたるもの）
- cherish: 会で大切にしたいこと2〜3個（各15文字以内。例:「全員が話せる」「否定しない」）
- venueHint: 向いている開催形態（30文字以内）
- recommendedCapacity: 目安の定員（主催者含む人数。初主催なら4〜8人を中心に）
- firstTimerFriendlyPoint: 初主催でもやりやすい理由（60文字以内）

## 注意事項
- 主催者が決めたテーマ「${profile.plannedTheme}」に必ず沿うこと（テーマを外れた提案はしない）
- 主催者が入力したテーマ「${profile.plannedTheme}」を勝手に別テーマへ拡大解釈せず、その内容に忠実に具体化すること。テーマ名の言い換え・置き換えは最小限にすること
- ${THEME_IDEAS_COUNT}件は切り口・時間帯・進め方にバリエーションを持たせること
- 初主催者が「これならできそう」と思える、運営が簡単な企画を優先すること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  {
    "title": "...",
    "summary": "...",
    "persona": "...",
    "purpose": "...",
    "cherish": ["...", "..."],
    "venueHint": "...",
    "recommendedCapacity": 6,
    "firstTimerFriendlyPoint": "..."
  }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.ideas || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('企画案の生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      id: crypto.randomUUID(),
      category: 'niche' as IdeaCategory,
      title: String(i.title || ''),
      summary: String(i.summary || ''),
      persona: String(i.persona || ''),
      purpose: String(i.purpose || ''),
      cherish: Array.isArray(i.cherish) ? i.cherish.map(String).slice(0, 3) : [],
      venueHint: String(i.venueHint || ''),
      recommendedCapacity: Number(i.recommendedCapacity) || 6,
      firstTimerFriendlyPoint: String(i.firstTimerFriendlyPoint || ''),
    }));
}

export async function generatePlanIdeas(
  apiKey: string,
  profile: OrganizerProfile
): Promise<PlanIdea[]> {
  // 主催者が既にテーマを決めている場合は、そのテーマに沿った案を5件だけ生成
  if (profile.plannedTheme && profile.plannedTheme.trim()) {
    return generateThemedIdeas(apiKey, profile);
  }
  // 空の場合は従来どおり王道系・テーマ系を並列生成（片方が失敗しても全滅させない）
  const results = await Promise.allSettled(
    IDEA_CATEGORIES.map((c) => generateIdeasForCategory(apiKey, profile, c))
  );
  const ideas = results
    .filter((r): r is PromiseFulfilledResult<PlanIdea[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
  if (ideas.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw firstError?.reason instanceof Error
      ? firstError.reason
      : new Error('企画案の生成に失敗しました。再度お試しください。');
  }
  return ideas;
}

// ============================================================
// 2. generateTitleCandidates — タイトル候補（5件）
// ============================================================
export async function generateTitleCandidates(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea
): Promise<string[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下のオフ会企画のタイトル候補を5件提案してください。

## 企画内容
- 企画名（仮）: ${idea.title}
- 概要: ${idea.summary}
${conceptLines(concept)}

## タイトルの条件
- 30文字以内
- 何をする会か・誰向けかが一目でわかること
- 初参加でも気軽に申し込めそうな親しみやすい表現
- 絵文字は多くても1つまで
- 5件はそれぞれ違う切り口にすること（内容説明型 / 呼びかけ型 / 数字入り / ターゲット明示型 / キャッチー型 など）

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "titles": ["...", "...", "...", "...", "..."] }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const titles: any[] = Array.isArray(parsed) ? parsed : parsed?.titles || [];
  if (!Array.isArray(titles) || titles.length === 0) {
    throw new Error('タイトル候補の生成結果を読み取れませんでした。再度お試しください。');
  }
  return titles.map(String).filter(Boolean).slice(0, 5);
}

// ============================================================
// 3. suggestCapacity — 定員の推奨
// ============================================================
export async function suggestCapacity(
  apiKey: string,
  idea: PlanIdea,
  venueTypeOrBasics: VenueType | EventBasics,
  venueDetail?: string,
  durationMinutes?: number
): Promise<CapacitySuggestion> {
  let finalVenueType: VenueType;
  let finalVenueDetail: string;
  let finalDurationMinutes: number;

  if (typeof venueTypeOrBasics === 'object' && venueTypeOrBasics !== null) {
    finalVenueType = venueTypeOrBasics.venueType;
    finalVenueDetail = venueTypeOrBasics.venueDetail;
    finalDurationMinutes = venueTypeOrBasics.durationMinutes;
  } else {
    finalVenueType = venueTypeOrBasics as VenueType;
    finalVenueDetail = venueDetail || '';
    finalDurationMinutes = durationMinutes || 120;
  }

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、以下の条件に合った定員（主催者を含む人数）を提案してください。

## 条件
- 企画: ${idea.title}（${idea.summary}）
- 開催形態: ${finalVenueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${finalVenueDetail || '未定'}
- 開催時間: ${finalDurationMinutes}分

## 考慮すること
- 初主催者が全員に目を配れる人数であること（多すぎは禁物）
- 時間内に全員が自己紹介や会話に参加できること
- 1〜2人欠席しても会が成立する人数であること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。reasonは80文字以内。

\`\`\`json
{ "recommended": 6, "min": 4, "max": 8, "reason": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const recommended = Number(parsed?.recommended);
  if (!recommended) {
    throw new Error('定員の提案結果を読み取れませんでした。再度お試しください。');
  }
  return {
    recommended,
    min: Number(parsed?.min) || Math.max(2, recommended - 2),
    max: Number(parsed?.max) || recommended + 2,
    reason: String(parsed?.reason || ''),
  };
}

// ============================================================
// 4. generateSchedule — 進行イメージ（タイムスケジュール）生成
// ============================================================
export async function generateSchedule(
  apiKey: string,
  basics: EventBasics,
  concept: IdeaConcept,
  idea: PlanIdea
): Promise<Omit<ScheduleItem, 'id'>[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、当日の進行イメージ（タイムスケジュール）を作ってください。

## オフ会の情報
- タイトル: ${basics.title}
- 企画: ${idea.title}（${idea.summary}）
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${venueLabelOf(basics)}
- 開催時間: ${basics.durationMinutes}分
- 定員: ${basics.capacity}人（主催者含む）
${conceptLines(concept)}

## 進行イメージの条件
- 各項目は {title, description, durationMinutes} で構成
- **durationMinutesの合計が必ず${basics.durationMinutes}分ちょうどになること**
- 冒頭にオープニング（挨拶・趣旨説明）、終盤にクロージング（まとめ・次回予告・解散）を入れること
- 定員${basics.capacity}人が全員話せるよう、自己紹介の時間は1人あたり1〜2分で計算すること
- descriptionには主催者向けの進行のコツを書くこと（50文字以内。例: 「主催者から先に話すと場が和みます」）
- 項目数は5〜8個程度
- 初主催者が迷わない、シンプルで無理のない進行にすること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  { "title": "オープニング", "description": "...", "durationMinutes": 10 }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.schedule || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('進行イメージの生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      title: String(i.title),
      description: String(i.description || ''),
      durationMinutes: Math.max(1, Number(i.durationMinutes) || 10),
    }));
}

/** 進行イメージ（schedule）の項目文字列化（reviseSchedule用） */
function scheduleLinesForRevise(basics: EventBasics, schedule: ScheduleItem[]): string {
  if (schedule.length === 0) return '（項目なし）';
  return schedule
    .map((s, i) => `${i + 1}. ${s.title}（${s.durationMinutes}分）${s.description ? ` - ${s.description}` : ''}`)
    .join('\n');
}

/**
 * 進行イメージの作り直し（「AIに作り直してほしい点」指定時）。
 * ゼロから作り直すのではなく、現在の schedule（ユーザーが削除・並べ替えた構成）をベースに、
 * 蓄積された feedbackHistory を反映して調整する。
 */
export async function reviseSchedule(
  apiKey: string,
  basics: EventBasics,
  concept: IdeaConcept,
  idea: PlanIdea,
  currentSchedule: ScheduleItem[],
  feedbackHistory: string[]
): Promise<Omit<ScheduleItem, 'id'>[]> {
  const historyText =
    feedbackHistory.length > 0
      ? feedbackHistory.map((f, i) => `${i + 1}. ${f}`).join('\n')
      : '（なし）';

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下は主催者がすでに編集済みの「現在の進行イメージ（タイムスケジュール）」です。
ゼロから作り直すのではなく、この現在の構成をベースに、主催者からの要望を反映して調整してください。

## オフ会の情報
- タイトル: ${basics.title}
- 企画: ${idea.title}（${idea.summary}）
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${venueLabelOf(basics)}
- 開催時間: ${basics.durationMinutes}分
- 定員: ${basics.capacity}人（主催者含む）
${conceptLines(concept)}

## 現在の進行イメージ（この構成・順序をベースにすること）
${scheduleLinesForRevise(basics, currentSchedule)}

## 主催者からの要望（これまでに伝えた分をすべて含む。すべて反映すること）
${historyText}

## 調整方針（重要）
- 主催者が既に削除した項目を勝手に復活させないこと。主催者が並べ替えた順序はできるだけ尊重すること
- ゼロから新しい進行を作るのではなく、現在の構成に要望を反映する形で調整すること（項目の追加・修正・時間配分の見直しは要望に応じて行ってよい）
- **durationMinutesの合計が必ず${basics.durationMinutes}分ちょうどになること**
- 各項目は {title, description, durationMinutes} で構成
- descriptionには主催者向けの進行のコツを書くこと（50文字以内）

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  { "title": "オープニング", "description": "...", "durationMinutes": 10 }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.schedule || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('進行イメージの生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      title: String(i.title),
      description: String(i.description || ''),
      durationMinutes: Math.max(1, Number(i.durationMinutes) || 10),
    }));
}

// ============================================================
// 5. generateAnnouncement — 告知文生成（本文＋タグ）
// ============================================================
const GUIDELINE_LINE_1 = '▶ オフ会ガイドラインはこちら';
const GUIDELINE_LINE_2 = 'https://site.libecity.com/meetup-guidelines';

/** 生成結果の末尾にガイドライン行が無ければ補完する（プロンプト指示への保険） */
function ensureGuidelineFooter(body: string): string {
  if (body.includes(GUIDELINE_LINE_2)) return body;
  return `${body.trim()}\n\n${GUIDELINE_LINE_1}\n${GUIDELINE_LINE_2}`;
}

export async function generateAnnouncement(
  apiKey: string,
  profile: OrganizerProfile,
  concept: IdeaConcept,
  basics: EventBasics,
  schedule: ScheduleItem[],
  formattedDate: string
): Promise<AnnouncementResult> {
  const venueLabel = venueLabelOf(basics);

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、リベシティのオフ会チャット作成フォームの「詳細（公開情報）」欄に掲載する告知文と、チャット作成フォームに入力するタグを書いてください。

## オフ会の情報
- タイトル: ${basics.title}
- 日時: ${formattedDate} ${basics.startTime}〜（${basics.durationMinutes}分）
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${venueLabel}
- 定員: ${basics.capacity}人（主催者含む）
${conceptLines(concept)}

## 主催者について
${profile.selfIntro}
${organizerNameDirective(profile.organizerName)}

## 告知文（body）の構成（必ずこのテンプレート構成で出力すること）
以下の見出し（■・▶）と改行構成を必ずそのまま使い、各セクションの中身だけを埋めてください。
「■当日の流れ」セクションは含めないでください（別途システム側で自動挿入します）。

\`\`\`
■イベント・オフ会内容
（会の紹介: 挨拶・自己紹介・どんな会か・こんな人に来てほしい・日時・場所・定員を、このセクション内に読みやすくまとめる。挨拶と自己紹介は1〜2文で初主催であることを正直に親しみやすく、どんな会かは目的・大切にしたいことを自然な文章で、こんな人に来てほしいはペルソナをやわらかい表現で、開催概要は日時・場所・定員を見やすくまとめる。当日の流れ・タイムテーブルはここに書かないこと）

■参加費用（内訳があれば明記してください）
（${basics.venueType === 'offline' ? '対面なら「実費（カフェ代等は各自ご負担）」のような想定を書き、主催者が編集しやすい形にすること' : 'オンラインなら「無料」等、実態に即した内容にすること'}）

■参加方法
参加希望の方は、こちらのチャットに参加申請をお願いします。

■募集期限
（開催日「${formattedDate}」から逆算した妥当な募集期限を提案する。例: ◯月◯日（◯）まで）

■注意事項
（${basics.venueType === 'online'
    ? 'オンライン開催なので、「無断キャンセル厳禁」等の強い表現は使わないこと。「参加が難しくなったら早めにひとことお知らせください」程度のやわらかい表現にすること'
    : '対面開催なので、会場予約や人数の都合があるため、無断キャンセルは控えてほしい旨を含める（キャンセル連絡・遅刻連絡など、初主催でも書きやすい定番の注意事項を1〜3行）'
  }）

▶ オフ会ガイドラインはこちら
https://site.libecity.com/meetup-guidelines
\`\`\`

- 「■参加方法」の本文2行目（「参加希望の方は、こちらのチャットに参加申請をお願いします。」）と、末尾の「▶ オフ会ガイドラインはこちら」「https://site.libecity.com/meetup-guidelines」の2行は、一字一句この通りに出力すること（絶対に変えない）
- 各見出し（■参加費用 等）はそのまま残し、中身だけを埋めること

## 注意事項
- ■イベント・オフ会内容セクションは全体で500〜800文字程度
- 絵文字を適度に使い、堅くなりすぎないこと
- 「初めての方も大歓迎」の空気を作ること
- リベシティの仕様上、Markdown記法（# 見出し、**太字**、* 箇条書き など）は使用できません。絶対にアスタリスク「**」やシャープ「#」などのマークダウン記号は含めず、プレーンテキスト（空白行、改行、全角の「■」「▼」「・」など）を使って見やすく整形して出力してください。

## タグ（tags）
リベシティのオフ会チャット作成フォームに入力する、この会に合ったタグを3〜5個考えてください。
- 例: オフ会 / 交流 / 初心者大歓迎 / 朝活 / もくもく会
- 「#」記号は付けないこと
- この会の内容・雰囲気に合った具体的なタグにすること
- 必ず3個以上5個以内に収めること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。bodyに告知文全体、tagsにタグの配列を入れること。

\`\`\`json
{ "body": "...", "tags": ["...", "...", "...", "...", "..."] }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const body = String(parsed?.body || '');
  if (!body) {
    throw new Error('告知文の生成結果を読み取れませんでした。再度お試しください。');
  }
  const tags: string[] = Array.isArray(parsed?.tags)
    ? parsed.tags.map(String).filter(Boolean).slice(0, 5)
    : [];
  // 「■当日の流れ」はAIに書かせず、コード側で機械挿入する
  const bodyWithTimetable = syncTimetableSection(ensureGuidelineFooter(body), basics, schedule);
  return {
    body: bodyWithTimetable,
    tags,
  };
}

/**
 * 詳細（公開情報）の書き直し（「AIに書き直してほしい点」指定時）。
 * ゼロから再生成するのではなく、現在表示中の詳細文全文をベースに、
 * 蓄積された feedbackHistory（過去分＋今回分すべて）を反映した改訂版を返す。
 * テンプレ構成（■見出し）・固定文・マークダウン禁止は維持し、
 * 「■当日の流れ」はAIに触らせず、呼び出し側で syncTimetableSection により機械同期し直すこと。
 */
export async function reviseAnnouncement(
  apiKey: string,
  profile: OrganizerProfile,
  currentAnnouncement: string,
  feedbackHistory: string[],
  basics: EventBasics,
  schedule: ScheduleItem[]
): Promise<AnnouncementResult> {
  const historyText =
    feedbackHistory.length > 0
      ? feedbackHistory.map((f, i) => `${i + 1}. ${f}`).join('\n')
      : '（なし）';

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下は、リベシティのオフ会チャット作成フォームの「詳細（公開情報）」欄に掲載する、現在の告知文です。
ゼロから書き直すのではなく、この現在の文章全文をベースに、主催者からの要望（これまでに伝えた分をすべて含む）を反映した改訂版を作ってください。

## 現在の詳細文（このテキストをベースに改訂すること）
${currentAnnouncement}

## 主催者からの書き直し要望（これまでに伝えた分をすべて含む。すべて反映すること）
${historyText}

## オフ会の情報（参考。矛盾があれば現在の詳細文より優先しない）
- タイトル: ${basics.title}
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
${organizerNameDirective(profile.organizerName)}

## 改訂方針（重要）
- 現在の詳細文の内容・情報（日時・場所・定員など具体的な事実）を勝手に変えないこと。要望に関係ない部分はできるだけ元の文章を活かすこと
- テンプレート構成（■イベント・オフ会内容 / ■参加費用 / ■参加方法 / ■募集期限 / ■注意事項 / ▶ オフ会ガイドラインはこちら）は必ずそのまま維持すること。見出しを増減・変更しないこと
- 「■当日の流れ」セクションがある場合はそのまま残すか触れないこと（別途システム側で機械的に同期し直します）
- 「■参加方法」の本文2行目（「参加希望の方は、こちらのチャットに参加申請をお願いします。」）と、末尾の「▶ オフ会ガイドラインはこちら」「https://site.libecity.com/meetup-guidelines」の2行は、一字一句そのまま維持すること（絶対に変えない）
- リベシティの仕様上、Markdown記法（# 見出し、**太字**、* 箇条書き など）は使用できません。絶対にアスタリスク「**」やシャープ「#」などのマークダウン記号は含めず、プレーンテキスト（空白行、改行、全角の「■」「▼」「・」など）を使って見やすく整形して出力してください

## タグ（tags）
現在のタグ内容も踏まえつつ、この会に合ったタグを3〜5個考えてください（要望に関係なければ内容を維持してよい）。「#」記号は付けないこと。

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。bodyに告知文全体、tagsにタグの配列を入れること。

\`\`\`json
{ "body": "...", "tags": ["...", "...", "...", "...", "..."] }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const body = String(parsed?.body || '');
  if (!body) {
    throw new Error('詳細（公開情報）の書き直し結果を読み取れませんでした。再度お試しください。');
  }
  const tags: string[] = Array.isArray(parsed?.tags)
    ? parsed.tags.map(String).filter(Boolean).slice(0, 5)
    : [];
  // 「■当日の流れ」はAIに任せず、コード側で機械同期し直す
  const bodyWithTimetable = syncTimetableSection(ensureGuidelineFooter(body), basics, schedule);
  return {
    body: bodyWithTimetable,
    tags,
  };
}

// ============================================================
// 6. generateIconPrompt — 円形オフ会アイコン用プロンプト
//    AIにはキーワードだけを考えさせ、プロンプト文の組み立てはコード側で行う
// ============================================================
/** 円形チャットアイコン用プロンプトの組み立て（シンプル背景＋大きな文字が主役） */
export function buildIconPrompt(word: string): string {
  return `あなたはプロのデザイナーです。オフ会のSNS用チャットアイコンをデザインしてください。
・完全な円形のアイコン
・背景はシンプル（無地〜ゆるやかなグラデーション。細かい描写・イラストは入れない）
・中央に「${word}」という文字を大きく・はっきり・読みやすく配置（文字がアイコンの主役）
・小さく表示されても一目で読める視認性とコントラスト
・装飾は最小限。ごちゃつかせない`;
}

export async function generateIconPrompt(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea,
  basics: EventBasics
): Promise<IconPromptResult> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
オフ会の「円形アイコン」の中央に大きく載せる、そのオフ会を最も表す短いワードを1つだけ選んでください。

## オフ会の情報
- タイトル: ${basics.title}
- 内容: ${idea.summary}
- 雰囲気: ${concept.cherish.join('、')}

## ワードの条件
- そのオフ会を最も的確に表す“名詞”のキーワードを1語だけ選ぶこと
- 動詞・活用形（例:「形に」「集まろう」）、文の断片、助詞付き表現は絶対に禁止。必ず名詞（体言）で終えること
- 短く（1〜6文字目安）、パッと見て何の会か伝わる語にすること
- 良い例（名詞）: 朝活／もくもく／ボドゲ／副業／読書／交流／雑談／飲み会
- 悪い例（動詞・断片。禁止）: 形に／語ろう／集まる／のために

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "word": "...", "styleNote": "主催者向けの補足（生成のコツ、40文字以内）" }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const word = String(parsed?.word || '').trim();
  if (!word) {
    throw new Error('アイコン用ワードの生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    word,
    prompt: buildIconPrompt(word),
    styleNote: String(parsed?.styleNote || ''),
  };
}

// ============================================================
// 7. generateThumbnailAssets — 告知サムネイル用プロンプト＋文言
// ============================================================
export async function generateThumbnailAssets(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea,
  basics: EventBasics,
  formattedDate: string
): Promise<ThumbnailAssets> {
  const venueLabel = venueLabelOf(basics);
  // 日付計算はAIに任せず、コード側で確定した文字列をそのまま画像に焼き込ませる
  const dateTimeText = `${formattedDate} ${basics.startTime}〜`;
  const placeText = venueLabel;

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
オフ会の「告知サムネイル画像」を画像生成AI（ChatGPT/Gemini等）で作るためのプロンプトを作ってください。
この画像には、キャッチーなタイトル・日時・場所の文字を実際に描き込みます（あとからの文字入れは行いません）。

## オフ会の情報
- タイトル: ${basics.title}
- 内容: ${idea.summary}
- 雰囲気: ${concept.cherish.join('、')}

## 画像に描き込む文字（この文言・表記のまま使うこと）
- 日時: 「${dateTimeText}」
- 場所: 「${placeText}」
※ キャッチーなタイトルはあなたが考え、そのままimagePrompt内で使うこと

## imagePromptの必須条件（プロンプト文に必ず含めること）
- プロンプトは必ず「あなたはプロのデザイナーです。」という一文で書き始めること
- 横長（16:9）の告知バナー構図
- 会の内容が伝わる構図（画風は指定しない。人物が楽しそうに集まる様子など、内容が伝わるモチーフを指示する）
- あなたが考えたキャッチーなタイトル（20文字以内）を、画像内で最も大きく目立つように配置すること
- 日時「${dateTimeText}」と場所「${placeText}」を、タイトルより小さく読みやすいサイズで画像内に配置すること
- 文字は背景との十分なコントラストを確保し、はっきり読めるようにすること
- 明るく参加したくなる配色
- 「参考画像（オフ会のチャットアイコンなど）が添付されている場合は、その画像のキャラクターやモチーフを、雰囲気を損なわないよう自然にサムネイル内へ配置・反映すること。」という一文を必ず含めること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。imagePromptに完成したプロンプト全文を入れること。

\`\`\`json
{ "imagePrompt": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  if (!parsed?.imagePrompt) {
    throw new Error('サムネイル素材の生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    imagePrompt: ensureDesignerPrefix(String(parsed.imagePrompt)),
  };
}

// ============================================================
// 8. generateShareTexts — 展開用の文体違い2種
// ============================================================
export async function generateShareTexts(
  apiKey: string,
  announcement: string,
  basics: EventBasics,
  region: string,
  formattedDate: string,
  organizerName?: string
): Promise<ShareTexts> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下のオフ会告知文をもとに、2つの場所に投稿する文章を作ってください。

## 元の告知文
${announcement}

## オフ会の基本情報
- タイトル: ${basics.title}
- 日時: ${formattedDate} ${basics.startTime}〜
- 主催者の地域: ${region || '未記入'}
${organizerNameDirective(organizerName || '')}

## 作る文章
1. regionalChat: 地域支部チャット（例: 関東チャット）向け
   - 「${region || '地域'}の皆さん」への呼びかけで始める
   - 丁寧め・300〜400文字程度
   - 日時・場所・定員を含める
   - 最後に「詳細・お申し込みはイベント案内をご覧ください」で締める
2. tweet: リベシティの「つぶやき」向け
   - カジュアル・文字数制限は撤廃。オフ会の魅力・日時・場所・参加方法などを詳しく書いてよい（ただし冗長になりすぎない範囲で）
   - 絵文字を使って気軽な雰囲気に
   - 初主催であることを添えて応援したくなる文面に

## 注意
- 主催者本人の名前には「さん」など敬称を付けないこと（一人称）。参加者や他の人には従来通り敬称OK

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "regionalChat": "...", "tweet": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  if (!parsed?.regionalChat && !parsed?.tweet) {
    throw new Error('展開用文章の生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    regionalChat: String(parsed.regionalChat || ''),
    tweet: String(parsed.tweet || ''),
  };
}
