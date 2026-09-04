'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay, kstDate, KST_OFFSET_MS, TEMP_METHOD_LABEL as METHOD_LABEL } from '../../lib/helpers';

// ──────────────────────────── 공통 상수 ────────────────────────────
const VACCINES = [
  { code: 'hepb1',  name: 'B형간염 1차',        daysMin: 0,   daysMax: 7 },
  { code: 'bcg',    name: 'BCG (결핵)',           daysMin: 0,   daysMax: 28 },
  { code: 'hepb2',  name: 'B형간염 2차',          daysMin: 28,  daysMax: 56 },
  { code: 'dtap1',  name: 'DTaP 1차',             daysMin: 56,  daysMax: 70 },
  { code: 'ipv1',   name: 'IPV (폴리오) 1차',     daysMin: 56,  daysMax: 70 },
  { code: 'hib1',   name: 'Hib 1차',              daysMin: 56,  daysMax: 70 },
  { code: 'pcv1',   name: '폐렴구균 1차',         daysMin: 56,  daysMax: 70 },
  { code: 'dtap2',  name: 'DTaP 2차',             daysMin: 112, daysMax: 126 },
  { code: 'ipv2',   name: 'IPV (폴리오) 2차',     daysMin: 112, daysMax: 126 },
  { code: 'hib2',   name: 'Hib 2차',              daysMin: 112, daysMax: 126 },
  { code: 'pcv2',   name: '폐렴구균 2차',         daysMin: 112, daysMax: 126 },
  { code: 'hepb3',  name: 'B형간염 3차',          daysMin: 168, daysMax: 210 },
  { code: 'dtap3',  name: 'DTaP 3차',             daysMin: 168, daysMax: 182 },
  { code: 'hib3',   name: 'Hib 3차',              daysMin: 168, daysMax: 182 },
  { code: 'pcv3',   name: '폐렴구균 3차',         daysMin: 168, daysMax: 182 },
  { code: 'hepa1',  name: 'A형간염 1차',          daysMin: 365, daysMax: 425 },
  { code: 'mmr1',   name: 'MMR 1차',              daysMin: 365, daysMax: 425 },
  { code: 'var',    name: '수두',                 daysMin: 365, daysMax: 425 },
  { code: 'je1',    name: '일본뇌염 1차',         daysMin: 365, daysMax: 425 },
];

const STATUS_OPTS = [
  { code: 'before', label: '접종이전', color: 'var(--muted)' },
  { code: 'done',   label: '접종완료', color: 'var(--cw)' },
  { code: 'skip',   label: '미접종',   color: 'var(--cd)' },
];

