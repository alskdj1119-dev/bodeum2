'use client';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import {
  durStr, fmt, elapsedStr, feedAmountMl, feedEffectiveMl, kstDate, KST_OFFSET_MS, useNowTick,
  DIAPER_TYPE_LABEL as TD, FEED_TYPE_LABEL as TF,
} from '../../lib/helpers';
import { useApp } from '../../lib/store';
import HourBarChart from '../charts/HourBarChart';

function StatBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ flex: 1, height: 6, background: 'var(--bdr)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', minWidth: 0, boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color, fontFamily: 'var(--serif)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── 수유 상세 ───
function FeedDetail({ records, onEdit }) {
  const totalMl = records.reduce((acc, f) => acc + feedEffectiveMl(f), 0);
  const count = records.length;
  const avgMl = count > 0 && totalMl > 0 ? Math.round(totalMl / count) : 0;

  // 시간대별 바 차트 (24개 버킷)
  const hourBuckets = Array(24).fill(0);
  records.forEach(f => {
    const h = kstDate(new Date(f.start || f.time).getTime()).getUTCHours();
    hourBuckets[h]++;
  });

  return (
    <>
      {/* 통계 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 섭취량" value={totalMl > 0 ? totalMl + 'ml' : count + '회'} sub={totalMl > 0 ? count + '회 수유' : '수유 횟수'} color="var(--cf)" />
        <StatCard label="수유 횟수" value={count + '회'} sub={avgMl > 0 ? '평균 ' + avgMl + 'ml' : '24시간'} color="var(--cf)" />
        {avgMl > 0 && <StatCard label="회당 평균" value={avgMl + 'ml'} sub={'총 ' + totalMl + 'ml'} color="var(--cf)" />}
      </div>

      {/* 시간대별 분포 */}
      {count > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>시간대별 수유</div>
          <HourBarChart buckets={hourBuckets} color="var(--cf)" formatTip={(h, v) => `${h}시대: ${v}회`} />
        </div>
      )}

      {/* 기록 목록 */}
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>수유 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.start || b.time) - new Date(a.start || a.time)).map((f, i) => {
        const amt = feedAmountMl(f);
        const amtStr = f.consumedAmount != null && amt != null ? `준비 ${amt}ml / 섭취 ${f.consumedAmount}ml`
          : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
          : amt ? `${amt}ml` : '';
        let durMs = null;
        if (f.sideTimes) {
          durMs = Object.values(f.sideTimes).reduce((acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0);
        } else if (f.start && f.end) {
          durMs = new Date(f.end) - new Date(f.start);
        }
        const durTxt = durMs ? ' · ' + durStr(durMs) : '';
        return (
          <div key={f.id || i} className="ec" onClick={() => onEdit(f)} style={{ marginBottom: 8 }}>
            <div className="edot f" />
            <div className="emain">
              <div className="epri">{TF[f.type] || f.type}{f.subtype === 'direct' ? ' (직수)' : f.subtype === 'pumped' ? ' (유축)' : ''}</div>
              <div className="esub">{amtStr}{durTxt}</div>
            </div>
            <div className="etime">{fmt(f.start || f.time)}<br /><span className="eago">{elapsedStr(f.start || f.time)}</span></div>
          </div>
        );
      })}
    </>
  );
}

