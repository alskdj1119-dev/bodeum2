'use client';
import { useApp } from '../../lib/store';
import {
  fmtFull, elapsedStr, groupByDay, useNowTick,
  DIAPER_TYPE_LABEL as TD, DIAPER_COLOR_LABEL as TC,
} from '../../lib/helpers';

export default function DiaperPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast } = useApp();
  const { diapers } = db;
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  const sorted = [...diapers].sort((a,b) => new Date(b.time) - new Date(a.time));
  const grouped = groupByDay(sorted, d => d.time);

  function openEdit(d) {
    setEditId(d.id); setEditType('diapers');
    setOpenModal('diaper');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('diaper');
  }

  // 소변/대변/소변+대변 색 구분 (카드 배경색)
  function diaperColor(type) {
    if (type === 'wet') return { dot: 'var(--cd-wet)', bg: 'var(--dw-wet)' };
    if (type === 'soiled') return { dot: 'var(--cd)', bg: 'var(--dw)' };
    // both: 두 색을 절반씩
    return { dot: 'linear-gradient(90deg, var(--cd-wet) 50%, var(--cd) 50%)', bg: 'linear-gradient(90deg, var(--dw-wet) 50%, var(--dw) 50%)' };
  }

  function delDiaper(id) {
    const item = diapers.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'diapers' };
    const newDiapers = diapers.filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    const newDB = { ...db, diapers: newDiapers, trash: newTrash };
    dispatch({ type: 'SET_DIAPERS', payload: newDiapers });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">기저귀</span>
        <span className="badge">{sorted.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          추가
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty"><div className="empty-ico">👶</div><div className="empty-lbl">기저귀 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(d => {
              const sub = [d.color ? TC[d.color] : '', d.note || ''].filter(Boolean).join(' · ');
              const dc = diaperColor(d.type);
              return (
                <div key={d.id} className="ec" onClick={() => openEdit(d)} style={{ background: dc.bg }}>
                  <div className="edot" style={{ background: dc.dot }}></div>
                  <div className="emain">
                    <div className="epri">{TD[d.type] || '기저귀'}</div>
                    <div className="esec">{sub || ' '}</div>
                  </div>
                  <div className="etime">{fmtFull(d.time)}<br/><span className="eago">{elapsedStr(d.time)}</span></div>
                  <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 기저귀 기록을 삭제하시겠어요?')) delDiaper(d.id); }}>
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </>
  );
}
