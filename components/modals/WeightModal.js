'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal } from '../../lib/helpers';

// Single-digit scroll column
function WDial({ value, onChange, min = 0, max = 9 }) {
  const colRef = useRef(null);
  const items = [];
  for (let v = min; v <= max; v++) items.push(v);
  const ITEM_H = 44;

  useEffect(() => {
    const el = colRef.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx >= 0) el.scrollTop = idx * ITEM_H;
  }, []);

  function onScroll() {
    const el = colRef.current;
    if (!el) return;
    const i = Math.min(Math.round(el.scrollTop / ITEM_H), items.length - 1);
    if (items[i] !== undefined) onChange(items[i]);
  }

  return (
    <div className="wdial-cont" style={{ flex: '0 0 48px' }}>
      <div className="wdial-bar" />
      <div className="wdial-col" ref={colRef} onScroll={onScroll} style={{ width: '48px' }}>
        {items.map(v => (
          <div key={v} className="wdial-item">{v}</div>
        ))}
      </div>
      <div className="wdial-fade" />
    </div>
  );
}

export default function WeightModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.weights.find(w => w.id === editId) : null;

  // 5 independent digit dials: d0=tens, d1=units, d2-d4=decimal 3 places
  const [d0, setD0] = useState(0); // 0-3
  const [d1, setD1] = useState(3); // 0-9
  const [d2, setD2] = useState(5); // 0-9
  const [d3, setD3] = useState(0); // 0-9
  const [d4, setD4] = useState(0); // 0-9
  const [time, setTime] = useState(() => nowISO());

  useEffect(() => {
    if (existing) {
      const kg = parseFloat(existing.kg) || 3.5;
      setD0(Math.floor(kg / 10));
      setD1(Math.floor(kg) % 10);
      const dec = Math.round((kg - Math.floor(kg)) * 1000);
      setD2(Math.floor(dec / 100));
      setD3(Math.floor((dec % 100) / 10));
      setD4(dec % 10);
      setTime(existing.time ? toLocal(existing.time) : nowISO());
    } else {
      setD0(0); setD1(3); setD2(5); setD3(0); setD4(0);
      setTime(nowISO());
    }
  }, [editId]);

  const kg = (d0 * 10 + d1 + d2 / 10 + d3 / 100 + d4 / 1000).toFixed(3);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const isoTime = new Date(time).toISOString();
    const newWeights = [...db.weights];
    if (isEdit) {
      const idx = newWeights.findIndex(w => w.id === editId);
      if (idx < 0) return;
      newWeights[idx] = { ...newWeights[idx], kg: parseFloat(kg), time: isoTime };
    } else {
      newWeights.push({ id: uid(), kg: parseFloat(kg), time: isoTime });
    }
    newWeights.sort((a, b) => new Date(a.time) - new Date(b.time));
    const newDB = { ...db, weights: newWeights };
    dispatch({ type: 'SET_WEIGHTS', payload: newWeights });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '체중이 기록됐어요');
    close();
  }

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" />
        <div className="mtitle">{isEdit ? '체중 수정' : '체중 기록'}</div>
        <div className="mbody">
          {/* 5-digit dial: 0 0 . 0 0 0 kg */}
          <div className="wdial-wrap" style={{ gap: '2px' }}>
            <WDial value={d0} onChange={setD0} min={0} max={3} />
            <WDial value={d1} onChange={setD1} min={0} max={9} />
            <div className="wdial-sep">.</div>
            <WDial value={d2} onChange={setD2} min={0} max={9} />
            <WDial value={d3} onChange={setD3} min={0} max={9} />
            <WDial value={d4} onChange={setD4} min={0} max={9} />
            <div className="wdial-unit">kg</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
            {kg} kg
          </div>

          <div className="fld" style={{ marginTop: 16 }}>
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
