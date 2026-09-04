'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

export default function HeadCircModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid, activeBabyId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.headCircs || []).find(h => h.id === editId) : null;

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
    if (isNaN(cm) || cm < 25 || cm > 55) {
      showToast('올바른 머리둘레를 입력해주세요 (25~55cm)');
      return;
    }
    const newList = [...(db.headCircs || [])];
    if (isEdit) {
      const idx = newList.findIndex(h => h.id === editId);
      if (idx < 0) return;
      newList[idx] = { ...newList[idx], time: fromLocal(time), cm };
    } else {
      newList.push({ id: uid(), babyId: activeBabyId || undefined, time: fromLocal(time), cm });
    }
    newList.sort((a, b) => new Date(a.time) - new Date(b.time));
    const newDB = { ...db, headCircs: newList };
    dispatch({ type: 'SET_HEAD_CIRCS', payload: newList });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '머리둘레가 기록됐어요');
    close();
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cv)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cv)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '머리둘레 수정' : '머리둘레 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">머리둘레 (cm)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="finp" type="number" step="0.1" min="25" max="55"
                value={cmStr} onChange={e => setCmStr(e.target.value)} placeholder="예: 40.5"
                style={{ flex: 1, fontSize: 24, fontWeight: 700, textAlign: 'center', color: 'var(--cv)' }}
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
          <button className="bpri" style={{ background: 'var(--cv)' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
