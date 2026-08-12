# src/ — 実装詳細

## ディレクトリ構成

```
src/
├── browser/
│   ├── dashboard/
│   │   ├── control/       # シナリオ・チーム選択パネル（プレイヤー workspace）
│   │   ├── player-info/   # チーム情報表示・編集・Graphic 適用パネル（プレイヤー workspace）
│   │   ├── result/        # 結果発表シナリオ選択・集計更新パネル（結果発表 workspace）
│   │   ├── data-source/   # 集計データの取得元切替・状態表示パネル（設定 workspace）
│   │   └── csv-reload/    # CSV 再読み込みパネル（設定 workspace）
│   ├── graphics/
│   │   ├── player/        # PlayerGraphic.tsx + FitText.tsx（共通コンポーネント）
│   │   ├── player1〜4/    # 各プレイヤー視点エントリ（index.tsx のみ）
│   │   └── result/        # 結果発表画面
│   ├── hooks/
│   │   └── useReplicant.ts
│   ├── global.css
│   └── global.d.ts
├── extension/
│   ├── index.ts               # エントリポイント
│   ├── eventGraphics.ts       # メッセージハンドラ・ランキング計算
│   ├── csvLoader.ts           # CSV 読み込みユーティリティ（集計データ以外）
│   ├── aggregationLoader.ts   # 集計データの読み込み（3形式を共通の型に正規化）
│   └── googleSheetsClient.ts  # サービスアカウント認証・シート取得
├── nodecg/
│   ├── replicants.d.ts    # ReplicantMap（名前 → 型）
│   └── messages.d.ts      # MessageMap（メッセージ名 → データ/結果型）
├── schemas/               # Zod スキーマ定義（ビルド時に JSON Schema も生成）
├── ranking.ts             # ランキングのソート（browser / extension 共用）
├── rules.ts               # ルール定数・スコア種別判定・表示色
├── teamName.ts            # チーム名の突合キー正規化
└── dataSource.ts          # データソースのラベルと Replicant 既定値（zod 非依存）
```

`src/` 直下の `ranking.ts` / `rules.ts` / `teamName.ts` / `dataSource.ts` は
browser・extension の両方から import される共用モジュール。
**extension から値として import されるため zod を import してはならない**
（zod は devDependencies にあり、extension バンドルは node_modules を external 化するので
実行時に解決できなくなる）。型が必要な場合は `import type` で `../schemas` から取る。

**ビルド成果物**（直接編集しない）: `/dashboard`, `/graphics`, `/extension`, `/shared`, `/schemas`

## Replicant 一覧

| 名前 | 型 | 用途 |
|---|---|---|
| `playerScreen` | `PlayerScreen` | 表示中のチーム名表示・プレイヤー4名・ルール |
| `resultScreen` | `ResultScreen` | 表示中のシナリオ名・ルール・ランキング上位3 |
| `broadcastSchedule` | `BroadcastSchedule` | 全シナリオ×全チームのエントリ一覧 |
| `scenarioList` | `ScenarioList` | シナリオ一覧（順序: 前半 → 休憩企画 → 後半） |
| `aggregationData` | `AggregationData` | 集計データの全行（ランキング計算用） |
| `dataSourceConfig` | `DataSourceConfig` | 集計データの取得元（`csv` / `sheet`）と URL・シート名 |
| `aggregationStatus` | `AggregationStatus` | 集計データの読み込み状況（件数・列の対応・エラー・警告） |
| `selectedPlayerRowIndex` | `number` | control パネルで選択中の broadcastSchedule インデックス |
| `selectedResultScenarioNumber` | `number \| null` | 結果発表パネルで選択中のシナリオ番号。**これを変えると結果 Graphic が即切り替わる**（null は先頭シナリオ扱い） |

`aggregationStatus` はエラーを報告するためのチャンネルなので、**それ自身がスキーマ検証で
throw してはならない**（`.value =` は検証失敗で throw する）。全フィールドを `.default()` 付きの
プリミティブに保つこと。

## Message 一覧

| 名前 | payload | 処理 |
|---|---|---|
| `setPlayerScreenDirect` | `{ teamName, players, rule }` | 渡された値をそのまま `playerScreen` に反映（player-info「適用」ボタン用） |
| `reloadCsvData` | なし | CSV を再読み込みし、続けて集計データも再取得 |
| `setDataSourceConfig` | `{ type, url, sheetTitle }` | 取得元を保存し、そのまま集計データを再取得 |
| `reloadAggregation` | なし | 現在の取得元で集計データのみ再取得 |

`setDataSourceConfig` は「Replicant への保存 → ロード → ack」を Extension 側で一貫して行う。
パネルが Replicant を直接書いてから `reloadAggregation` を送る構成にすると、
socket 上の順序が保証されず競合する。

## Graphic 適用フロー（プレイヤー画面）

1. `control` パネルでシナリオ・チームを選択 → `selectedPlayerRowIndex` Replicant が更新される
2. `player-info` パネルに選択チームの情報が自動ロードされる
3. `player-info` パネルの「適用」ボタンを押すと Graphic が更新される（`setPlayerScreenDirect` メッセージ）

