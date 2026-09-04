'use client';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay } from '../../lib/helpers';
import WeightValueChart from '../charts/WeightValueChart';

// 2단계 네비게이션 재편 — 기존 "건강" 탭에 있던 체중 기록을 "성장" 탭으로 분리.
// (키/머리둘레 + 성장 백분위 차트는 추후 별도 단계에서 이 화면에 추가 예정)
export default function GrowthPanel() {
  const {
    db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, filterByActiveBaby,
  } = useApp();
  const weights = filterByActiveBaby(db.weights || []);

  const weightSorted = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const weightGrouped = groupByDay(weightSorted, w => w.time);

  function openWeightEdit(w) { setEditId(w.id); setEditType('weights'); setOpenModal('weight'); }
  function openWeightNew() { setEditId(null); setEditType(null); setOpenModal('weight'); }

  async function delWeight(id) {
    const item = (db.weights || []).find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'weights' };
    const newW = (db.weights || []).filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_WEIGHTS', payload: newW });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, weights: newW, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span className="logtitle" style={{ flex: 1 }}>성장</span>
        <button className="addbtn" onClick={openWeightNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          체중 추가
        </button>
      </div>

      {weights.length >= 2 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>일별 체중 추이</div>
          <WeightValueChart weights={weights} />
        </div>
      )}

      {weightSorted.length === 0 ? (
        <div className="empty"><div className="empty-ico">⚖️</div><div className="empty-lbl">체중 기록이 없어요</div></div>
      ) : (
        weightGrouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(w => (
              <div key={w.id} className="ec" onClick={() => openWeightEdit(w)}>
                <div className="edot w"></div>
                <div className="emain">
                  <div className="epri">{w.kg.toFixed(3)} kg</div>
                </div>
                <div className="etime">{fmtFull(w.time)}</div>
                <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 체중 기록을 삭제하시겠어요?')) delWeight(w.id); }}>
                  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
