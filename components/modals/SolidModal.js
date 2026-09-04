'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal, SOLID_REACTION_LABEL } from '../../lib/helpers';

const REACTION_OPTIONS = [
  { code: '',        label: '미기록' },
  { code: 'good',     label: SOLID_REACTION_LABEL.good },
  { code: 'neutral',  label: SOLID_REACTION_LABEL.neutral },
  { code: 'refused',  label: SOLID_REACTION_LABEL.refused },
  { code: 'allergy',  label: SOLID_REACTION_LABEL.allergy },
];
const AUTHOR_OPTIONS = [
  { code: '', label: '—' },
  { code: 'mom', label: '엄마' },
  { code: 'dad', label: '아빠' },
  { code: 'other', label: '기타' },
];

export default function SolidModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    editId, setEditId, setEditType,
    uid, activeBabyId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.solids || []).find(s => s.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [food, setFood] = useState('');
  const [amount, setAmount] = useState('');
  const [reaction, setReaction] = useState('');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setFood(existing.food || '');
      setAmount(existing.amount != null ? String(existing.amount) : '');
      setReaction(existing.reaction || '');
      setNote(existing.note || '');
      setAuthor(existing.author || '');
    } else {
      setTime(nowISO());
      setFood('');
      setAmount('');
      setReaction('');
      setNote('');
      setAuthor('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const list = db.solids || [];
    const newSolids = [...list];
    const foodName = (food || '').trim() || '이유식';
    const amt = amount !== '' && !isNaN(parseFloat(amount)) ? parseFloat(amount) : undefined;
    if (isEdit) {
      const idx = newSolids.findIndex(s => s.id === editId);
      if (idx < 0) return;
      newSolids[idx] = {
        ...newSolids[idx],
        time: fromLocal(time), food: foodName, amount: amt,
        reaction: reaction || undefined,
        note: note || undefined,
        author: author || undefined,
      };
    } else {
      newSolids.unshift({
        id: uid(), babyId: activeBabyId || undefined, time: fromLocal(time), food: foodName, amount: amt,
        reaction: reaction || undefined,
        note: note || undefined,
        author: author || undefined,
      });
    }
    const newDB = { ...db, solids: newSolids };
    dispatch({ type: 'SET_SOLIDS', payload: newSolids });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '이유식 기록이 추가됐어요');
    close();
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cn)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cn)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '이유식 수정' : '이유식 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          <div className="fld">
            <div className="flbl">음식 이름</div>
            <input className="finp finp-white" value={food} onChange={e => setFood(e.target.value)} placeholder="예: 애호박 죽" />
          </div>

          <div className="fld">
            <div className="flbl">양 (g, 선택)</div>
            <input className="finp finp-white" type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="예: 50" />
          </div>

          <div className="fld">
            <div className="flbl">아이 반응</div>
            <div className="seg">
              {REACTION_OPTIONS.map(opt => (
                <button key={opt.code || 'none'} className={`sbtn${reaction === opt.code ? ' on' : ''}`}
                  onClick={() => setReaction(opt.code)}>{opt.label}</button>
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
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항 (알레르기 반응 등)" />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: 'var(--cn)' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
