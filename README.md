# Salmon Party — 配信制御システム

Splatoon 3 サーモンラン大会「Salmon Party！」向けの NodeCG 配信グラフィックシステムです。
プレイヤー名オーバーレイと結果発表画面を、ダッシュボードから操作できます。


## 必要環境

- Node.js v22 以上
- pnpm（`corepack enable` で有効化）


## セットアップ

```bash
pnpm install
pnpm build
npx nodecg start
```

ブラウザで http://localhost:9090 を開くとダッシュボードにアクセスできます。


## 大会前の準備：CSVファイルの編集

`data/` ディレクトリ内の CSV を大会情報に合わせて編集します。
各ファイルの列仕様は [`data/README.md`](data/README.md) を参照してください。

| ファイル | 内容 |
|---|---|
| `data/配信卓.csv` | シナリオごとの配信卓チームと Graphic 表示名 |
| `data/ルール.csv` | シナリオごとのルール |
| `data/前半チーム情報.csv` | 前半シナリオのチーム別メンバー構成 |
| `data/後半チーム情報.csv` | 後半チームの固定メンバー |
| `data/休憩企画.csv` | 休憩企画のチーム情報（1行=1企画） |

また、`sample-data/data/` の以下のファイルも更新してください。

| ファイル | 内容 |
|---|---|
| `sample-data/data/scenario.csv` | シナリオ一覧（番号・表示名・セクション） |
| `sample-data/data/集計.csv` | 結果発表用のシナリオ別スコアデータ |

CSV 編集後は、ダッシュボードの **設定 → CSV リロード** パネルからデータを再読み込みできます。


## 配信中の操作

### プレイヤー画面の切り替え（OBS: player1〜4 ソース）

1. ダッシュボードの **プレイヤー** workspace を開く
2. **プレイヤー画面** パネルで ← → ボタンを押してシナリオを選択
3. ドロップダウンで配信するチームを選択（配信卓のチームがデフォルト）
4. **チーム情報** パネルに選択チームの情報が自動で読み込まれる
5. 内容を確認・必要に応じて修正し、「**適用**」ボタンを押す → Graphic が更新される

> 緊急時は **チーム情報** パネルのフィールドを直接編集してから「適用」することで、CSV を変更せずに上書きできます。

### 結果発表画面の切り替え（OBS: result ソース）

1. ダッシュボードの **結果発表** workspace を開く
2. **結果発表** パネルで ← → ボタンを押してシナリオを選択
3. ランキングを確認し、「**適用**」ボタンを押す → Graphic が更新される

## ライセンス
本コードは [bozitoma/nodecg-template-with-vite](https://github.com/bozitoma/nodecg-template-with-vite)（MIT License, Copyright (c) 2026 bozitoma）をベースに作成しています。
