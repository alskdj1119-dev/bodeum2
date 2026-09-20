'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { elapsedStr, useNowTick, handoffRoleLabel, handoffRoleEmoji } from '../lib/helpers';

// 홈 화면 상단 "잘 부탁해 메모" 카드 — 육아 교대할 때 남긴 메모를 다음 사람이 놓치지 않도록 보여준다.
// 이 기기의 역할(myRole)이 받는 사람(targetRole)으로 지정된 메모 중 아직 확인 안 한 것만 보여준다 —
// 다른 역할에게 보낸 메모는 이 기기에 뜨지 않는다.
export default function HandoffNoteCard() {
  const { handoffNotes, myRole, confirmHandoffNote, snoozeHandoffNote, showToast } = useApp();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  useNowTick(30000); // "N분 전"/"약 N분 후" 표시가 시간 지나도 갱신되도록

  const mine = (handoffNotes || []).filter((n) => n.targetRole === myRole && n.status !== 'done');
  const latest = mine.length ? mine.sort((a, b) => b.createdAt - a.createdAt)[0] : null;
  if (!latest) return null;

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
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          {handoffRoleEmoji(latest.authorRole)} {handoffRoleLabel(latest.authorRole)} → {handoffRoleEmoji(latest.targetRole)} {handoffRoleLabel(latest.targetRole)}
        </div>
        <div className="handoff-text">{latest.text}</div>
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
