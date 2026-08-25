'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

const PLACE_OPTIONS = [
  { code: 'crib',    label: '침대' },
  { code: 'arms',    label: '품' },
  { code: 'cushion', label: '원형쿠션' },
];
const AUTHOR_OPTIONS = [
  { code: '', label: '—' },
  { code: 'mom', label: '엄마' },
  { code: 'dad', label: '아빠' },
  { code: 'other', label: '기타' },
];

export default function SleepModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    editId, setEditId, setEditType,
    uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.sleeps.find(s => s.id === editId) : null;

  const [start, setStart] = useState(nowISO());
  const [end, setEnd] = useState('');
  const [place, setPlace] = useState('crib');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    if (existing) {
      setStart(existing.start ? toLocal(existing.start) : nowISO());
      setEnd(existing.end ? toLocal(existing.end) : '');
      setPlace(existing.place || 'crib');
      setNote(existing.note || '');
      setAuthor(existing.author || '');
    } else {
      setStart(nowISO());
      setEnd('');
      setPlace('crib');
      setNote('');
      setAuthor('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

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
        author: author || undefined,
      };
    } else {
      newSleeps.unshift({
        id: uid(),
        start: new Date().toISOString(),
        end: end ? fromLocal(end) : undefined,
        place,
        note: note || undefined,
        author: author || undefined,
      });
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
        <div className="mhandle" style={{ background: 'var(--cs)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cs)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '수면 수정' : '수면 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시작 시간</div>
            <input className="finp" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          </div>

          <div className="fld">
            <div className="flbl">종료 시간 <span>(비워두면 타이머 시작)</span></div>
            <input className="finp" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
          </div>

          <div className="fld">
            <div className="flbl">장소</div>
            <div className="seg">
              {PLACE_OPTIONS.map(opt => (
                <button key={opt.code} className={`sbtn${place === opt.code ? ' on' : ''}`}
                  onClick={() => setPlace(opt.code)}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <div className="flbl">기록자</div>
            <div className="seg">
              {AUTHOR_OPTIONS.map(opt => (
                <button key={opt.code || 'none'} className={`sbtn${author === opt.code ? ' on' : ''}`}
                  onClick={() => setAuthor(opt.code)}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: 'var(--cs)' }} onClick={save}>
            {end ? '저장' : '수면 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
