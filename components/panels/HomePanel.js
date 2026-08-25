'use client';
import { useApp } from '../../lib/store';
import { agoStr, durStr, fmt, fmtFull, elapsedStr, directFeedMl } from '../../lib/helpers';

function p2(n) { return n < 10 ? '0' + n : '' + n; }

export default function HomePanel() {
  const { db, baby, setOpenModal, setEditId, setEditType, goTab } = useApp();
  const { feeds, diapers, sleeps, weights } = db;

  // Day count
  let dayCount = null;
  if (baby.birthDate) {
    const birth = new Date(baby.birthDate + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const d = Math.floor((today - birth) / 86400000) + 1;
    if (d >= 1) dayCount = d;
  }

  const TF = { breast:'모유', bottle:'분유' };
  const TD = { wet:'소변', soiled:'대변', both:'소변+대변' };

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
  const feedMl = feed24.reduce((acc, f) => {
    let amt = f.amount;
    if (amt == null && f.type === 'breast' && f.subtype === 'direct' && f.start && f.end) {
      amt = directFeedMl(f.start, f.end);
    }
    return acc + (f.consumedAmount != null ? f.consumedAmount : (amt || 0));
  }, 0);

  // Weight
  const sortedWeights = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const latestW = sortedWeights[0];
  const prevW = sortedWeights[1];
  let wDiffG = null;
  if (latestW && prevW) wDiffG = Math.round((latestW.kg - prevW.kg) * 1000);

  // Recent timeline
  const all = [];
  feeds.forEach(f => {
    const t = f.start || f.time;
    let fAmt = f.amount;
    if (fAmt == null && f.type === 'breast' && f.subtype === 'direct' && f.start && f.end) fAmt = directFeedMl(f.start, f.end);
    const amtStr = f.consumedAmount != null && fAmt != null ? `준비 ${fAmt}ml / 섭취 ${f.consumedAmount}ml`
      : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
      : fAmt ? `${fAmt}ml` : '';
    const durTxt = (f.start && f.end) ? ' · ' + durStr(new Date(f.end) - new Date(f.start)) : '';
    all.push({ t: 'f', time: t, label: '수유 — ' + (TF[f.type] || ''), sub: amtStr + durTxt });
  });
  diapers.forEach(d => all.push({ t: 'd', time: d.time, label: '기저귀 — ' + (TD[d.type] || ''), sub: d.note || '' }));
  sleeps.filter(s => s.end).forEach(s => all.push({ t: 's', time: s.start, label: '수면', sub: durStr(new Date(s.end) - new Date(s.start)) }));
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recent = all.slice(0, 10);

  return (
    <>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' }}>
        <h1 className="daytitle" style={{ fontSize:'19px', marginBottom:0, flex:1 }}>
          할 수 있다! {baby.name || '아이'} 육성기록
        </h1>
        {dayCount !== null && (
          <div style={{ textAlign:'right', fontSize:'11px', color:'var(--muted)', lineHeight:'1.5', paddingTop:'2px', flexShrink:0, marginLeft:'10px' }}>
            {baby.name || '아이'}와 만난지 <strong style={{ fontSize:'13px', color:'var(--sage)' }}>{dayCount}일차</strong>
          </div>
        )}
      </div>

      {/* 직전 */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>직전</p>
      <div className="sgrid" style={{ gridTemplateColumns:'1fr 1fr 1fr', marginBottom:'20px' }}>
        <div className="sc" onClick={() => goTab('feed')}>
          <div className="sr">
            <div className="slbl">수유</div>
            <div className="sico f"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastFeed ? agoStr(lastFeed.start || lastFeed.time) : '—'}</div>
          <div className="ssub">{lastFeed ? fmt(lastFeed.start || lastFeed.time) : '기록 없음'}</div>
        </div>
        <div className="sc" onClick={() => goTab('diaper')}>
          <div className="sr">
            <div className="slbl">기저귀</div>
            <div className="sico d"><svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastDiaper ? agoStr(lastDiaper.time) : '—'}</div>
          <div className="ssub">{lastDiaper ? fmt(lastDiaper.time) : '기록 없음'}</div>
        </div>
        <div className="sc" onClick={() => goTab('sleep')}>
          <div className="sr">
            <div className="slbl">수면</div>
            <div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastSleep ? agoStr(lastSleep.start) : '—'}</div>
          <div className="ssub">{lastSleep ? durStr(new Date(lastSleep.end) - new Date(lastSleep.start)) : '기록 없음'}</div>
        </div>
      </div>

      {/* 직전 24시간 */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>직전 24시간</p>
      <div className="sgrid" style={{ gridTemplateColumns:'1fr 1fr 1fr', marginBottom:'20px' }}>
        <div className="sc" onClick={() => goTab('sleep')}>
          <div className="sr"><div className="slbl">수면</div><div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div></div>
          <div className="sval" style={{ fontSize:'13px' }}>{sleepMs > 0 ? durStr(sleepMs) : '0분'}</div>
          <div className="ssub">{sleep24.length}회</div>
        </div>
        <div className="sc" onClick={() => goTab('feed')}>
          <div className="sr"><div className="slbl">수유</div><div className="sico f"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div></div>
          <div className="sval" style={{ fontSize:'13px' }}>{feed24.length}</div>
          <div className="ssub">{feedMl > 0 ? `섭취 ${feedMl}ml` : '회'}</div>
        </div>
        <div className="sc" onClick={() => goTab('diaper')}>
          <div className="sr"><div className="slbl">기저귀</div><div className="sico d"><svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div></div>
          <div className="sval" style={{ fontSize:'13px' }}>{diaper24.length}</div>
          <div className="ssub">회</div>
        </div>
      </div>

      {/* 체중 */}
      <div className="sgrid" style={{ gridTemplateColumns:'1fr', marginBottom:'20px' }}>
        <div className="sc" onClick={() => goTab('weight')}>
          <div className="sr"><div className="slbl">체중</div><div className="sico w"><svg viewBox="0 0 24 24" style={{ width:'17px', height:'17px', fill:'none', stroke:'var(--cw)', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }}><path d="M12 3a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4z"/><path d="M4 7h16l-2 14H6L4 7z"/></svg></div></div>
          <div className="sval">{latestW ? latestW.kg.toFixed(2) + ' kg' : '—'}</div>
          <div className="ssub">
            {latestW ? '직전 체중' : '기록 없음'}
            {wDiffG !== null && (
              <span style={{ marginLeft:'6px', color: wDiffG > 0 ? 'var(--cw)' : wDiffG < 0 ? 'var(--cd)' : 'var(--muted)' }}>
                {wDiffG > 0 ? '+' : ''}{wDiffG}g
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 빠른 기록 */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>빠른 기록</p>
      <div className="qgrid" style={{ marginBottom:'20px' }}>
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

      {/* 최근 기록 */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>최근 기록</p>
      {recent.length === 0 ? (
        <div className="empty"><div className="empty-lbl" style={{ fontSize:'13px' }}>아직 기록이 없어요 🌿</div></div>
      ) : (
        <div>
          {recent.map((e, i) => (
            <div key={i} className="tlitem" style={{ animationDelay: `${i * 40}ms` }}>
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
    </>
  );
}
