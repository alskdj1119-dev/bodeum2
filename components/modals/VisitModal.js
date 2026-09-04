'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

export default function VisitModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal, editId, setEditId, setEditType, uid, activeBabyId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? (db.visits || []).find(v => v.id === editId) : null;

  const [time, setTime] = useState(nowISO());
  const [hospital, setHospital] = useState('');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existing) {
      setTime(existing.time ? toLocal(existing.time) : nowISO());
      setHospital(existing.hospital || '');
      setReason(existing.reason || '');
      setDiagnosis(existing.diagnosis || '');
      setPrescription(existing.prescription || '');
      setFollowUpDate(existing.followUpDate || '');
      setNote(existing.note || '');
    } else {
      setTime(nowISO());
      setHospital('');
      setReason('');
      setDiagnosis('');
      setPrescription('');
      setFollowUpDate('');
      setNote('');
    }
  }, [editId]);

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    const list = db.visits || [];
    const newVisits = [...list];
    const data = {
      time: fromLocal(time),
      hospital: hospital.trim() || undefined,
      reason: reason.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      prescription: prescription.trim() || undefined,
      followUpDate: followUpDate || undefined,
      note: note.trim() || undefined,
    };
    if (isEdit) {
      const idx = newVisits.findIndex(v => v.id === editId);
      if (idx < 0) return;
      newVisits[idx] = { ...newVisits[idx], ...data };
    } else {
      newVisits.unshift({ id: uid(), babyId: activeBabyId || undefined, ...data });
    }
    const newDB = { ...db, visits: newVisits };
    dispatch({ type: 'SET_VISITS', payload: newVisits });
    await saveDB(newDB);
    showToast(isEdit ? '수정됐어요' : '병원 방문 기록이 추가됐어요');
    close();
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cv)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cv)', display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '병원 방문 수정' : '병원 방문 기록'}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">방문 일시</div>
            <input className="finp" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="fld">
            <div className="flbl">병원 이름</div>
            <input className="finp finp-white" value={hospital} onChange={e => setHospital(e.target.value)} placeholder="예: 튼튼소아과" />
          </div>
          <div className="fld">
            <div className="flbl">방문 이유</div>
            <input className="finp finp-white" value={reason} onChange={e => setReason(e.target.value)} placeholder="예: 콧물, 기침" />
          </div>
          <div className="fld">
            <div className="flbl">진단 내용</div>
            <input className="finp finp-white" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="예: 감기" />
          </div>
          <div className="fld">
            <div className="flbl">처방 내용</div>
            <input className="finp finp-white" value={prescription} onChange={e => setPrescription(e.target.value)} placeholder="예: 해열시럽 3일분" />
          </div>
          <div className="fld">
            <div className="flbl">다음 방문 예정일 (선택)</div>
            <input className="finp" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
          </div>
          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: 'var(--cv)' }} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
