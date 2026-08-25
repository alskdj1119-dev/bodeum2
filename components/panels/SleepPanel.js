'use client';
import { useApp } from '../../lib/store';
import {
  fmt, fmtFull, elapsedStr, durStr, groupByDay, timerStr,
  SLEEP_PLACE_LABEL as PL,
} from '../../lib/helpers';

export default function SleepPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, sleepTimerMs, stopActiveSleep } = useApp();
  const { sleeps } = db;

  const activeSleep = sleeps.find(s => s.start && !s.end);
  const done = sleeps.filter(s => s.end).sort((a,b) => new Date(b.start) - new Date(a.start));
  const grouped = groupByDay(done, s => s.start);

  function openEdit(s) {
    setEditId(s.id); setEditType('sleeps');
    setOpenModal('sleep');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('sleep');
  }

  function delSleep(id) {
    const item = sleeps.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'sleeps' };
    const newSleeps = sleeps.filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    const newDB = { ...db, sleeps: newSleeps, trash: newTrash };
    dispatch({ type: 'SET_SLEEPS', payload: newSleeps });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  return (
    <>
      {activeSleep && (
        <div className="slive banner-in" style={{ background:'var(--sw)' }}>
          <div className="spulse" style={{ background:'var(--cs)' }}></div>
          <div className="sliveinf">
            <div className="slivelbl">수면 중</div>
            <div className="slivetimer">{timerStr(sleepTimerMs)}</div>
          </div>
          <button className="sstop" style={{ background:'var(--cs)' }} onClick={stopActiveSleep}>종료</button>
        </div>
      )}

      <div className="loghdr">
        <span className="logtitle">수면</span>
        <span className="badge">{done.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          추가
        </button>
      </div>

      {done.length === 0 && !activeSleep ? (
        <div className="empty"><div className="empty-ico">🌙</div><div className="empty-lbl">수면 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(s => {
              const dur = s.end ? durStr(new Date(s.end) - new Date(s.start)) : '';
              const timeRange = `${fmt(s.start)} → ${fmt(s.end)}`;
              const place = s.place ? PL[s.place] : '';
              return (
                <div key={s.id} className="ec" onClick={() => openEdit(s)}>
                  <div className="edot s"></div>
                  <div className="emain">
                    <div className="epri">{dur}</div>
                    <div className="esec">{timeRange}{place ? ' · ' + place : ''}</div>
                  </div>
                  <div className="etime">{fmtFull(s.start)}<br/><span className="eago">{elapsedStr(s.start)}</span></div>
                  <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 수면 기록을 삭제하시겠어요?')) delSleep(s.id); }}>
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
