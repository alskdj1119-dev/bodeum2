'use client';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useApp } from '../../lib/store';

// 이 기기에서 마지막으로 쓴 이름을 기억해뒀다가 다음에 메모 남길 때 미리 채워준다.
// 가족 구성원마다 다른 기기를 쓰므로 서버 동기화 없이 이 기기(브라우저)에만 저장한다.
const AUTHOR_KEY = 'bodeum_handoff_author';

export default function HandoffNoteModal() {
  const { addHandoffNote, setOpenModal, showToast } = useApp();
  const [author, setAuthor] = useState(() => {
    try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (_) { return ''; }
  });
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  function close() { setOpenModal(null); }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) { showToast('내용을 입력해주세요'); return; }
    setSaving(true);
    try { localStorage.setItem(AUTHOR_KEY, author.trim()); } catch (_) {}
    await addHandoffNote(trimmed, author);
    setSaving(false);
    showToast('잘 부탁해 메모를 남겼어요');
    close();
  }

  return createPortal(
    <div className="mbg open" onClick={close}>
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" />
        <div className="mtitle">잘 부탁해 메모 남기기</div>
        <div className="mbody">
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5', marginTop: 0, marginBottom: '16px' }}>
            교대할 때 놓치기 쉬운 걸 남겨두면, 상대방 기기로 바로 알려드려요.
          </p>
          <div className="fld">
            <div className="flbl">누가 남기나요</div>
            <input
              className="finp"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="예: 의성"
              maxLength={12}
            />
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
          <button className="bpri" onClick={send} disabled={saving}>{saving ? '저장 중…' : '상대방에게 남기기'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
