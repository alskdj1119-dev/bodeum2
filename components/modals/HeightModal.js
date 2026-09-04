'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

export default function HeightModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid, activeBabyId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.heights || []).find(h => h.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [cmStr, setCmStr] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setCmStr(String(existing.cm || ''));
    } else {
      setTime(nowISO());
      setCmStr('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const cm = parseFloat(cmStr);
    if (isNaN(cm) || cm < 30 || cm > 120) {
      showToast('올바른 키를 입력해주세요 (30~120cm)');
      return;
    }
    const newHeights = [...(db.heights || [])];
    if (isEdit) {
      const idx = newHeights.findIndex(h => h.id === editId);
      if (idx < 0) return;
      newHeights[idx] = { ...newHeights[idx], time: fromLocal(time), cm };
    } else {
      newHeights.push({ id: uid(), babyId: activeBabyId || undefined, time: fromLocal(time), cm });
    }
    newHeights.sort((a, b) => new Date(a.time) - new Date(b.time));
    const newDB = { ...db, heights: newHeights };
    dispatch({ type: 'SET_HEIGHTS', payload: newHeights });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '키가 기록됐어요');
    close();
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cw)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cw)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '키 수정' : '키 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">키 (cm)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="finp" type="number" step="0.1" min="30" max="120"
                value={cmStr} onChange={e => setCmStr(e.target.value)} placeholder="예: 65.0"
                style={{ flex: 1, fontSize: 24, fontWeight: 700, textAlign: 'center', color: 'var(--cw)' }}
              />
              <span style={{ fontSize: 20, color: 'var(--muted)', fontWeight: 500 }}>cm</span>
            </div>
          </div>
          <div className="fld">
            <div className="flbl">날짜/시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
