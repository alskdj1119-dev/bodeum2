'use client';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
import { kstDate } from '../../lib/helpers';
import { ALL_TEETH, normalizeToothInfo } from '../charts/TeethChart';

// 치아 추가 기록 종류 — 3가지로 고정 (색상은 배지 표시용)
const RECORD_TYPES = [
  { code: 'treatment', label: '치료',    color: 'var(--cv)',    bg: 'var(--vw)' },
  { code: 'note',      label: '특이사항', color: 'var(--muted)', bg: 'var(--dw)' },
  { code: 'extracted', label: '발치',    color: 'var(--cy)',    bg: 'var(--yw)' },
];
const RECORD_TYPE_MAP = Object.fromEntries(RECORD_TYPES.map(t => [t.code, t]));

function todayStr() {
  return kstDate(Date.now()).toISOString().slice(0, 10);
}

// 치아 하나를 탭했을 때 뜨는 상세 화면 — 난 날짜 수정 + 치료/특이사항/발치 등 추가 기록 관리.
export default function ToothDetailModal() {
  const { teethStatus, saveTeethStatus, editId, setOpenModal, setEditId, uid, showToast } = useApp();
  const toothId = editId;
  const tooth = ALL_TEETH.find(t => t.id === toothId);
  const info = normalizeToothInfo(teethStatus?.[toothId]) || { date: todayStr(), records: [] };

  const [date, setDate] = useState(info.date);
  const [newType, setNewType] = useState('treatment');
  const [newDate, setNewDate] = useState(todayStr());
  const [newMemo, setNewMemo] = useState('');

  if (!toothId || !tooth) return null;

  function close() { setOpenModal(null); setEditId(null); }

  function persist(records, nextDate) {
    saveTeethStatus({ ...teethStatus, [toothId]: { date: nextDate != null ? nextDate : date, records, updatedAt: new Date().toISOString() } });
  }

  function saveDate() {
    persist(info.records, date);
    showToast('저장됐어요');
  }

  function addRecord() {
    if (!newDate) { showToast('날짜를 입력해주세요'); return; }
    const records = [...info.records, { id: uid(), type: newType, date: newDate, memo: newMemo.trim() }];
    persist(records);
    setNewMemo('');
    showToast('기록이 추가됐어요');
  }

  function deleteRecord(recordId) {
    persist(info.records.filter(r => r.id !== recordId));
  }

  function deleteTooth() {
    if (!window.confirm('이 치아 기록을 전체 삭제하시겠어요? (추가 기록도 함께 삭제돼요)')) return;
    const cur = { ...teethStatus };
    delete cur[toothId];
    saveTeethStatus(cur);
    close();
  }

  const sortedRecords = [...info.records].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return createPortal(
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cv)', opacity: 0.6 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--cv)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: 'var(--cv)' }}>{tooth.num}</span>
          {tooth.label}
        </div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">난 날짜</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <DateTimePicker mode="date" value={date} onChange={setDate} style={{ flex: 1 }} />
              <button className="bcan" style={{ padding: '0 16px' }} onClick={saveDate}>저장</button>
            </div>
          </div>

          <div className="fld">
            <div className="flbl">추가 기록{info.records.length > 0 ? ` (${info.records.length}건)` : ''}</div>
            {sortedRecords.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 0 8px' }}>치료·특이사항·발치 등을 기록해보세요</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {sortedRecords.map(r => {
                  const rt = RECORD_TYPE_MAP[r.type] || RECORD_TYPES[1];
                  return (
                    <div key={r.id} className="ec" style={{ padding: '8px 10px', cursor: 'default' }}>
                      <div className="emain">
                        <div className="epri" style={{ fontSize: 13 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, background: rt.bg, color: rt.color, borderRadius: 4, padding: '1px 6px', marginRight: 6 }}>{rt.label}</span>
                          {r.date}
                        </div>
                        {r.memo && <div className="esec" style={{ fontSize: 12 }}>{r.memo}</div>}
                      </div>
                      <button className="edel" onClick={() => deleteRecord(r.id)}>
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="fld">
            <div className="flbl">기록 추가</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {RECORD_TYPES.map(rt => (
                <button
                  key={rt.code}
                  className={`sbtn${newType === rt.code ? ' on' : ''}`}
                  onClick={() => setNewType(rt.code)}
                >{rt.label}</button>
              ))}
            </div>
            <DateTimePicker mode="date" value={newDate} onChange={setNewDate} style={{ marginBottom: 8, width: '100%' }} />
            <input className="finp" type="text" placeholder="메모 (선택)" value={newMemo} onChange={e => setNewMemo(e.target.value)} style={{ marginBottom: 8, width: '100%' }} />
            <button className="bpri" style={{ width: '100%' }} onClick={addRecord}>추가</button>
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" style={{ flex: 1 }} onClick={close}>닫기</button>
          <button
            className="bcan"
            style={{ flex: 1, color: '#E05A4E' }}
            onClick={deleteTooth}
          >치아 기록 전체 삭제</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