// ──────────────────────────── 메인 컴포넌트 ────────────────────────────
export default function HealthPanel() {
  const {
    db, dispatch, saveDB, setOpenModal, setEditId, setEditType,
    baby, vaccineStatus, saveVaccineStatus, showToast, filterByActiveBaby,
  } = useApp();
  const temps = filterByActiveBaby(db.temps || []);

  const [tab, setTab] = useState('temp'); // 'temp' | 'vaccine' — 체중은 2단계부터 '성장' 탭으로 이동

  // 체온 데이터
  const tempsSorted = [...temps].sort((a,b) => new Date(b.time) - new Date(a.time));
  const tempsGrouped = groupByDay(tempsSorted, t => t.time);
  const last24Fever = temps.filter(t =>
    t.temp >= 37.5 && (Date.now() - new Date(t.time).getTime()) <= 86400000
  );
  const latestTemp = tempsSorted[0];

  // 예방접종 — 생년월일은 항상 "한국 날짜"로 해석해 만 며칠인지 계산 (기기 시간대 무관).
  const age = baby.birthDate
    ? (() => {
        const [by, bm, bd] = baby.birthDate.split('-').map(Number);
        const birthMs = Date.UTC(by, bm - 1, bd, 0, 0) - KST_OFFSET_MS;
        const nowKst = kstDate(Date.now());
        const todayMs = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate(), 0, 0) - KST_OFFSET_MS;
        return Math.floor((todayMs - birthMs) / 86400000);
      })()
    : null;

  function openTempEdit(t) { setEditId(t.id); setEditType('temps'); setOpenModal('temp'); }
  function openTempNew() { setEditId(null); setEditType(null); setOpenModal('temp'); }

  // 수유/기저귀/수면과 동일하게 휴지통을 거치도록 통일 (기존엔 여기만 영구 삭제였음)
  async function delTemp(id) {
    const item = (db.temps || []).find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'temps' };
    const newTemps = (db.temps || []).filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_TEMPS', payload: newTemps });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, temps: newTemps, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  // vaccineStatus[code]는 예전엔 문자열('before'|'done'|'skip')만 저장했는데,
  // 접종완료일자를 함께 기록해야 해서 { status, doneDate } 객체로 확장한다.
  // 기존에 문자열로 저장된 값도 그대로 읽을 수 있도록 아래 getVaccineInfo()에서 정규화한다.
  function getVaccineInfo(code) {
    const v = vaccineStatus[code];
    if (!v) return { status: 'before', doneDate: '' };
    if (typeof v === 'string') return { status: v, doneDate: '' };
    return { status: v.status || 'before', doneDate: v.doneDate || '' };
  }

  function setVaccine(code, status) {
    const cur = getVaccineInfo(code);
    saveVaccineStatus({ ...vaccineStatus, [code]: { status, doneDate: cur.doneDate } });
  }

  function setVaccineDate(code, doneDate) {
    const cur = getVaccineInfo(code);
    saveVaccineStatus({ ...vaccineStatus, [code]: { status: cur.status, doneDate } });
  }

  const TABS = [
    { id: 'temp',    label: '체온' },
    { id: 'vaccine', label: '예방접종' },
  ];

  return (
    <>
      {/* ─── 헤더 + 탭 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span className="logtitle" style={{ flex: 1 }}>건강</span>
        {tab === 'temp' && (
          <button className="addbtn" onClick={openTempNew}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            체온 추가
          </button>
        )}
      </div>

      {/* 세그먼트 탭 */}
      <div className="seg" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} className={`sbtn${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ─── 체온 탭 ─── */}
      {tab === 'temp' && (
        <>
          {latestTemp && (
            <div className="sc-static" style={{ marginBottom: 12 }}>
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
                {last24Fever.length > 0 && (
                  <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#E05A4E' }}>{last24Fever.length}회</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>24h 발열</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tempsSorted.length === 0 ? (
            <div className="empty"><div className="empty-ico">🌡️</div><div className="empty-lbl">체온 기록이 없어요</div></div>
          ) : (
            tempsGrouped.map(([day, items]) => (
              <div key={day} className="daygrp">
                <div className="daylbl">{day}</div>
                {items.map(t => {
                  const isFever = t.temp >= 37.5;
                  return (
                    <div key={t.id} className="ec" onClick={() => openTempEdit(t)}>
                      <div className="edot" style={{ background: isFever ? '#E05A4E' : 'var(--cw)' }} />
                      <div className="emain">
                        <div className="epri" style={{ color: isFever ? '#E05A4E' : undefined }}>
                          {t.temp.toFixed(1)}°C
                          {isFever && <span style={{ fontSize: 10, background: '#E05A4E', color: '#fff', borderRadius: 4, padding: '1px 5px', marginLeft: 6 }}>발열</span>}
                        </div>
                        <div className="esub">{METHOD_LABEL[t.method] || t.method}{t.note ? ' · ' + t.note : ''}</div>
                      </div>
                      <div className="etime">{fmtFull(t.time)}</div>
                      <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 체온 기록을 삭제하시겠어요?')) delTemp(t.id); }}>
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </>
      )}

      {/* ─── 예방접종 탭 ─── */}
      {tab === 'vaccine' && (
        <>
          {!baby.birthDate ? (
            <div className="sc-static">
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
                설정에서 생년월일을 입력하면 예방접종 일정이 표시돼요
              </div>
            </div>
          ) : (
            VACCINES.map((v) => {
              const { status, doneDate } = getVaccineInfo(v.code);
              // 생년월일 문자열을 UTC 기준 Date로 만들고 UTC getter/setter만 사용 —
              // 기기 시간대와 무관하게 항상 같은 달력 날짜 계산이 되도록 한다.
              const [vby, vbm, vbd] = baby.birthDate.split('-').map(Number);
              const targetDate = new Date(Date.UTC(vby, vbm - 1, vbd));
              targetDate.setUTCDate(targetDate.getUTCDate() + v.daysMin);

              const isNowPeriod = age !== null && age >= v.daysMin - 7 && age <= v.daysMax + 30;
              const isPastPeriod = age !== null && age > v.daysMax + 30;

              const statusOpt = STATUS_OPTS.find(s => s.code === status);
              const dotColor = status === 'done' ? 'var(--cw)'
                : status === 'skip' ? 'var(--cd)'
                : isNowPeriod ? 'var(--cf)'
                : isPastPeriod ? 'var(--muted)'
                : 'var(--bdr)';

              return (
                <div key={v.code} style={{
                  background: 'var(--surf)',
                  borderRadius: 12,
                  marginBottom: 8,
                  overflow: 'hidden',
                  opacity: (status === 'before' && isPastPeriod) ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        권장: {targetDate.getUTCMonth()+1}/{targetDate.getUTCDate()}
                        {isNowPeriod && status === 'before' && (
                          <span style={{ color: 'var(--cf)', fontWeight: 600, marginLeft: 6 }}>지금 시기</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: statusOpt.color }}>
                      {statusOpt.label}
                    </div>
                  </div>
                  <div style={{ display: 'flex', borderTop: '1px solid var(--bdr)' }}>
                    {STATUS_OPTS.map((opt, oi) => (
                      <button key={opt.code} onClick={() => setVaccine(v.code, opt.code)} style={{
                        flex: 1, padding: '7px 0', fontSize: 11,
                        fontWeight: status === opt.code ? 700 : 400,
                        color: status === opt.code ? opt.color : 'var(--muted)',
                        background: status === opt.code ? 'var(--fw)' : 'transparent',
                        border: 'none', borderRight: oi < 2 ? '1px solid var(--bdr)' : 'none',
                        cursor: 'pointer', transition: 'background .15s, color .15s',
                      }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {status === 'done' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--bdr)' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>접종 완료일자</div>
                      <input type="date" className="finp" value={doneDate}
                        onChange={e => setVaccineDate(v.code, e.target.value)}
                        style={{ padding: '5px 8px', fontSize: 12, width: 'auto', flex: 1 }} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </>
  );
}
