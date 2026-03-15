
import { GoogleGenAI, Type } from "@google/genai";
import { UserInput, SkillIdea, SurveyPattern, ThumbnailPromptVersion } from "../types";

const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const getThumbnailPrompt = (
  idea: SkillIdea,
  useHighQuality: boolean = false,
  promptVersion: ThumbnailPromptVersion = 'standard'
): string => {
  let catchphrase = "";
  let title = idea.title; // Default to the idea title

  // Check if content is provided in the idea or externally
  const content = idea.generatedContent || "";

  // Extract Catchphrase
  const catchMatch = content.match(/キャッチコピー[：:]\s*(.*)/);
  if (catchMatch) {
    catchphrase = catchMatch[1].trim();
  }

  // Extract Title from content if available (to match the UI)
  const titleMatch = content.match(/タイトル[：:]\s*(.*)/);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  if (!useHighQuality) {
    return `スキルマーケット出品ページ用のサムネイル画像を生成してください。
■ コンテキスト：「${title}」、${idea.strength}
■ 要件：画像内にテキストは一切含めないこと。純粋なビジュアル表現のみ。プロフェッショナルで魅力的なデザイン。`;
  }

  // ── 共通パート（全バージョン共通） ──
  const commonBase = `あなたはプロのデザイナーです。以下の要件のサービスのスキルマーケット出品ページ用のサムネイル画像を生成してください。

■ 共通要件：
・タイトル：「${title}」を維持したまま、サービス名に変換して使用すること。文末を体言止めにする程度の微修正は許容する。
・キャッチコピー：「${catchphrase}」からキーワードを抽出して使用すること（全文をそのまま使わない）。
・アスペクト比：3:2（横長）
・タイトルは大きく太く、読みやすく表示すること。
・テキストは視覚的に美しく、画像を圧迫しないように配置すること。
・アイコン画像が添付されている場合、そのアイコンを自然とサムネイルに反映させる。
`;


  // ── バージョン別パート（統一セクション構成） ──
  const versionStyles: Record<ThumbnailPromptVersion, string> = {
    standard: `
■ デザインスタイル：
・プロフェッショナルで信頼感のあるビジネスデザイン。
・高精細で洗練された印象。

■ レイアウト構成：
・タイトルを中央または上部に大きく配置し、キャッチコピーをその下に配置する。
・余白を適度に取り、すっきりとした構成にする。
・背景はサービスの雰囲気に合うビジネス系のイメージ。

■ タイポグラフィ（文字デザイン）：
・信頼感のある太めのゴシック体。
・背景とのコントラストを確保し、視認性を高める。

■ 装飾：
・最小限の装飾で、洗練された印象を保つ。
・ビジネス感のあるシンプルな幾何学的要素を控えめに使用。

■ デザインの雰囲気：
・洗練されたプロフェッショナル感。
・信頼性と実績を感じさせる。
・高品質で上質な印象。

`,

    simple: `
■ デザインスタイル：
・清潔感があり、信頼できて、やさしく丁寧な印象のシンプルデザイン。

■ レイアウト構成：
・全体は横長の長方形バナー。四辺に細いフレーム枠あり。
・背景はサービスの雰囲気にあうイメージ。
・余白を適度に取り、すっきりとした構成にする。
・最上部に横長の「ゆるいアーチ型バナー」を配置し、サービスのジャンル名やカテゴリ名が入る想定。色は薄いアクセントカラー。
・アーチの下に大きな横長の楕円エリア（メインコピーエリア）を配置。ここが最も目立つゾーンで、サービスのタイトルが入る想定。
・画面左下に大きな円形エリアを配置。出品者の顔写真、または親しみやすい人物イラストが入る想定。
・右側には横長の楕円を上下に2つ配置。上の楕円はサブコピー用で安心材料の短文が入る想定。下の楕円は信頼性を示す情報。
・一番下に細い横長ライン（フッターのような装飾帯）。全体のデザインを引き締める役割。情報はほぼ入れず、視覚的な安定感を出す。

■ タイポグラフィ（文字デザイン）：
・メインコピーは太めで読みやすく、信頼感のあるフォント。
・サブテキストは短く落ち着いたフォントで控えめに。

■ 装飾：
・アイコンや図形は丸みのあるデザイン。
・配色はベース＋アクセント1色まで。

■ デザインの雰囲気：
・ごちゃごちゃしない。
・余白多め。
・やさしいビジネスデザイン。
・信頼感、誠実さ、安心感が伝わる。`,

    watercolor: `
■ デザインスタイル：
・手書き感のある、柔らかで優しいタッチ（水彩画風、色鉛筆風）。輪郭線は強すぎず、自然な印象。
・親しみやすさ、安心感、信頼性を感じさせる、穏やかで落ち着いたムード。
・サービスの内容に合ったモチーフや情景をイラストで表現する。

■ レイアウト構成：
・画面の片側（例：左側）にテキストエリアを設け、もう片側（例：右側）にメインとなるイラストを配置する、情報と視覚要素が分離した構成。
・主要なキャッチコピーを最も目立つ位置（例：左上）に配置し、補足情報（箇条書きなど）をその下に整理して配置する。

■ タイポグラフィ（文字デザイン）：
・親しみやすく、可読性の高い書体。
・背景のイラストに埋もれないよう、文字に縁取りやドロップシャドウなどの処理を施し、視認性を高める。

■ 装飾：
・デザインのテーマに沿った、小さく控えめな装飾イラストを複数配置し、画面に温かみや動きを加える。
・配色は水彩絵の具のにじみを活かした柔らかいトーンで統一する。

■ デザインの雰囲気：
・手描きの温かみと柔らかさ。
・親しみやすく、リラックスした印象。
・自然体で気負わない安心感。`,

    pop: `
■ トンマナ（世界観・雰囲気）：
・ポップ＆フレンドリー: 鮮やかな多色使いと丸みのある造形で、「楽しそう」と感じさせる、心理的ハードルの低い雰囲気。
・賑やかさと期待感: 多くの要素（文字、装飾、商品写真）を詰め込むことで、サービスの選択肢の豊富さとワクワク感を演出する。
・手書き風の矢印やキラキラした装飾で親近感を生む。

■ デザインスタイル：
・配色（カラーパレット）はレインボー・パステル: 原色に近い鮮やかさを持ちつつ、少し白を混ぜたような「元気で明るい」多色配色。
・高コントラストな縁取り: 背景色に文字が埋もれないよう、強い白縁やドロップシャドウを多用し、視認性を確保する。
・ハーフトーン（ドット）: 背景のグラデーションにドットパターンを重ねることで、漫画やアメコミのような「ポップアート」の質感を与える。
・マンガ的記号（漫符）: 矢印、キラキラ、吹き出しのラインなど、動きを感じさせる装飾が視線を誘導する。

■ レイアウト構成：
・左：文字情報 / 右：視覚情報の典型的な「F型」または「Z型」の視線誘導。
  1. 左上の大きなタイトルでキャッチ。
  2. 左側のリストでサービス内容を理解。
  3. 右側の実物写真（モックアップ）で完成イメージを補完。
・重なりの演出（レイヤー感）: 商品写真をあえて重ねて配置することで、立体感と「たくさんある」というボリューム感を表現する。背景の斜めのラインで動的なリズムを生む。

■ タイポグラフィ（文字デザイン）：
・極太の角丸ゴシック: メインコピーは、力強さと柔らかさを兼ね備えたフォント。
・情報の階層化: 商品名は、視認性の高い白背景のボックスに入れることで、メニューとしての役割を明確にする。

■ 装飾：
・手書き風の矢印やキラキラした装飾で、手作り感と親近感を演出。
・吹き出し、星形、ハートなどのポップな記号を随所に配置。
・背景にドットパターンやグラデーションを重ね、奥行きとポップアート感を出す。

■ デザインの雰囲気：
・楽しくてワクワクする、お祭り感。
・初心者歓迎の明るくフレンドリーな印象。
・多色使いによる賑やかで豊かなイメージ。`,
  };

  return commonBase + versionStyles[promptVersion];
};

