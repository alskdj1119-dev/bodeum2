'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { toLocal, fromLocal } from '../../lib/helpers';

// Color scheme per feed type
const FEED_COLOR = {
  breast_direct: { main: 'var(--cs)', bg: 'var(--sw)' },  // purple — 직수
  breast_pumped:  { main: 'var(--cf)', bg: 'var(--fw)' },  // blue   — 유축
  bottle:         { main: 'var(--cd)', bg: 'var(--dw)' },  // warm   — 분유
};

const AUTHOR_OPTIONS = [
  { code: '', label: '—' },
  { code: 'mom', label: '엄마' },
  { code: 'dad', label: '아빠' },
  { code: 'other', label: '기타' },
];

export default function FeedModal() {
  const {
    db, dispatch, saveDB, showToast,
    setOpenModal,
    editId, setEditId, setEditType,
    uid,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.feeds.find(f => f.id === editId) : null;

  const [type, setType] = useState('breast');
  const [subtype, setSubtype] = useState('direct');
  const [side, setSide] = useState('left');
  const [amount, setAmount] = useState('');
  const [consumedAmount, setConsumedAmount] = useState('');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('mom');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (existing) {
      setType(existing.type || 'breast');
      setSubtype(existing.subtype || 'direct');
      setSide(existing.side || 'left');
      setAmount(existing.amount != null ? String(existing.amount) : '');
      setConsumedAmount(existing.consumedAmount != null ? String(existing.consumedAmount) : '');
      setNote(existing.note || '');
      setAuthor(existing.author || '');
      setStart(existing.start ? toLocal(existing.start) : '');
      setEnd(existing.end ? toLocal(existing.end) : '');
    } else {
      setType('breast');
      setSubtype('direct');
      setSide('left');
      setAmount('');
      setConsumedAmount('');
      setNote('');
      setAuthor('mom');
      setStart('');
      setEnd('');
    }
  }, [editId]);

  // 직수 & 새 기록: 기록자 자동으로 엄마 설정
  useEffect(() => {
    if (!isEdit && type === 'breast' && subtype === 'direct') {
      setAuthor('mom');
    }
  }, [type, subtype, isEdit]);

  const isDirectBreast = type === 'breast' && subtype === 'direct';
  const colorKey = type === 'bottle' ? 'bottle' : `breast_${subtype}`;
  const fc = FEED_COLOR[colorKey] || FEED_COLOR.breast_direct;

  function close() { setOpenModal(null); setEditId(null); setEditType(null); }

  async function save() {
    // 준비량(수유량)은 직수를 제외하고 필수값
    if (!isDirectBreast && !amount) {
      showToast('준비량(ml)을 입력해주세요');
      return;
    }
    // 종료 시간이 시작 시간보다 빠르면(=시작이 미래) 저장하지 않고 경고
    // ("YYYY-MM-DDTHH:mm" 형식이라 문자열 비교로 시간 순서 비교가 가능함)
    if (isEdit && end && start && end < start) {
      showToast('종료 시간이 시작 시간보다 빠를 수 없어요');
      return;
    }

    const newFeeds = [...db.feeds];

    if (isEdit) {
      const idx = newFeeds.findIndex(f => f.id === editId);
      if (idx < 0) return;
      newFeeds[idx] = {
        ...newFeeds[idx],
        type,
        subtype: type === 'breast' ? subtype : undefined,
        side: isDirectBreast ? side : undefined,
        amount: amount ? parseFloat(amount) : undefined,
        consumedAmount: (!isDirectBreast && consumedAmount !== '') ? parseFloat(consumedAmount) : undefined,
        note: note || undefined,
        author: author || undefined,
        start: fromLocal(start),
        end: end ? fromLocal(end) : undefined,
      };
      const newDB = { ...db, feeds: newFeeds };
      dispatch({ type: 'SET_FEEDS', payload: newFeeds });
      await saveDB(newDB);
      showToast('수정됐어요');
      close();
    } else {
      // 모든 수유 타입: 타이머 시작 모드 (start만 저장, end 없음)
      // 시작 시점을 누른 시점으로 정확히 기록 (초 포함)
      const startTime = new Date().toISOString();
      const id = uid();
      const entry = {
        id,
        type,
        subtype: type === 'breast' ? subtype : undefined,
        side: isDirectBreast ? side : undefined,
        amount: (amount && !isDirectBreast) ? parseFloat(amount) : undefined,
        note: note || undefined,
        author: author || undefined,
        start: startTime,
      };
      newFeeds.unshift(entry);
      const newDB = { ...db, feeds: newFeeds };
      dispatch({ type: 'SET_FEEDS', payload: newFeeds });
      await saveDB(newDB);
      showToast('수유 타이머 시작!');
      close();
    }
  }

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        {/* Colored handle bar reflects feed type */}
        <div className="mhandle" style={{ background: fc.main, opacity: 0.7 }} />
        <div className="mtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: fc.main, display: 'inline-block', flexShrink: 0 }} />
          {isEdit ? '수유 수정' : '수유 기록'}
        </div>

        <div className="mbody">
          {/* Type */}
          <div className="fld">
            <div className="flbl">수유 종류</div>
            <div className="seg">
              <button className={`sbtn${type === 'breast' ? ' on' : ''}`}
                style={type === 'breast' ? { background: fc.main, borderColor: fc.main } : {}}
                onClick={() => setType('breast')}>모유</button>
              <button className={`sbtn${type === 'bottle' ? ' on' : ''}`}
                style={type === 'bottle' ? { background: FEED_COLOR.bottle.main, borderColor: FEED_COLOR.bottle.main } : {}}
                onClick={() => setType('bottle')}>분유</button>
            </div>
          </div>

          {/* Subtype (breast only) */}
          {type === 'breast' && (
            <div className="fld">
              <div className="flbl">방식</div>
              <div className="seg">
                <button className={`sbtn${subtype === 'direct' ? ' on' : ''}`}
                  style={subtype === 'direct' ? { background: FEED_COLOR.breast_direct.main, borderColor: FEED_COLOR.breast_direct.main } : {}}
                  onClick={() => setSubtype('direct')}>직수</button>
                <button className={`sbtn${subtype === 'pumped' ? ' on' : ''}`}
                  style={subtype === 'pumped' ? { background: FEED_COLOR.breast_pumped.main, borderColor: FEED_COLOR.breast_pumped.main } : {}}
                  onClick={() => setSubtype('pumped')}>유축</button>
              </div>
            </div>
          )}

          {/* Side (direct breast only) */}
          {isDirectBreast && (
            <div className="fld">
              <div className="flbl">방향</div>
              <div className="seg">
                <button className={`sbtn${side === 'left' ? ' on' : ''}`}
                  style={side === 'left' ? { background: fc.main, borderColor: fc.main } : {}}
                  onClick={() => setSide('left')}>왼쪽</button>
                <button className={`sbtn${side === 'right' ? ' on' : ''}`}
                  style={side === 'right' ? { background: fc.main, borderColor: fc.main } : {}}
                  onClick={() => setSide('right')}>오른쪽</button>
                <button className={`sbtn${side === 'both' ? ' on' : ''}`}
                  style={side === 'both' ? { background: fc.main, borderColor: fc.main } : {}}
                  onClick={() => setSide('both')}>양쪽</button>
              </div>
            </div>
          )}

          {/* Amount(준비량) — 유축/분유만, 새 기록 또는 수정 시. 필수값 */}
          {(!isDirectBreast) && (
            <div className="fld">
              <div className="flbl">준비량 (ml) <span>· 필수</span></div>
              <input className="finp" type="number" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="예: 120" />
            </div>
          )}
          {/* 섭취량 — 최초 기록 시엔 입력하지 않음(타이머 종료 시 팝업으로 입력), 이미 기록된 건을 수정할 때만 수정 가능 */}
          {isEdit && !isDirectBreast && (
            <div className="fld">
              <div className="flbl">섭취량 (ml)</div>
              <input className="finp" type="number" value={consumedAmount}
                onChange={e => setConsumedAmount(e.target.value)} placeholder="예: 100" />
            </div>
          )}

          {/* Author — 직수 새 기록: 엄마 고정 표시, 그 외: 선택 가능 */}
          {isDirectBreast && !isEdit ? (
            <div className="fld">
              <div className="flbl">기록자</div>
              <div style={{ padding:'8px 0', fontSize:'14px', color:'var(--ink)', fontWeight:500 }}>엄마 (고정)</div>
            </div>
          ) : (
            <div className="fld">
              <div className="flbl">기록자</div>
              <div className="seg">
                {AUTHOR_OPTIONS.map(opt => (
                  <button key={opt.code || 'none'} className={`sbtn${author === opt.code ? ' on' : ''}`}
                    style={author === opt.code ? { background: fc.main, borderColor: fc.main } : {}}
                    onClick={() => setAuthor(opt.code)}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항" />
          </div>

          {/* Edit mode: time fields */}
          {isEdit && (
            <>
              <div className="fld">
                <div className="flbl">시작 시간</div>
                <input className="finp" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="fld">
                <div className="flbl">종료 시간</div>
                <input className="finp" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" style={{ background: fc.main }} onClick={save}>
            {isEdit ? '저장' : '수유 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
