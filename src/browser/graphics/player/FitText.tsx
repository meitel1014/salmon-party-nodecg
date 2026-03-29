import { useLayoutEffect, useRef, useState } from 'react';

type Props = {
  children: string;
  maxFontSize: number;  // pt
  minFontSize?: number; // pt
  className?: string;
  style?: React.CSSProperties;
};

export function FitText({ children, maxFontSize, minFontSize = 8, className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    let size = maxFontSize;
    text.style.fontSize = `${size}pt`;

    while (text.scrollWidth > container.clientWidth && size > minFontSize) {
      size -= 1;
      text.style.fontSize = `${size}pt`;
    }

    setFontSize(size);
  }, [children, maxFontSize, minFontSize]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, overflow: 'visible', whiteSpace: 'nowrap' }}
    >
      <span ref={textRef} style={{ fontSize: `${fontSize}pt`, whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  );
}