const getApiKey = (): string => {
  try {
    // 環境変数から取得（開発環境向け）
    const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (envKey) return envKey;

    // Google AI Studio 環境（ブラウザ）では、@google/genai が自動的にセッションキーを使用
    // この関数が呼ばれるということはセッションが有効な状態なので空文字列を返す
    // GoogleGenAI 初期化時にキーが不可欠な場合は、上位で処理される
    return "";
  } catch {
    return "";
  }
};

export const generateIdeas = async (input: UserInput): Promise<SkillIdea[]> => {
  const apiKey = getApiKey();
  // Google AI Studio ではセッションから自動的にキーが利用可能
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

  const prompt = `
あなたはプロのスキルマーケット・コンサルタントです。
入力されたテキストから「好きなこと」「得意なこと」「経験」の情報を読み取り、それらを掛け合わせてスキルマーケット（ココナラなど）の出品アイデアを提案してください。

【入力された生データ】
${input.rawText}

【タスク】
以下の2つのカテゴリで、それぞれ10個ずつ、合計20個のアイデアを出力してください。

1. **standard（王道・スタンダード）**: 市場で需要が安定しており、初心者でも参入しやすい手堅いアイデア。
2. **niche（ニッチ・ユニーク）**: 「えっ、そんなこと？」と思うような隙間産業や、ユーザーの個性が強烈に活きる差別化されたアイデア。

【出力形式】
JSON配列で出力してください。各要素は以下のキーを持つオブジェクトにしてください。
- "title": 出品サービスのタイトル
- "strength": このサービスで活かせる、ユーザーの潜在的な強みや独自性（具体的に）
- "solution": 誰のどんな悩みを解決するか
- "type": 文字列として "standard" または "niche" を指定

【ガイドライン】
- 最初に、入力データから「好きなこと」「得意なこと」「経験」をAIとして整理・解釈してください。
- 各アイデアは具体的で、すぐにでも出品できそうな具体的な内容にしてください。
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            strength: { type: Type.STRING },
            solution: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["standard", "niche"] }
          },
          required: ["title", "strength", "solution", "type"]
        }
      }
    }
  });

  const rawIdeas = JSON.parse(response.text || "[]");
  
  return rawIdeas.map((idea: any) => ({
    ...idea,
    id: generateUniqueId()
  }));
};

export const generateServicePage = async (selectedIdea: SkillIdea): Promise<string> => {
  const apiKey = getApiKey();
  // Google AI Studio ではセッションから自動的にキーが利用可能
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

  const prompt = `
【役割】
あなたは、リベシティ「スキルマーケットonline」に出品するプロの出品ページクリエイターです。
以下の「カテゴリマスター」と「カテゴリ自動決定ルール」を厳守し、出品ページとしてそのまま使える魅力的な文章を作成してください。

【カテゴリマスター】
イラスト・マンガ（SNSアイコン／イラスト／マンガ／その他）
デザイン（ロゴ／チラシ・フライヤー・パンフレット／メニュー・POP／名刺・カード／書籍・カバー／結婚式・イベント／建築・インテリア・図面／プロダクト・3Dモデリング／その他）
Web制作・Webデザイン（HP・LP／ブログ／EC／HTML・CSSコーディング／Webサイトデザイン／モバイルアプリデザイン／UI・UX／素材／図解／ヘッダー・バナー／サムネイル／サービス画像・商品画像／Web制作のディレクション／その他）
IT・プログラミング（作業自動化・効率化／Webアプリ／モバイルアプリ／Mac・Windowsアプリ／サーバー・インフラ／ゲーム／システムアーキテクチャ／AI・機械学習／バグチェック・テストプレイ／保守・運用・管理／システム開発のディレクション／その他）
写真・撮影（撮影・素材提供／編集・加工／その他）
動画（撮影・素材提供／編集／サムネイル／アニメーション／データ変換・ディスク化／結婚式・イベント／PR・プロモーション／SNS／その他）
音楽・音響・ナレーション（作曲・編曲／楽譜・譜面／歌唱・楽器演奏／ナレーション／キャラクターボイス／ミックス・マスタリング／編集・加工／その他）
マーケティング（SEO対策／MEO対策／リスティング広告／ディスプレイ広告／メールマーケティング／SNSマーケティング／Webサイト分析／その他）
ハンドメイド（ワークショップ／オーダーメイド／その他）
ライティング（コピーライティング／記事作成／文章校正・編集・リライト／取材・インタビュー／シナリオ・脚本・台本／その他）
翻訳（翻訳／その他）
せどり・物販（オーダーメイドツール／各種代行／その他）
コンサル・ビジネス代行（会計・経理・財務・税務／行政法務／オンライン秘書／営業・集集／資料・企画書／起業・事業・経営／補助金・助成金／DX／データ分析・整理・集計／人事・労務／スカウト・ヘッドハント／文字起こし・データ入力／イベント企画・運営／不動産／YouTube・音声配信／SNS／ブログ・アフィリエイト／コンテンツ販売／EC／せどり・物販／家計見直し／通信費見直し／その他）
コーチング（自己理解・強みを活かす／キャリア・転職相談／人生お悩み相談／恋愛・結婚の相談／子育て・教育・進路相談／資格取得の相談／オンライン家庭教師／話術・コミュニケーション／その他）
スキルアップ支援（イラスト・マンガ／デザイン／写真・撮影／動画／音楽・音響・ナレーション／ITスキル／Web制作・Webデザイン／プログラミング／マーケティング／ハンドメイド／ライティング／その他）
ライフスタイル（ヨガ・ピラティス／フィットネス／ダイエット／ダンス／ファッション／美容／話し相手／DIY／整理収納・インテリア／グルメ・料理・献立／旅行・お出かけ／ペット／その他）
占い（恋愛・結婚／自己分析・資質・適性／仕事／対人関係／人生総合／その他）

【カテゴリ自動決定ルール】
・テーマ文から主要キーワードを抽出
・もっとも関連性が高いカテゴリとサブカテゴリを採用
・複数候補が一致した場合は一覧の上位カテゴリを優先

【入力情報】
テーマ：${selectedIdea.title}
活かせる強み：${selectedIdea.strength}
解決する悩み：${selectedIdea.solution}

【出力形式】
カテゴリ：
サブカテゴリ：
タイトル：
キャッチコピー：
サービス詳細（以下の構成と順序）
　💭こんなお悩みありませんか？
　✅このサービスでできること
　🌟信頼と実績
　📦ご依頼の流れ
　💬こんな方におすすめ！
　💰価格の目安
　🔚さいごに
　⚠️キャンセル時の注意事項
　🎯出品者スキル
　📝依頼テンプレート

【出力条件】
・絵文字を適度に使用し、初心者にもわかりやすい親しみやすいトーンで構成
・タイトルは30文字以内
・キャッチコピーは100文字以内
・価格はカテゴリの一般相場を自動反映
・「さいごに」の後に必ず「キャンセル時の注意事項」を配置すること
・「出品者スキル」はサービス提供にあたって、ユーザーが入力した好き・得意・経験をもとにアピールできるスキルを箇条書きで3〜5個記載すること
・マークダウンの書式（# や ** など）は一切使わないこと

`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {}
  });

  let text = response.text || "";
  
  // Clean up any stray markdown formatting just in case
  text = text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/`/g, "")
    .replace(/^\s*-\s/gm, "・");

  return text;
};

