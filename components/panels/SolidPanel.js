'use client';
import { useApp } from '../../lib/store';
import {
  fmtFull, elapsedStr, groupByDay, useNowTick,
  SOLID_REACTION_LABEL as TR,
} from '../../lib/helpers';

export default function SolidPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, filterByActiveBaby } = useApp();
  const solids = filterByActiveBaby(db.solids || []);
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  const sorted = [...solids].sort((a,b) => new Date(b.time) - new Date(a.time));
  const grouped = groupByDay(sorted, s => s.time);

  function openEdit(s) {
    setEditId(s.id); setEditType('solids');
    setOpenModal('solid');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('solid');
  }

  function delSolid(id) {
    const item = (db.solids || []).find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'solids' };
    const newSolids = (db.solids || []).filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    const newDB = { ...db, solids: newSolids, trash: newTrash };
    dispatch({ type: 'SET_SOLIDS', payload: newSolids });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">이유식</span>
        <span className="badge">{sorted.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          추가
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty"><div className="empty-ico">🥣</div><div className="empty-lbl">이유식 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(s => {
              const sub = [s.amount != null ? `${s.amount}g` : '', s.reaction ? TR[s.reaction] : '', s.note || ''].filter(Boolean).join(' · ');
              return (
                <div key={s.id} className="ec" onClick={() => openEdit(s)}>
                  <div className="edot n"></div>
                  <div className="emain">
                    <div className="epri">{s.food || '이유식'}</div>
                    <div className="esec">{sub || ' '}</div>
                  </div>
                  <div className="etime">{fmtFull(s.time)}<br/><span className="eago">{elapsedStr(s.time)}</span></div>
                  <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 이유식 기록을 삭제하시겠어요?')) delSolid(s.id); }}>
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
