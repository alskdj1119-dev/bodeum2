'use client';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';

// 분유/유축 타이머 종료 시 뜨는 모달.
// 예전엔 "수유 시간 기준 예상 섭취량"을 함께 보여줬는데, 이건 직수(빠는 시간으로 ml을
// 추정)에만 의미가 있는 계산이고 분유/유축은 이미 "준비량"이 정확히 정해져 있어서
// 시간 기준 추정치를 보여주는 게 오히려 혼란을 줬다 — 그래서 제거.
// 섭취량을 직접 입력하는 대신, 먹고 남은 "잔여량"을 입력받아 섭취량 = 준비량 - 잔여량으로
// 계산한다. 남은 게 없으면(잔여량 0) 굳이 "0"을 입력하지 않아도 "없음" 버튼 한 번으로
// 바로 저장할 수 있게 한다.
export default function ConsumedModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    pendingConsumedFeedId, setPendingConsumedFeedId, cancelStopFeed,
    setEditId, setEditType,
  } = useApp();

  const feedId = pendingConsumedFeedId;
  const feed = feedId ? db.feeds.find(f => f.id === feedId) : null;
  const prepared = feed && feed.amount != null ? feed.amount : null;

  const [leftover, setLeftover] = useState('');

  useEffect(() => {
    setLeftover('');
  }, [feedId]);

  function close() {
    setOpenModal(null);
    setPendingConsumedFeedId(null);
    setEditId(null);
    setEditType(null);
  }

  // 취소 — 실수로 종료를 눌렀을 때, 방금 종료된 타이머를 되돌려서 계속 진행 중이던 것처럼 복구한다.
  function cancel() {
    cancelStopFeed();
    setEditId(null);
    setEditType(null);
  }

  async function commit(leftoverMl) {
    if (!feed) { close(); return; }
    const preparedMl = feed.amount != null ? feed.amount : 0;
    const consumedMl = Math.max(0, preparedMl - leftoverMl);
    const newFeeds = db.feeds.map(f =>
      f.id === feedId ? { ...f, consumedAmount: consumedMl } : f
    );
    const newDB = { ...db, feeds: newFeeds };
    dispatch({ type: 'SET_FEEDS', payload: newFeeds });
    await saveDB(newDB);
    showToast('섭취량이 기록됐어요');
    close();
  }

  // 잔여량 없음(전부 먹음) — 입력 없이 바로 저장
  function saveNone() {
    commit(0);
  }

  async function save() {
    if (leftover === '' || leftover == null || Number.isNaN(parseFloat(leftover))) {
      showToast('잔여량(ml)을 입력하거나, 남은 게 없으면 "없음"을 눌러주세요');
      return;
    }
    const ml = parseFloat(leftover);
    if (ml < 0) {
      showToast('잔여량은 0ml 이상이어야 해요');
      return;
    }
    if (prepared != null && ml > prepared) {
      showToast(`잔여량은 준비량(${prepared}ml)보다 많을 수 없어요`);
      return;
    }
    commit(ml);
  }

  return createPortal(
    <div className="mbg open" onClick={cancel}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle"></div>
        <div className="mtitle">잔여량 기록</div>
        <div className="mbody">
          <p className="modal-desc">
            수유가 끝났어요. {prepared != null ? `준비량 ${prepared}ml 중 ` : ''}남은 양(잔여량)을 입력해주세요.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '-4px 0 12px' }}>
            잘못 종료했다면 취소를 눌러 타이머로 돌아갈 수 있어요.
          </p>
          <div className="fld">
            <div className="flbl">잔여량 (ml)</div>
            <input
              className="finp"
              type="number"
              value={leftover}
              onChange={e => setLeftover(e.target.value)}
              placeholder="예: 10"
              autoFocus
            />
          </div>
          <button className="bcan-accent" style={{ width: '100%', marginTop: '10px' }} onClick={saveNone}>
            없음 (전부 먹었어요)
          </button>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={cancel}>취소</button>
          <button className="bpri" style={{ flex: 1 }} onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
