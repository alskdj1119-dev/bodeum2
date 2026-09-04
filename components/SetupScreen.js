'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { generateFamilyCode } from '../lib/helpers';

export default function SetupScreen() {
  const { launchApp } = useApp();
  const [code, setCode] = useState('');

  function start() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    launchApp(c);
  }

  function generate() {
    const c = generateFamilyCode();
    launchApp(c);
  }

  return (
    <div className="setup-ov">
      <div className="setup-card">
        {/* 로고 영역 */}
        <div className="setup-logo">
          <div className="setup-logo-icon">
            <svg width="52" height="52" viewBox="0 0 100 100">
              <rect width="100" height="100" rx="22" fill="var(--s-wash)"/>
              <circle cx="50" cy="28" r="11" fill="var(--sage)"/>
              <path d="M22 52 Q22 80 50 80 Q78 80 78 52" fill="none" stroke="var(--sage)" strokeWidth="11" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="setup-title">보듬</span>
          <span className="setup-sub">
            가족 코드로 파트너와<br />
            기록을 실시간 공유해요
          </span>
        </div>

        {/* 입력 영역 */}
        <div className="fld">
          <div className="flbl">가족 코드 입력</div>
          <input
            className="finp"
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && start()}
            placeholder="파트너와 같은 코드를 입력하세요"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* 시작하기 버튼 */}
        <button
          className="bpri setup-start-btn"
          onClick={start}
          disabled={!code.trim()}
        >
          시작하기
        </button>

        {/* 구분선 */}
        <div className="setup-divider">
          <span>또는</span>
        </div>

        {/* 자동 생성 버튼 */}
        <button className="setup-generate-btn" onClick={generate}>
          새 가족 코드 자동 생성
        </button>

        <p className="setup-desc">
          생성 후 파트너에게 코드를 공유하면<br />
          같은 코드로 접속할 때 기록이 동기화돼요
        </p>
      </div>
    </div>
  );
}
