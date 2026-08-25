'use client';
import { useApp } from '../../lib/store';
import { fmt, fmtFull, elapsedStr, groupByDay } from '../../lib/helpers';

const TD = { wet:'소변', soiled:'대변', both:'소변+대변' };
const TC = { yellow:'노란색', green:'녹색', other:'기타' };

export default function DiaperPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast } = useApp();
  const { diapers } = db;

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
              return (
                <div key={d.id} className="ec" onClick={() => openEdit(d)}>
                  <div className="edot d"></div>
                  <div className="emain">
                    <div className="epri">{TD[d.type] || '기저귀'}</div>
                    <div className="esec">{sub || ' '}</div>
                  </div>
                  <div className="etime">{fmtFull(d.time)}<br/><span className="eago">{elapsedStr(d.time)}</span></div>
                  <button className="edel" onClick={e => { e.stopPropagation(); delDiaper(d.id); }}>
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
