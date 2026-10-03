'use client';
import { createPortal } from 'react-dom';
import { useApp } from '../../lib/store';
import {
  fmt, fmtFull, feedAmountMl, feedStartTime, directFeedDurationMs, durStr, feedColor,
  FEED_TYPE_LABEL as TF, FEED_SUBTYPE_LABEL as TSU,
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
  return [amtStr, dur].filter(Boolean).join(' · ');
}

// "합치기" 버튼으로 연 수동 합치기 팝업 — 자동 제안을 놓쳤거나 "아니요"를 누른 경우를 위한
// 보조 기능. 기준이 된 기록(editId)과 합칠 다른 기록을 목록에서 골라 mergeFeeds()를 호출한다.
// 이미 묶여 있는 기록끼리는(복잡해지는 걸 막기 위해) 합칠 수 없게 후보에서 제외한다.
export default function FeedMergeModal() {
  const { db, editId, setEditId, setEditType, setOpenModal, mergeFeeds, filterByActiveBaby } = useApp();

  const source = db.feeds.find(f => f.id === editId);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  if (!source) return null;

  const parentIds = new Set(db.feeds.filter(f => f.groupId).map(f => f.groupId));
  const candidates = filterByActiveBaby(db.feeds)
    .filter(f => f.id !== source.id && f.end && !f.groupId && !parentIds.has(f.id))
    .sort((a, b) => new Date(feedStartTime(b)) - new Date(feedStartTime(a)))
    .slice(0, 30);

  function pick(id) {
    mergeFeeds(source.id, id);
    close();
  }

  return createPortal(
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--sage)', opacity: 0.7 }} />
        <div className="mtitle">다른 기록과 합치기</div>
        <div className="mbody">
          <div style={{ background: 'var(--sw)', borderRadius: 14, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{feedLabel(source)}</div>
            <div style={{ color: 'var(--muted)' }}>{fmt(feedStartTime(source))}{feedDetail(source) ? ' · ' + feedDetail(source) : ''}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>이 기록과 합칠 다른 수유 기록을 골라주세요. 합치면 목록에서 하나의 수유 세션으로 보여요.</div>
          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>합칠 수 있는 다른 기록이 없어요</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '45vh', overflowY: 'auto' }}>
              {candidates.map(f => {
                const fc = feedColor(f);
                return (
                  <div key={f.id} onClick={() => pick(f.id)} style={{ background: fc.bg, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: fc.dot, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{feedLabel(f)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{feedDetail(f)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', flex: 'none' }}>{fmtFull(feedStartTime(f))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close} style={{ flex: 1 }}>취소</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
