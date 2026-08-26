'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  agoStr, durStr, fmt, fmtFull, elapsedStr, feedAmountMl, feedEffectiveMl, timerStr,
  kstDate, KST_OFFSET_MS,
  FEED_TYPE_LABEL as TF, DIAPER_TYPE_LABEL as TD,
} from '../../lib/helpers';
import Home24hModal from '../modals/Home24hModal';
import WeightGainChart from '../charts/WeightGainChart';

// "직전" 카드는 가로 폭이 좁아 "23시간 59분 전"처럼 긴 경과시간이 잘릴 수 있음.
// 카드 안에서 항상 안 잘리도록: 끝의 " 전"을 생략(라벨이 이미 "직전"이라 의미는 충분히 전달됨) + 폰트 축소.
function agoShort(iso) {
  return agoStr(iso).replace(/ 전$/, '');
}

export default function HomePanel() {
  const {
    db, baby, setOpenModal, setEditId, setEditType, goTab, setHealthInitTab,
    feedTimerMs, sleepTimerMs, stopActiveFeed, stopActiveSleep,
    notifPermission, requestNotifPermission,
  } = useApp();
  const { feeds, diapers, sleeps, weights } = db;

  // 진행 중인 타이머 (홈 최상단 요약 배너용)
  const activeFeed = feeds.find(f => f.start && !f.end);
  const activeSleep = sleeps.find(s => s.start && !s.end);

  // 직전 24시간 상세 모달
  const [detail24, setDetail24] = useState(null); // null | 'feed' | 'diaper' | 'sleep'

  // Day count
  let dayCount = null;
  if (baby.birthDate) {
    // 생년월일은 항상 "한국 날짜"로 해석 — 기기 시간대와 무관하게 동일한 만난지 일수가 나오도록.
    const [by, bm, bd] = baby.birthDate.split('-').map(Number);
    const birthMs = Date.UTC(by, bm - 1, bd, 0, 0) - KST_OFFSET_MS;
    const nowKst = kstDate(Date.now());
    const todayMs = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate(), 0, 0) - KST_OFFSET_MS;
    const d = Math.floor((todayMs - birthMs) / 86400000) + 1;
    if (d >= 1) dayCount = d;
  }

  // Last events
  const sortedFeeds = [...feeds].filter(f => f.end || f.time).sort((a,b) => new Date(b.start||b.time) - new Date(a.start||a.time));
  const lastFeed = sortedFeeds[0];
  const lastDiaper = [...diapers].sort((a,b) => new Date(b.time) - new Date(a.time))[0];
  const lastSleep = [...sleeps].filter(s => s.end).sort((a,b) => new Date(b.start) - new Date(a.start))[0];

  // 24h stats
  const h24 = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const feed24 = feeds.filter(f => (now - new Date(f.start||f.time).getTime()) <= h24);
  const diaper24 = diapers.filter(d => (now - new Date(d.time).getTime()) <= h24);
  const sleep24 = sleeps.filter(s => s.end && (now - new Date(s.start).getTime()) <= h24);
  const sleepMs = sleep24.reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
  const diaperWet24 = diaper24.filter(d => d.type === 'wet' || d.type === 'both').length;
  const diaperSoiled24 = diaper24.filter(d => d.type === 'soiled' || d.type === 'both').length;
  const feedMl = feed24.reduce((acc, f) => acc + feedEffectiveMl(f), 0);

  // Weight
  const sortedWeights = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const latestW = sortedWeights[0];
  const prevW = sortedWeights[1];
  let wDiffG = null;
  if (latestW && prevW) wDiffG = Math.round((latestW.kg - prevW.kg) * 1000);

  // 직전 카드 클릭 → 수정 팝업
  function openEditFeed(f) {
    if (!f) return;
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
  }
  function openEditDiaper(d) {
    if (!d) return;
    setEditId(d.id);
    setEditType('diapers');
    setOpenModal('diaper');
  }
  function openEditSleep(s) {
    if (!s) return;
    setEditId(s.id);
    setEditType('sleeps');
    setOpenModal('sleep');
  }

  // 체중 카드 클릭 → 건강 > 체중 탭
  function openHealthWeight() {
    setHealthInitTab('weight');
    goTab('health');
  }

  // Recent timeline
  const all = [];
  feeds.forEach(f => {
    const t = f.start || f.time;
    const fAmt = feedAmountMl(f);
    const amtStr = f.consumedAmount != null && fAmt != null ? `준비 ${fAmt}ml / 섭취 ${f.consumedAmount}ml`
      : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
      : fAmt ? `${fAmt}ml` : '';
    const durTxt = (f.start && f.end) ? ' · ' + durStr(new Date(f.end) - new Date(f.start)) : '';
    all.push({ t: 'f', time: t, label: '수유 — ' + (TF[f.type] || ''), sub: amtStr + durTxt, raw: f });
  });
  diapers.forEach(d => all.push({ t: 'd', time: d.time, label: '기저귀 — ' + (TD[d.type] || ''), sub: d.note || '', raw: d }));
  sleeps.filter(s => s.end).forEach(s => all.push({ t: 's', time: s.start, label: '수면', sub: durStr(new Date(s.end) - new Date(s.start)), raw: s }));
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recent = all.slice(0, 10);

  // 최근 기록 클릭 → 수정 팝업
  function handleRecentClick(e) {
    if (!e.raw) return;
    if (e.t === 'f') openEditFeed(e.raw);
    else if (e.t === 'd') openEditDiaper(e.raw);
    else if (e.t === 's') openEditSleep(e.raw);
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' }}>
        <h1 className="daytitle" style={{ fontSize:'19px', marginBottom:0, flex:1 }}>
          할 수 있다! {baby.name || '아이'} 육성기록
        </h1>
        {dayCount !== null && (
          <div style={{ textAlign:'right', fontSize:'11px', color:'var(--muted)', lineHeight:'1.5', paddingTop:'2px', flexShrink:0, marginLeft:'10px' }}>
            <strong style={{ fontSize:'15px', color:'var(--sage)' }}>{baby.name || '아이'}이와</strong><br/>
            만난지 {dayCount}일차
          </div>
        )}
      </div>

      {/* 알림 권한 아직 결정 안 됨 → 눈에 띄게 한 번 안내 */}
      {notifPermission === 'default' && (
        <div className="sc" style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', padding:'12px 14px' }}>
          <span style={{ fontSize:'18px', lineHeight:1 }}>🔔</span>
          <span style={{ flex:1, fontSize:'12.5px', color:'var(--ink)' }}>수유·수면·기저귀 알림을 받으려면 알림을 허용해주세요.</span>
          <button className="bpri" style={{ padding:'8px 14px', fontSize:'12.5px', whiteSpace:'nowrap' }} onClick={requestNotifPermission}>허용하기</button>
        </div>
      )}

      {/* 진행 중인 타이머 — 얇은 한 줄 요약 배너 */}
      {(activeFeed || activeSleep) && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
          {activeFeed && (
            <div className="slive-mini banner-in">
              <span className="slive-mini-dot" style={{ background:'var(--cf)' }} />
              <span className="slive-mini-lbl">수유 중</span>
              <span className="slive-mini-timer">{timerStr(feedTimerMs)}</span>
              <button className="slive-mini-stop" style={{ background:'var(--cf)' }} onClick={stopActiveFeed}>종료</button>
            </div>
          )}
          {activeSleep && (
            <div className="slive-mini banner-in">
              <span className="slive-mini-dot" style={{ background:'var(--cs)' }} />
              <span className="slive-mini-lbl">수면 중</span>
              <span className="slive-mini-timer">{timerStr(sleepTimerMs)}</span>
              <button className="slive-mini-stop" style={{ background:'var(--cs)' }} onClick={stopActiveSleep}>종료</button>
            </div>
          )}
        </div>
      )}

      {/* 빠른 기록 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>빠른 기록</p>
      <div className="qgrid" style={{ marginBottom:'16px' }}>
        <button className="qbtn qf" onClick={() => { setEditId(null); setEditType(null); setOpenModal('feed'); }}>
          <svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          수유
        </button>
        <button className="qbtn qd" onClick={() => { setEditId(null); setEditType(null); setOpenModal('diaper'); }}>
          <svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg>
          기저귀
        </button>
        <button className="qbtn qs" onClick={() => { setEditId(null); setEditType(null); setOpenModal('sleep'); }}>
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          수면
        </button>
      </div>

      {/* 직전 — 클릭 시 수정 팝업 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>직전</p>
      <div className="sgrid" style={{ gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', marginBottom:'16px' }}>
        <div className="sc" onClick={() => openEditFeed(lastFeed)}>
          <div className="sr">
            <div className="slbl">수유</div>
            <div className="sico f"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastFeed ? agoShort(lastFeed.start || lastFeed.time) : '—'}</div>
          <div className="ssub">{lastFeed ? fmt(lastFeed.start || lastFeed.time) : '기록 없음'}</div>
        </div>
        <div className="sc" onClick={() => openEditDiaper(lastDiaper)}>
          <div className="sr">
            <div className="slbl">기저귀</div>
            <div className="sico d"><svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastDiaper ? agoShort(lastDiaper.time) : '—'}</div>
          <div className="ssub">{lastDiaper ? fmt(lastDiaper.time) : '기록 없음'}</div>
        </div>
        <div className="sc" onClick={() => openEditSleep(lastSleep)}>
          <div className="sr">
            <div className="slbl">수면</div>
            <div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastSleep ? agoShort(lastSleep.start) : '—'}</div>
          <div className="ssub">{lastSleep ? durStr(new Date(lastSleep.end) - new Date(lastSleep.start)) : '기록 없음'}</div>
        </div>
      </div>

      {/* 직전 24시간 — 클릭 시 상세 모달 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>직전 24시간</p>
      <div className="sgrid" style={{ gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', marginBottom:'16px' }}>
        <div className="sc" onClick={() => setDetail24('feed')}>
          <div className="sr"><div className="slbl">수유</div><div className="sico f"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div></div>
          <div className="sval" style={{ fontSize:'15px' }}>{feed24.length}회</div>
          <div className="ssub">{feedMl > 0 ? `섭취 ${feedMl}ml` : (feed24.length > 0 ? ' ' : '기록 없음')}</div>
        </div>
        <div className="sc" onClick={() => setDetail24('diaper')}>
          <div className="sr"><div className="slbl">기저귀</div><div className="sico d"><svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div></div>
          <div className="sval" style={{ fontSize:'15px', whiteSpace:'nowrap' }}>{diaper24.length}회</div>
          <div className="ssub">소변 {diaperWet24} · 대변 {diaperSoiled24}</div>
        </div>
        <div className="sc" onClick={() => setDetail24('sleep')}>
          <div className="sr"><div className="slbl">수면</div><div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div></div>
          <div className="sval" style={{ fontSize:'15px' }}>{sleepMs > 0 ? durStr(sleepMs) : '0분'}</div>
          <div className="ssub">{sleep24.length}회</div>
        </div>
      </div>

      {/* 체중 — 클릭 시 건강 > 체중 탭 */}
      <div className="sgrid" style={{ gridTemplateColumns:'1fr', marginBottom:'16px' }}>
        <div className="sc" onClick={openHealthWeight}>
          <div className="sr"><div className="slbl">체중</div><div className="sico w"><svg viewBox="0 0 24 24" style={{ width:'17px', height:'17px', fill:'none', stroke:'var(--cw)', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }}><path d="M12 3a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4z"/><path d="M4 7h16l-2 14H6L4 7z"/></svg></div></div>
          <div className="sval" style={{ fontSize:'26px', whiteSpace:'nowrap' }}>{latestW ? latestW.kg.toFixed(2) + ' kg' : '—'}</div>
          <div className="ssub">
            {latestW ? '직전 체중' : '기록 없음'}
            {wDiffG !== null && (
              <span style={{ marginLeft:'6px', color: wDiffG > 0 ? 'var(--cw)' : wDiffG < 0 ? 'var(--cd)' : 'var(--muted)' }}>
                {wDiffG > 0 ? '+' : ''}{wDiffG}g
              </span>
            )}
          </div>
          <WeightGainChart weights={weights} />
        </div>
      </div>

      {/* 최근 기록 — 클릭 시 수정 팝업 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>최근 기록</p>
      {recent.length === 0 ? (
        <div className="empty"><div className="empty-lbl" style={{ fontSize:'15px' }}>아직 기록이 없어요 🌿</div></div>
      ) : (
        <div>
          {recent.map((e, i) => (
            <div
              key={i}
              className="tlitem"
              style={{ animationDelay: `${i * 40}ms`, cursor: 'pointer' }}
              onClick={() => handleRecentClick(e)}
            >
              <div className={`tldot ${e.t}`}></div>
              <div className="tlinf">
                <div className="tltype">{e.label}</div>
                {e.sub && <div className="tldet">{e.sub}</div>}
              </div>
              <div className="tltime">
                {fmtFull(e.time)}<br/>
                <span className="eago">{elapsedStr(e.time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 직전 24시간 상세 모달 */}
      {detail24 && (
        <Home24hModal type={detail24} onClose={() => setDetail24(null)} />
      )}
    </>
  );
}
