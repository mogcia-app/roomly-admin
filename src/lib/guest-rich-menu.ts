export const guestRichMenuActionTypes = [
  "external_link",
  "handoff_category",
  "language",
  "ai_prompt",
  "ai_message",
  "human_handoff",
] as const;

export type GuestRichMenuActionType = (typeof guestRichMenuActionTypes)[number];
export type GuestRichMenuTranslationLanguage = "en" | "zh-CN" | "zh-TW" | "ko";
export type GuestRichMenuTranslations = Partial<Record<GuestRichMenuTranslationLanguage, string>>;
export const guestRichMenuTranslationLanguages: GuestRichMenuTranslationLanguage[] = ["en", "zh-CN", "zh-TW", "ko"];

export function normalizeProtectedTerms(value: unknown) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];

  return Array.from(
    new Set(
      entries
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeGuestRichMenuTranslations(value: unknown): GuestRichMenuTranslations | undefined {
  const record = (value ?? {}) as Record<string, unknown>;
  const translations = Object.fromEntries(
    guestRichMenuTranslationLanguages.map((language) => [
      language,
      typeof record[language] === "string" ? record[language].trim() : "",
    ]),
  ) as GuestRichMenuTranslations;

  return Object.values(translations).some((text) => text) ? translations : undefined;
}

export function mergeProtectedTerms(...groups: Array<string[] | undefined>) {
  return Array.from(
    new Set(
      groups
        .flatMap((group) => group ?? [])
        .map((term) => String(term ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function getManualTranslation(
  translations: GuestRichMenuTranslations | undefined,
  language: GuestRichMenuTranslationLanguage,
) {
  const text = translations?.[language];
  return typeof text === "string" && text.trim() ? text.trim() : "";
}

export type GuestRichMenuArea = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  actionType: GuestRichMenuActionType;
  visible: boolean;
  sortOrder: number;
  url?: string;
  prompt?: string;
  handoffCategory?: string;
  messageText?: string;
  messageImageUrl?: string;
  messageImageAlt?: string;
  protectedTerms?: string[];
  translations?: GuestRichMenuTranslations;
};

export type GuestRichMenuDoc = {
  enabled: boolean;
  version: number;
  menuGuideText?: string;
  translationProtectedTerms?: string[];
  imageUrl: string;
  imageContentType?: string;
  storagePath?: string;
  imageWidth: number;
  imageHeight: number;
  updatedAt: string | null;
  items: GuestRichMenuArea[];
};

export type GuestRichMenuUpsertInput = Omit<GuestRichMenuDoc, "updatedAt" | "version"> & {
  version?: number;
};

const templateLabels = [
  "公式HP",
  "Instagram",
  "タクシー手配",
  "アメニティ依頼",
  "言語変更",
  "フロントに聞く",
] as const;

export function createGuestRichMenuTemplateItems(
  imageWidth = 1200,
  imageHeight = 810,
): GuestRichMenuArea[] {
  const cols = 3;
  const rows = 2;
  const horizontalGap = imageWidth * 0.03;
  const verticalGap = imageHeight * 0.04;
  const itemWidth = (imageWidth - horizontalGap * (cols + 1)) / cols;
  const itemHeight = (imageHeight - verticalGap * (rows + 1)) / rows;

  return templateLabels.map((label, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      id: crypto.randomUUID(),
      label,
      x: Math.round(horizontalGap + col * (itemWidth + horizontalGap)),
      y: Math.round(verticalGap + row * (itemHeight + verticalGap)),
      width: Math.round(itemWidth),
      height: Math.round(itemHeight),
      actionType:
        label === "公式HP" || label === "Instagram"
          ? "external_link"
          : label === "タクシー手配" || label === "アメニティ依頼"
            ? "ai_prompt"
            : label === "言語変更"
              ? "language"
              : "human_handoff",
      visible: true,
      sortOrder: index + 1,
      url: label === "Instagram" || label === "公式HP" ? "" : undefined,
      prompt:
        label === "タクシー手配"
          ? "タクシーのご予約ですね。利用日時、行き先、必要事項を入力してください。"
          : label === "アメニティ依頼"
            ? "必要なアメニティを入力してください。"
            : undefined,
    };
  });
}

function isActionType(value: unknown): value is GuestRichMenuActionType {
  return typeof value === "string" && guestRichMenuActionTypes.includes(value as GuestRichMenuActionType);
}

function asNonNegativeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function normalizeGuestRichMenuInput(input: unknown): GuestRichMenuUpsertInput {
  const record = (input ?? {}) as Record<string, unknown>;
  const items = Array.isArray(record.items) ? record.items : [];

  return {
    enabled: Boolean(record.enabled),
    version: Number.isFinite(Number(record.version)) ? Number(record.version) : 0,
    menuGuideText: typeof record.menuGuideText === "string" ? record.menuGuideText.trim() : undefined,
    translationProtectedTerms: normalizeProtectedTerms(record.translationProtectedTerms),
    imageUrl: String(record.imageUrl ?? "").trim(),
    imageContentType: typeof record.imageContentType === "string" ? record.imageContentType.trim() : undefined,
    storagePath: typeof record.storagePath === "string" ? record.storagePath.trim() : undefined,
    imageWidth: Math.round(asNonNegativeNumber(record.imageWidth)),
    imageHeight: Math.round(asNonNegativeNumber(record.imageHeight)),
    items: items.map((item, index) => {
      const area = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(area.id ?? "").trim() || crypto.randomUUID(),
        label: String(area.label ?? "").trim(),
        x: Math.round(asNonNegativeNumber(area.x)),
        y: Math.round(asNonNegativeNumber(area.y)),
        width: Math.round(asNonNegativeNumber(area.width)),
        height: Math.round(asNonNegativeNumber(area.height)),
        actionType: isActionType(area.actionType) ? area.actionType : "external_link",
        visible: area.visible !== false,
        sortOrder: Number.isFinite(Number(area.sortOrder)) ? Number(area.sortOrder) : index + 1,
        url: typeof area.url === "string" ? area.url.trim() : undefined,
        prompt: typeof area.prompt === "string" ? area.prompt.trim() : undefined,
        handoffCategory: typeof area.handoffCategory === "string" ? area.handoffCategory.trim() : undefined,
        messageText: typeof area.messageText === "string" ? area.messageText.trim() : undefined,
        messageImageUrl: typeof area.messageImageUrl === "string" ? area.messageImageUrl.trim() : undefined,
        messageImageAlt: typeof area.messageImageAlt === "string" ? area.messageImageAlt.trim() : undefined,
        protectedTerms: normalizeProtectedTerms(area.protectedTerms),
        translations: normalizeGuestRichMenuTranslations(area.translations),
      } satisfies GuestRichMenuArea;
    }),
  };
}

export function validateGuestRichMenuInput(input: GuestRichMenuUpsertInput) {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const allowedImageContentTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

  if (!input.imageUrl) {
    errors.push("imageUrl は必須です。");
  }

  if (input.imageUrl && /\.pdf(?:$|[?#])/i.test(input.imageUrl)) {
    errors.push("imageUrl には PDF ではなく画像 URL を保存してください。");
  }

  if (input.imageContentType && !allowedImageContentTypes.has(input.imageContentType)) {
    errors.push("imageContentType は image/png・image/jpeg・image/webp のみ保存できます。");
  }

  if (input.imageWidth <= 0 || input.imageHeight <= 0) {
    errors.push("imageWidth と imageHeight は 1 以上で指定してください。");
  }

  input.items.forEach((item, index) => {
    const label = item.label || `項目 ${index + 1}`;
    if (seenIds.has(item.id)) {
      errors.push(`items[].id は一意である必要があります: ${label}`);
    }
    seenIds.add(item.id);

    if (item.width <= 0 || item.height <= 0) {
      errors.push(`${label} の width / height は 1 以上で指定してください。`);
    }

    if (item.x + item.width > input.imageWidth + 48 || item.y + item.height > input.imageHeight + 48) {
      errors.push(`${label} が画像外にはみ出しすぎています。`);
    }

    if (item.actionType === "external_link" && !item.url) {
      errors.push(`${label} は external_link のため url が必須です。`);
    }

    if (item.actionType === "handoff_category" && !item.handoffCategory) {
      errors.push(`${label} は handoff_category のため handoffCategory が必須です。`);
    }

    if (item.actionType === "ai_prompt" && !item.prompt) {
      errors.push(`${label} は ai_prompt のため prompt が必須です。`);
    }

    if (item.actionType === "ai_message" && !item.messageText && !item.messageImageUrl) {
      errors.push(`${label} は ai_message のため messageText または messageImageUrl が必須です。`);
    }
  });

  return errors;
}

export function sortGuestRichMenuItems(items: GuestRichMenuArea[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.label.localeCompare(right.label, "ja");
  });
}
