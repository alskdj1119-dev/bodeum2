'use client';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
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
    uid, activeBabyId,
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
    if (!start) { showToast('시작 시간을 입력해주세요'); return; }
    // 종료 시간이 시작 시간보다 빠르면(=시작이 미래) 저장하지 않고 경고
    // ("YYYY-MM-DDTHH:mm" 형식이라 문자열 비교로 시간 순서 비교가 가능함)
    if (end && start && end < start) {
      showToast('종료 시간이 시작 시간보다 빠를 수 없어요');
      return;
    }

    const newSleeps = [...db.sleeps];
    if (isEdit) {
      const idx = newSleeps.findIndex(s => s.id === editId);
      if (idx < 0) return;
      const startISO = fromLocal(start);
      const endISO = end ? fromLocal(end) : undefined;
      // 일시정지했던 시간(pausedMs)은 시간을 고쳐도 유지한다 — 단, 고친 구간 길이보다
      // 길어지지 않게 잘라서 수면 시간이 음수가 되지 않도록 한다.
      const prevPausedMs = newSleeps[idx].pausedMs;
      let pausedMs = prevPausedMs;
      if (prevPausedMs && endISO) {
        const kept = Math.min(prevPausedMs, Math.max(0, new Date(endISO) - new Date(startISO)));
        pausedMs = kept > 0 ? kept : undefined;
      }
      newSleeps[idx] = {
        ...newSleeps[idx],
        start: startISO,
        end: endISO,
        pausedMs,
        place,
        note: note || undefined,
        author: author || undefined,
      };
    } else {
      newSleeps.unshift({
        id: uid(),
        babyId: activeBabyId || undefined,
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

  return createPortal(
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cs)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cs)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '수면 수정' : '수면 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시작 시간</div>
            <DateTimePicker value={start} onChange={setStart} />
          </div>

          <div className="fld">
            <div className="flbl">종료 시간 <span>(비워두면 타이머 시작)</span></div>
            <DateTimePicker value={end} onChange={setEnd} />
          </div>

          {existing && existing.pausedMs > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, margin: '-4px 0 12px' }}>
              일시정지한 시간({Math.max(1, Math.round(existing.pausedMs / 60000))}분)은 수면 시간에서 빠져 있어요.
            </p>
          )}

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
    </div>,
    document.body
  );
}
