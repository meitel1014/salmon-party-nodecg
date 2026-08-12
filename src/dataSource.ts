import type { AggregationStatus, DataSourceConfig, DataSourceType } from './schemas';

/**
 * データソース関連の実行時定数。
 *
 * Replicant の `.value` は型上 undefined を含むため（JSON Schema の default で
 * 実際には埋まるが TS からは分からない）、フォールバック用の既定値をここに置く。
 * zod を import しない純粋な TS にしてあるので extension / browser 双方から使える。
 */

export const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  csv: 'data/集計.csv',
  sheet: 'Googleスプレッドシート',
};

export const DEFAULT_DATA_SOURCE_CONFIG: DataSourceConfig = {
  type: 'csv',
  url: '',
  sheetTitle: '',
};

export const DEFAULT_AGGREGATION_STATUS: AggregationStatus = {
  state: 'loading',
  sourceType: 'csv',
  rowCount: 0,
  skippedCount: 0,
  loadedAt: '',
  error: '',
  warnings: [],
  resolvedColumns: '',
};
