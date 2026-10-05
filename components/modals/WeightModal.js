'use client';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
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
    // value가 바깥에서 바뀌었을 때(직전 체중 자동 세팅, 수정 모드 값 로딩)도 다이얼이 따라가도록
    // value가 바뀔 때마다 맞춰준다. 사용자가 직접 스크롤 중일 땐 이미 같은 칸이라 건드리지 않는다.
    const curIdx = Math.min(Math.round(el.scrollTop / ITEM_H), items.length - 1);
    if (idx >= 0 && curIdx !== idx) el.scrollTop = idx * ITEM_H;
  }, [value]);

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
    setOpenModal, editId, setEditId, setEditType, uid, activeBabyId, filterByActiveBaby,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.weights.find(w => w.id === editId) : null;

  // 5 independent digit dials: d0=tens, d1=units, d2-d4=decimal 3 places
  // 초기값은 "첫 렌더"부터 정확히 계산해서 넣는다. (마운트 뒤 effect로 setState하면, 다이얼이 마운트 때
  // 기본값 위치로 스크롤하며 쏘는 scroll 이벤트가 새로 세팅한 값을 도로 덮어써서 일부 자리만 맞춰지는 문제가 있었다.)
  //  - 수정: 그 기록의 체중
  //  - 새 기록: 직전(가장 최근) 체중 — 처음부터 숫자를 하나씩 돌려 맞추지 않아도 되도록. 기록이 없으면 3.500kg.
  const [init] = useState(() => {
    let kgVal = 3.5;
    if (existing) {
      kgVal = parseFloat(existing.kg) || 3.5;
    } else {
      const mine = (filterByActiveBaby ? filterByActiveBaby(db.weights || []) : (db.weights || []))
        .filter(w => w && w.time && parseFloat(w.kg) > 0);
      const last = [...mine].sort((a, b) => new Date(b.time) - new Date(a.time))[0];
      if (last) kgVal = parseFloat(last.kg);
    }
    const grams = Math.min(39999, Math.max(0, Math.round(kgVal * 1000)));
    return {
      d0: Math.floor(grams / 10000),
      d1: Math.floor(grams / 1000) % 10,
      d2: Math.floor(grams / 100) % 10,
      d3: Math.floor(grams / 10) % 10,
      d4: grams % 10,
    };
  });
  const [d0, setD0] = useState(init.d0); // 0-3
  const [d1, setD1] = useState(init.d1); // 0-9
  const [d2, setD2] = useState(init.d2); // 0-9
  const [d3, setD3] = useState(init.d3); // 0-9
  const [d4, setD4] = useState(init.d4); // 0-9
  const [time, setTime] = useState(() => (existing && existing.time ? toLocal(existing.time) : nowISO()));

  const kg = (d0 * 10 + d1 + d2 / 10 + d3 / 100 + d4 / 1000).toFixed(3);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    if (!time) { showToast('시간을 입력해주세요'); return; }
    const isoTime = new Date(time).toISOString();
    const newWeights = [...db.weights];
    if (isEdit) {
      const idx = newWeights.findIndex(w => w.id === editId);
      if (idx < 0) return;
      newWeights[idx] = { ...newWeights[idx], kg: parseFloat(kg), time: isoTime };
    } else {
      newWeights.push({ id: uid(), babyId: activeBabyId || undefined, kg: parseFloat(kg), time: isoTime });
    }
    newWeights.sort((a, b) => new Date(a.time) - new Date(b.time));
    const newDB = { ...db, weights: newWeights };
    dispatch({ type: 'SET_WEIGHTS', payload: newWeights });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '체중이 기록됐어요');
    close();
  }

  return createPortal(
    <div className="mbg open">
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
          <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px', whiteSpace: 'nowrap' }}>
            {kg} kg
          </div>

          <div className="fld" style={{ marginTop: 16 }}>
            <div className="flbl">날짜/시간</div>
            <DateTimePicker value={time} onChange={setTime} />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
