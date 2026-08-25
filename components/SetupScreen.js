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
        <div className="setup-logo">
          <svg width="52" height="52" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="var(--s-wash)"/>
            <circle cx="50" cy="28" r="11" fill="var(--sage)"/>
            <path d="M22 52 Q22 80 50 80 Q78 80 78 52" fill="none" stroke="var(--sage)" strokeWidth="11" strokeLinecap="round"/>
          </svg>
          <span className="setup-title">보듬</span>
          <span className="setup-sub">가족 코드로 파트너와<br/>기록을 실시간 공유해요</span>
        </div>
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
            style={{textTransform:'uppercase',letterSpacing:'.08em'}}
          />
        </div>
        <button className="bpri" style={{width:'100%',marginBottom:10}} onClick={start}>시작하기</button>
        <div className="setup-divider">또는</div>
        <button onClick={generate} style={{width:'100%',padding:'13px',border:'1.5px solid var(--bdr)',borderRadius:'100px',background:'var(--bg)',fontFamily:'var(--sans)',fontSize:'14px',color:'var(--muted)',cursor:'pointer'}}>새 가족 코드 자동 생성</button>
        <p style={{fontSize:'11px',color:'var(--muted)',textAlign:'center',marginTop:'12px',lineHeight:'1.6'}}>생성 후 파트너에게 코드를 공유하면<br/>같은 코드로 접속할 때 기록이 동기화돼요</p>
      </div>
    </div>
  );
}
