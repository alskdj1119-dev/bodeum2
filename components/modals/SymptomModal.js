'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

export default function SymptomModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid, activeBabyId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.symptoms || []).find(s => s.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [symptom, setSymptom] = useState('');
  const [medicine, setMedicine] = useState('');
  const [dose, setDose] = useState('');
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setSymptom(existing.symptom || '');
      setMedicine(existing.medicine || '');
      setDose(existing.dose || '');
      setResolved(!!existing.resolved);
      setNote(existing.note || '');
    } else {
      setTime(nowISO());
      setSymptom('');
      setMedicine('');
      setDose('');
      setResolved(false);
      setNote('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const list = db.symptoms || [];
    const newSymptoms = [...list];
    const symptomName = symptom.trim() || '증상';
    const data = {
      time: fromLocal(time),
      symptom: symptomName,
      medicine: medicine.trim() || undefined,
      dose: dose.trim() || undefined,
      resolved: resolved || undefined,
      note: note.trim() || undefined,
    };
    if (isEdit) {
      const idx = newSymptoms.findIndex(s => s.id === editId);
      if (idx < 0) return;
      newSymptoms[idx] = { ...newSymptoms[idx], ...data };
    } else {
      newSymptoms.unshift({ id: uid(), babyId: activeBabyId || undefined, ...data });
    }
    const newDB = { ...db, symptoms: newSymptoms };
    dispatch({ type: 'SET_SYMPTOMS', payload: newSymptoms });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '증상·투약 기록이 추가됐어요');
    close();
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cy)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cy)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '증상·투약 수정' : '증상·투약 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">시간</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="fld">
            <div className="flbl">증상</div>
            <input className="finp finp-white" value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="예: 콧물, 기침, 발진" />
          </div>
          <div className="fld">
            <div className="flbl">투약한 약 (선택)</div>
            <input className="finp finp-white" value={medicine} onChange={e => setMedicine(e.target.value)} placeholder="예: 타이레놀 시럽" />
          </div>
          <div className="fld">
            <div className="flbl">용량 (선택)</div>
            <input className="finp finp-white" value={dose} onChange={e => setDose(e.target.value)} placeholder="예: 5ml" />
          </div>
          <div className="fld">
            <div className="flbl">상태</div>
            <div className="seg">
              <button className={`sbtn${!resolved ? ' on' : ''}`} onClick={() => setResolved(false)}>진행 중</button>
              <button className={`sbtn${resolved ? ' on' : ''}`} onClick={() => setResolved(true)}>호전됨</button>
            </div>
          </div>
          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: 'var(--cy)' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
