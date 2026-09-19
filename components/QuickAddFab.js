'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';

// 전역 "빠른 기록 +" 버튼 — 예전엔 홈 화면 우측 상단에 고정이었는데,
// 하단 네비 바로 위로 옮기고 좌우로 끌어서 원하는 자리에 둘 수 있게 했다.
// 모든 탭에서 공통으로 보이도록 BodeumApp 최상단(NavBar 옆)에서 렌더링한다.
// 위치는 화면 폭 대비 비율(0~1)로 로컬에 저장 — 기기가 바뀌어도 자연스럽게 맞는다.
const POS_KEY = 'bodeum_fab_pos_ratio_v1';
const BTN_SIZE = 42; // .qplus 크기와 일치
const MENU_WIDTH = 132; // app/globals.css .qmenu 의 width 와 일치 — 버튼 중앙 기준으로 펼쳐짐
const CONTAINER_MAX = 430; // .app-root/.bnav의 max-width와 일치
const MARGIN = 14; // 화면 끝에 완전히 붙지 않도록 두는 여백
const DRAG_THRESHOLD = 6; // 이 이상 움직여야 "드래그"로 보고, 아니면 탭(메뉴 열기)으로 처리

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

// 버튼은 42px 이지만, 눌렀을 때 펼쳐지는 메뉴는 132px 폭으로 버튼 중앙에 겹쳐서 뜬다.
// 그래서 이동 가능 범위는 버튼이 아니라 "펼쳐진 메뉴"가 화면 밖으로 나가지 않는 범위로 잡아야 한다.
function getBounds(containerW) {
  const half = MENU_WIDTH / 2;
  const min = MARGIN + half - BTN_SIZE / 2;
  const max = containerW - MARGIN - half - BTN_SIZE / 2;
  return { min, max: Math.max(min, max) };
}

export default function QuickAddFab() {
  const { setOpenModal, setEditId, setEditType } = useApp();
  const [open, setOpen] = useState(false);
  const [ratio, setRatio] = useState(0.86); // 기본은 예전 위치와 비슷하게 오른쪽 근처
  const [containerW, setContainerW] = useState(CONTAINER_MAX);
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startRatio: 0.86, width: CONTAINER_MAX });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved != null) {
        const v = parseFloat(saved);
        if (!Number.isNaN(v)) setRatio(clamp(v, 0, 1));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    function update() { setContainerW(Math.min(window.innerWidth, CONTAINER_MAX)); }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function openQuick(modal) {
    setOpen(false);
    setEditId(null); setEditType(null); setOpenModal(modal);
  }

  function onPointerDown(e) {
    dragRef.current = { dragging: true, moved: false, startX: e.clientX, startRatio: ratio, width: containerW };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    const { min, max } = getBounds(d.width);
    const range = max - min;
    const deltaRatio = range > 0 ? dx / range : 0;
    setRatio(clamp(d.startRatio + deltaRatio, 0, 1));
  }
  function onPointerUp(e) {
    const d = dragRef.current;
    if (d.dragging) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      if (d.moved) {
        setRatio(current => {
          try { localStorage.setItem(POS_KEY, String(current)); } catch (_) {}
          return current;
        });
      } else {
        setOpen(v => !v);
      }
    }
    dragRef.current.dragging = false;
  }

  const { min: fabMin, max: fabMax } = getBounds(containerW);
  const left = fabMin + ratio * (fabMax - fabMin);

  return (
    <div className="fab-layer">
      {open && <div className="fab-dim" onClick={() => setOpen(false)} />}
      <div className="fab-wrap" style={{ left }}>
        {open && (
          <div className="qmenu fab-menu">
            <button onClick={() => openQuick('feed')}>
              <span className="mico f"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></span>
              수유
            </button>
            <button onClick={() => openQuick('diaper')}>
              <span className="mico d"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></span>
              기저귀
            </button>
            <button onClick={() => openQuick('sleep')}>
              <span className="mico s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
              수면
            </button>
          </div>
        )}
        <button
          className={`qplus fab-btn${open ? ' open' : ''}`}
          aria-label="빠른 기록"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
  );
}