## Graphic 反映フロー（結果発表画面）

**適用ボタンは無く、選択が即 Graphic に出る。** プレイヤー画面とは流儀が違うので注意。

1. `result` パネルでシナリオを選択 → `selectedResultScenarioNumber` Replicant が更新される
2. Extension の `syncResultScreen()` が「選択シナリオ × ロード済み集計データ」から
   `resultScreen` を作り直す → Graphic が切り替わる
3. `syncResultScreen()` を通る契機は 3 つ:
   選択変更（Replicant の `change`）／集計データ再取得（起動時・「更新」・「CSV リロード」）／CSV 再読込
4. CSV か集計データが未ロードのうちは **`resultScreen` に代入しない**（空のランキングで
   配信中の表示を壊さないため）。ロード完了時に改めて呼ばれるので取りこぼさない

## ランキング計算ロジック（`eventGraphics.ts`）

| ルール | スコア | ソート |
|---|---|---|
| `ローポイント` | 赤イクラ | 昇順 |
| `赤乱獲` | 赤イクラ | 降順 |
| それ以外 | 金イクラ | 降順 |

メンバー 4 名は `broadcastSchedule` からチーム名で引く。突合キーは `teamName.ts` で
NFKC 正規化 + 空白除去する（集計データのチーム名は入力経路によって表記がブレるため）。

## 集計データの読み込み（`aggregationLoader.ts`）

取得元は `dataSourceConfig` で切り替わる（`csv` / `sheet`）。仕様は
[`data/README.md`](../data/README.md#集計データ) を参照。実装上の要点:

- **CSV 部（ルール・配信卓・チーム情報）は同期、集計データは非同期**。
  未ロード状態は `aggregation === undefined` で表し、`[]`（0 件ロード済み）と区別する。
  `syncResultScreen()` はこれを見て未ロード中の反映を見送る（見送らないと空のランキングが
  スキーマ的に valid なまま本番の結果画面に出てしまう）。
- `listenFor` の登録をすべて済ませてから集計ロードを開始する（起動直後のメッセージ取りこぼし防止）。
- `loadGeneration` で世代を管理し、遅れて返った古いロードで新しい結果を上書きしない。
- `loadAggregation()` は **throw せず** `{ ok: true, data } | { ok: false, error }` を返す。
  失敗時は `aggregationData` に一切代入せず、配信中のデータを維持する。
- 読むのは `集計.csv` 基準の 4 列（チーム名 / シナリオ / 合計金イクラ納品数 / 合計赤イクラ取得数）
  のみで、フォームの回答シートも集計botのシートも同じ経路で処理する（形式ごとの分岐を持たない）。
- 列はヘッダー名の**完全一致**で解決する（別名は候補として列挙）。部分一致は許さない
  ＝フォームの注意書き列を誤って拾わせない。1 つでも解決できなければ 0 件成功にせずエラーにする。
- 同一チーム×シナリオの重複は**常に**「後の行が勝ち」で集約する。ソース種別で分岐させない
  （分岐させると CSV とシートで結果が食い違う）。

## BroadcastRow の主要フィールド

| フィールド | 内容 |
|---|---|
| `teamName` | 実際のチーム名 |
| `displayTeamName` | Graphic に表示する名前。`配信卓.csv` の「シナリオ表示名」列が優先される |
| `isBroadcastTable` | 配信卓として指定されたチームか（control パネルのデフォルト選択に使用） |

## 新機能追加の標準フロー

1. `src/schemas/xxx.ts` に Zod スキーマを定義し `src/schemas/index.ts` からエクスポート
2. `src/nodecg/replicants.d.ts` または `messages.d.ts` に型を追加
3. `src/browser/dashboard/<name>/` にパネルを作成（`index.tsx` + `App.tsx` + `style.css`）
4. `src/browser/graphics/<name>/` に Graphic を作成（同上）
5. `src/extension/` に処理を実装し `index.ts` から呼び出す
6. `package.json` の `nodecg.dashboardPanels` / `nodecg.graphics` に登録

## 主要パターン

### useReplicant フック
```tsx
const [value, setValue] = useReplicant('replicantName');
// value: undefined（初期ロード中）→ 同期後に値が入る
```

### Dashboard のローカルステート分離
Replicant を直接編集せず、ローカルステートで編集して「適用」ボタンで反映する。
選択変更時の初回ロードのみ `useRef` で制御する。

**例外: `result` パネル**は選択をローカルステートに持たず `selectedResultScenarioNumber`
Replicant を直接書く（＝選択が即 Graphic に出る）。「操作を溜めて適用する」パネルではなく
「選択そのものが配信状態」だからで、Extension 側が変更を監視して `resultScreen` を作り直す。

### Message 通信
```tsx
// Dashboard 側
await nodecg.sendMessage('messageName', payload);

// Extension 側
nodecg.listenFor('messageName', (data, ack) => {
  if (ack && !ack.handled) ack(null, { success: true });
});
```
