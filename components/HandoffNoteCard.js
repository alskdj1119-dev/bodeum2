'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { elapsedStr, useNowTick } from '../lib/helpers';

// 홈 화면 상단 "잘 부탁해 메모" 카드 — 육아 교대할 때 남긴 메모를 다음 사람이 놓치지 않도록 보여준다.
// handoffNotes는 항상 최신 메모가 배열 맨 앞(index 0)에 온다 (lib/store.js addHandoffNote 참고).
// 최신 메모가 '확인 완료' 상태면 카드 자체를 숨기고(할 일이 없으니), 그 외(대기중/다시보기 예약)에는 보여준다.
// 새로 메모를 남기는 건 이 카드가 아니라 "+" 빠른 기록 버튼 메뉴에서 한다.
export default function HandoffNoteCard() {
  const { handoffNotes, confirmHandoffNote, snoozeHandoffNote, showToast } = useApp();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  useNowTick(30000); // "N분 전"/"약 N분 후" 표시가 시간 지나도 갱신되도록

  const latest = handoffNotes && handoffNotes[0];
  if (!latest || latest.status === 'done') return null;

  function onConfirm() {
    confirmHandoffNote(latest.id);
    showToast('확인 처리됐어요');
  }
  function onSnooze(minutes) {
    setSnoozeOpen(false);
    snoozeHandoffNote(latest.id, minutes);
    showToast(`${minutes}분 후 다시 보여드릴게요`);
  }

  if (latest.status === 'snoozed') {
    const remainMin = Math.max(1, Math.ceil((latest.snoozeUntil - Date.now()) / 60000));
    return (
      <div className="handoff-snoozed" style={{ marginBottom: '16px' }}>
        ⏰ 잘 부탁해 메모를 약 <b>{remainMin}분</b> 후에 다시 보여드릴게요
      </div>
    );
  }

  return (
    <div className="handoff-card" style={{ marginBottom: '16px' }}>
      <div className="handoff-icon">✎</div>
      <div className="handoff-body">
        <div className="handoff-top">
          <span className="handoff-label">잘 부탁해 메모</span>
          <span className="handoff-time">{elapsedStr(latest.createdAt)}</span>
        </div>
        <div className="handoff-text">{latest.text}</div>
        <div className="handoff-author">{latest.author}님이 남김</div>
        <div className="handoff-actions">
          <button className="hbtn confirm" onClick={onConfirm}>확인했어요</button>
          <button className="hbtn snooze" onClick={() => setSnoozeOpen(v => !v)}>다시보기</button>
        </div>
        {snoozeOpen && (
          <div className="snooze-menu">
            <button className="smopt" onClick={() => onSnooze(10)}>10분</button>
            <button className="smopt" onClick={() => onSnooze(30)}>30분</button>
            <button className="smopt" onClick={() => onSnooze(60)}>60분</button>
          </div>
        )}
      </div>
    </div>
  );
}
