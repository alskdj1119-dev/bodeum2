'use client';
import { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import {
  fmtFull, toLocal, directFeedDurationMs, directFeedMlFromMs, getDirectFeedRate,
  FEED_SIDE_LABEL,
} from '../../lib/helpers';

// 오늘(또는 offsetDays일 전) 날짜를 한국 시각 기준 YYYY-MM-DD로.
function kstDateStr(offsetDays = 0) {
  const ms = Date.now() + offsetDays * 86400000;
  return toLocal(new Date(ms).toISOString()).slice(0, 10);
}

// 직수 계산 설정을 바꾼 뒤, 기존에 저장된 직수 기록들 중 원하는 기간/기록을 직접 골라서
// 현재 설정 기준으로 다시 계산할 수 있는 화면. 아기가 자라며 실제 섭취량이 달라지는 걸
// 반영하되, 체크하지 않은 예전 기록은 그대로 두어 과거 데이터가 왜곡되지 않게 한다.
export default function RecalcFeedsPanel() {
  const { db, recalcDirectFeedAmounts, showToast } = useApp();

  const [startDate, setStartDate] = useState(() => kstDateStr(-1));
  const [endDate, setEndDate] = useState(() => kstDateStr(0));
  const [selected, setSelected] = useState(() => new Set());

  const rate = getDirectFeedRate();

  const directFeeds = useMemo(
    () => (db.feeds || []).filter(f => f.type === 'breast' && f.subtype === 'direct' && f.start),
    [db.feeds]
  );

  const filtered = useMemo(() => {
    return directFeeds
      .filter(f => {
        const d = toLocal(f.start).slice(0, 10);
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      })
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  }, [directFeeds, startDate, endDate]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => {
      if (prev.size === filtered.length && filtered.length > 0) return new Set();
      return new Set(filtered.map(f => f.id));
    });
  }

  function apply() {
    if (selected.size === 0) {
      showToast('다시 계산할 기록을 선택해주세요');
      return;
    }
    recalcDirectFeedAmounts([...selected]);
    showToast(`${selected.size}건 다시 계산했어요 ✓`);
    setSelected(new Set());
  }

  const allChecked = filtered.length > 0 && selected.size === filtered.length;

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">직수 기록 다시 계산</span>
      </div>

      <div className="sc-static" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
          현재 설정: <strong>1분당 {rate.toFixed(2)}ml</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
          기간과 기록을 골라 체크하면, 선택한 기록만 현재 설정 기준으로 다시 계산돼요. 체크하지 않은 기록은 그대로 유지됩니다.
        </div>
      </div>

      <div className="fld">
        <div className="flbl">기간</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="finp finp-white" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>~</span>
          <input className="finp finp-white" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🍼</div>
          <div className="empty-lbl">이 기간에는 직수 기록이 없어요</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 2px 8px' }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll}
              style={{ width: 17, height: 17, accentColor: 'var(--sage)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              전체 선택 ({filtered.length}건)
            </span>
          </div>

          {filtered.map(f => {
            const ms = directFeedDurationMs(f);
            const newAmount = directFeedMlFromMs(ms);
            const changed = f.amount != null && f.amount !== newAmount;
            return (
              <div key={f.id} className="ec" style={{ alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                  style={{ width: 17, height: 17, marginTop: 3, accentColor: 'var(--sage)', flexShrink: 0 }}
                />
                <div className="emain" style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                  <div className="epri">
                    {FEED_SIDE_LABEL[f.side] || ''} 직수 — {fmtFull(f.start)}
                  </div>
                  <div className="esec" style={{ fontSize: '11px' }}>
                    현재 {f.amount != null ? `${f.amount}ml` : '—'}
                    {' → '}
                    <span style={{ color: changed ? 'var(--sage)' : 'var(--muted)', fontWeight: changed ? 700 : 400 }}>
                      {newAmount}ml
                    </span>
                    {!changed && ' (변화 없음)'}
                  </div>
                </div>
              </div>
            );
          })}

          <button className="bpri" style={{ width: '100%', marginTop: 16 }} onClick={apply}>
            선택한 {selected.size > 0 ? `${selected.size}건 ` : ''}다시 계산
          </button>
        </>
      )}
    </>
  );
}
