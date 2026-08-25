'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal } from '../../lib/helpers';

// Scroll-wheel number picker (wdial)
function WDial({ value, onChange, min, max, step = 1, label, pad = 0 }) {
  const listRef = useRef(null);
  const items = [];
  for (let v = min; v <= max; v = Math.round((v + step) * 1000) / 1000) {
    items.push(Math.round(v * 1000) / 1000);
  }

  const ITEM_H = 44;
  const idx = items.findIndex(v => Math.abs(v - value) < step * 0.5);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const target = Math.max(0, idx) * ITEM_H;
    el.scrollTop = target;
  }, []);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    const v = items[Math.min(i, items.length - 1)];
    if (v !== undefined) onChange(v);
  }

  function fmtVal(v) {
    if (pad > 0) return String(v).padStart(pad, '0');
    return String(v);
  }

  return (
    <div className="wdial-wrap">
      <div className="wdial-label">{label}</div>
      <div className="wdial">
        <div className="wdial-mask top"></div>
        <div className="wdial-list" ref={listRef} onScroll={onScroll}>
          <div style={{height: ITEM_H * 2}}></div>
          {items.map(v => (
            <div key={v} className={`wdial-item${Math.abs(v - value) < step * 0.5 ? ' selected' : ''}`}
              style={{height:ITEM_H, lineHeight: ITEM_H + 'px'}}>
              {fmtVal(v)}
            </div>
          ))}
          <div style={{height: ITEM_H * 2}}></div>
        </div>
        <div className="wdial-mask bottom"></div>
        <div className="wdial-sel"></div>
      </div>
    </div>
  );
}

export default function WeightModal() {
  const {
    db, dispatch, saveDB, showToast,
    openModal, setOpenModal,
    editId, setEditId, editType, setEditType,
    uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.weights.find(w => w.id === editId) : null;

  // kg stored as integer parts for dial: integer part + decimal part (0-999)
  const [kgInt, setKgInt] = useState(3);
  const [kgDec, setKgDec] = useState(0); // 0-999
  const [time, setTime] = useState(() => nowISO().slice(0, 16)); // datetime-local format

  useEffect(() => {
    if (existing) {
      const kg = parseFloat(existing.kg) || 3;
      setKgInt(Math.floor(kg));
      setKgDec(Math.round((kg - Math.floor(kg)) * 1000));
      // existing.time is ISO UTC; convert to local datetime-local format
      setTime(existing.time ? toLocal(existing.time) : nowISO());
    } else {
      setKgInt(3);
      setKgDec(0);
      setTime(nowISO());
    }
  }, [editId]);

  const kg = (kgInt + kgDec / 1000).toFixed(3);

  function close() {
    setOpenModal(null);
    setEditId(null);
    setEditType(null);
  }

  async function save() {
    // Convert datetime-local string back to ISO
    const isoTime = new Date(time).toISOString();
    const newWeights = [...db.weights];
    if (isEdit) {
      const idx = newWeights.findIndex(w => w.id === editId);
      if (idx < 0) return;
      newWeights[idx] = { ...newWeights[idx], kg: parseFloat(kg), time: isoTime };
    } else {
      newWeights.push({ id: uid(), kg: parseFloat(kg), time: isoTime });
    }
    newWeights.sort((a,b) => new Date(a.time) - new Date(b.time));
    const newDB = { ...db, weights: newWeights };
    dispatch({ type: 'SET_WEIGHTS', payload: newWeights });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '체중이 기록됐어요');
    close();
  }

  return (
    <div className="mbg" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle"></div>
        <div className="mtitle">{isEdit ? '체중 수정' : '체중 기록'}</div>
        <div className="mbody">
          <div className="wdial-row">
            <WDial value={kgInt} onChange={setKgInt} min={0} max={30} label="kg" />
            <div className="wdial-dot">.</div>
            <WDial value={kgDec} onChange={setKgDec} min={0} max={999} label="g (1/1000)" pad={3}/>
          </div>
          <div className="weight-preview">{kg} kg</div>

          <div className="fld" style={{marginTop:16}}>
            <div className="flbl">날짜/시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)}/>
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
