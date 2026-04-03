"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  createGuestRichMenuTemplateItems,
  guestRichMenuActionTypes,
  type GuestRichMenuArea,
  type GuestRichMenuDoc,
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
    enabled: false,
    version: 0,
    imageUrl: "",
    imageWidth: recommendedWidth,
    imageHeight: recommendedHeight,
    updatedAt: null,
    items: [],
  };
}

function getActionTypeLabel(actionType: GuestRichMenuArea["actionType"]) {
  switch (actionType) {
    case "external_link":
      return "外部リンク";
    case "handoff_category":
      return "カテゴリ引き継ぎ";
    case "language":
      return "言語変更";
    case "ai_prompt":
      return "AI プロンプト";
    case "human_handoff":
      return "有人対応";
    default:
      return actionType;
  }
}

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
      return;
    }

    if (selectedHotelId === initialHotelId && initialMenu) {
      setMenu(initialMenu);
      setSelectedAreaId(initialMenu.items[0]?.id ?? null);
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
      } catch (loadError) {
        if (!cancelled) {
          setMenu(createEmptyMenu());
          setSelectedAreaId(null);
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
        imageWidth: payload.image!.imageWidth,
        imageHeight: payload.image!.imageHeight,
      }));
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
      enabled: menu.enabled,
      version: menu.version,
      imageUrl: menu.imageUrl,
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
            <p className="text-lg font-semibold text-stone-950">画像キャンバス</p>
            <p className="mt-1 text-sm text-stone-600">
              ドラッグで移動、右下ハンドルでリサイズできます。推奨サイズは 1200x810 です。
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
            対象ホテル
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
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageUpload} />
              {isUploading ? "アップロード中..." : "画像アップロード"}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={menu.enabled}
                onChange={(event) => updateMenu({ enabled: event.target.checked })}
              />
              guest 側で有効化
            </label>
            <span className="text-xs text-stone-500">
              version {menu.version || 0}
              {menu.updatedAt ? ` / 最終更新 ${new Date(menu.updatedAt).toLocaleString()}` : ""}
            </span>
          </div>

          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-white/60 p-3">
            {menu.imageUrl ? (
              <div
                ref={canvasRef}
                className="relative overflow-hidden rounded-[22px] bg-stone-100"
                style={{ aspectRatio: `${menu.imageWidth} / ${menu.imageHeight}` }}
                onClick={() => setSelectedAreaId(null)}
              >
                <img src={menu.imageUrl} alt="guest rich menu" className="h-full w-full object-cover" />
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
                先に画像をアップロードしてください。画像がなくてもテンプレートや領域追加はできますが、最終保存には
                imageUrl が必須です。
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
              guest 側は <code>enabled === true</code> かつ <code>visible === true</code> の項目だけを
              <code>sortOrder</code> 昇順で読みます。
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="panel p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-lg font-semibold text-stone-950">項目一覧</p>
              <p className="mt-1 text-sm text-stone-600">表示順、表示状態、選択中の項目を管理します。</p>
            </div>
            <button
              type="button"
              onClick={normalizeSortOrders}
              className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              sortOrder を採番
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sortedItems.length === 0 ? (
              <p className="text-sm text-stone-500">まだ項目はありません。</p>
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
            <p className="text-lg font-semibold text-stone-950">選択中の項目</p>
            <p className="mt-1 text-sm text-stone-600">位置、サイズ、アクション詳細を編集します。</p>
          </div>

          {selectedArea ? (
            <div className="mt-4 space-y-4">
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
                label
                <input
                  value={selectedArea.label}
                  onChange={(event) => updateArea(selectedArea.id, { label: event.target.value })}
                  className="form-input"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  actionType
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
                  sortOrder
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.sortOrder}
                    onChange={(event) => updateArea(selectedArea.id, { sortOrder: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={selectedArea.visible}
                  onChange={(event) => updateArea(selectedArea.id, { visible: event.target.checked })}
                />
                visible
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-label">
                  x
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.x}
                    onChange={(event) => updateArea(selectedArea.id, { x: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  y
                  <input
                    type="number"
                    min={0}
                    value={selectedArea.y}
                    onChange={(event) => updateArea(selectedArea.id, { y: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  width
                  <input
                    type="number"
                    min={1}
                    value={selectedArea.width}
                    onChange={(event) => updateArea(selectedArea.id, { width: Number(event.target.value) || 0 })}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  height
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
                  url
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
                  handoffCategory
                  <input
                    value={selectedArea.handoffCategory ?? ""}
                    onChange={(event) => updateArea(selectedArea.id, { handoffCategory: event.target.value })}
                    className="form-input"
                    placeholder="taxi"
                  />
                </label>
              ) : null}

              {selectedArea.actionType === "ai_prompt" ? (
                <label className="form-label">
                  prompt
                  <textarea
                    value={selectedArea.prompt ?? ""}
                    onChange={(event) => updateArea(selectedArea.id, { prompt: event.target.value })}
                    className="form-input min-h-32"
                    placeholder="ここに AI へ渡す prompt を入力"
                  />
                </label>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">左または上の一覧から項目を選択してください。</p>
          )}
        </div>

        <div className="panel p-5 md:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-lg font-semibold text-stone-950">プレビュー</p>
            <p className="mt-1 text-sm text-stone-600">guest 側で使う visible 項目だけを sortOrder 昇順で確認します。</p>
          </div>

          <div className="mt-4 space-y-4">
            {menu.imageUrl ? (
              <div className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-stone-100" style={{ aspectRatio: `${menu.imageWidth} / ${menu.imageHeight}` }}>
                <img src={menu.imageUrl} alt="preview" className="h-full w-full object-cover" />
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
                <p className="text-sm text-stone-500">表示対象の項目はまだありません。</p>
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
                {isSaving ? "保存中..." : "保存"}
              </button>
              {isLoading ? <span className="text-sm text-stone-500">読み込み中...</span> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
