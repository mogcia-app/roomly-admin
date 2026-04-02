export type AdminRole = "super_admin" | "hotel_admin" | "hotel_front";

export type HotelRecord = {
  id: string;
  name: string;
  plan: string;
  rooms: number;
  status: "onboarding" | "active" | "attention";
  hotelAdminEmail: string;
  lastLoginAt: string;
};

export type QueueRecord = {
  roomId: string;
  hotel: string;
  roomNumber: string;
  guestLanguage: string;
  waitingFor: string;
  priority: "normal" | "high";
};

export type PipelineStage = {
  name: string;
  owner: string;
  status: "ready" | "in_progress" | "planned";
  description: string;
};

export type CollectionRecord = {
  name: string;
  fields: string[];
  responsibility: string;
};

export const kpiCards = [
  {
    label: "稼働ホテル数",
    value: "12",
    note: "導入中 3件、契約中 9件",
  },
  {
    label: "未処理エスカレーション",
    value: "7",
    note: "通話引き継ぎと緊急通知",
  },
  {
    label: "基盤稼働率",
    value: "99.6%",
    note: "直近30日の目標稼働率",
  },
  {
    label: "月次API費用見込み",
    value: "¥182k",
    note: "STT、翻訳、TTS、Claude",
  },
] as const;

export const hotels: HotelRecord[] = [
  {
    id: "hotel_akari_001",
    name: "Akari Ryokan",
    plan: "Basic",
    rooms: 24,
    status: "active",
    hotelAdminEmail: "owner@akari.example",
    lastLoginAt: "2025-02-21 09:14",
  },
  {
    id: "hotel_harbor_002",
    name: "Harbor Stay Kobe",
    plan: "Basic",
    rooms: 42,
    status: "onboarding",
    hotelAdminEmail: "ops@harbor.example",
    lastLoginAt: "招待待ち",
  },
  {
    id: "hotel_sora_003",
    name: "Sora Annex",
    plan: "Pilot",
    rooms: 18,
    status: "attention",
    hotelAdminEmail: "front@sora.example",
    lastLoginAt: "2025-02-20 18:42",
  },
];

export const onboardingChecklist = [
  "hotel_admin アカウントを作成し、hotel_id を含む custom claims を付与する。",
  "客室マスタCSVを取り込み、room_id ベースの永続QRを発行する。",
  "ヒアリングシートURLを発行し、ホテルへ初期設定案内を送る。",
  "フロントPWAの通知許可と緊急通知ルートを確認する。",
] as const;

export const callQueue: QueueRecord[] = [
  {
    roomId: "room_402",
    hotel: "Akari Ryokan",
    roomNumber: "402",
    guestLanguage: "英語",
    waitingFor: "フロント応答待ち",
    priority: "high",
  },
  {
    roomId: "room_215",
    hotel: "Harbor Stay Kobe",
    roomNumber: "215",
    guestLanguage: "한국어",
    waitingFor: "WebRTC失敗後の再試行待ち",
    priority: "normal",
  },
  {
    roomId: "room_107",
    hotel: "Sora Annex",
    roomNumber: "107",
    guestLanguage: "简体中文",
    waitingFor: "有人チャット引き継ぎ",
    priority: "high",
  },
];

export const pipelineStages: PipelineStage[] = [
  {
    name: "リアルタイム通話シグナリング",
    owner: "Firebase RTDB + WebRTC",
    status: "in_progress",
    description: "ゲストブラウザとフロントPWAの接続確立、キュー制御、チャットへの切り替え。",
  },
  {
    name: "音声認識",
    owner: "Whisper API",
    status: "planned",
    description: "多言語音声認識。信頼度が低い場合はチャットへ誘導。",
  },
  {
    name: "翻訳",
    owner: "DeepL API",
    status: "planned",
    description: "日英中韓の双方向翻訳。チャットと通話の両方で利用。",
  },
  {
    name: "音声合成",
    owner: "Google TTS",
    status: "planned",
    description: "翻訳後音声の再生。将来的に ElevenLabs への切替余地あり。",
  },
  {
    name: "AIチャット参照基盤",
    owner: "Claude API",
    status: "in_progress",
    description: "カテゴリ単位でヒアリングシートを注入し、必要時はフォールバック文言へ切り替える。",
  },
];

export const responsibilities = [
  {
    title: "アカウント発行",
    body: "super_admin が hotel_admin を発行し、hotel_id 付き custom claims を設定します。hotel_admin と hotel_front の緊急削除権限も保持します。",
  },
  {
    title: "ゲストセッション制御",
    body: "ゲストは Firebase Auth を使いません。サーバーが room_id から active stay を判定し、ゲストの Firestore 直書きを禁止します。",
  },
  {
    title: "監視とフォールバック",
    body: "cron による stay 失効、パイプライン監視、APIコスト監視、通話からチャットへの切替導線は MOGCIA が担当します。",
  },
] as const;

export const collections: CollectionRecord[] = [
  {
    name: "users",
    fields: ["user_id", "hotel_id", "hotel_name", "role", "email", "created_at"],
    responsibility: "Firebase Auth uid をキーにしたプロフィール保管と表示用メタデータ。",
  },
  {
    name: "hotels",
    fields: ["hotel_id", "name", "plan", "created_at"],
    responsibility: "ホテル契約情報と課金単位の管理。",
  },
  {
    name: "rooms",
    fields: ["room_id", "hotel_id", "room_number", "floor"],
    responsibility: "永続QRの起点となる客室マスタ。",
  },
  {
    name: "stays",
    fields: ["stay_id", "room_id", "hotel_id", "check_in", "check_out", "is_active", "language"],
    responsibility: "現在のゲストセッション判定とチェックアウト後の無効化。",
  },
  {
    name: "hearing_sheets",
    fields: ["sheet_id", "hotel_id", "categories", "updated_at"],
    responsibility: "ホテル提供情報をもとにしたAI参照元。",
  },
  {
    name: "hearing_sheet_links",
    fields: ["hearing_sheet_link_id", "hotel_id", "token", "url", "status", "created_at"],
    responsibility: "ホテル担当者に送るヒアリングシート入力URLの発行履歴。",
  },
  {
    name: "chat_threads",
    fields: ["thread_id", "stay_id", "room_id", "mode", "created_at"],
    responsibility: "AI対応と有人引き継ぎを共有する会話単位。",
  },
  {
    name: "messages",
    fields: ["message_id", "thread_id", "sender", "body", "timestamp"],
    responsibility: "AI、ゲスト、フロントのメッセージ保存。",
  },
  {
    name: "calls",
    fields: ["call_id", "stay_id", "room_id", "started_at", "ended_at", "guest_lang", "translated"],
    responsibility: "通話記録とフォールバック分析の元データ。",
  },
  {
    name: "surveys",
    fields: ["survey_id", "stay_id", "room_id", "rating", "comment", "submitted_at"],
    responsibility: "滞在後アンケートとレビュー送客の記録。",
  },
  {
    name: "room_qrs",
    fields: ["room_qr_id", "hotel_id", "room_id", "room_number", "guest_url", "qr_svg", "generated_at"],
    responsibility: "各部屋のゲスト用固定QRと発行済みURL。",
  },
];

export const roadmap = [
  {
    phase: "今",
    focus: "MOGCIA Admin、ホテル発行、QR発行、AI / 通話基盤の土台。",
  },
  {
    phase: "MVPコア",
    focus: "WebRTC 通話、フロントPWA着信キュー、stay 判定、AIチャット引き継ぎ。",
  },
  {
    phase: "次フェーズ",
    focus: "アンケート、音声品質改善、対応言語拡張。",
  },
] as const;
