"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  createGuestRichMenuTemplateItems,
  getManualTranslation,
  guestRichMenuActionTypes,
  guestRichMenuTranslationLanguages,
  mergeProtectedTerms,
  normalizeGuestRichMenuTranslations,
  normalizeProtectedTerms,
  type GuestRichMenuArea,
  type GuestRichMenuDoc,
  type GuestRichMenuTranslationLanguage,
  type GuestRichMenuUpsertInput,
  sortGuestRichMenuItems,
  validateGuestRichMenuInput,
} from "@/lib/guest-rich-menu";

type HotelOption = {
  id: string;
  name: string;
};

type InteractionState = {
  areaId: string;
  mode: "move" | "resize";
  origin: GuestRichMenuArea;
  pointerX: number;
  pointerY: number;
};

const recommendedWidth = 1200;
const recommendedHeight = 810;

function createEmptyMenu(): GuestRichMenuDoc {
  return {
    enabled: true,
    version: 0,
    menuGuideText: "",
    translationProtectedTerms: [],
    imageUrl: "",
    imageContentType: "",
    imageWidth: recommendedWidth,
    imageHeight: recommendedHeight,
    updatedAt: null,
    items: [],
  };
}

function getActionTypeLabel(actionType: GuestRichMenuArea["actionType"]) {
  switch (actionType) {
    case "external_link":
      return "外部ページを開く";
    case "handoff_category":
      return "チャットの依頼メニューへ進む";
    case "language":
      return "表示言語を切り替える";
    case "ai_prompt":
      return "チャットで依頼を始める";
    case "ai_message":
      return "AIから画像や案内を表示する";
    case "human_handoff":
      return "スタッフ対応へつなぐ";
    default:
      return actionType;
  }
}

function getActionTypeDescription(actionType: GuestRichMenuArea["actionType"]) {
  switch (actionType) {
    case "external_link":
      return "公式サイトや予約サイトなど、ホテルの外にあるページを開きたいときに使います。";
    case "handoff_category":
      return "guest 側に用意された依頼カテゴリへ進めたいときに使います。定型導線向けです。";
    case "language":
      return "日本語・英語など、guest 側の表示言語を切り替えるボタンに使います。";
    case "ai_prompt":
      return "チャット欄に依頼文のたたきを出して、そのまま会話を始めたいときに使います。";
    case "ai_message":
      return "ボタン押下後に、AI側の案内メッセージとして画像やテキストを表示したいときに使います。";
    case "human_handoff":
      return "フロントやスタッフへ取り次ぐ導線にしたいときに使います。";
    default:
      return "";
  }
}

const AI_PROMPT_BAD_EXAMPLE = "タクシーのご予約ですね！ご利用日時・行き先・注意事項を記載してください";
const AI_PROMPT_GOOD_EXAMPLE = `タクシーのご予約ですね！
・ご利用日時
・行き先
・注意事項
を記載してください`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      reject(new Error("画像サイズの読み取りに失敗しました。"));
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

