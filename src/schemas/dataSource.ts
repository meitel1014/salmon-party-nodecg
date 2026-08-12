import { z } from 'zod';

/**
 * 集計データの取得元。
 *
 * Googleフォームの回答シートも集計botのシートも「特定の4列を読むスプレッドシート」に
 * 過ぎないため、種別は分けず `sheet` に統合してURLだけで指定する。
 */
export const dataSourceTypeSchema = z.enum(['csv', 'sheet']);

export const dataSourceConfigSchema = z.object({
  /** csv: data/集計.csv / sheet: Googleスプレッドシート（フォームの回答／集計bot 共通） */
  type: dataSourceTypeSchema.default('csv'),
  /** スプレッドシートのURL（そのまま貼り付ければよい。IDは正規表現で抽出する） */
  url: z.string().default(''),
  /** ワークシート（タブ）名。空の場合は先頭シートを使う */
  sheetTitle: z.string().default(''),
});

/**
 * 集計データの読み込み状況。Dashboard のデータソースパネルに表示する。
 * エラーを報告するためのチャンネルなので、これ自身がスキーマ検証で throw しないよう
 * 全フィールドを .default() 付きのプリミティブに保つ（Date や null を使わない）。
 */
export const aggregationStatusSchema = z.object({
  state: z.enum(['loading', 'loaded', 'error']).default('loading'),
  sourceType: dataSourceTypeSchema.default('csv'),
  rowCount: z.number().default(0),
  /** シナリオ番号が数値でない等で読み飛ばした行数 */
  skippedCount: z.number().default(0),
  /** ISO 文字列。空文字は未読み込み */
  loadedAt: z.string().default(''),
  /** 空文字ならエラーなし */
  error: z.string().default(''),
  warnings: z.array(z.string()).default([]),
  /** 「チーム名→◯◯ / シナリオ→◯◯ / 合計金イクラ納品数→◯◯ / …」。列解決の目視確認用 */
  resolvedColumns: z.string().default(''),
});

export type DataSourceType = z.infer<typeof dataSourceTypeSchema>;
export type DataSourceConfig = z.infer<typeof dataSourceConfigSchema>;
export type AggregationStatus = z.infer<typeof aggregationStatusSchema>;
