'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { toLocal, fromLocal } from '../../lib/helpers';

// 진행 중인(아직 종료하지 않은) 수유/수면 타이머를 탭했을 때 뜨는 팝업.
// 타이머를 멈추지 않은 채로 시작 시각(그리고 직수라면 방향)만 바로잡을 수 있도록 한다.
// FeedModal/SleepModal의 일반 수정 화면은 종료 시간이 있는 "완결된" 기록을 다루도록 짜여 있어서
// (직수는 특히 양쪽 시간이 다 있어야 저장됨) 진행 중인 기록에는 그대로 쓸 수 없어 별도로 둔다.
export default function ActiveTimerEditModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, editType,
  } = useApp();

  const isFeed = editType === 'feeds';
  const record = isFeed
    ? db.feeds.find(f => f.id === editId)
    : db.sleeps.find(s => s.id === editId);

  const isDirectBreast = isFeed && record && record.type === 'breast' && record.subtype === 'direct';

  const [start, setStart] = useState('');
  const [side, setSide] = useState('left');

  useEffect(() => {
    if (record && record.start) {
      setStart(toLocal(record.start));
      setSide(record.side === 'right' ? 'right' : 'left');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    if (!record || !start) { close(); return; }
    const newStartISO = fromLocal(start);
    if (new Date(newStartISO).getTime() > Date.now() + 60000) {
      showToast('시작 시각은 미래로 설정할 수 없어요');
      return;
    }

    if (isFeed) {
      const newFeeds = db.feeds.map(f => f.id === editId
        ? { ...f, start: newStartISO, side: isDirectBreast ? side : f.side }
        : f);
      const newDB = { ...db, feeds: newFeeds };
      dispatch({ type: 'SET_FEEDS', payload: newFeeds });
      await saveDB(newDB);
    } else {
      const newSleeps = db.sleeps.map(s => s.id === editId
        ? { ...s, start: newStartISO }
        : s);
      const newDB = { ...db, sleeps: newSleeps };
      dispatch({ type: 'SET_SLEEPS', payload: newSleeps });
      await saveDB(newDB);
    }
    showToast('수정됐어요');
    close();
  }

  if (!record) return null;

  const accent = isFeed ? 'var(--cf)' : 'var(--cs)';

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: accent, opacity: 0.7 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }} />
          {isFeed ? '진행 중인 수유 수정' : '진행 중인 수면 수정'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시작 시간</div>
            <input className="finp" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          </div>

          {isDirectBreast && (
            <div className="fld">
              <div className="flbl">방향</div>
              <div className="seg">
                <button className={`sbtn${side === 'left' ? ' on' : ''}`}
                  style={side === 'left' ? { background: accent, borderColor: accent } : {}}
                  onClick={() => setSide('left')}>왼쪽</button>
                <button className={`sbtn${side === 'right' ? ' on' : ''}`}
                  style={side === 'right' ? { background: accent, borderColor: accent } : {}}
                  onClick={() => setSide('right')}>오른쪽</button>
              </div>
            </div>
          )}

          <p className="setup-hint" style={{ marginTop: 4 }}>
            타이머는 계속 진행돼요. 종료 시간은 종료 버튼을 눌렀을 때 정해져요.
          </p>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: accent }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
