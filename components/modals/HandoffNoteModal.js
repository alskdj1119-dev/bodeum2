'use client';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import { HANDOFF_ROLES, handoffRoleLabel } from '../../lib/helpers';

export default function HandoffNoteModal() {
  const { addHandoffNote, setOpenModal, showToast, myRole, goTab } = useApp();
  const [targetRole, setTargetRole] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  function close() { setOpenModal(null); }

  function goSetMyRole() {
    close();
    goTab('myRoleSettings', 'forward');
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) { showToast('내용을 입력해주세요'); return; }
    if (!targetRole) { showToast('누구에게 보낼지 먼저 골라주세요'); return; }
    setSaving(true);
    await addHandoffNote(trimmed, targetRole);
    setSaving(false);
    close();
  }

  // 아직 내 역할을 안 골랐으면 메모를 남길 수 없다 — 먼저 설정으로 안내한다.
  if (!myRole) {
    return createPortal(
      <div className="mbg open" onClick={close}>
        <div className="msheet" onClick={e => e.stopPropagation()}>
          <div className="mhandle" />
          <div className="mtitle">먼저 내 역할을 골라주세요</div>
          <div className="mbody">
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              "잘 부탁해 메모"는 역할(엄마·아빠·가족·도우미·기타)로 주고받아요. 설정에서 이 기기의 역할을 먼저 골라주세요.
            </p>
          </div>
          <div className="mfoot">
            <button className="bcan" onClick={close}>취소</button>
            <button className="bpri" onClick={goSetMyRole}>설정으로 가기</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" />
        <div className="mtitle">잘 부탁해 메모 남기기</div>
        <div className="mbody">
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5', marginTop: 0, marginBottom: '16px' }}>
            이 메모는 지금 이 기기의 역할(<b style={{ color: 'var(--ink)' }}>{handoffRoleLabel(myRole)}</b>)로 저장돼요. 역할은 설정에서 바꿀 수 있어요.
          </p>
          <div className="fld">
            <div className="flbl">누구에게 보낼까요</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {HANDOFF_ROLES.map((r) => {
                const on = targetRole === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setTargetRole(r.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 13px', borderRadius: '100px',
                      border: '1.5px solid var(--sage)', background: on ? 'var(--sage)' : 'var(--surf)',
                      color: on ? '#fff' : 'var(--sage)', fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', boxShadow: 'var(--sh-sm)',
                    }}
                  >
                    <span>{r.emoji}</span>{r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="fld" style={{ marginTop: 14 }}>
            <div className="flbl">내용</div>
            <textarea
              className="finp"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="예: 방금 분유 90ml 먹였고, 15분 후에 트림시켜주세요"
              rows={4}
              maxLength={200}
              style={{ resize: 'none', lineHeight: 1.5, fontFamily: 'var(--sans)' }}
              autoFocus
            />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={close}>취소</button>
          <button className="bpri" onClick={send} disabled={saving}>{saving ? '저장 중…' : '보내기'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
