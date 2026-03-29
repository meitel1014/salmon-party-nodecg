# src/ — 実装詳細

## ディレクトリ構成

```
src/
├── browser/
│   ├── dashboard/
│   │   ├── control/       # シナリオ・チーム選択パネル（プレイヤー workspace）
│   │   ├── player-info/   # チーム情報表示・編集・Graphic 適用パネル（プレイヤー workspace）
│   │   ├── result/        # 結果発表シナリオ選択・適用パネル（結果発表 workspace）
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
│   ├── index.ts           # エントリポイント
│   ├── eventGraphics.ts   # メッセージハンドラ・ランキング計算
│   └── csvLoader.ts       # CSV 読み込みユーティリティ
├── nodecg/
│   ├── replicants.d.ts    # ReplicantMap（名前 → 型）
│   └── messages.d.ts      # MessageMap（メッセージ名 → データ/結果型）
└── schemas/               # Zod スキーマ定義（ビルド時に JSON Schema も生成）
```

**ビルド成果物**（直接編集しない）: `/dashboard`, `/graphics`, `/extension`, `/shared`, `/schemas`

## Replicant 一覧

| 名前 | 型 | 用途 |
|---|---|---|
| `playerScreen` | `PlayerScreen` | 表示中のチーム名表示・プレイヤー4名・ルール |
| `resultScreen` | `ResultScreen` | 表示中のシナリオ名・ルール・ランキング上位3 |
| `broadcastSchedule` | `BroadcastSchedule` | 全シナリオ×全チームのエントリ一覧 |
| `scenarioList` | `ScenarioList` | シナリオ一覧（順序: 前半 → 休憩企画 → 後半） |
| `aggregationData` | `AggregationData` | 集計.csv の全行（ランキング計算用） |
| `selectedPlayerRowIndex` | `number` | control パネルで選択中の broadcastSchedule インデックス |

## Message 一覧

| 名前 | payload | 処理 |
|---|---|---|
| `setPlayerScreenDirect` | `{ teamName, players, rule }` | 渡された値をそのまま `playerScreen` に反映（player-info「適用」ボタン用） |
| `setResultScreen` | `{ scenarioNumber: number }` | ランキング計算して `resultScreen` に反映 |
| `reloadCsvData` | なし | CSV を再読み込みして全 Replicant を再同期 |

## Graphic 適用フロー（プレイヤー画面）

1. `control` パネルでシナリオ・チームを選択 → `selectedPlayerRowIndex` Replicant が更新される
2. `player-info` パネルに選択チームの情報が自動ロードされる
3. `player-info` パネルの「適用」ボタンを押すと Graphic が更新される（`setPlayerScreenDirect` メッセージ）

## ランキング計算ロジック（`eventGraphics.ts`）

| ルール | スコア | ソート |
|---|---|---|
| `ローポイント` | 赤イクラ | 昇順 |
| `赤乱獲` | 赤イクラ | 降順 |
| それ以外 | 金イクラ | 降順 |

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

### Message 通信
```tsx
// Dashboard 側
await nodecg.sendMessage('messageName', payload);

// Extension 側
nodecg.listenFor('messageName', (data, ack) => {
  if (ack && !ack.handled) ack(null, { success: true });
});
```
