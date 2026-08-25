'use client';
import { useApp } from '../../lib/store';
import { fmtFull, groupByDay } from '../../lib/helpers';

function buildChart(weights) {
  const asc = [...weights].sort((a,b) => new Date(a.time) - new Date(b.time));
  if (asc.length < 2) return null;

  const byDay = {};
  asc.forEach(w => { byDay[w.time.slice(0,10)] = w.kg; });
  const days = Object.keys(byDay).sort().slice(-14);
  const pts = days.map(d => ({ label: d.slice(5,7) + '/' + d.slice(8,10), kg: byDay[d] }));
  if (pts.length < 2) return null;

  const W = 360, H = 172, ml = 10, mr = 10, mt = 32, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = pts.length;
  const kgs = pts.map(p => p.kg);
  const minKg = Math.min(...kgs), maxKg = Math.max(...kgs);
  const range = maxKg - minKg;
  const pad = range < 0.05 ? 0.15 : range * 0.3;
  const yMin = minKg - pad, yMax = maxKg + pad;

  const xp = i => n === 1 ? ml + cW / 2 : ml + i * (cW / (n - 1));
  const yp = kg => mt + (yMax - kg) / (yMax - yMin) * cH;

  const ptStr = pts.map((p,i) => `${xp(i)},${yp(p.kg)}`).join(' ');
  const area = `<path d="M${xp(0)},${mt+cH} L${ptStr.split(' ').join(' L')} L${xp(n-1)},${mt+cH} Z" fill="var(--cf)" opacity="0.09"/>`;
  const line = `<polyline points="${ptStr}" fill="none" stroke="var(--cf)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;

  const gains = pts.slice(1).map((p,i) => Math.round((p.kg - pts[i].kg) * 1000));
  const last7 = gains.slice(-7);
  const avg7 = last7.length ? Math.round(last7.reduce((s,g) => s+g, 0) / last7.length) : null;

  let dots = '', wlbls = '', dlbls = '', glbls = '';
  pts.forEach((p,i) => {
    const x = xp(i), y = yp(p.kg);
    dots += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--cf)" stroke="var(--surf)" stroke-width="2"/>`;
    wlbls += `<text x="${x}" y="${y-10}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">${p.kg.toFixed(2)}</text>`;
    const showDate = n <= 7 || i % Math.ceil(n/7) === 0 || i === n-1;
    if (showDate) dlbls += `<text x="${x}" y="${H-mb+13}" text-anchor="middle" font-size="9" fill="var(--muted)">${p.label}</text>`;
    if (i > 0) {
      const gv = gains[i-1];
      const gs = (gv >= 0 ? '+' : '') + gv + 'g';
      const gc = gv >= 0 ? 'var(--cw)' : 'var(--cd)';
      glbls += `<text x="${x}" y="${H-mb+27}" text-anchor="middle" font-size="9" font-weight="600" fill="${gc}">${gs}</text>`;
    }
  });

  const avgColor = avg7 >= 0 ? 'var(--cw)' : 'var(--cd)';

  return { svgStr: `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${area}${line}${dots}${wlbls}${dlbls}${glbls}</svg>`, avg7, avgColor };
}

export default function WeightPanel() {
  const { db, dispatch, saveDB, setOpenModal, setEditId, setEditType } = useApp();
  const { weights } = db;

  const sorted = [...weights].sort((a,b) => new Date(b.time) - new Date(a.time));
  const grouped = groupByDay(sorted, w => w.time);
  const chart = buildChart(weights);

  function openEdit(w) {
    setEditId(w.id); setEditType('weights');
    setOpenModal('weight');
  }

  function openNew() {
    setEditId(null); setEditType(null);
    setOpenModal('weight');
  }

  function delWeight(id) {
    const newW = weights.filter(x => x.id !== id);
    const newDB = { ...db, weights: newW };
    dispatch({ type: 'SET_WEIGHTS', payload: newW });
    saveDB(newDB);
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">체중</span>
        <span className="badge">{sorted.length}</span>
        <button className="addbtn" onClick={openNew}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          추가
        </button>
      </div>

      {chart && (
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.04em', color:'var(--muted)', marginBottom:'4px' }}>일별 체중 추이</div>
          <div dangerouslySetInnerHTML={{ __html: chart.svgStr }} />
          {chart.avg7 !== null && (
            <div style={{ textAlign:'center', fontSize:'12px', color:'var(--muted)', padding:'4px 0' }}>
              최근 7일 일평균 <strong style={{ color: chart.avgColor }}>{chart.avg7 >= 0 ? '+' : ''}{chart.avg7}g</strong>
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty"><div className="empty-ico">⚖️</div><div className="empty-lbl">체중 기록이 없어요</div></div>
      ) : (
        grouped.map(([day, items]) => (
          <div key={day} className="daygrp">
            <div className="daylbl">{day}</div>
            {items.map(w => (
              <div key={w.id} className="ec" onClick={() => openEdit(w)}>
                <div className="edot w"></div>
                <div className="emain">
                  <div className="epri">{w.kg.toFixed(2)} kg</div>
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