export const generateThumbnail = async (idea: SkillIdea, useHighQuality: boolean = false): Promise<string> => {
  const apiKey = getApiKey();
  // Google AI Studio ではセッションから自動的にキーが利用可能
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  const prompt = getThumbnailPrompt(idea, useHighQuality);

  const model = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const config: any = {
    imageConfig: {
      aspectRatio: "3:2"
    }
  };

  if (useHighQuality) {
    config.imageConfig.imageSize = "2K";
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: config
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};

// --- Promoter Tool Functions ---

export const generatePromotion = async (serviceBody: string, serviceUrl: string): Promise<string[]> => {
  const apiKey = getApiKey();
  // Google AI Studio では、セッションから自動的にキーが利用可能
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  const prompt = `
あなたは「リベシティのつぶやき投稿」を作るプロのコピーライターです。
以下の【出品サービスページ本文】を読み取り、リベシティの雰囲気に合う
「前向き・丁寧・押しつけない」文章で、つぶやき投稿を20本作成してください。

【出品サービスページ本文】
${serviceBody}

【差し込み情報】
- 出品サービスURL：${serviceUrl}

【必須フォーマット（1投稿＝4行）】
各投稿は必ず次の4行で構成してください（行数を増やさない）：
1) 悩み（1〜2文：サービス内容に関連するよくある困りごと）
2) 軽い共感（1文：押しつけず、やさしく寄り添う）
3) 解決方法（1〜2文：出品サービスの特徴・価値を自然に提示）
4) URL（注釈として1行）
   例：「※必要な方へ：${serviceUrl}」「※リンクを置いてます：${serviceUrl}」
   ※「詳細はこちら」は使用禁止

【レビュー起点の投稿ルール】
- 20本のうち「ちょうど3本」は、必ず次の書き出しで開始してください：
  「〇〇な嬉しいレビューをいただきました。🙏」
- 〇〇には、【出品サービスページ本文】に実際に記載されているレビュー内容を要約して入れてください。
  ※本文にないレビューの捏造は禁止。
- レビュー起点の3本は、上記4行フォーマットのまま作成してください。
  （1行目＝レビュー要約、2行目＝感謝/共感、3行目＝特徴、4行目＝URL）
- レビュー起点の3本は配列内で分散させ、連続しないようにしてください。
- もし本文にレビューが存在しない/読み取れない場合は、レビュー起点投稿は作らず、通常型の投稿を3本増やしてください。

【絵文字ルール（厳守）】
- 絵文字は「文末」にのみ使用し、必ず句点の代わりにに置くこと。
  例：「〜です☺️」「〜ありがとうございます🙏」
- 絵文字を単独行にしない（絵文字の直前で改行しない）。
- 行頭に絵文字は禁止（「☺️〜」はNG）。
- 1投稿あたり絵文字は2〜4個。別々の文末に分散させる。
- URL行（4行目）には絵文字を入れない。

【文字数制限（重要）】
- 各投稿の「1〜3行目合計」は、改行・句読点を含めて125文字以内にしてください（URL行は除外）。
- 125文字を超えそうな場合は次の順で短縮する：
  1) 悩みを1文にする
  2) 解決方法を1文にする
  3) 重複表現を削る
  4) 絵文字を減らす（最少2個まで）
- 最終出力前に自己チェックし、130文字超過があれば必ず修正してから出力する。

【トーン＆禁止事項】
- 口調：丁寧でやさしい。煽り・断定・強いセールスは禁止。
- 「今すぐ」「絶対」「最安」「限定で急げ」など煽り表現は禁止。
- 「購入」「申し込み」「依頼」など直接的な販売ワードは極力避ける。
  「置いてます」「まとめています」「必要な方へ」など柔らかい表現を使う。
- 同じ言い回しの連発を避け、切り口を毎回変える。
- レビューは原文引用ではなく要約でOK（個人情報は出さない）。

【出力形式】
JSON配列 (string[]) で出力してください。
各要素は、上記4行を改行（\n）で含む文字列とすること。

`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

// --- Survey Tool Functions ---

export const generateSurveyPatterns = async (serviceBody: string, priceHint: string): Promise<SurveyPattern[]> => {
  const apiKey = getApiKey();
  // Google AI Studio では、セッションから自動的にキーが利用可能
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  const servicePrice = priceHint || "価格未定";
  const selectedPattern = "";

  const prompt = `
あなたは「サービス提供後アンケート（Google Form前提）」の設計者です。
入力されたサービス本文を踏まえ、改善に役立つ情報を集めるアンケートを
3パターン（A/B/C）で設計してください。
Aは2〜3分、Bは3〜4分、Cは4〜5分を目安に、設問量を段階的に増やしてください。

【入力】
- サービス本文: ${serviceBody}
- サービス価格（数値・円）: ${servicePrice}   // 例: 5000
- パターン選択（任意）: ${selectedPattern}      // "A"|"B"|"C" または空（空なら3パターンすべて出力）

────────────────────────────────────────
【全体ルール（最重要）】
- 個人情報（本名、住所、連絡先）は収集しない。
- 記述式の設問は必要最小限にし、必ず「1〜2行でOK」「箇条書きOK」等の短文誘導を helpText に入れる。
- 選択式で回収できるものは選択式を優先し、自由記述は理由の深掘りに限定する。
- serviceBodyから読み取れる提供価値（例：ヒアリング、提案の具体性、スピード、丁寧さ、成果物品質など）を、
  optionsに反映して“サービスに沿った選択肢”にする（serviceBodyに無い要素の捏造は禁止）。
- 「動機」と「ご受講の動機」は重複させない（動機は1問に統合する）。
- 「決め手」は“最後の一押し”にフォーカスする（動機の焼き直しにしない）。
- 断定表現（例：改善に繋げます）は避け、「今後の参考に」「見直しのヒントとして」などにする。
- 体験形式（対面/オンライン面談/非対面の納品型）に関わらず自然な設問にするため、
  「当日の対応」という表現は避け、「やりとり・進行（連絡〜納品まで）」の満足度として統一する。
- 最後に、ひとこと（任意）
　「もしよければ、ひとこと感想をいただけると励みになります（任意）。」で締める。

────────────────────────────────────────
【必須設問（全パターン共通・順序厳守）】
※以下8問は必ず全パターンに含め、順序も固定する。
1) リベネーム（TEXT・必須）
  title: 「リベシティでの表示名（リベネーム）を教えてください。」
2) 申し込んだ動機（CHECKBOX・必須）
  title: 「今回お申し込みいただいた理由を教えてください（複数選択可）。」
  options: serviceBodyを参考に作成し「その他」を必ず含める
3) 申込の決め手（RADIO・必須）
  title: 「お申し込みの“決め手”として最も近いものを1つ選んでください。」
  options: serviceBodyを参考に作成し「その他」を含める
    （例：内容の具体性／レビュー・実績／人柄・安心感／価格／納期／やりとりの丁寧さ など）
4) サービス全体の満足度（RADIO・必須）
  title: 「サービス全体の満足度を教えてください。」
  options: 「とても満足」「満足」「どちらともいえない」「やや不満」「不満」
5) 期待との比較（RADIO・必須）
  title: 「事前の期待と比べて、今回の内容はいかがでしたか？」
  options: 「期待以上」「期待どおり」「期待より少し下」「期待以下」
6) やりとり・進行の満足度（RADIO・必須）
  title: 「やりとりや進行（連絡・ヒアリング・納品までの流れ）はいかがでしたか？」
  options: 「とても満足」「満足」「どちらともいえない」「やや不満」「不満」
7) おすすめ（PARAGRAPH・必須）
  title: 「このサービスは、どんな方におすすめだと思いますか？（1〜2行でOKです。）」
  helpText: 「1〜2行でOKです。『どんな悩みの人に合いそうか』があると参考になります。"
8) 改善点（PARAGRAPH・必須）
  title: 「より良くするために、改善できそうな点があれば教えてください（1〜2行でOK／箇条書きでも可）。」
  helpText: 「1〜2行でOKです。箇条書きでも構いません。"

※注意：上記 7) 8) の helpText は必ずダブルクォートを閉じ、JSONとして壊れないようにすること。

────────────────────────────────────────
【価格に関する設問（必須ではなく“任意”で追加する）】
※「適正価格レンジ」は作らない。代わりに「価格印象（5段階）」を任意で追加する。
- 価格印象（RADIO・任意）
  title: 「今回の価格（${servicePrice}円）の印象に最も近いものを選んでください（任意）。」
  options: 「とても安い」「やや安い」「妥当」「やや高い」「とても高い」
  helpText: 「目安でOKです。迷ったら『妥当』で大丈夫です。"
- 理由（TEXTまたはPARAGRAPH・任意）
  title: 「（任意）そう感じた理由があれば、一言で教えてください。」
  helpText: 「1行でOKです。『高い/安い』と感じた場合は理由があると参考になります。"

※パターンCでは、価格印象＋理由の2問セットを原則採用する（任意のまま）。
※パターンAでは価格設問は入れない（最短優先）。B以上で採用を検討する。

────────────────────────────────────────
【追加で使える設問候補（serviceBodyに沿って採用・優先度順）】
※必須8問に加えて、各パターンの時間内に収まる範囲で追加する。
優先1：良かった点（CHECKBOX・任意）
  title: 「特に良かった点があれば選んでください（任意／複数選択可）。」
  options: serviceBodyに沿って作成＋「その他」
  （例：説明の分かりやすさ／提案の具体性／やりとりの丁寧さ／スピード感／安心感／成果物の品質 など）
優先2：事前サポートで役立った点（CHECKBOX・任意）
  title: 「事前サポートで役立った点があれば選んでください（任意／複数選択可）。」
  options: serviceBodyに沿って作成＋「その他"
優先3：期待以下の理由（分岐・TEXTまたはPARAGRAPH・任意）
  title: 「（『期待以下』を選んだ方へ）差し支えなければ理由を教えてください（任意）。」
  helpText: 「差し支えない範囲で大丈夫です。1〜2行でOKです。"
優先4：NPS（RADIO・任意）
  title: 「知人・同僚にこのサービスを勧めたい度合いを教えてください（0〜10）（任意）。」
  options: 0〜10　（Google Formの「均等目盛（0〜10）」で作成すること。）
  helpText: 「0=まったく勧めたくない、10=ぜひ勧めたい"
優先5：価格印象（RADIO・任意）＋理由（任意）
  ※上記「価格に関する設問」ブロックを採用する

────────────────────────────────────────
【パターン別の設問量（目安）】
- パターンA：サクッと（2〜3分）
  - 必須8問のみ（追加0〜1問まで）
  - 追加するなら「良かった点（CHECKBOX・任意）」のみ推奨
  - 価格印象/NPS/理由記述は入れない
- パターンB：ちょうど良い（3〜4分）
  - 必須8問 + 追加1〜3問
  - 推奨：良かった点、事前サポートで役立った点
  - 価格印象（任意）＋理由（任意）は余裕があれば追加
- パターンC：改善に活かす（4〜5分）
  - 必須8問 + 追加3〜6問
  - 推奨：良かった点、事前サポートで役立った点、NPS、価格印象（任意）＋理由（任意）
  - 期待以下の理由は分岐の任意として追加

────────────────────────────────────────
【導入文（formDescription）要件】
- 丁寧・前向き・押しつけない文体。
- 「所要時間：A=2〜3分/B=3〜4分/C=4〜5分」相当の表現を入れる（表示は簡潔でOK）。
- 例：ご利用のお礼＋今後の参考にしたい旨＋短時間で終わる旨＋協力への感謝。

────────────────────────────────────────
【出力形式（厳守）】
JSON配列 Array<SurveyPattern> で出力する。JSON以外の文章は出さない。
Questions配列内の type は "TEXT", "PARAGRAPH", "RADIO", "CHECKBOX","Linear scale(均等目盛)" のいずれか。
RADIO/CHECKBOX のみ options を付与する。TEXT/PARAGRAPHにはoptionsを付けない。

Schema:
Array<SurveyPattern>
where SurveyPattern is:
{
  id: "A" | "B" | "C",
  name: string,
  description: string,
  formTitle: string,
  formDescription: string,
  questions: Array<{
    title: string,
    type: "TEXT" | "PARAGRAPH" | "RADIO" | "CHECKBOX",
    options?: string[],
    required: boolean,
    helpText?: string
  }>
}

────────────────────────────────────────
【最終チェック（必須）】
- 必須8問が全パターンに含まれ、順序が一致していること。
- 価格印象（任意）を入れる場合は、servicePrice（${servicePrice}円）を文面に含めること。
- 記述設問に短文誘導の helpText が付いていること。
- A=2〜3分、B=3〜4分、C=4〜5分になるように設問数・記述量を調整していること。
- 重複質問（動機系など）が無いこと。
- 出力はJSONとしてパースできること（クォートの閉じ忘れや全角記号の混入に注意）。


`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, enum: ["A", "B", "C"] },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            formTitle: { type: Type.STRING },
            formDescription: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["TEXT", "PARAGRAPH", "RADIO", "CHECKBOX"] },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  required: { type: Type.BOOLEAN },
                  helpText: { type: Type.STRING }
                },
                required: ["title", "type", "required"]
              }
            }
          },
          required: ["id", "name", "description", "formTitle", "formDescription", "questions"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};
