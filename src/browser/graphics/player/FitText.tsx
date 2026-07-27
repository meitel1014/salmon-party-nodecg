import { useRef, useEffect, useState, type HTMLAttributes } from 'react';
import { observeFitMeasure } from '../../utils/observeFitMeasure';

type Props = {
  /** レンダリングする生 HTML 文字列 */
  html: string;
  /** transform-origin の水平位置。左寄せなら 'left'、右寄せなら 'right'、中央寄せなら 'center' */
  align?: 'left' | 'right' | 'center';
} & Omit<HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML' | 'children'>;

/**
 * テキストが親の幅を超えたら自動で縮小して収める。
 * 内部で scrollWidth と clientWidth を比較し、
 * はみ出していれば transform: scale() で縮小する。
 *
 * 揃え位置は必ず flex（justify-content）で行い、text-align は使わない。
 * transform はレイアウトに影響しないため「縮小前の span の位置」が基準になるが、
 * text-align: center は中身が幅を超えるとオフセットを 0 でクランプして右側だけに
 * はみ出させる。すると span の中心が枠の中心とずれ、transform-origin: center で
 * 縮小しても右にずれたまま枠外へ出てしまう。flex の justify-content: center は
 * 負のフリースペースを左右均等に配分するので中心が一致し、縮小後にちょうど収まる。
 */
export function FitText({ html, align = 'left', style, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // フォント差し替え（Typekit の遅延適用）を ResizeObserver で検知して測り直す
    return observeFitMeasure(inner, () => {
      // 一旦高さをリセットしてから測定する
      container.style.height = 'auto';
      const contentWidth = inner.scrollWidth;
      const availableWidth = container.clientWidth;
      const contentHeight = inner.scrollHeight;
      // 親要素に固定高さがある場合は縦方向の制約として使う
      const availableHeight = container.parentElement?.clientHeight ?? 0;

      let newScale = 1;
      if (contentWidth > availableWidth && contentWidth > 0) {
        newScale = Math.min(newScale, availableWidth / contentWidth);
      }
      if (availableHeight > 0 && contentHeight > availableHeight) {
        newScale = Math.min(newScale, availableHeight / contentHeight);
      }
      setScale(newScale);
      // コンテナの高さを視覚サイズに合わせる（transform はレイアウトに影響しないため）
      container.style.height = `${contentHeight * newScale}px`;
    });
  }, [html]);

  const origin = align === 'right' ? 'right top' : align === 'center' ? 'center top' : 'left top';
  const justify = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    // display/justifyContent/alignItems は transform-origin と対で成り立つ FitText の
    // 前提なので、呼び出し側の style で壊せないよう spread のあとに置く。
    // alignItems は stretch にしない（span の高さがコンテナ高さに引き伸ばされると
    // ResizeObserver → 再測定 → 高さ更新 のループになるため）。
    <div
      ref={containerRef}
      style={{ ...style, display: 'flex', justifyContent: justify, alignItems: 'flex-start' }}
      {...rest}
    >
      <span
        ref={innerRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          transform: `scale(${scale})`,
          transformOrigin: origin,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
