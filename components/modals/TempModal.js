'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

const METHOD_OPTIONS = [
  { code: 'ear',    label: '귀' },
  { code: 'armpit', label: '겨드랑이' },
  { code: 'forehead', label: '이마' },
  { code: 'rectal', label: '항문' },
];

export default function TempModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.temps || []).find(t => t.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [tempStr, setTempStr] = useState('36.5');
  const [method, setMethod] = useState('ear');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setTempStr(String(existing.temp || '36.5'));
      setMethod(existing.method || 'ear');
      setNote(existing.note || '');
    } else {
      setTime(nowISO());
      setTempStr('36.5');
      setMethod('ear');
      setNote('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const temp = parseFloat(tempStr);
    if (isNaN(temp) || temp < 34 || temp > 43) {
      showToast('올바른 체온을 입력해주세요 (34~43°C)');
      return;
    }
    const newTemps = [...(db.temps || [])];
    if (isEdit) {
      const idx = newTemps.findIndex(t => t.id === editId);
      if (idx < 0) return;
      newTemps[idx] = { ...newTemps[idx], time: fromLocal(time), temp, method, note: note || undefined };
    } else {
      newTemps.unshift({ id: uid(), time: fromLocal(time), temp, method, note: note || undefined });
    }
    const newDB = { ...db, temps: newTemps };
    dispatch({ type: 'SET_TEMPS', payload: newTemps });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '체온이 기록됐어요');
    close();
  }

  const tempVal = parseFloat(tempStr) || 36.5;
  const isFever = tempVal >= 37.5;
  const accentColor = isFever ? '#E05A4E' : 'var(--cw)';

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: accentColor, opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: accentColor, display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '체온 수정' : '체온 기록'}
          {isFever && <span style={{ fontSize: 11, background: '#E05A4E', color: '#fff', borderRadius: 6, padding: '2px 6px', marginLeft: 4 }}>발열</span>}
        </div>
        <div className="mbody">
          {/* Temperature input */}
          <div className="fld">
            <div className="flbl">체온 (°C)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="finp"
                type="number"
                step="0.1"
                min="34"
                max="43"
                value={tempStr}
                onChange={e => setTempStr(e.target.value)}
                style={{ flex: 1, fontSize: 24, fontWeight: 700, textAlign: 'center', color: accentColor }}
              />
              <span style={{ fontSize: 20, color: 'var(--muted)', fontWeight: 500 }}>°C</span>
            </div>
            {isFever && (
              <div style={{ fontSize: 12, color: '#E05A4E', marginTop: 4 }}>
                37.5°C 이상 — 발열 상태예요
              </div>
            )}
          </div>

          {/* Method */}
          <div className="fld">
            <div className="flbl">측정 방법</div>
            <div className="seg">
              {METHOD_OPTIONS.map(opt => (
                <button key={opt.code} className={`sbtn${method === opt.code ? ' on' : ''}`}
                  onClick={() => setMethod(opt.code)}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="fld">
            <div className="flbl">시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          {/* Note */}
          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: accentColor }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
