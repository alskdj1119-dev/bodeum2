'use client';
import { useApp } from '../../lib/store';
import {
  fmt, fmtFull, durStr, elapsedStr, groupByDay, timerStr, feedAmountMl, useNowTick,
  FEED_TYPE_LABEL as TF, FEED_SUBTYPE_LABEL as TSU, FEED_SIDE_LABEL as TS,
} from '../../lib/helpers';

export default function FeedPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, feedTimerMs, stopActiveFeed } = useApp();
  const { feeds } = db;
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  const activeFeed = feeds.find(f => f.start && !f.end);
  const done = feeds.filter(f => f.end || f.time).sort((a,b) => new Date(b.start||b.time) - new Date(a.start||a.time));
  const grouped = groupByDay(done, f => f.start || f.time);

  function openActiveEdit() {
    if (!activeFeed) return;
    setEditId(activeFeed.id);
    setEditType('feeds');
    setOpenModal('activeTimerEdit');
  }

  function openEdit(f) {
    if (!f.end) { showToast('진행 중인 수유는 종료 후 수정할 수 있어요'); return; }
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('feed');
  }

  function delFeed(id) {
    const item = feeds.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'feeds' };
    const newFeeds = feeds.filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    const newDB = { ...db, feeds: newFeeds, trash: newTrash };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  // 모유(직수)/모유(유축)/분유 색 구분 (카드 배경색) — FeedModal의 색상 체계와 동일
  function feedColor(f) {
    if (f.type === 'bottle') return { dot: 'var(--cd)', bg: 'var(--dw)' };
    if (f.subtype === 'pumped') return { dot: 'var(--cf)', bg: 'var(--fw)' };
    return { dot: 'var(--cs)', bg: 'var(--sw)' }; // 직수 (기본)
  }

  function feedLabel(f) {
    const base = TF[f.type] || '수유';
    if (f.subtype) return base + ' · ' + (TSU[f.subtype] || '');
    return base;
  }

  function feedDetails(f) {
    const dispAmt = feedAmountMl(f);
    const amtStr = f.consumedAmount != null && dispAmt != null ? `준비 ${dispAmt}ml / 섭취 ${f.consumedAmount}ml`
      : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
      : dispAmt ? `${dispAmt}ml` : '';
    // 직수를 왼쪽/오른쪽 이어서 한 기록은 sideTimes 각 구간의 합으로 실제 수유 시간을 계산.
    let durMs = null;
    if (f.sideTimes) {
      durMs = Object.values(f.sideTimes).reduce((acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0);
    } else if (f.start && f.end) {
      durMs = new Date(f.end) - new Date(f.start);
    }
    const dur = durMs ? durStr(durMs) : '';
    const side = f.side ? TS[f.side] : '';
    return [amtStr, dur, side, f.note || ''].filter(Boolean).join(' · ');
  }

  return (
    <>
      {activeFeed && (
        <div className="slive banner-in" style={{ background:'var(--fw)', cursor:'pointer' }} onClick={openActiveEdit}>
          <div className="spulse" style={{ background:'var(--cf)' }}></div>
          <div className="sliveinf">
            <div className="slivelbl">수유 중</div>
            <div className="slivetimer">{timerStr(feedTimerMs)}</div>
          </div>
          <button className="sstop" style={{ background:'var(--cf)' }} onClick={e => { e.stopPropagation(); stopActiveFeed(); }}>종료</button>
        </div>
      )}

      <div className="loghdr">
        <span className="logtitle">수유</span>
        <span className="badge">{done.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          추가
        </button>
      </div>

      {done.length === 0 && !activeFeed ? (
        <div className="empty"><div className="empty-ico">🍼</div><div className="empty-lbl">수유 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(f => {
              const t = f.start || f.time;
              const timeRange = (f.start && f.end) ? `${fmt(f.start)} → ${fmt(f.end)}` : fmt(t);
              const detail = feedDetails(f);
              const fc = feedColor(f);
              return (
                <div key={f.id} className="ec" onClick={() => openEdit(f)} style={{ background: fc.bg }}>
                  <div className="edot" style={{ background: fc.dot }}></div>
                  <div className="emain">
                    <div className="epri">{feedLabel(f)}</div>
                    <div className="esec">{timeRange}{detail ? ' · ' + detail : ''}</div>
                  </div>
                  <div className="etime">{fmtFull(t)}<br/><span className="eago">{elapsedStr(t)}</span></div>
                  <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 수유 기록을 삭제하시겠어요?')) delFeed(f.id); }}>
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
