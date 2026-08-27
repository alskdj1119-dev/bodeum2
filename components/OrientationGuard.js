'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../lib/store';
import { timerStr } from '../lib/helpers';

// 화면을 옆으로(가로 모드) 돌렸을 때 처리하는 컴포넌트.
// - 웹/PWA는 iOS에서 화면 회전 자체를 막을 방법이 없어서(사파리·홈화면 앱 모두 지원 안 함),
//   대신 가로 모드가 되면 항상 이 오버레이로 화면을 덮어서 실사용을 막는 방식으로 처리한다.
//   (안드로이드 등 screen.orientation.lock을 지원하는 환경에서는 세로 고정도 함께 시도)
// - 수유/수면 타이머가 진행 중이면, 안내 문구 대신 그 타이머를 화면 꽉 채워서 크게 보여준다.
export default function OrientationGuard() {
  const { db, feedTimerMs, sleepTimerMs } = useApp();
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => setIsLandscape(mq.matches);
    update();
    mq.addEventListener('change', update);

    // 지원하는 환경(주로 안드로이드)에서는 세로 고정도 시도 — 실패해도 조용히 무시
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }

    return () => mq.removeEventListener('change', update);
  }, []);

  if (!isLandscape) return null;

  const activeFeed = db.feeds.find(f => f.start && !f.end);
  const activeSleep = db.sleeps.find(s => s.start && !s.end);

  if (activeFeed) {
    return (
      <div className="orient-overlay" style={{ background: 'var(--cf)' }}>
        <div className="orient-timer-label">수유 중</div>
        <div className="orient-timer-value">{timerStr(feedTimerMs)}</div>
      </div>
    );
  }

  if (activeSleep) {
    return (
      <div className="orient-overlay" style={{ background: 'var(--cs)' }}>
        <div className="orient-timer-label">수면 중</div>
        <div className="orient-timer-value">{timerStr(sleepTimerMs)}</div>
      </div>
    );
  }

  return (
    <div className="orient-overlay orient-rotate">
      <svg className="orient-rotate-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
      <div className="orient-timer-label">세로 모드로 사용해주세요</div>
    </div>
  );
}
