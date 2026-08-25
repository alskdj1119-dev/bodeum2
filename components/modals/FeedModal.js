'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { nowISO, toLocal, fromLocal } from '../../lib/helpers';

export default function FeedModal() {
  const {
    db, dispatch, saveDB, showToast,
    openModal, setOpenModal,
    editId, setEditId, editType, setEditType,
    uid, setLinkedSleepId, setPendingConsumedFeedId,
  } = useApp();

  const isEdit = !!editId;
  const existing = isEdit ? db.feeds.find(f => f.id === editId) : null;

  const [type, setType] = useState('breast');      // 'breast' | 'bottle'
  const [subtype, setSubtype] = useState('direct'); // 'direct' | 'pumped'
  const [side, setSide] = useState('left');         // 'left' | 'right' | 'both'
  const [amount, setAmount] = useState('');
  const [consumedAmount, setConsumedAmount] = useState('');
  const [note, setNote] = useState('');
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
      setStart(existing.start ? toLocal(existing.start) : nowISO());
      setEnd(existing.end ? toLocal(existing.end) : '');
    } else {
      setType('breast');
      setSubtype('direct');
      setSide('left');
      setAmount('');
      setConsumedAmount('');
      setNote('');
      setStart(nowISO());
      setEnd('');
    }
  }, [editId]);

  const isDirectBreast = type === 'breast' && subtype === 'direct';

  function close() {
    setOpenModal(null);
    setEditId(null);
    setEditType(null);
  }

  async function save() {
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
        consumedAmount: consumedAmount ? parseFloat(consumedAmount) : undefined,
        note: note || undefined,
        start: fromLocal(start),
        end: end ? fromLocal(end) : undefined,
      };
      const newDB = { ...db, feeds: newFeeds };
      dispatch({ type: 'SET_FEEDS', payload: newFeeds });
      await saveDB(newDB);
      showToast('수정됐어요');
      close();
    } else {
      const id = uid();
      if (isDirectBreast) {
        // Start timer — no end time yet
        const entry = {
          id,
          type,
          subtype,
          side,
          note: note || undefined,
          start: nowISO(),
        };
        newFeeds.unshift(entry);
        const newDB = { ...db, feeds: newFeeds };
        dispatch({ type: 'SET_FEEDS', payload: newFeeds });
        await saveDB(newDB);
        showToast('수유 타이머 시작!');

        // Also create a linked sleep
        const sleepId = uid();
        setLinkedSleepId(sleepId);
        try { localStorage.setItem('bodeum_linked_sleep', sleepId); } catch(_) {}
        const newSleeps = [{ id: sleepId, start: nowISO(), note: '수유 연동' }, ...db.sleeps];
        const newDB2 = { ...db, feeds: newFeeds, sleeps: newSleeps };
        dispatch({ type: 'SET_SLEEPS', payload: newSleeps });
        await saveDB(newDB2);
        close();
      } else {
        const entry = {
          id,
          type,
          subtype: type === 'breast' ? subtype : undefined,
          side: isDirectBreast ? side : undefined,
          amount: amount ? parseFloat(amount) : undefined,
          consumedAmount: consumedAmount ? parseFloat(consumedAmount) : undefined,
          note: note || undefined,
          start: nowISO(),
          end: nowISO(),
        };
        newFeeds.unshift(entry);
        const newDB = { ...db, feeds: newFeeds };
        dispatch({ type: 'SET_FEEDS', payload: newFeeds });
        await saveDB(newDB);
        showToast('수유 기록이 추가됐어요');
        close();
      }
    }
  }

  return (
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle"></div>
        <div className="mtitle">{isEdit ? '수유 수정' : '수유 기록'}</div>
        <div className="mbody">
          {/* Type */}
          <div className="fld">
            <div className="flbl">수유 종류</div>
            <div className="seg">
              <button className={`sbtn${type === 'breast' ? ' on' : ''}`} onClick={() => setType('breast')}>모유</button>
              <button className={`sbtn${type === 'bottle' ? ' on' : ''}`} onClick={() => setType('bottle')}>분유</button>
            </div>
          </div>

          {/* Subtype (breast only) */}
          {type === 'breast' && (
            <div className="fld">
              <div className="flbl">방식</div>
              <div className="seg">
                <button className={`sbtn${subtype === 'direct' ? ' on' : ''}`} onClick={() => setSubtype('direct')}>직수</button>
                <button className={`sbtn${subtype === 'pumped' ? ' on' : ''}`} onClick={() => setSubtype('pumped')}>유축</button>
              </div>
            </div>
          )}

          {/* Side (direct breast only) */}
          {isDirectBreast && (
            <div className="fld">
              <div className="flbl">방향</div>
              <div className="seg">
                <button className={`sbtn${side === 'left' ? ' on' : ''}`} onClick={() => setSide('left')}>왼쪽</button>
                <button className={`sbtn${side === 'right' ? ' on' : ''}`} onClick={() => setSide('right')}>오른쪽</button>
                <button className={`sbtn${side === 'both' ? ' on' : ''}`} onClick={() => setSide('both')}>양쪽</button>
              </div>
            </div>
          )}

          {/* Amount (not shown for new direct feed) */}
          {!(isDirectBreast && !isEdit) && (
            <div className="fld">
              <div className="flbl">수유량 (ml)</div>
              <input className="finp" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="선택 사항"/>
            </div>
          )}

          {/* Consumed amount */}
          <div className="fld">
            <div className="flbl">섭취량 (ml)</div>
            <input className="finp" type="number" value={consumedAmount} onChange={e => setConsumedAmount(e.target.value)} placeholder="선택 사항"/>
          </div>

          {/* Note */}
          <div className="fld">
            <div className="flbl">메모</div>
            <input className="finp" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 사항"/>
          </div>

          {/* Edit mode: time fields */}
          {isEdit && (
            <>
              <div className="fld">
                <div className="flbl">시작 시간</div>
                <input className="finp" type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/>
              </div>
              <div className="fld">
                <div className="flbl">종료 시간</div>
                <input className="finp" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}/>
              </div>
            </>
          )}
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" onClick={save}>{isEdit ? '저장' : (isDirectBreast ? '수유 시작' : '저장')}</button>
        </div>
      </div>
    </div>
  );
}
