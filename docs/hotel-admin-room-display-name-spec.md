# Hotel Admin 実装指示書: 客室表示名 `display_name`

## 目的

ホテル管理画面側で、各客室に現場向け表示名を設定できるようにする。

例:

- `101` -> `梅の部屋`
- `102` -> `松の部屋`

内部識別子は引き続き `room_number` を使う。
表示用だけ `display_name` を追加する。

## 背景

- QR は `101`, `102` のような固定の部屋番号ベースで運用する
- ただしホテル現場では、部屋名で認識したいケースがある
- そのため、通知・着信・管理画面では `101 (梅の部屋)` のように出せるようにしたい

## データ構造

Firestore `rooms` ドキュメントに以下を持たせる。

- `room_id: string`
- `hotel_id: string`
- `room_number: string`
- `display_name: string | null`
- `floor: string | null`
- `room_type: string | null`

`display_name` は任意入力。未設定なら `null` でよい。

## ホテル管理画面で必要な機能

### 1. 客室一覧で表示名を編集できること

各ホテルの客室一覧で、少なくとも以下を表示する。

- 部屋番号 `room_number`
- 表示名 `display_name`
- 保存ボタン

表示例:

- `101 | 梅の部屋`
- `102 | 松の部屋`

### 2. 表示名は後から何度でも更新できること

- 部屋番号自体は編集させなくてよい
- まずは `display_name` のみ編集対象でよい
- 未入力に戻せるように、空文字保存で `null` 扱いにしてよい

### 3. 通知や着信画面では両方表示すること

表示ルール:

- `display_name` がある場合: `101 (梅の部屋)`
- `display_name` がない場合: `101`

## 実装方針

### 必須

- `room_number` は内部キーとして維持する
- `display_name` は表示専用として扱う
- ゲスト導線や QR 再発行は不要

### 非必須

- 並び替え
- 一括編集
- CSV 入出力
- 部屋番号の変更

## 参考実装

この repo では `display_name` のデータ構造はすでに追加済み。

参考ファイル:

- [src/lib/server/roomly-admin.ts](/Users/marina/Desktop/roomly-admin/src/lib/server/roomly-admin.ts)
- [src/app/api/admin/hotels/[hotelId]/rooms/route.ts](/Users/marina/Desktop/roomly-admin/src/app/api/admin/hotels/[hotelId]/rooms/route.ts)

注意:

- この repo の `PATCH /api/admin/hotels/[hotelId]/rooms` は `super_admin` 前提
- ホテル管理画面では、そのまま流用せず、`hotel_admin` 権限に合わせた更新導線を別途持つこと

## 保存時の挙動

更新対象:

- `rooms/{roomId}.display_name`
- `rooms/{roomId}.updated_at`

保存ルール:

- 入力値は trim する
- 空文字は `null` 保存でよい
- `hotel_id` が一致する客室のみ更新可能にする

## 受け入れ条件

- ホテル管理画面で各客室の表示名を編集できる
- 保存後、再読込しても値が残る
- 通知・着信・滞在表示などで `101 (梅の部屋)` 形式が使える
- `display_name` 未設定でも既存運用は壊れない

## 最小リリース範囲

今回のMVPではここまでで十分:

1. 客室一覧に表示名入力欄を追加
2. 保存時に `display_name` を更新
3. ホテル側の主要画面で `room_number + display_name` を表示

これ以上の運用機能は、必要になってから追加でよい。