function isPdfAsset(menu: GuestRichMenuDoc) {
  if (menu.imageContentType === "application/pdf") {
    return true;
  }

  return /\.pdf(?:$|[?#])/i.test(menu.imageUrl);
}

function formatProtectedTerms(terms?: string[]) {
  return (terms ?? []).join("\n");
}

function parseProtectedTerms(value: string) {
  return normalizeProtectedTerms(value);
}

function getTranslationLabel(language: GuestRichMenuTranslationLanguage) {
  switch (language) {
    case "en":
      return "英語";
    case "zh-CN":
      return "簡体字";
    case "zh-TW":
      return "繁体字";
    case "ko":
      return "韓国語";
    default:
      return language;
  }
}

function getPrimaryText(area: GuestRichMenuArea) {
  if (area.actionType === "ai_prompt") {
    return area.prompt ?? "";
  }

  if (area.actionType === "ai_message") {
    return area.messageText ?? "";
  }

  return "";
}

function updateManualTranslation(
  area: GuestRichMenuArea,
  language: GuestRichMenuTranslationLanguage,
  value: string,
) {
  const nextTranslations = normalizeGuestRichMenuTranslations({
    ...(area.translations ?? {}),
    [language]: value,
  });

  return nextTranslations;
}

export function GuestRichMenuEditor({
  hotels,
  initialHotelId,
  initialMenu,
}: {
  hotels: HotelOption[];
  initialHotelId?: string;
  initialMenu?: GuestRichMenuDoc | null;
}) {
  const [selectedHotelId, setSelectedHotelId] = useState(initialHotelId ?? hotels[0]?.id ?? "");
  const [menu, setMenu] = useState<GuestRichMenuDoc>(initialMenu ?? createEmptyMenu());
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(initialMenu?.items[0]?.id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftAssetUrl, setDraftAssetUrl] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const latestMenuRef = useRef(menu);

  useEffect(() => {
    latestMenuRef.current = menu;
  }, [menu]);

  useEffect(() => {
    if (!selectedHotelId) {
      setMenu(createEmptyMenu());
      setSelectedAreaId(null);
      setDraftAssetUrl(null);
      return;
    }

    if (selectedHotelId === initialHotelId && initialMenu) {
      setMenu(initialMenu);
      setSelectedAreaId(initialMenu.items[0]?.id ?? null);
      setDraftAssetUrl(null);
      return;
    }

    let cancelled = false;

    async function loadMenu() {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/admin/hotels/${selectedHotelId}/guest-rich-menu`);
        const payload = (await response.json()) as { error?: string; menu?: GuestRichMenuDoc | null };

        if (!response.ok) {
          throw new Error(payload.error ?? "guest rich menu の取得に失敗しました。");
        }

        if (cancelled) {
          return;
        }

        const nextMenu = payload.menu ?? createEmptyMenu();
        setMenu(nextMenu);
        setSelectedAreaId(nextMenu.items[0]?.id ?? null);
        setDraftAssetUrl(null);
      } catch (loadError) {
        if (!cancelled) {
          setMenu(createEmptyMenu());
          setSelectedAreaId(null);
          setDraftAssetUrl(null);
          setError(loadError instanceof Error ? loadError.message : "guest rich menu の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMenu();

    return () => {
      cancelled = true;
    };
  }, [initialHotelId, initialMenu, selectedHotelId]);

  useEffect(() => {
    if (!interaction) {
      return;
    }
    const activeInteraction = interaction;

    function handlePointerMove(event: PointerEvent) {
      const canvas = canvasRef.current;
      const currentMenu = latestMenuRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const scaleX = currentMenu.imageWidth / rect.width;
      const scaleY = currentMenu.imageHeight / rect.height;
      const dx = (event.clientX - activeInteraction.pointerX) * scaleX;
      const dy = (event.clientY - activeInteraction.pointerY) * scaleY;

      setMenu((current) => ({
        ...current,
        items: current.items.map((item) => {
          if (item.id !== activeInteraction.areaId) {
            return item;
          }

          if (activeInteraction.mode === "move") {
            return {
              ...item,
              x: Math.round(clamp(activeInteraction.origin.x + dx, 0, current.imageWidth - activeInteraction.origin.width)),
              y: Math.round(clamp(activeInteraction.origin.y + dy, 0, current.imageHeight - activeInteraction.origin.height)),
            };
          }

          return {
            ...item,
            width: Math.round(clamp(activeInteraction.origin.width + dx, 24, current.imageWidth - activeInteraction.origin.x)),
            height: Math.round(clamp(activeInteraction.origin.height + dy, 24, current.imageHeight - activeInteraction.origin.y)),
          };
        }),
      }));
    }

    function handlePointerUp() {
      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interaction]);

  const sortedItems = useMemo(() => sortGuestRichMenuItems(menu.items), [menu.items]);
  const selectedArea = menu.items.find((item) => item.id === selectedAreaId) ?? null;
  const visibleItems = sortedItems.filter((item) => item.visible);
  const pdfAsset = isPdfAsset(menu);
  const previewAssetUrl = draftAssetUrl ?? menu.imageUrl;

  function updateMenu(next: Partial<GuestRichMenuDoc>) {
    setMenu((current) => ({ ...current, ...next }));
  }

  function updateArea(areaId: string, patch: Partial<GuestRichMenuArea>) {
    setMenu((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === areaId ? { ...item, ...patch } : item)),
    }));
  }

  function addArea() {
    const newArea: GuestRichMenuArea = {
      id: crypto.randomUUID(),
      label: `項目 ${menu.items.length + 1}`,
      x: Math.round(menu.imageWidth * 0.1 + menu.items.length * 12),
      y: Math.round(menu.imageHeight * 0.1 + menu.items.length * 12),
      width: Math.round(menu.imageWidth * 0.24),
      height: Math.round(menu.imageHeight * 0.18),
      actionType: "external_link",
      visible: true,
      sortOrder: menu.items.length + 1,
      url: "",
    };

    setMenu((current) => ({ ...current, items: [...current.items, newArea] }));
    setSelectedAreaId(newArea.id);
    setSuccess(null);
    setError(null);
  }

  function applyTemplate() {
    const templateItems = createGuestRichMenuTemplateItems(menu.imageWidth, menu.imageHeight);
    setMenu((current) => ({ ...current, items: templateItems }));
    setSelectedAreaId(templateItems[0]?.id ?? null);
    setSuccess("初期テンプレートを反映しました。");
    setError(null);
  }

  function deleteArea(areaId: string) {
    setMenu((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== areaId),
    }));
    setSelectedAreaId((current) => (current === areaId ? null : current));
  }

  function normalizeSortOrders() {
    setMenu((current) => ({
      ...current,
      items: sortGuestRichMenuItems(current.items).map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      })),
    }));
  }

  function moveItem(areaId: string, direction: "up" | "down") {
    const ordered = sortGuestRichMenuItems(menu.items);
    const index = ordered.findIndex((item) => item.id === areaId);

    if (index < 0) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) {
      return;
    }

    const nextOrdered = [...ordered];
    const [target] = nextOrdered.splice(index, 1);
    nextOrdered.splice(swapIndex, 0, target);

    setMenu((current) => ({
      ...current,
      items: nextOrdered.map((item, itemIndex) => ({
        ...current.items.find((entry) => entry.id === item.id)!,
        sortOrder: itemIndex + 1,
      })),
    }));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedHotelId) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("guest 側へ保存できるのは PNG / JPEG / WebP のみです。PDF は画像に変換してからアップロードしてください。");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const { width, height } = await readImageDimensions(file);
      const formData = new FormData();
      formData.set("image", file);
      formData.set("imageWidth", String(width));
      formData.set("imageHeight", String(height));

      const response = await fetch(`/api/admin/hotels/${selectedHotelId}/guest-rich-menu/image`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        image?: {
          imageUrl: string;
          imageContentType?: string;
          storagePath?: string;
          imageWidth: number;
          imageHeight: number;
        };
      };

      if (!response.ok || !payload.image) {
        throw new Error(payload.error ?? "画像アップロードに失敗しました。");
      }

      setMenu((current) => ({
        ...current,
        imageUrl: payload.image!.imageUrl,
        imageContentType: payload.image!.imageContentType ?? file.type,
        storagePath: payload.image!.storagePath,
        imageWidth: payload.image!.imageWidth,
        imageHeight: payload.image!.imageHeight,
      }));
      setDraftAssetUrl(payload.image!.imageUrl);
      setSuccess("画像をアップロードしました。保存すると設定に反映されます。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "画像アップロードに失敗しました。");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function saveMenu() {
    if (!selectedHotelId) {
      setError("hotelId を選択してください。");
      return;
    }

    const payload: GuestRichMenuUpsertInput = {
      enabled: true,
      version: menu.version,
      menuGuideText: menu.menuGuideText,
      translationProtectedTerms: menu.translationProtectedTerms,
      imageUrl: menu.imageUrl,
      imageContentType: menu.imageContentType,
      storagePath: menu.storagePath,
      imageWidth: menu.imageWidth,
      imageHeight: menu.imageHeight,
      items: menu.items,
    };
    const errors = validateGuestRichMenuInput(payload);

    if (errors.length > 0) {
      setError(errors.join("\n"));
      setSuccess(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/hotels/${selectedHotelId}/guest-rich-menu`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; menu?: GuestRichMenuDoc };

      if (!response.ok || !result.menu) {
        throw new Error(result.error ?? "guest rich menu の保存に失敗しました。");
      }

      const savedMenu = result.menu;
      setMenu(savedMenu);
      setSelectedAreaId((current) => current ?? savedMenu.items[0]?.id ?? null);
      setDraftAssetUrl(null);
      setSuccess("guest rich menu を保存しました。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "guest rich menu の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function beginInteraction(event: ReactPointerEvent<HTMLElement>, area: GuestRichMenuArea, mode: InteractionState["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedAreaId(area.id);
    setInteraction({
      areaId: area.id,
      mode,
      origin: area,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="panel p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <p className="text-lg font-semibold text-stone-950">1. 背景画像とタップ位置</p>
            <p className="mt-1 text-sm text-stone-600">
              まずホテルを選び、背景画像を登録してから、押せるボタン範囲を画像の上に置きます。ドラッグで移動、右下ハンドルでサイズ変更できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addArea}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              領域を追加
            </button>
            <button
              type="button"
              onClick={applyTemplate}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              初期テンプレート
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="form-label">
            設定するホテル
            <select
              value={selectedHotelId}
              onChange={(event) => setSelectedHotelId(event.target.value)}
              className="form-select"
            >
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} ({hotel.id})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              {isUploading ? "アップロード中..." : "背景画像をアップロード"}
            </label>
            <span className="text-xs text-stone-500">
              version {menu.version || 0}
              {menu.updatedAt ? ` / 最終更新 ${new Date(menu.updatedAt).toLocaleString()}` : ""}
            </span>
          </div>

          <div className="form-hint">
            操作の流れ: 画像をアップロード → 「領域を追加」でボタン範囲を置く → 右側でボタン内容を設定 → 保存。
            保存時は guest 側表示用として `enabled = true` で保存されます。
          </div>

          <label className="form-label">
            ゲスト向けメニュー案内文
            <textarea
              value={menu.menuGuideText ?? ""}
              onChange={(event) => updateMenu({ menuGuideText: event.target.value })}
              className="form-input min-h-28"
              placeholder={`例:
下の便利メニューから、HP・公式SNS・アクセス・予約関連などをご利用いただけます。
気になる項目をタップしてください。`}
            />
          </label>

          <div className="form-hint">
            guest 側で「このリッチメニューでは何ができるか」を案内するための文面です。トグルの上や開いた直後の案内文として使う想定です。
          </div>

          <label className="form-label">
            ホテル共通の翻訳除外ワード
            <textarea
              value={formatProtectedTerms(menu.translationProtectedTerms)}
              onChange={(event) => updateMenu({ translationProtectedTerms: parseProtectedTerms(event.target.value) })}
              className="form-input min-h-28"
              placeholder={`例:
Roomly旅館
MIタクシー
ゆの花の湯
プレミアムラウンジ`}
            />
          </label>

          <div className="form-hint">
            このホテルで共通して翻訳したくない固有名詞を 1 行ずつ登録します。各ボタンの翻訳除外ワードとマージして使う想定です。
          </div>

          <div className="form-hint">
            保存ルール: 前後の空白は自動で削除し、空行は保存せず、重複する語句は 1 件にまとめます。例としてホテル名、温泉名、タクシー会社名、ブランド名を入れてください。
          </div>

          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-white/60 p-3">
            {menu.imageUrl ? (
              <div
                ref={canvasRef}
                className="relative overflow-hidden rounded-[22px] bg-stone-100"
                style={{ aspectRatio: `${menu.imageWidth} / ${menu.imageHeight}` }}
                onClick={() => setSelectedAreaId(null)}
              >
                {pdfAsset ? (
                  <iframe src={previewAssetUrl} title="guest rich menu" className="h-full w-full border-0" />
                ) : (
                  <img src={previewAssetUrl} alt="guest rich menu" className="h-full w-full object-cover" />
                )}
                {sortedItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(event) => beginInteraction(event, item, "move")}
                    className={`absolute rounded-xl border-2 text-left transition ${
                      item.id === selectedAreaId
                        ? "border-stone-950 bg-stone-950/18"
                        : item.visible
                          ? "border-emerald-500 bg-emerald-500/18"
                          : "border-stone-400 bg-stone-400/12"
                    }`}
                    style={{
                      left: `${(item.x / menu.imageWidth) * 100}%`,
                      top: `${(item.y / menu.imageHeight) * 100}%`,
                      width: `${(item.width / menu.imageWidth) * 100}%`,
                      height: `${(item.height / menu.imageHeight) * 100}%`,
                    }}
                  >
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-stone-800">
                      {index + 1}. {item.label || "未設定"}
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => beginInteraction(event, item, "resize")}
                      className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border border-white bg-stone-950"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[22px] bg-stone-100 px-6 text-center text-sm leading-7 text-stone-500">
                先に背景画像をアップロードしてください。画像がなくてもボタン領域の追加はできますが、最終保存には背景画像が必要です。
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="form-label">
              imageWidth
              <input
                type="number"
                min={1}
                value={menu.imageWidth}
                onChange={(event) => updateMenu({ imageWidth: Number(event.target.value) || 0 })}
                className="form-input"
              />
            </label>
            <label className="form-label">
              imageHeight
              <input
                type="number"
                min={1}
                value={menu.imageHeight}
                onChange={(event) => updateMenu({ imageHeight: Number(event.target.value) || 0 })}
                className="form-input"
              />
            </label>
            <div className="form-hint">
              背景の比率は guest 側表示の基準になります。推奨サイズは <code>1200 x 810</code> です。
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="panel p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-lg font-semibold text-stone-950">2. ボタン一覧</p>
              <p className="mt-1 text-sm text-stone-600">今あるボタンを並び順つきで管理します。編集したいボタンをここから選びます。</p>
            </div>
            <button
              type="button"
              onClick={normalizeSortOrders}
              className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              表示順を並べ直す
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sortedItems.length === 0 ? (
              <p className="text-sm text-stone-500">まだボタンはありません。「領域を追加」または「初期テンプレート」から始めてください。</p>
            ) : (
              sortedItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAreaId(item.id)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    item.id === selectedAreaId
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-[var(--border)] bg-white hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{index + 1}. {item.label || "未設定"}</p>
                      <p className={`mt-1 text-xs ${item.id === selectedAreaId ? "text-white/72" : "text-stone-500"}`}>
                        {getActionTypeLabel(item.actionType)} / {item.visible ? "表示" : "非表示"} / sortOrder{" "}
                        {item.sortOrder}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          item.id === selectedAreaId ? "bg-white/12 text-white" : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {Math.round(item.x)},{Math.round(item.y)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel p-5 md:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-lg font-semibold text-stone-950">3. ボタン内容の設定</p>
            <p className="mt-1 text-sm text-stone-600">選択したボタンの名前、動き、位置、サイズをここで決めます。</p>
          </div>

          {selectedArea ? (
            <div className="mt-4 space-y-4">
              <div className="form-hint">
                ボタンごとに「外部ページへ移動する」のか、「チャットの中で依頼を始める」のかを選べます。
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(selectedArea.id, "up")}
                  className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  上へ
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(selectedArea.id, "down")}
                  className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  下へ
                </button>
                <button
                  type="button"
                  onClick={() => deleteArea(selectedArea.id)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  削除
                </button>
              </div>

              <label className="form-label">
                ボタン名
                <input
                  value={selectedArea.label}
                  onChange={(event) => updateArea(selectedArea.id, { label: event.target.value })}
                  className="form-input"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  押したときの動作
                  <select
                    value={selectedArea.actionType}
                    onChange={(event) => {
                      const actionType = event.target.value as GuestRichMenuArea["actionType"];
                      updateArea(selectedArea.id, {
                        actionType,
                        url: actionType === "external_link" ? selectedArea.url ?? "" : undefined,
                        prompt: actionType === "ai_prompt" ? selectedArea.prompt ?? "" : undefined,
                        handoffCategory:
                          actionType === "handoff_category" ? selectedArea.handoffCategory ?? "" : undefined,
                        messageText:
                          actionType === "ai_message" ? selectedArea.messageText ?? "" : undefined,
                        messageImageUrl:
                          actionType === "ai_message" ? selectedArea.messageImageUrl ?? "" : undefined,
                        messageImageAlt:
                          actionType === "ai_message" ? selectedArea.messageImageAlt ?? "" : undefined,
                        protectedTerms:
                          actionType === "ai_prompt" || actionType === "ai_message"
                            ? selectedArea.protectedTerms ?? []
                            : undefined,
                      });
                    }}
                    className="form-select"
                  >
                    {guestRichMenuActionTypes.map((actionType) => (
                      <option key={actionType} value={actionType}>
                        {getActionTypeLabel(actionType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  表示順
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.sortOrder}
                    onChange={(event) => updateArea(selectedArea.id, { sortOrder: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
              </div>

              <div className="form-hint">
                {getActionTypeDescription(selectedArea.actionType)}
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={selectedArea.visible}
                  onChange={(event) => updateArea(selectedArea.id, { visible: event.target.checked })}
                />
                ゲスト画面のリッチメニューにこのボタンを表示する
              </label>

              <div className="form-hint">
                オフにすると設定内容は残したまま、guest 側のリッチメニュー一覧と公開前プレビューから除外されます。
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  X位置
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.x}
                    onChange={(event) => updateArea(selectedArea.id, { x: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  Y位置
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.y}
                    onChange={(event) => updateArea(selectedArea.id, { y: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  幅
                  <input
                    type="number"
                    min={1}
                    value={selectedArea.width}
                    onChange={(event) => updateArea(selectedArea.id, { width: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  高さ
                  <input
                    type="number"
                    min={1}
                    value={selectedArea.height}
                    onChange={(event) => updateArea(selectedArea.id, { height: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
              </div>

              {selectedArea.actionType === "external_link" ? (
                <label className="form-label">
                  遷移先URL
                  <input
                    value={selectedArea.url ?? ""}
                    onChange={(event) => updateArea(selectedArea.id, { url: event.target.value })}
                    className="form-input"
                    placeholder="https://example.com"
                  />
                </label>
              ) : null}

              {selectedArea.actionType === "handoff_category" ? (
                <label className="form-label">
                  依頼メニュー名
                  <input
                    value={selectedArea.handoffCategory ?? ""}
                    onChange={(event) => updateArea(selectedArea.id, { handoffCategory: event.target.value })}
                    className="form-input"
                    placeholder="taxi"
                  />
                </label>
              ) : null}

              {selectedArea.actionType === "ai_prompt" ? (
                <div className="space-y-4">
                  <label className="form-label">
                    チャットに出したい案内文
                    <textarea
                      value={selectedArea.prompt ?? ""}
                      onChange={(event) => updateArea(selectedArea.id, { prompt: event.target.value })}
                      className="form-input min-h-40"
                      placeholder={`例:
タクシーのご予約ですね！
・ご利用日時
・行き先
・注意事項
をご記載ください`}
                    />
                  </label>

                  <label className="form-label">
                    翻訳除外ワード
                    <textarea
                      value={formatProtectedTerms(selectedArea.protectedTerms)}
                      onChange={(event) =>
                        updateArea(selectedArea.id, { protectedTerms: parseProtectedTerms(event.target.value) })
                      }
                      className="form-input min-h-28"
                      placeholder={`例:
MIタクシー
Roomly旅館
プレミアムラウンジ`}
                    />
                  </label>

                  <div className="form-hint">
                    この案内文を自動翻訳するときに、そのまま残したい固有名詞を 1 行ずつ登録します。
                  </div>

                  <div className="form-hint">
                    手動翻訳を入力した言語は、その文言を自動翻訳より優先して表示します。空欄は未設定扱いで、自動翻訳にフォールバックします。
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {guestRichMenuTranslationLanguages.map((language) => (
                      <label key={`prompt-translation-${language}`} className="form-label">
                        {getTranslationLabel(language)} の手動翻訳
                        <textarea
                          value={getManualTranslation(selectedArea.translations, language)}
                          onChange={(event) =>
                            updateArea(selectedArea.id, {
                              translations: updateManualTranslation(selectedArea, language, event.target.value),
                            })
                          }
                          className="form-input min-h-28"
                          placeholder="未入力なら自動翻訳"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="form-hint space-y-3">
                    <p className="font-semibold text-stone-900">Guestチャット文面作成ルール</p>
                    <p>
                      ゲスト向けチャット文面は、スマホ表示を前提に短く・区切って作成してください。吹き出し本文の実効幅は約
                      <code>360px</code> 前後です。
                    </p>
                    <p>
                      基本ルール: 1文は短くする / 要点ごとに改行する / 箇条書きは
                      <code>・</code> でそろえる / 日時・場所・持ち物・注意事項は分けて書く
                    </p>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">悪い例</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-rose-900">{AI_PROMPT_BAD_EXAMPLE}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">良い例</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-emerald-900">{AI_PROMPT_GOOD_EXAMPLE}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">スマホ表示プレビュー</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        左側の AI 吹き出しとして、ゲストにどう見えるかを確認します。
                      </p>
                    </div>
                    <div className="ai-prompt-preview-shell">
                      <div className="ai-prompt-preview-bubble">
                        <p className="whitespace-pre-line">
                          {(selectedArea.prompt ?? "").trim() || "ここに入力した文面がプレビューされます。"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">言語別の保存前確認</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        手動翻訳があればそれを最優先で表示し、未設定の言語は日本語原文を自動翻訳に回す想定で確認します。
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <article className="rounded-2xl border border-[var(--border)] bg-stone-50 p-4">
                        <p className="text-xs font-semibold text-stone-500">保護語句</p>
                        <p className="mt-2 text-sm leading-6 text-stone-700 whitespace-pre-line">
                          {formatProtectedTerms(
                            mergeProtectedTerms(menu.translationProtectedTerms, selectedArea.protectedTerms),
                          ) || "なし"}
                        </p>
                      </article>
                      {(["ja", ...guestRichMenuTranslationLanguages] as const).map((language) => {
                        const manual = language === "ja" ? "" : getManualTranslation(selectedArea.translations, language);
                        const sourceText = getPrimaryText(selectedArea).trim();
                        const displayText = language === "ja" ? sourceText : manual || sourceText;

                        return (
                          <article key={`prompt-preview-${language}`} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-stone-950">
                                {language === "ja" ? "日本語" : getTranslationLabel(language)}
                              </p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${language === "ja"
                                ? "bg-stone-100 text-stone-700"
                                : manual
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"}`}>
                                {language === "ja" ? "原文" : manual ? "手動翻訳あり" : "自動翻訳"}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                              {displayText || "文言未入力"}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedArea.actionType === "ai_message" ? (
                <div className="space-y-4">
                  <div className="form-hint">
                    リッチメニュー押下後に、ゲストの発話ではなく AI 側の案内として表示する内容を設定します。画像だけ、文章だけ、画像+文章のどれでも使えます。
                  </div>

                  <label className="form-label">
                    AIが表示する案内文
                    <textarea
                      value={selectedArea.messageText ?? ""}
                      onChange={(event) => updateArea(selectedArea.id, { messageText: event.target.value })}
                      className="form-input min-h-32"
                      placeholder={`例:
アクセス方法はこちらです。
画像をご確認ください。

ご不明点があればそのままチャットでお知らせください。`}
                    />
                  </label>

                  <label className="form-label">
                    AIが表示する画像URL
                    <input
                      value={selectedArea.messageImageUrl ?? ""}
                      onChange={(event) => updateArea(selectedArea.id, { messageImageUrl: event.target.value })}
                      className="form-input"
                      placeholder="https://example.com/guide.png"
                    />
                  </label>

                  <label className="form-label">
                    翻訳除外ワード
                    <textarea
                      value={formatProtectedTerms(selectedArea.protectedTerms)}
                      onChange={(event) =>
                        updateArea(selectedArea.id, { protectedTerms: parseProtectedTerms(event.target.value) })
                      }
                      className="form-input min-h-28"
                      placeholder={`例:
MIタクシー
ゆの花の湯
プレミアムラウンジ`}
                    />
                  </label>

                  <div className="form-hint">
                    `messageText` を自動翻訳するときに翻訳したくない固有名詞を 1 行ずつ登録します。
                  </div>

                  <div className="form-hint">
                    手動翻訳を入力した言語は、その文言を自動翻訳より優先して表示します。空欄は未設定扱いで、自動翻訳にフォールバックします。
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {guestRichMenuTranslationLanguages.map((language) => (
                      <label key={`message-translation-${language}`} className="form-label">
                        {getTranslationLabel(language)} の手動翻訳
                        <textarea
                          value={getManualTranslation(selectedArea.translations, language)}
                          onChange={(event) =>
                            updateArea(selectedArea.id, {
                              translations: updateManualTranslation(selectedArea, language, event.target.value),
                            })
                          }
                          className="form-input min-h-28"
                          placeholder="未入力なら自動翻訳"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="form-label">
                    画像の説明テキスト
                    <input
                      value={selectedArea.messageImageAlt ?? ""}
                      onChange={(event) => updateArea(selectedArea.id, { messageImageAlt: event.target.value })}
                      className="form-input"
                      placeholder="例: 送迎バス案内"
                    />
                  </label>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">AI表示プレビュー</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        guest 側で、左側の AI メッセージとして出したい見え方の確認用です。
                      </p>
                    </div>
                    <div className="ai-prompt-preview-shell">
                      <div className="ai-prompt-preview-bubble space-y-3">
                        {selectedArea.messageImageUrl ? (
                          <img
                            src={selectedArea.messageImageUrl}
                            alt={selectedArea.messageImageAlt || "AI message preview"}
                            className="w-full rounded-2xl border border-[var(--border)] object-cover"
                          />
                        ) : null}
                        <p className="whitespace-pre-line">
                          {(selectedArea.messageText ?? "").trim() || "ここに入力した案内文が表示されます。"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="form-hint">
                    画像のみ設定して本文が空の場合、翻訳対象はありません。画像URLと画像説明だけを guest 側に表示する運用です。
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">言語別の保存前確認</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        手動翻訳があればそれを最優先で表示し、未設定の言語は日本語原文を自動翻訳に回す想定で確認します。
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <article className="rounded-2xl border border-[var(--border)] bg-stone-50 p-4">
                        <p className="text-xs font-semibold text-stone-500">保護語句</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">
                          {formatProtectedTerms(
                            mergeProtectedTerms(menu.translationProtectedTerms, selectedArea.protectedTerms),
                          ) || "なし"}
                        </p>
                      </article>
                      {(["ja", ...guestRichMenuTranslationLanguages] as const).map((language) => {
                        const manual = language === "ja" ? "" : getManualTranslation(selectedArea.translations, language);
                        const sourceText = getPrimaryText(selectedArea).trim();
                        const displayText = language === "ja" ? sourceText : manual || sourceText;

                        return (
                          <article key={`message-preview-${language}`} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-stone-950">
                                {language === "ja" ? "日本語" : getTranslationLabel(language)}
                              </p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${language === "ja"
                                ? "bg-stone-100 text-stone-700"
                                : manual
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"}`}>
                                {language === "ja" ? "原文" : manual ? "手動翻訳あり" : "自動翻訳"}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                              {displayText || "本文なし（画像のみ運用）"}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">上のボタン一覧、または画像上のボタン範囲を選択してください。</p>
          )}
        </div>

        <div className="panel p-5 md:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-lg font-semibold text-stone-950">4. 公開前プレビュー</p>
            <p className="mt-1 text-sm text-stone-600">guest 側で実際に使う並びと表示対象だけを確認してから保存します。</p>
          </div>

          <div className="mt-4 space-y-4">
            {menu.imageUrl ? (
              <div className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-stone-100" style={{ aspectRatio: `${menu.imageWidth} / ${menu.imageHeight}` }}>
                {pdfAsset ? (
                  <iframe src={previewAssetUrl} title="preview" className="h-full w-full border-0" />
                ) : (
                  <img src={previewAssetUrl} alt="preview" className="h-full w-full object-cover" />
                )}
                {visibleItems.map((item, index) => (
                  <div
                    key={`preview-${item.id}`}
                    className="absolute rounded-xl border border-white bg-black/18"
                    style={{
                      left: `${(item.x / menu.imageWidth) * 100}%`,
                      top: `${(item.y / menu.imageHeight) * 100}%`,
                      width: `${(item.width / menu.imageWidth) * 100}%`,
                      height: `${(item.height / menu.imageHeight) * 100}%`,
                    }}
                  >
                    <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[11px] font-semibold text-stone-900">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              {visibleItems.length === 0 ? (
                <p className="text-sm text-stone-500">公開対象のボタンはまだありません。</p>
              ) : (
                visibleItems.map((item, index) => (
                  <div key={`order-${item.id}`} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-stone-700">
                    {index + 1}. {item.label || "未設定"} / {getActionTypeLabel(item.actionType)}
                  </div>
                ))
              )}
            </div>

            {error ? <p className="form-feedback form-feedback-error whitespace-pre-line">{error}</p> : null}
            {success ? <p className="form-feedback form-feedback-success">{success}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveMenu}
                disabled={isSaving || isLoading || isUploading}
                className="form-submit"
              >
                {isSaving ? "保存中..." : "保存して guest 側へ反映"}
              </button>
              {isLoading ? <span className="text-sm text-stone-500">読み込み中...</span> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
