'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

const PLACE_OPTIONS = [
  { code: 'crib',    label: '침대' },
  { code: 'arms',    label: '품' },
  { code: 'cushion', label: '원형쿠션' },
];

export default function SleepModal() {
  const {
    db, dispatch, saveDB, showToast,
    openModal, setOpenModal,
    editId, setEditId, editType, setEditType,
    uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.sleeps.find(s => s.id === editId) : null;

  const [start, setStart] = useState(nowISO());
  const [end, setEnd] = useState('');
  const [place, setPlace] = useState('crib');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existing) {
      setStart(existing.start ? toLocal(existing.start) : nowISO());
      setEnd(existing.end ? toLocal(existing.end) : '');
      setPlace(existing.place || 'crib');
      setNote(existing.note || '');
    } else {
      setStart(nowISO());
      setEnd('');
      setPlace('crib');
      setNote('');
    }
  }, [editId]);

  function close() {
    setOpenModal(null);
    setEditId(null);
    setEditType(null);
  }

  async function save() {
    const newSleeps = [...db.sleeps];
    if (isEdit) {
      const idx = newSleeps.findIndex(s => s.id === editId);
      if (idx < 0) return;
      newSleeps[idx] = {
        ...newSleeps[idx],
        start: fromLocal(start),
        end: end ? fromLocal(end) : undefined,
        place,
        note: note || undefined,
      };
    } else {
      // If no end time, start timer
      const entry = {
        id: uid(),
        start: new Date().toISOString(),
        end: end ? fromLocal(end) : undefined,
        place,
        note: note || undefined,
      };
      newSleeps.unshift(entry);
    }
    const newDB = { ...db, sleeps: newSleeps };
    dispatch({ type: 'SET_SLEEPS', payload: newSleeps });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : (end ? '수면 기록이 추가됐어요' : '수면 타이머 시작!'));
    close();
  }

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle"></div>
        <div className="mtitle">{isEdit ? '수면 수정' : '수면 기록'}</div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시작 시간</div>
            <input className="finp" type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/>
          </div>

          <div className="fld">
            <div className="flbl">종료 시간 (비워두면 타이머 시작)</div>
            <input className="finp" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}/>
          </div>

          <div className="fld">
            <div className="flbl">장소</div>
            <div className="seg">
              {PLACE_OPTIONS.map(opt => (
                <button key={opt.code} className={`sbtn${place === opt.code ? ' on' : ''}`} onClick={() => setPlace(opt.code)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항"/>
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" onClick={save}>{end ? '저장' : '수면 시작'}</button>
        </div>
      </div>
    </div>
  );
}
