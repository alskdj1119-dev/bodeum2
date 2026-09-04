'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay } from '../../lib/helpers';
import WeightValueChart from '../charts/WeightValueChart';
import SimpleValueChart from '../charts/SimpleValueChart';
import WHOPercentileChart from '../charts/WHOPercentileChart';

// 5단계 — 키/머리둘레 기록 + WHO 소아 성장 백분위 차트 추가.
const TABS = [
  { id: 'weight',     label: '체중' },
  { id: 'height',     label: '키' },
  { id: 'headCirc',   label: '머리둘레' },
  { id: 'percentile', label: '성장곡선(WHO)' },
];

const PERCENTILE_MEASURES = [
  { id: 'weight',   label: '체중', unit: 'kg', color: 'var(--cw)' },
  { id: 'height',   label: '키',   unit: 'cm', color: 'var(--cf)' },
  { id: 'headCirc', label: '머리둘레', unit: 'cm', color: 'var(--cv)' },
];

export default function GrowthPanel() {
  const {
    db, dispatch, saveDB, setOpenModal, setEditId, setEditType, showToast, filterByActiveBaby, baby,
  } = useApp();
  const weights = filterByActiveBaby(db.weights || []);
  const heights = filterByActiveBaby(db.heights || []);
  const headCircs = filterByActiveBaby(db.headCircs || []);

  const [tab, setTab] = useState('weight');
  const [pMeasure, setPMeasure] = useState('weight');

  const weightSorted = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const weightGrouped = groupByDay(weightSorted, w => w.time);
  const heightSorted = [...heights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const heightGrouped = groupByDay(heightSorted, h => h.time);
  const headCircSorted = [...headCircs].sort((a,b) => new Date(b.time) - new Date(a.time));
  const headCircGrouped = groupByDay(headCircSorted, h => h.time);

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

  function openHeightEdit(h) { setEditId(h.id); setEditType('heights'); setOpenModal('height'); }
  function openHeightNew() { setEditId(null); setEditType(null); setOpenModal('height'); }
  async function delHeight(id) {
    const item = (db.heights || []).find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'heights' };
    const newList = (db.heights || []).filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_HEIGHTS', payload: newList });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, heights: newList, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  function openHeadCircEdit(h) { setEditId(h.id); setEditType('headCircs'); setOpenModal('headCirc'); }
  function openHeadCircNew() { setEditId(null); setEditType(null); setOpenModal('headCirc'); }
  async function delHeadCirc(id) {
    const item = (db.headCircs || []).find(x => x.id === id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: 'headCircs' };
    const newList = (db.headCircs || []).filter(x => x.id !== id);
    const newTrash = [trashItem, ...(db.trash || [])];
    dispatch({ type: 'SET_HEAD_CIRCS', payload: newList });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    await saveDB({ ...db, headCircs: newList, trash: newTrash });
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
  }

  const gender = (baby.gender === 'boy' || baby.gender === 'girl') ? baby.gender : 'boy';
  const pMeasureInfo = PERCENTILE_MEASURES.find(m => m.id === pMeasure);
  const pRecords = (pMeasure === 'weight' ? weights : pMeasure === 'height' ? heights : headCircs)
    .map(r => ({ time: r.time, value: pMeasure === 'weight' ? r.kg : r.cm }));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span className="logtitle" style={{ flex: 1 }}>성장</span>
        {tab === 'weight' && (
          <button className="addbtn" onClick={openWeightNew}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            체중 추가
          </button>
        )}
        {tab === 'height' && (
          <button className="addbtn" onClick={openHeightNew}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            키 추가
          </button>
        )}
        {tab === 'headCirc' && (
          <button className="addbtn" onClick={openHeadCircNew}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            머리둘레 추가
          </button>
        )}
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} className={`sbtn${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'weight' && (
        <>
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
                    <div className="emain"><div className="epri">{w.kg.toFixed(3)} kg</div></div>
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
      )}

      {tab === 'height' && (
        <>
          {heights.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>일별 키 추이</div>
              <SimpleValueChart records={heights.map(h => ({ time: h.time, value: h.cm }))} color="var(--cw)" unit="cm" decimals={1} />
            </div>
          )}
          {heightSorted.length === 0 ? (
            <div className="empty"><div className="empty-ico">📏</div><div className="empty-lbl">키 기록이 없어요</div></div>
          ) : (
            heightGrouped.map(([day, items]) => (
              <div key={day} className="daygrp">
                <div className="daylbl">{day}</div>
                {items.map(h => (
                  <div key={h.id} className="ec" onClick={() => openHeightEdit(h)}>
                    <div className="edot w"></div>
                    <div className="emain"><div className="epri">{h.cm.toFixed(1)} cm</div></div>
                    <div className="etime">{fmtFull(h.time)}</div>
                    <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 키 기록을 삭제하시겠어요?')) delHeight(h.id); }}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'headCirc' && (
        <>
          {headCircs.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>일별 머리둘레 추이</div>
              <SimpleValueChart records={headCircs.map(h => ({ time: h.time, value: h.cm }))} color="var(--cv)" unit="cm" decimals={1} />
            </div>
          )}
          {headCircSorted.length === 0 ? (
            <div className="empty"><div className="empty-ico">🎗️</div><div className="empty-lbl">머리둘레 기록이 없어요</div></div>
          ) : (
            headCircGrouped.map(([day, items]) => (
              <div key={day} className="daygrp">
                <div className="daylbl">{day}</div>
                {items.map(h => (
                  <div key={h.id} className="ec" onClick={() => openHeadCircEdit(h)}>
                    <div className="edot v"></div>
                    <div className="emain"><div className="epri">{h.cm.toFixed(1)} cm</div></div>
                    <div className="etime">{fmtFull(h.time)}</div>
                    <button className="edel" onClick={e => { e.stopPropagation(); if (window.confirm('이 머리둘레 기록을 삭제하시겠어요?')) delHeadCirc(h.id); }}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'percentile' && (
        <>
          <div className="seg" style={{ marginBottom: 12 }}>
            {PERCENTILE_MEASURES.map(m => (
              <button key={m.id} className={`sbtn${pMeasure === m.id ? ' on' : ''}`}
                onClick={() => setPMeasure(m.id)}>{m.label}</button>
            ))}
          </div>

          {!baby.birthDate ? (
            <div className="sc-static">
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
                설정에서 생년월일을 입력하면 성장 곡선이 표시돼요
              </div>
            </div>
          ) : pRecords.length === 0 ? (
            <div className="empty"><div className="empty-ico">📈</div><div className="empty-lbl">{pMeasureInfo.label} 기록이 없어요</div></div>
          ) : (
            <>
              <WHOPercentileChart
                measure={pMeasure} gender={gender} birthDate={baby.birthDate}
                records={pRecords} unit={pMeasureInfo.unit} color={pMeasureInfo.color}
              />
              {!(baby.gender === 'boy' || baby.gender === 'girl') && (
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
                  성별이 설정되지 않아 남아 기준 표를 보여드리고 있어요 (아이 정보에서 설정 가능)
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
                WHO 소아 성장 표준 0~24개월 근사치예요. 참고용이며, 정확한 발육 평가는 소아과 상담을 권장해요.
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