// ─── 기저귀 상세 ───
function DiaperDetail({ records, onEdit, periodLabel }) {
  const wet = records.filter(d => d.type === 'wet').length;
  const soiled = records.filter(d => d.type === 'soiled').length;
  const both = records.filter(d => d.type === 'both').length;
  const total = records.length;

  const hourBuckets = Array(24).fill(0);
  records.forEach(d => { hourBuckets[kstDate(new Date(d.time).getTime()).getUTCHours()]++; });

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 횟수" value={total + '회'} sub={periodLabel} color="var(--cd)" />
        <StatCard label="소변" value={wet + '회'} sub={both > 0 ? '혼합 ' + both + '회' : '소변 전용'} color="var(--cd)" />
        <StatCard label="대변" value={soiled + '회'} sub={total > 0 ? Math.round((soiled + both) / total * 100) + '%' : '—'} color="var(--cd)" />
      </div>

      {/* 분류 바 */}
      {total > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>유형별 비율</div>
          {[{ label: '소변', count: wet, color: 'var(--cf)' }, { label: '대변', count: soiled, color: 'var(--cd)' }, { label: '소변+대변', count: both, color: 'var(--cs)' }].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', width: 60, flexShrink: 0 }}>{item.label}</div>
              <StatBar value={item.count} max={total} color={item.color} />
              <div style={{ fontSize: 11, fontWeight: 600, color: item.color, width: 24, textAlign: 'right' }}>{item.count}</div>
            </div>
          ))}

          {/* 시간대 */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>시간대별</div>
            <HourBarChart buckets={hourBuckets} color="var(--cd)" height={30} formatTip={(h, v) => `${h}시대: ${v}회`} />
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>기저귀 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.time) - new Date(a.time)).map((d, i) => (
        <div key={d.id || i} className="ec" onClick={() => onEdit(d)} style={{ marginBottom: 8 }}>
          <div className="edot d" />
          <div className="emain">
            <div className="epri">{TD[d.type] || d.type}</div>
            {d.note && <div className="esub">{d.note}</div>}
          </div>
          <div className="etime">{fmt(d.time)}<br /><span className="eago">{elapsedStr(d.time)}</span></div>
        </div>
      ))}
    </>
  );
}

// ─── 수면 상세 ───
function SleepDetail({ records, onEdit, periodLabel }) {
  const totalMs = records.reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
  const count = records.length;
  const avgMs = count > 0 ? Math.round(totalMs / count) : 0;

  const hourBuckets = Array(24).fill(0);
  records.forEach(s => {
    const startH = kstDate(new Date(s.start).getTime()).getUTCHours();
    const endH = kstDate(new Date(s.end).getTime()).getUTCHours();
    for (let h = startH; h !== (endH + 1) % 24; h = (h + 1) % 24) {
      hourBuckets[h]++;
      if (h === endH) break;
    }
  });

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 수면" value={totalMs > 0 ? durStr(totalMs) : '0분'} sub={count + '회 수면'} color="var(--cs)" />
        <StatCard label="수면 횟수" value={count + '회'} sub={periodLabel} color="var(--cs)" />
        {avgMs > 0 && <StatCard label="평균 수면" value={durStr(avgMs)} sub="회당 평균" color="var(--cs)" />}
      </div>

      {count > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>시간대별 수면</div>
          <HourBarChart buckets={hourBuckets} color="var(--cs)" formatTip={(h, v) => v > 0 ? `${h}시대: 수면 중` : `${h}시대: 깨어있음`} />
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>수면 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.start) - new Date(a.start)).map((s, i) => (
        <div key={s.id || i} className="ec" onClick={() => onEdit(s)} style={{ marginBottom: 8 }}>
          <div className="edot s" />
          <div className="emain">
            <div className="epri">{durStr(new Date(s.end) - new Date(s.start))}</div>
            <div className="esub">{fmt(s.start)} — {fmt(s.end)}</div>
          </div>
          <div className="etime">{fmt(s.start)}<br /><span className="eago">{elapsedStr(s.start)}</span></div>
        </div>
      ))}
    </>
  );
}

