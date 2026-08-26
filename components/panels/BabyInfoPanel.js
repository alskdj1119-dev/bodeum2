'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';

export default function BabyInfoPanel() {
  const { baby, saveBaby, showToast } = useApp();

  const [form, setForm] = useState({
    name: '',
    prenatal: '',
    birthDate: '',
    birthTime: '',
    birthWeight: '',
  });
  // 사용자가 폼을 직접 수정했으면 baby 상태 변경시 덮어쓰지 않음
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setForm({
      name: baby.name || '',
      prenatal: baby.prenatal || '',
      birthDate: baby.birthDate || '',
      birthTime: baby.birthTime || '',
      birthWeight: baby.birthWeight || '',
    });
  }, [baby]);

  function set(k, v) { dirtyRef.current = true; setForm(p => ({ ...p, [k]: v })); }

  function save() {
    const nb = { ...baby, ...form, name: (form.name || '').trim() || '아이' };
    saveBaby(nb);
    dirtyRef.current = false;
    showToast('아이 정보가 저장됐어요 ✓');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">아이 정보</span>
      </div>

      <div className="fld">
        <div className="flbl">이름</div>
        <input className="finp finp-white" value={form.name} onChange={e => set('name', e.target.value)} placeholder="아기 이름" />
      </div>
      <div className="fld">
        <div className="flbl">태명</div>
        <input className="finp finp-white" value={form.prenatal} onChange={e => set('prenatal', e.target.value)} placeholder="태명 (선택)" />
      </div>
      <div className="fld">
        <div className="flbl">생년월일</div>
        <input className="finp finp-white" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 시간</div>
        <input className="finp finp-white" type="time" value={form.birthTime} onChange={e => set('birthTime', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 체중 (kg)</div>
        <input className="finp finp-white" type="number" step="0.001" value={form.birthWeight} onChange={e => set('birthWeight', e.target.value)} placeholder="예: 3.250" />
      </div>
      <button className="bpri" style={{ width: '100%' }} onClick={save}>아이 정보 저장</button>
    </>
  );
}
