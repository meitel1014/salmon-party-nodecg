# CLAUDE.md

## プロジェクト概要

NodeCG を用いたライブ配信グラフィック開発プロジェクト。
[Zenn Book「NodeCG 配信グラフィック開発入門」](https://zenn.dev/bozitoma/books/nodecg-react-overlay) のテンプレートリポジトリをベースに、
**Salmon Party**（Splatoon 3 サーモンラン大会）向けの配信制御システムとして開発している。

## 技術スタック

- **フレームワーク**: NodeCG v2
- **フロントエンド**: React 19 + TypeScript (SWC)
- **ビルド**: Vite 7 + カスタムプラグイン (`vite-plugin-nodecg.mts`, `vite-plugin-nodecg-schemas.mts`)
- **Extension ビルド**: Rollup + esbuild
- **スキーマ / バリデーション**: Zod + zod-to-json-schema
- **型定義**: ts-nodecg
- **パッケージマネージャー**: pnpm (Corepack)
- **Node.js**: v22 以上

## コマンド

```bash
pnpm install       # 依存関係インストール
pnpm dev           # 開発サーバー起動 (Vite HMR + NodeCG 同時起動)
pnpm build         # プロダクションビルド
npx nodecg start   # ビルド後の本番起動
pnpm lint          # ESLint 実行
```

- 開発サーバー: http://localhost:9090
- Graphics URL: `http://localhost:9090/bundles/salmon-party-nodecg/graphics/<name>.html`

## アーキテクチャ

NodeCG は 3 つのコンポーネントと 2 つの通信手段で構成される。

### 3 つのコンポーネント
- **Dashboard**: スタッフが操作する管理画面 (`src/browser/dashboard/`)
- **Graphics**: OBS 等で表示する配信オーバーレイ (`src/browser/graphics/`)
- **Extension**: Node.js で動作するバックエンド (`src/extension/`)

### 2 つの通信手段
- **Replicant**: Dashboard / Graphics / Extension 間でリアルタイム同期される変数。SQLite で永続化される。
- **Message**: Dashboard/Graphics から Extension への命令。`sendMessage` / `listenFor` で通信する。

## ディレクトリ構成

```
src/
├── browser/
│   ├── dashboard/
│   │   └── control/          # 配信制御パネル
│   │       ├── index.tsx
│   │       ├── App.tsx
│   │       └── style.css
│   ├── graphics/
│   │   ├── player/           # プレイヤー画面 共通コンポーネント
│   │   │   ├── PlayerGraphic.tsx
│   │   │   ├── FitText.tsx   # テキストを幅に収まるよう自動縮小するコンポーネント
│   │   │   └── style.css
│   │   ├── player1/ … player4/   # 各プレイヤー視点エントリ (*/index.tsx)
│   │   └── result/           # 結果発表画面
│   │       ├── index.tsx
│   │       ├── App.tsx
│   │       └── style.css
│   ├── hooks/
│   │   └── useReplicant.ts   # Replicant 購読フック
│   ├── global.css            # リセット CSS
│   └── global.d.ts           # グローバル型定義
├── extension/
│   ├── index.ts              # エントリポイント
│   ├── eventGraphics.ts      # メッセージハンドラ・ランキング計算
│   ├── csvLoader.ts          # CSV 読み込みユーティリティ
│   └── nodecg.d.ts           # NodeCG 型定義（サーバー側）
├── nodecg/
│   ├── replicants.d.ts       # ReplicantMap (名前 → 型のマッピング)
│   └── messages.d.ts         # MessageMap (メッセージ名 → データ/結果型のマッピング)
├── schemas/
│   ├── index.ts              # エクスポート集約
│   ├── bundleConfig.ts
│   ├── playerScreen.ts
│   ├── resultScreen.ts
│   ├── broadcastSchedule.ts
│   └── scenarioList.ts
├── template.html
└── vite-env.d.ts

sample-data/
└── data/
    ├── 配信卓.csv     # 配信スケジュール（シナリオ番号・チーム名・プレイヤー4名・ルール）
    ├── scenario.csv   # シナリオ一覧（番号・表示名・ルール・セクション）
    └── 集計.csv       # シナリオ別チームスコア（チーム名・金イクラ・赤イクラ）
```

**重要**: ルートの `/dashboard`, `/graphics`, `/extension`, `/shared`, `/schemas` はビルド成果物。直接編集しない。

## 現在の実装状態

### Dashboard

| パネル | ファイル | 機能 |
|---|---|---|
| Control | `control.html` | プレイヤー画面切り替え・結果発表切り替え・CSV 再読み込み |

### Graphics

| ページ | ファイル | 内容 |
|---|---|---|
| Player 1〜4 | `player1.html`〜`player4.html` | プレイヤー名オーバーレイ（1920×1080）。`playerIndex={0〜3}` で自分を active 強調表示 |
| Result | `result.html` | 結果発表画面（1920×1080）。ランキング上位3チームを表示。ルール名の文字色がルール種別で変化 |

### Replicant

| 名前 | 型 | 用途 |
|---|---|---|
| `playerScreen` | `PlayerScreen` | 表示中のチーム名・プレイヤー4名・ルール |
| `resultScreen` | `ResultScreen` | 表示中のシナリオ名・ルール・ランキング上位3 |
| `broadcastSchedule` | `BroadcastSchedule` | 配信卓.csv の全行 |
| `scenarioList` | `ScenarioList` | scenario.csv の全行 |

### Message

| 名前 | payload | 処理 |
|---|---|---|
| `setPlayerScreen` | `{ rowIndex: number }` | `broadcastSchedule[rowIndex]` を `playerScreen` に反映 |
| `setResultScreen` | `{ scenarioNumber: number }` | 集計.csv からランキング計算し `resultScreen` に反映 |
| `reloadCsvData` | なし | CSV を再読み込みして `broadcastSchedule` / `scenarioList` を再同期 |

### ランキング計算ロジック（`src/extension/eventGraphics.ts`）

| ルール | スコア列 | ソート |
|---|---|---|
| `ローポイント` | 赤イクラ | 昇順 |
| `赤乱獲` | 赤イクラ | 降順 |
| それ以外（乱獲・姫鮭 等） | 金イクラ | 降順 |

## CSV データ構造

CSV ファイルは `sample-data/data/` に配置し、Extension 起動時および `reloadCsvData` メッセージ受信時に読み込まれる。

### 配信卓.csv

| 列 | 内容 |
|---|---|
| 0 | シナリオ番号（空欄の場合は null） |
| 1 | チーム名 |
| 2〜5 | プレイヤー名 × 4 |
| 6 | ルール |

### scenario.csv

| 列 | 内容 |
|---|---|
| 0 | シナリオ番号 |
| 2 | 表示名 |
| 3 | ルール |
| 6 | セクション（部） |

### 集計.csv

| 列 | 内容 |
|---|---|
| 4 | チーム名 |
| 5 | シナリオ番号 |
| 6 | 合計金イクラ納品数 |
| 7 | 合計赤イクラ取得数 |

## 新機能追加の標準フロー

1. **スキーマ定義** (`src/schemas/xxx.ts`): Zod でデータ構造を定義し、`src/schemas/index.ts` からエクスポート
2. **型定義の紐付け** (`src/nodecg/`):
   - Replicant: `replicants.d.ts` の `ReplicantMap` に追加
   - Message: `messages.d.ts` の `MessageMap` に追加
3. **フロントエンド** (`src/browser/`):
   - `dashboard/<name>/index.tsx` + `App.tsx` を作成 (操作画面)
   - `graphics/<name>/index.tsx` + `App.tsx` を作成 (表示画面)
   - `useReplicant` フックで Replicant を読み書き
4. **バックエンド** (`src/extension/`):
   - 機能ごとにファイル分割し、`index.ts` から呼び出す
   - `nodecg.listenFor` で Message を受信、`nodecg.Replicant` で状態管理
5. **マニフェスト登録** (`package.json`):
   - `nodecg.dashboardPanels` にパネル設定を追加
   - `nodecg.graphics` にグラフィックス設定を追加

## 主要パターン

### useReplicant フック
```tsx
const [value, setValue] = useReplicant('replicantName');
// value: undefined (初期ロード中) → 同期後に値が入る
// setValue: Replicant の値を更新
```

### Dashboard のローカルステート分離パターン
Dashboard では Replicant を直接編集せず、ローカルステート (`localData`) で編集し、「更新」ボタンで Replicant に反映する。初回ロード時のみ `useRef` で制御して Replicant の値をローカルに取り込む。

### Message 通信
```tsx
// Dashboard 側: 送信
const result = await nodecg.sendMessage('messageName', payload);

// Extension 側: 受信
nodecg.listenFor('messageName', (data, ack) => {
  // 処理
  if (ack && !ack.handled) ack(null, { success: true });
});
```

### Bundle Configuration
- 設定スキーマ: `src/schemas/bundleConfig.ts`
- 設定ファイル: `cfg/<バンドル名>.json` (バンドル名は `package.json` の `name` と一致)
- Extension から `nodecg.bundleConfig` でアクセス
- API キーや URL など、環境依存の値を管理する

## バンドル名

`salmon-party-nodecg` (`bundleName.ts` および `package.json` の `name` で定義)

## 運用メモ

- 本番は `pnpm build` → `npx nodecg start` で起動 (`pnpm dev` は使わない)
- 複数人運用: 同一 LAN 内から IP でアクセス、または ngrok 等のトンネリング
- 認証: `cfg/nodecg.json` でログイン機能を有効化可能
- `cfg/` ディレクトリは `.gitignore` 対象