// ─── 메인 모달 ───
// initialDate("YYYY-MM-DD", KST 기준)가 주어지면 그 날짜의 "당일" 모드로 열리고,
// 없으면 "직전 24시간" 모드로 열린다. 안에서 두 모드를 토글로 바꿀 수 있다.
export default function Home24hModal({ type, initialDate, initialMode, onClose }) {
  const { db, setOpenModal, setEditId, setEditType } = useApp();
  const { feeds, diapers, sleeps } = db;
  const dayOnly = !!initialDate; // 요일 스트립에서 특정 날짜를 눌러 열린 경우 — "당일" 고정, 토글 불필요
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(dayOnly ? 'day' : (initialMode || 'recent24h'));
  const [selectedDate, setSelectedDate] = useState(() => initialDate || kstDate(Date.now()).toISOString().slice(0, 10));
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  useEffect(() => {
    // 슬라이드 업 애니메이션
    requestAnimationFrame(() => setOpen(true));
    return () => {};
  }, []);

  const h24 = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const feed24 = feeds.filter(f => (now - new Date(f.start || f.time).getTime()) <= h24);
  const diaper24 = diapers.filter(d => (now - new Date(d.time).getTime()) <= h24);
  const sleep24 = sleeps.filter(s => s.end && (now - new Date(s.start).getTime()) <= h24);

  // "당일"(선택한 날짜 00:00~23:59, KST) 필터
  const [dy, dm, dd] = selectedDate.split('-').map(Number);
  const dayStartMs = Date.UTC(dy, dm - 1, dd, 0, 0) - KST_OFFSET_MS;
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const feedDay = feeds.filter(f => { const t = new Date(f.start || f.time).getTime(); return t >= dayStartMs && t < dayEndMs; });
  const diaperDay = diapers.filter(d => { const t = new Date(d.time).getTime(); return t >= dayStartMs && t < dayEndMs; });
  const sleepDay = sleeps.filter(s => s.end && (() => { const t = new Date(s.start).getTime(); return t >= dayStartMs && t < dayEndMs; })());

  const feedRecords = mode === 'day' ? feedDay : feed24;
  const diaperRecords = mode === 'day' ? diaperDay : diaper24;
  const sleepRecords = mode === 'day' ? sleepDay : sleep24;

  const dateLabelStr = `${dm}월 ${dd}일(${['일','월','화','수','목','금','토'][kstDate(dayStartMs).getUTCDay()]})`;

  const titles = { feed: '수유', diaper: '기저귀', sleep: '수면' };
  const colors = { feed: 'var(--cf)', diaper: 'var(--cd)', sleep: 'var(--cs)' };

  function handleClose() {
    setOpen(false);
    setTimeout(onClose, 220);
  }

  function editFeed(f) {
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
    handleClose();
  }
  function editDiaper(d) {
    setEditId(d.id);
    setEditType('diapers');
    setOpenModal('diaper');
    handleClose();
  }
  function editSleep(s) {
    setEditId(s.id);
    setEditType('sleeps');
    setOpenModal('sleep');
    handleClose();
  }

  return createPortal(
    <div
      className={`mbg${open ? ' open' : ''}`}
      style={{ display: 'flex' }}
    >
      <div
        className="msheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform .28s cubic-bezier(.32,1,.32,1)',
        }}
      >
        {/* 핸들 + 제목 */}
        <div className="mhandle" />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px 14px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--serif)', color: colors[type] }}>
            {mode === 'day' ? `${dateLabelStr} ${titles[type]}` : `직전 24시간 ${titles[type]}`}
          </div>
          <button
            onClick={handleClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, lineHeight: 1 }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 직전 24시간 / 당일 토글 — 요일 날짜를 눌러 "당일" 고정으로 연 경우는 불필요하므로 숨김 */}
        {!dayOnly && (
          <div className="modetoggle" style={{ padding: '12px 20px 0' }}>
            <button
              className={`modetoggle-btn${mode === 'recent24h' ? ' on' : ''}`}
              onClick={() => setMode('recent24h')}
              style={mode === 'recent24h' ? { background: colors[type], borderColor: colors[type] } : undefined}
            >
              직전 24시간
            </button>
            <button
              className={`modetoggle-btn${mode === 'day' ? ' on' : ''}`}
              onClick={() => { setSelectedDate(kstDate(Date.now()).toISOString().slice(0, 10)); setMode('day'); }}
              style={mode === 'day' ? { background: colors[type], borderColor: colors[type] } : undefined}
            >
              당일{mode === 'day' ? ` · ${dm}월 ${dd}일` : ''}
            </button>
          </div>
        )}

        {/* 내용 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px', WebkitOverflowScrolling: 'touch' }}>
          {type === 'feed' && <FeedDetail records={feedRecords} onEdit={editFeed} />}
          {type === 'diaper' && <DiaperDetail records={diaperRecords} onEdit={editDiaper} periodLabel={mode === 'day' ? '당일' : '직전 24시간'} />}
          {type === 'sleep' && <SleepDetail records={sleepRecords} onEdit={editSleep} periodLabel={mode === 'day' ? '당일' : '직전 24시간'} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
