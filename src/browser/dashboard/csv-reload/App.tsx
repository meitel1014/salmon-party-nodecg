import { useState } from 'react';

// NodeCG dashboard provides paper-button as a Polymer web component
declare global {
  // JSX.IntrinsicElements の拡張は namespace 宣言でしか行えず ES module 構文に置換できないため、
  // このルールのみ限定的に無効化する。
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      'paper-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        raised?: boolean;
        disabled?: boolean;
      };
    }
  }
}

export function App() {
  const [status, setStatus] = useState('');

  const handleReload = async () => {
    try {
      setStatus('読み込み中...');
      await nodecg.sendMessage('reloadCsvData');
      setStatus('✓ 完了');
    } catch (err) {
      setStatus(`エラー: ${(err as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: 0, fontSize: '13px', color: '#aaaaaa' }}>
        ルール.csv・配信卓.csv・チーム情報.csv・集計.csv を再読み込みします。
        <br />
        CSV を更新した後にクリックしてください。
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <paper-button raised onClick={handleReload}>
          CSV リロード
        </paper-button>
        {status && (
          <span style={{ fontSize: '13px', color: '#aaaaaa' }}>{status}</span>
        )}
      </div>
    </div>
  );
}
