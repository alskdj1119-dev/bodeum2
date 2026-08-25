'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

const DTYPE_OPTIONS = [
  { code: 'wet',    label: '소변' },
  { code: 'soiled', label: '대변' },
  { code: 'both',   label: '소변+대변' },
];
const COLOR_OPTIONS = [
  { code: '',        label: '없음' },
  { code: 'yellow',  label: '노란색' },
  { code: 'green',   label: '녹색' },
  { code: 'other',   label: '기타' },
];
const AUTHOR_OPTIONS = [
  { code: '', label: '—' },
  { code: 'mom', label: '엄마' },
  { code: 'dad', label: '아빠' },
  { code: 'other', label: '기타' },
];

export default function DiaperModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    editId, setEditId, setEditType,
    uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.diapers.find(d => d.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [type, setType] = useState('wet');
  const [color, setColor] = useState('');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setType(existing.type || 'wet');
      setColor(existing.color || '');
      setNote(existing.note || '');
      setAuthor(existing.author || '');
    } else {
      setTime(nowISO());
      setType('wet');
      setColor('');
      setNote('');
      setAuthor('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const newDiapers = [...db.diapers];
    if (isEdit) {
      const idx = newDiapers.findIndex(d => d.id === editId);
      if (idx < 0) return;
      newDiapers[idx] = {
        ...newDiapers[idx],
        time: fromLocal(time), type,
        color: color || undefined,
        note: note || undefined,
        author: author || undefined,
      };
    } else {
      newDiapers.unshift({
        id: uid(), time: fromLocal(time), type,
        color: color || undefined,
        note: note || undefined,
        author: author || undefined,
      });
    }
    const newDB = { ...db, diapers: newDiapers };
    dispatch({ type: 'SET_DIAPERS', payload: newDiapers });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '기저귀 기록이 추가됐어요');
    close();
  }

  const showColor = type === 'soiled' || type === 'both';

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cd)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cd)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '기저귀 수정' : '기저귀 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          <div className="fld">
            <div className="flbl">종류</div>
            <div className="seg">
              {DTYPE_OPTIONS.map(opt => (
                <button key={opt.code} className={`sbtn${type === opt.code ? ' on' : ''}`}
                  onClick={() => setType(opt.code)}>{opt.label}</button>
              ))}
            </div>
          </div>

          {showColor && (
            <div className="fld">
              <div className="flbl">색상 (선택)</div>
              <div className="seg">
                {COLOR_OPTIONS.map(opt => (
                  <button key={opt.code || 'none'} className={`sbtn${color === opt.code ? ' on' : ''}`}
                    onClick={() => setColor(opt.code)}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

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
          <button className="bpri" style={{ background: 'var(--cd)' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
