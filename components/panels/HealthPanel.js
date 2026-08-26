'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay, TEMP_METHOD_LABEL as METHOD_LABEL } from '../../lib/helpers';
import WeightValueChart from '../charts/WeightValueChart';

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
    db, dispatch, saveDB, setOpenModal, setEditId, setEditType, activeTab, healthInitTab, setHealthInitTab,
    baby, vaccineStatus, saveVaccineStatus, showToast,
  } = useApp();
  const { temps = [], weights = [] } = db;

  const [tab, setTab] = useState('temp'); // 'temp' | 'weight' | 'vaccine'

  // 홈에서 체중 카드 클릭 시 체중 탭으로 자동 이동
  useEffect(() => {
    if (activeTab === 'health' && healthInitTab) {
      setTab(healthInitTab);
      setHealthInitTab(null);
    }
  }, [activeTab, healthInitTab]);

  // 체온 데이터
  const tempsSorted = [...temps].sort((a,b) => new Date(b.time) - new Date(a.time));
  const tempsGrouped = groupByDay(tempsSorted, t => t.time);
  const last24Fever = temps.filter(t =>
    t.temp >= 37.5 && (Date.now() - new Date(t.time).getTime()) <= 86400000
  );
  const latestTemp = tempsSorted[0];

  // 체중 데이터
  const weightSorted = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const weightGrouped = groupByDay(weightSorted, w => w.time);

  // 예방접종
  const age = baby.birthDate
    ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000)
    : null;

  function openTempEdit(t) { setEditId(t.id); setEditType('temps'); setOpenModal('temp'); }
  function openTempNew() { setEditId(null); setEditType(null); setOpenModal('temp'); }

  function openWeightEdit(w) { setEditId(w.id); setEditType('weights'); setOpenModal('weight'); }
  function openWeightNew() { setEditId(null); setEditType(null); setOpenModal('weight'); }

  // 수유/기저귀/수면과 동일하게 휴지통을 거치도록 통일 (기존엔 여기만 영구 삭제였음)
  async function delTemp(id) {
    const item = temps.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'temps' };
    const newTemps = temps.filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_TEMPS', payload: newTemps });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, temps: newTemps, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }
  async function delWeight(id) {
    const item = weights.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'weights' };
    const newW = weights.filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_WEIGHTS', payload: newW });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, weights: newW, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  function setVaccine(code, status) {
    saveVaccineStatus({ ...vaccineStatus, [code]: status });
  }

  const TABS = [
    { id: 'temp',    label: '체온' },
    { id: 'weight',  label: '체중' },
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
        {tab === 'weight' && (
          <button className="addbtn" onClick={openWeightNew}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            체중 추가
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

      {/* ─── 체중 탭 ─── */}
      {tab === 'weight' && (
        <>
          {weights.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>일별 체중 추이</div>
              <WeightValueChart weights={weights} />
            </div>
          )}

          {weightSorted.length === 0 ? (
            <div className="empty"><div className="empty-ico">⚖️</div><div className="empty-lbl">체중 기록이 없어요</div></div>
          ) : (
            weightGrouped.map(([day, items]) => (
              <div key={day} className="daygrp">
                <div className="daylbl">{day}</div>
                {items.map(w => (
                  <div key={w.id} className="ec" onClick={() => openWeightEdit(w)}>
                    <div className="edot w"></div>
                    <div className="emain">
                      <div className="epri">{w.kg.toFixed(3)} kg</div>
                    </div>
                    <div className="etime">{fmtFull(w.time)}</div>
                    <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 체중 기록을 삭제하시겠어요?')) delWeight(w.id); }}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {/* ─── 예방접종 탭 ─── */}
      {tab === 'vaccine' && (
        <>
          {!baby.birthDate ? (
            <div className="sc">
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
                설정에서 생년월일을 입력하면 예방접종 일정이 표시돼요
              </div>
            </div>
          ) : (
            VACCINES.map((v) => {
              const status = vaccineStatus[v.code] || 'before';
              const targetDate = new Date(baby.birthDate);
              targetDate.setDate(targetDate.getDate() + v.daysMin);

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
                        권장: {targetDate.getMonth()+1}/{targetDate.getDate()}
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
                </div>
              );
            })
          )}
        </>
      )}
    </>
  );
}
