'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// 차트 위에 마우스를 올렸을 때(또는 모바일 탭 시) 나오는 세부 수치 툴팁.
//
// 예전에는 부모 컨테이너(.chart-wrap) 기준 퍼센트 좌표로 absolute 배치했는데,
// 홈 카드(.sc)와 패널(.panel)에 overflow:hidden/overflow-x:hidden이 걸려 있어
// 가장자리 근처 포인트의 툴팁이 화면 밖으로 잘려 보이는 문제가 있었다.
// 이제는 document.body에 포탈로 렌더링해 position:fixed로 배치하고, 실제 렌더된
// 크기를 측정해 뷰포트 안에 항상 들어오도록 위치를 보정한다(가장자리에서는
// 화살표만 원래 지점을 계속 가리키도록 살짝 옆으로 이동).
//
// containerRef: xPct/yPct가 상대적으로 계산된 기준 엘리먼트(보통 svg)의 ref.
export default function ChartTooltip({ containerRef, xPct, yPct, children }) {
  const boxRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [pos, setPos] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (xPct == null || yPct == null || !containerRef?.current) {
      setAnchor(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setAnchor({
      x: rect.left + rect.width * (xPct / 100),
      y: rect.top + rect.height * (yPct / 100),
    });
  }, [xPct, yPct, containerRef]);

  useLayoutEffect(() => {
    if (!anchor || !boxRef.current) { setPos(null); return; }
    const box = boxRef.current.getBoundingClientRect();
    const margin = 8;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

    let left = anchor.x - box.width / 2;
    let top = anchor.y - box.height - 10; // 기본: 지점 위쪽에 표시
    let flipped = false;

    if (top < margin) { top = anchor.y + 10; flipped = true; } // 위 공간이 부족하면 아래로
    if (left < margin) left = margin;
    if (left + box.width > vw - margin) left = vw - box.width - margin;
    if (top + box.height > vh - margin) top = vh - box.height - margin;

    const arrowLeft = Math.min(Math.max(anchor.x - left, 12), Math.max(box.width - 12, 12));
    setPos({ left, top, arrowLeft, flipped });
  }, [anchor]);

  if (!mounted || !anchor) return null;

  return createPortal(
    <div
      ref={boxRef}
      className="chart-tip"
      style={{
        position: 'fixed',
        left: pos ? pos.left : anchor.x,
        top: pos ? pos.top : anchor.y,
        transform: 'none',
        margin: 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
      <span
        className={`chart-tip-arrow${pos?.flipped ? ' up' : ''}`}
        style={{ left: pos ? pos.arrowLeft : '50%' }}
      />
    </div>,
    document.body
  );
}
