'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { directFeedMl } from '../../lib/helpers';

export default function ConsumedModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    pendingConsumedFeedId, setPendingConsumedFeedId,
    setEditId, setEditType,
  } = useApp();

  const feedId = pendingConsumedFeedId;
  const feed = feedId ? db.feeds.find(f => f.id === feedId) : null;

  // Estimate from direct feed duration
  const estimate = feed && feed.start && feed.end ? directFeedMl(feed.start, feed.end) : null;
  const [consumedAmount, setConsumedAmount] = useState('');

  useEffect(() => {
    setConsumedAmount('0');
  }, [feedId]);

  function close() {
    setOpenModal(null);
    setPendingConsumedFeedId(null);
    setEditId(null);
    setEditType(null);
  }

  async function save() {
    if (!feed) { close(); return; }
    // 섭취량은 필수값
    if (consumedAmount === '' || consumedAmount == null || Number.isNaN(parseFloat(consumedAmount))) {
      showToast('섭취량(ml)을 입력해주세요');
      return;
    }
    const ml = parseFloat(consumedAmount);
    const newFeeds = db.feeds.map(f =>
      f.id === feedId ? { ...f, consumedAmount: ml } : f
    );
    const newDB = { ...db, feeds: newFeeds };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    await saveDB(newDB);
    showToast('섭취량이 기록됐어요');
    close();
  }

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle"></div>
        <div className="mtitle">섭취량 기록</div>
        <div className="mbody">
          <p className="modal-desc">수유가 끝났어요. 섭취량을 입력해주세요.</p>
          {estimate != null && (
            <p className="modal-hint">수유 시간 기준 예상 섭취량: 약 {estimate}ml</p>
          )}
          <div className="fld">
            <div className="flbl">섭취량 (ml) <span>· 필수</span></div>
            <input
              className="finp"
              type="number"
              value={consumedAmount}
              onChange={e => setConsumedAmount(e.target.value)}
              placeholder="예: 90"
              autoFocus
            />
          </div>
        </div>
        <div className="mfoot">
          <button className="bpri" style={{ width: '100%' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
