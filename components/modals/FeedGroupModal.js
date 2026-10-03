'use client';
import { createPortal } from 'react-dom';
import { useApp } from '../../lib/store';
import {
  fmt, durStr, feedAmountMl, feedStartTime, directFeedDurationMs, feedColor, capTrash,
  FEED_TYPE_LABEL as TF, FEED_SUBTYPE_LABEL as TSU, FEED_SIDE_LABEL as TS,
} from '../../lib/helpers';

function feedLabel(f) {
  const base = TF[f.type] || '수유';
  if (f.subtype) return base + ' · ' + (TSU[f.subtype] || '');
  return base;
}

function feedDetail(f) {
  const amt = feedAmountMl(f);
  const amtStr = f.consumedAmount != null && amt != null ? `준비 ${amt}ml / 섭취 ${f.consumedAmount}ml`
    : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
    : amt ? `${amt}ml` : '';
  const durMs = directFeedDurationMs(f);
  const dur = durMs ? durStr(durMs) : '';
  const side = f.side ? TS[f.side] : '';
  return [amtStr, dur, side, f.note || ''].filter(Boolean).join(' · ');
}

// 직수+보충수유 묶음을 탭했을 때 뜨는 팝업 — 기존에는 묶음을 탭하면 구성원 중
// 하나(직수)의 "수유 수정" 폼이 그대로 열려서, 그 안의 모유/분유 토글이 마치
// 묶음 안의 다른 기록을 보여주는 것처럼 보여 혼란을 줬다. 이제는 이 팝업에서
// 묶인 기록 둘 다를 한눈에 보여주고, 각각을 수정하거나 지우고 싶을 때만
// 그 기록의 "수정" 버튼으로 기존 수유 수정 폼을 연다.
export default function FeedGroupModal() {
  const { db, dispatch, saveDB, showToast, editId, setEditId, setEditType, setOpenModal } = useApp();

  const members = db.feeds
    .filter(f => f.id === editId || f.groupId === editId)
    .sort((a, b) => new Date(feedStartTime(a)) - new Date(feedStartTime(b)));

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  function editMember(f) {
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
  }

  function deleteMember(id) {
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
    // 묶음에 기록이 하나만 남으면(또는 다 지워지면) 더 볼 게 없으니 팝업을 닫는다.
    if (members.length <= 1) close();
  }

  function deleteAll() {
    const ids = new Set(members.map(m => m.id));
    const items = db.feeds.filter(x => ids.has(x.id));
    const now = new Date().toISOString();
    const trashItems = items.map(item => ({ ...item, _deletedAt: now, _type: 'feeds' }));
    const newFeeds = db.feeds.filter(x => !ids.has(x.id));
    const newTrash = capTrash([...trashItems, ...(db.trash || [])]);
    const newDB = { ...db, feeds: newFeeds, trash: newTrash };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
    close();
  }

  if (members.length === 0) return null;

  return createPortal(
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--sage)', opacity: 0.7 }} />
        <div className="mtitle">수유 세션 ({members.length}건)</div>
        <div className="mbody" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(f => {
            const fc = feedColor(f);
            const t = feedStartTime(f);
            const timeRange = (f.start && f.end) ? `${fmt(t)} → ${fmt(f.end)}` : fmt(t);
            const detail = feedDetail(f);
            return (
              <div key={f.id} style={{ background: fc.bg, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: fc.dot, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{feedLabel(f)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{timeRange}{detail ? ' · ' + detail : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button className="bcan" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => deleteMember(f.id)}>삭제</button>
                  <button className="bpri" style={{ padding: '7px 12px', fontSize: 12.5, background: fc.dot }} onClick={() => editMember(f)}>수정</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={deleteAll}>세션 전체 삭제</button>
          <button className="bpri" style={{ background: 'var(--sage)' }} onClick={close}>닫기</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
