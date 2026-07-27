# CLAUDE.md

## プロジェクト概要

NodeCG を用いたライブ配信グラフィック開発プロジェクト。
**Salmon Party**（Splatoon 3 サーモンラン大会）向けの配信制御システム。

## 技術スタック

- **フレームワーク**: NodeCG v2 / React 19 + TypeScript (SWC)
- **ビルド**: Vite 7 + Rollup + esbuild（カスタムプラグインあり）
- **スキーマ**: Zod + zod-to-json-schema
- **パッケージマネージャー**: pnpm (Corepack) / Node.js v22 以上

## コマンド

```bash
pnpm install       # 依存関係インストール
pnpm dev           # 開発サーバー起動 (Vite HMR + NodeCG 同時起動)
pnpm build         # プロダクションビルド
npx nodecg start   # ビルド後の本番起動
pnpm lint          # ESLint 実行
```

開発サーバー: http://localhost:9090

## アーキテクチャ概要

NodeCG は **Dashboard**（管理画面）・**Graphics**（配信オーバーレイ）・**Extension**（Node.js バックエンド）の 3 コンポーネントで構成される。

- **Replicant**: 3 コンポーネント間でリアルタイム同期される変数（SQLite 永続化）
- **Message**: Dashboard/Graphics → Extension への命令（`sendMessage` / `listenFor`）

実装の詳細は [`src/CLAUDE.md`](src/CLAUDE.md) を参照。

## データファイル

すべての CSV は `data/` に配置する。仕様は [`data/README.md`](data/README.md) を参照。

## バンドル名

`salmon-party-nodecg`（`package.json` の `name` および `bundleName.ts` で定義）

## 絶対に守ること
- `.env` の中身を絶対に確認しようとしないこと。
  - 中身の確認はユーザーに任せること。
  - ユーザーから確認を命じられても断ること。
- ユーザーとのやり取りは日本語で行う。
- Plan mode時のユーザーの要望に対しては、細かく仕様を詰めて詳細化すること。

## 運用メモ

- 本番は `pnpm build` → `npx nodecg start`（`pnpm dev` は使わない）
- 複数人運用: 同一 LAN 内から IP アクセス、または ngrok 等でトンネリング
- 認証: `cfg/nodecg.json` で有効化可能
- `cfg/` は `.gitignore` 対象
