'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  fmt, fmtFull, durStr, elapsedStr, groupByDay, timerStr, feedAmountMl, feedStartTime, directFeedDurationMs,
  feedColor, groupFeedsForDisplay, groupFeedTypeLabel, useNowTick, capTrash,
  FEED_TYPE_LABEL as TF, FEED_SUBTYPE_LABEL as TSU, FEED_SIDE_LABEL as TS,
} from '../../lib/helpers';

// 수유 라벨/상세 텍스트는 컴포넌트 상태와 무관(가져온 라벨 맵만 사용)이라 모듈 레벨
// 함수로 빼서, 단일 카드(SingleFeedRow)와 묶음 카드(FeedGroupCard) 양쪽에서 재사용한다.
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
  const durMs = directFeedDurationMs(f) || null;
  const dur = durMs ? durStr(durMs) : '';
  const side = f.side ? TS[f.side] : '';
  return [amtStr, dur, side, f.note || ''].filter(Boolean).join(' · ');
}

// 기록 카드 하나(단독 기록이든, 묶음 안의 한 구성원이든 동일하게 사용) — × 눌러서
// 삭제 확인 팝오버를 띄우는 방식은 홈 화면 "최근 기록"과 동일.
function SingleFeedRow({ f, onEdit, onDelete, confirmDeleteKey, toggleDeleteConfirm, closeDeleteConfirm }) {
  const t = f.start || f.time;
  const timeRange = (f.start && f.end) ? `${fmt(f.start)} → ${fmt(f.end)}` : fmt(t);
  const detail = feedDetails(f);
  const fc = feedColor(f);
  return (
    <div className="rwrap">
      <button className="delx" onClick={e => toggleDeleteConfirm(f.id, e)} aria-label="기록 삭제">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      {confirmDeleteKey === f.id && (
        <div className="delpop" onClick={ev => ev.stopPropagation()}>
          <div className="delpop-text">이 수유 기록을 삭제하시겠어요?</div>
          <button className="btn-delete" onClick={() => { onDelete(f.id); closeDeleteConfirm(); }}>삭제</button>
          <button className="btn-cancel" onClick={closeDeleteConfirm}>취소</button>
        </div>
      )}
      <div className="ec" onClick={() => onEdit(f)} style={{ background: fc.bg }}>
        <div className="edot" style={{ background: fc.dot }}></div>
        <div className="emain">
          <div className="epri">{feedLabel(f)}</div>
          <div className="esec">{timeRange}{detail ? ' · ' + detail : ''}</div>
        </div>
        <div className="etime">{fmtFull(t)}<br/><span className="eago">{elapsedStr(t)}</span></div>
      </div>
    </div>
  );
}

