'use client';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay } from '../../lib/helpers';

const METHOD_LABEL = { ear: '귀', armpit: '겨드랑이', forehead: '이마', rectal: '항문' };

// 예방접종 스케줄 (출생 기준 권장 시기)
const VACCINES = [
  { name: 'B형간염 1차', daysMin: 0, daysMax: 0 },
  { name: 'BCG (결핵)', daysMin: 0, daysMax: 28 },
  { name: 'B형간염 2차', daysMin: 28, daysMax: 56 },
  { name: 'DTaP 1차', daysMin: 56, daysMax: 63 },
  { name: 'IPV 1차', daysMin: 56, daysMax: 63 },
  { name: 'Hib 1차', daysMin: 56, daysMax: 63 },
  { name: '폐렴구균 1차', daysMin: 56, daysMax: 63 },
  { name: 'DTaP 2차', daysMin: 112, daysMax: 119 },
  { name: 'IPV 2차', daysMin: 112, daysMax: 119 },
  { name: 'Hib 2차', daysMin: 112, daysMax: 119 },
  { name: '폐렴구균 2차', daysMin: 112, daysMax: 119 },
  { name: 'B형간염 3차', daysMin: 168, daysMax: 180 },
  { name: 'DTaP 3차', daysMin: 168, daysMax: 175 },
  { name: 'Hib 3차', daysMin: 168, daysMax: 175 },
  { name: '폐렴구균 3차', daysMin: 168, daysMax: 175 },
  { name: 'A형간염 1차', daysMin: 365, daysMax: 425 },
  { name: 'MMR 1차', daysMin: 365, daysMax: 425 },
  { name: '수두', daysMin: 365, daysMax: 425 },
  { name: '일본뇌염 사백신 1차', daysMin: 365, daysMax: 425 },
];

function daysOld(birthDate) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export default function HealthPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType } = useApp();
  const { temps = [] } = db;
  const baby = useApp().baby;

  const sorted = [...temps].sort((a,b) => new Date(b.time) - new Date(a.time));
  const grouped = groupByDay(sorted, t => t.time);

  const age = baby.birthDate ? daysOld(baby.birthDate) : null;

  function openEdit(t) {
    setEditId(t.id); setEditType('temps');
    setOpenModal('temp');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('temp');
  }

  async function delTemp(id) {
    const newTemps = temps.filter(x => x.id !== id);
    const newDB = { ...db, temps: newTemps };
    dispatch({ type: 'SET_TEMPS', payload: newTemps });
    await saveDB(newDB);
  }

  // Fever stats
  const last24 = temps.filter(t => (Date.now() - new Date(t.time).getTime()) <= 86400000);
  const fevers = last24.filter(t => t.temp >= 37.5);
  const latestTemp = sorted[0];

  return (
    <>
      {/* ─── 체온 헤더 ─── */}
      <div className="loghdr">
        <span className="logtitle">건강 기록</span>
        <span className="badge">{sorted.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          체온 추가
        </button>
      </div>

      {/* ─── 요약 카드 ─── */}
      {latestTemp && (
        <div className="sc" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--serif)',
              color: latestTemp.temp >= 37.5 ? '#E05A4E' : 'var(--cw)' }}>
              {latestTemp.temp.toFixed(1)}
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>°C — {METHOD_LABEL[latestTemp.method] || latestTemp.method}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtFull(latestTemp.time)}</div>
              {latestTemp.temp >= 37.5 && (
                <div style={{ fontSize: 11, color: '#E05A4E', fontWeight: 600 }}>⚠ 발열 상태</div>
              )}
            </div>
            {fevers.length > 0 && (
              <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#E05A4E' }}>{fevers.length}회</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>24h 발열</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 체온 목록 ─── */}
      {sorted.length === 0 ? (
        <div className="empty"><div className="empty-ico">🌡️</div><div className="empty-lbl">체온 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(t => {
              const isFever = t.temp >= 37.5;
              return (
                <div key={t.id} className="ec" onClick={() => openEdit(t)}>
                  <div className="edot" style={{ background: isFever ? '#E05A4E' : 'var(--cw)' }} />
                  <div className="emain">
                    <div className="epri" style={{ color: isFever ? '#E05A4E' : undefined }}>
                      {t.temp.toFixed(1)}°C
                      {isFever && <span style={{ fontSize: 10, background: '#E05A4E', color: '#fff', borderRadius: 4, padding: '1px 5px', marginLeft: 6 }}>발열</span>}
                    </div>
                    <div className="esub">{METHOD_LABEL[t.method] || t.method}{t.note ? ' · ' + t.note : ''}</div>
                  </div>
                  <div className="etime">{fmtFull(t.time)}</div>
                  <button className="edel" onClick={e => { e.stopPropagation(); delTemp(t.id); }}>
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* ─── 예방접종 스케줄 ─── */}
      <p className="seclbl" style={{ marginTop: 24, marginBottom: 10 }}>예방접종 스케줄</p>
      {!baby.birthDate ? (
        <div className="sc" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
            설정에서 생년월일을 입력하면 예방접종 일정이 표시돼요
          </div>
        </div>
      ) : (
        <div className="sc" style={{ marginBottom: 20, padding: '4px 0' }}>
          {VACCINES.map((v, i) => {
            const targetDate = addDays(baby.birthDate, v.daysMin);
            const isPast = age !== null && age > v.daysMax;
            const isNow = age !== null && age >= v.daysMin && age <= v.daysMax + 30;
            const isSoon = age !== null && !isNow && !isPast && (v.daysMin - age) <= 14;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                borderBottom: i < VACCINES.length - 1 ? '1px solid var(--bdr)' : 'none',
                opacity: isPast ? 0.45 : 1,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isPast ? 'var(--muted)' : isNow ? 'var(--cf)' : isSoon ? 'var(--cd)' : 'var(--bdr)',
                }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{v.name}</div>
                <div style={{ fontSize: 11, color: isNow ? 'var(--cf)' : isSoon ? 'var(--cd)' : 'var(--muted)', fontWeight: isNow || isSoon ? 600 : 400 }}>
                  {isPast ? '완료 예정' : isNow ? '지금 시기' : isSoon ? '곧 예정' : ''}
                  {' '}
                  {targetDate.getMonth()+1}/{targetDate.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
