import { useState, useRef } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { DATA_SOURCE_LABELS, DEFAULT_DATA_SOURCE_CONFIG } from '../../../dataSource';
import type { DataSourceConfig, DataSourceType } from '../../../schemas';
import './style.css';

const SOURCE_OPTIONS: { type: DataSourceType; hint: string }[] = [
  { type: 'csv', hint: 'バンドル同梱の CSV を読み込みます' },
  { type: 'sheet', hint: 'フォームの回答シート・集計botのシートいずれも可' },
];

/** 読み取る列。ヘッダー名が完全一致した列だけを見る（並び順・他の列は問わない） */
const REQUIRED_COLUMNS = 'チーム名 / シナリオ / 合計金イクラ納品数 / 合計赤イクラ取得数';

function formatLoadedAt(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('ja-JP');
}

export function App() {
  const [config] = useReplicant('dataSourceConfig');
  const [status] = useReplicant('aggregationStatus');

  // Replicant を直接編集せず、ローカルステートで編集して「保存して再読込」で反映する
  const [draft, setDraft] = useState<DataSourceConfig | null>(null);
  const [applyState, setApplyState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saved = config ?? DEFAULT_DATA_SOURCE_CONFIG;
  const current = draft ?? saved;
  const isDirty =
    current.type !== saved.type ||
    current.url !== saved.url ||
    current.sheetTitle !== saved.sheetTitle;

  const update = (patch: Partial<DataSourceConfig>) => setDraft({ ...current, ...patch });

  const handleApply = async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setApplyState('pending');
    try {
      const result = await nodecg.sendMessage('setDataSourceConfig', current);
      setDraft(null);
      setApplyState(result.success ? 'success' : 'error');
    } catch {
      setApplyState('error');
    }
    resetTimerRef.current = setTimeout(() => setApplyState('idle'), 1500);
  };

  const needsUrl = current.type === 'sheet';

  return (
    <div className="container">
      <div className="field">
        <span className="label">データソース</span>
        <div className="radios">
          {SOURCE_OPTIONS.map(({ type, hint }) => (
            <label className="radio" key={type}>
              <input
                type="radio"
                name="dataSourceType"
                checked={current.type === type}
                onChange={() => update({ type })}
              />
              <span>
                {DATA_SOURCE_LABELS[type]}
                <br />
                <span className="hint">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">スプレッドシート URL</span>
        <input
          className="input"
          type="text"
          value={current.url}
          disabled={!needsUrl}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          onChange={(e) => update({ url: e.target.value })}
        />
      </div>

      <div className="field">
        <span className="label">シート名（省略時は先頭シート）</span>
        <input
          className="input"
          type="text"
          value={current.sheetTitle}
          disabled={!needsUrl}
          placeholder="フォームの回答 1"
          onChange={(e) => update({ sheetTitle: e.target.value })}
        />
      </div>

      {isDirty && <p className="unsaved">未保存の変更があります</p>}

      <button
        className={`apply-button apply-button--${applyState}`}
        onClick={handleApply}
        disabled={applyState === 'pending'}
      >
        保存して再読込
      </button>

      <div className={`status ${status?.state === 'error' ? 'status--error' : ''}`}>
        <div className="status-line">
          <span className="status-key">状態</span>
          <span className="status-value">
            {status?.state === 'loading' && '読み込み中...'}
            {status?.state === 'loaded' && `${status.rowCount} 件を読み込み済み`}
            {status?.state === 'error' && '読み込み失敗'}
            {!status && '-'}
          </span>
        </div>
        <div className="status-line">
          <span className="status-key">取得元</span>
          <span className="status-value">
            {status ? DATA_SOURCE_LABELS[status.sourceType] : '-'}
          </span>
        </div>
        <div className="status-line">
          <span className="status-key">最終取得</span>
          <span className="status-value">{formatLoadedAt(status?.loadedAt ?? '')}</span>
        </div>
        {!!status?.skippedCount && (
          <div className="status-line">
            <span className="status-key">読み飛ばし</span>
            <span className="status-warning">
              {status.skippedCount} 行（シナリオ番号が数値でない等）
            </span>
          </div>
        )}
        {!!status?.resolvedColumns && (
          <div className="status-line">
            <span className="status-key">列の対応</span>
            <span className="status-value">{status.resolvedColumns}</span>
          </div>
        )}
        {!!status?.error && (
          <div className="status-line">
            <span className="status-key">エラー</span>
            <span className="status-error">{status.error}</span>
          </div>
        )}
        {status?.warnings.map((w) => (
          <div className="status-line" key={w}>
            <span className="status-key">警告</span>
            <span className="status-warning">{w}</span>
          </div>
        ))}
      </div>

      <p className="hint">
        読み取るのは「{REQUIRED_COLUMNS}」の 4 列だけです（ヘッダー名で探すので並び順・他の列は問いません）。
        同一チーム×シナリオが複数行ある場合は、後に現れた行の値を使います。
        <br />
        シートを読むには、鍵JSON（data/credentials/）のサービスアカウントを対象シートに
        「閲覧者」で共有しておく必要があります。
        <br />
        休憩企画（シナリオ 101〜）は集計対象外です。
      </p>
    </div>
  );
}