// 직수 뒤에 보충수유를 이어서 한 "묶음" — 평소엔 합쳐진 요약 카드 하나로 보이다가,
// 탭하면 안에 들어있는 각 기록(직수/보충)이 펼쳐져서 개별적으로 수정·삭제할 수 있다.
function FeedGroupCard({ item, onEdit, onDeleteSingle, onDeleteGroup, confirmDeleteKey, toggleDeleteConfirm, closeDeleteConfirm }) {
  const [open, setOpen] = useState(false);
  const { members, id: groupKey } = item;
  const earliestStart = feedStartTime(members[0]);
  const latestEnd = members.reduce((max, m) => (m.end && (!max || new Date(m.end) > new Date(max))) ? m.end : max, null);
  const timeRange = latestEnd ? `${fmt(earliestStart)} → ${fmt(latestEnd)}` : fmt(earliestStart);
  const combinedDetail = members.map(m => `${feedLabel(m)} ${feedDetails(m)}`.trim()).filter(Boolean).join(' + ');
  const fc = feedColor(members[0]);
  const ids = members.map(m => m.id);

  return (
    <div className="rwrap">
      <button className="delx" onClick={e => toggleDeleteConfirm(groupKey, e)} aria-label="기록 삭제">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      {confirmDeleteKey === groupKey && (
        <div className="delpop" onClick={ev => ev.stopPropagation()}>
          <div className="delpop-text">이 수유 세션({members.length}건)을 모두 삭제하시겠어요?</div>
          <button className="btn-delete" onClick={() => { onDeleteGroup(ids); closeDeleteConfirm(); }}>삭제</button>
          <button className="btn-cancel" onClick={closeDeleteConfirm}>취소</button>
        </div>
      )}
      <div className="ec" onClick={() => setOpen(o => !o)} style={{ background: fc.bg }}>
        <div className="edot" style={{ background: fc.dot }}></div>
        <div className="emain">
          <div className="epri">
            {groupFeedTypeLabel(members)}
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}> · {members.length}건 묶음</span>
          </div>
          <div className="esec">{timeRange}{combinedDetail ? ' · ' + combinedDetail : ''}{open ? ' · 접기 ▲' : ' · 펼쳐보기 ▾'}</div>
        </div>
        <div className="etime">{fmtFull(earliestStart)}<br/><span className="eago">{elapsedStr(earliestStart)}</span></div>
      </div>
      {open && (
        <div style={{ marginLeft: 14, marginTop: 8, borderLeft: '2px solid var(--bdr)', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <SingleFeedRow
              key={m.id} f={m} onEdit={onEdit} onDelete={onDeleteSingle}
              confirmDeleteKey={confirmDeleteKey} toggleDeleteConfirm={toggleDeleteConfirm} closeDeleteConfirm={closeDeleteConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, feedTimerMs, stopActiveFeed, pauseActiveFeed, resumeActiveFeed, filterByActiveBaby, activeBabyId, babies } = useApp();
  // 기록 카드 × 삭제 확인 팝오버 — 홈 화면 "최근 기록"과 동일한 디자인/동작.
  // 한 번에 하나만 열리며, 다른 카드의 ×를 누르면 열려있던 팝오버는 닫히고 새로 열린다.
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  function toggleDeleteConfirm(key, e) {
    e.stopPropagation();
    setConfirmDeleteKey(prev => (prev === key ? null : key));
  }
  function closeDeleteConfirm() {
    setConfirmDeleteKey(null);
  }
  // 화면에는 지금 보고 있는 아이의 기록만 — 실제 삭제/저장은 항상 db.feeds(전체) 기준으로 해서
  // 다른 아이의 기록이 실수로 사라지지 않게 한다 (아래 delFeed 참고).
  const feeds = filterByActiveBaby(db.feeds);
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  const activeFeed = feeds.find(f => f.start && !f.end);
  // 직수만 일시정지 가능 — 멈춘 동안의 시간은 섭취량(ml) 계산에서 빠진다.
  const canPause = !!activeFeed && activeFeed.type === 'breast' && activeFeed.subtype === 'direct';
  const isPaused = canPause && !!activeFeed.pausedAt;
  const done = feeds.filter(f => f.end || f.time).sort((a,b) => new Date(b.start||b.time) - new Date(a.start||a.time));
  // 직수 뒤에 보충수유를 이어서 한 기록들은 groupFeedsForDisplay()가 하나의 묶음 항목으로
  // 합쳐준다 — 저장은 그대로 기록별로 따로 돼 있고, 화면에 보일 때만 묶인다.
  const displayItems = groupFeedsForDisplay(done);
  const grouped = groupByDay(displayItems, item => item.time);

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
    const item = db.feeds.find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'feeds' };
    const newFeeds = db.feeds.filter(x => x.id !== id);
    const newTrash = capTrash([trashItem, ...(db.trash || [])]);
    const newDB = { ...db, feeds: newFeeds, trash: newTrash };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  // 묶음(세션) 전체 삭제 — 직수+보충수유 기록을 한 번에 휴지통으로 보낸다.
  function delFeedGroup(ids) {
    const idSet = new Set(ids);
    const items = db.feeds.filter(x => idSet.has(x.id));
    if (items.length === 0) return;
    const now = new Date().toISOString();
    const trashItems = items.map(item => ({ ...item, _deletedAt: now, _type: 'feeds' }));
    const newFeeds = db.feeds.filter(x => !idSet.has(x.id));
    const newTrash = capTrash([...trashItems, ...(db.trash || [])]);
    const newDB = { ...db, feeds: newFeeds, trash: newTrash };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  return (
    <>
      {activeFeed && (
        <div className={`slive banner-in${isPaused ? ' paused' : ''}`} style={{ background:'var(--fw)', cursor:'pointer' }} onClick={openActiveEdit}>
          <div className="spulse" style={{ background:'var(--cf)' }}></div>
          <div className="sliveinf">
            <div className="slivelbl">{isPaused ? '일시정지 중' : '수유 중'}</div>
            <div className="slivetimer">{timerStr(feedTimerMs)}</div>
          </div>
          {canPause && (
            <button className="spause" style={{ '--pause-c':'color-mix(in srgb, var(--cf) 65%, white)' }}
              onClick={e => { e.stopPropagation(); isPaused ? resumeActiveFeed() : pauseActiveFeed(); }}>
              {isPaused ? '이어서' : '일시정지'}
            </button>
          )}
          <button className="sstop" style={{ background:'var(--cf)' }} onClick={e => { e.stopPropagation(); stopActiveFeed(); }}>종료</button>
        </div>
      )}

      <div className="loghdr">
        <span className="logtitle">수유</span>
        <span className="badge">{displayItems.length}</span>
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
            {items.map(item => item.isGroup ? (
              <FeedGroupCard
                key={item.id} item={item} onEdit={openEdit} onDeleteSingle={delFeed} onDeleteGroup={delFeedGroup}
                confirmDeleteKey={confirmDeleteKey} toggleDeleteConfirm={toggleDeleteConfirm} closeDeleteConfirm={closeDeleteConfirm}
              />
            ) : (
              <SingleFeedRow
                key={item.id} f={item.feed} onEdit={openEdit} onDelete={delFeed}
                confirmDeleteKey={confirmDeleteKey} toggleDeleteConfirm={toggleDeleteConfirm} closeDeleteConfirm={closeDeleteConfirm}
              />
            ))}
          </div>
        ))
      )}
      {confirmDeleteKey && <div className="deldim" onClick={closeDeleteConfirm} />}
    </>
  );
}
