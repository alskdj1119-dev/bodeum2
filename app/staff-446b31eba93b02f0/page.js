'use client';
import { useState, useEffect } from 'react';
import { getDb, collection, doc, updateDoc, addDoc, query, orderBy, onSnapshot } from '../../lib/firebase';

// 건의사항 관리 화면 — 일반 사용자는 이 경로를 모른다(앱 메뉴 어디에도 링크가 없음).
// 로그인/비밀번호 없이, "URL 자체를 아는 사람만" 들어올 수 있게 하는 방식이라 완벽한 접근 제어는
// 아니다(주소를 아는 사람은 누구나 볼 수 있음) — 하지만 지금 이 앱은 로그인 체계가 전혀 없어서
// 비밀번호 화면을 새로 만들면 그게 오히려 첫 번째로 뚫리는 지점이 된다. 대신 여기서는
// familyCode처럼 진짜 민감한 값은 애초에 저장/노출하지 않도록 해서(RequestsPanel.js도 함께 수정),
// 이 주소가 알려지더라도 볼 수 있는 건 "사용자가 보낸 건의사항 텍스트"뿐이게 만든다.
const REQUESTS_COLLECTION = 'bodeum_requests';

const STATUS_OPTIONS = ['접수', '처리중', '처리완료', '미진행'];

const STATUS_STYLES = {
  '접수':     { bg: 'rgba(125,91,56,.12)',  color: '#7d5b38', border: 'rgba(125,91,56,.25)' },
  '처리중':   { bg: 'rgba(61,90,120,.12)',  color: '#3d5a78', border: 'rgba(61,90,120,.25)' },
  '처리완료': { bg: 'rgba(127,175,145,.12)', color: '#4f8f6c', border: 'rgba(127,175,145,.25)' },
  '미진행':   { bg: 'rgba(120,120,120,.1)', color: '#787878', border: 'rgba(120,120,120,.2)' },
  '완료':     { bg: 'rgba(127,175,145,.12)', color: '#4f8f6c', border: 'rgba(127,175,145,.25)' },
};

function AdminRequestItem({ r }) {
  const s = STATUS_STYLES[r.status] || STATUS_STYLES['접수'];
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const db = getDb();
    const col = collection(db, REQUESTS_COLLECTION, r.id, 'comments');
    const q = query(col, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [open, r.id]);

  async function changeStatus(status) {
    try {
      const db = getDb();
      await updateDoc(doc(db, REQUESTS_COLLECTION, r.id), { status });
    } catch (e) {
      alert('상태 변경 중 오류: ' + e.message);
    }
  }

  async function addNote() {
    const t = memo.trim();
    if (!t) return;
    setSending(true);
    try {
      const db = getDb();
      const col = collection(db, REQUESTS_COLLECTION, r.id, 'comments');
      await addDoc(col, { text: t, createdAt: new Date().toISOString() });
      setMemo('');
    } catch (e) {
      alert('메모 등록 중 오류: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--bdr)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <select
          value={r.status || '접수'}
          onChange={e => changeStatus(e.target.value)}
          style={{
            flexShrink: 0, fontSize: '11px', fontWeight: 700,
            padding: '2px 6px', borderRadius: '100px',
            background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
            marginTop: 1, WebkitAppearance: 'none', appearance: 'none',
            cursor: 'pointer', textAlignLast: 'center',
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <div style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.text}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 3 }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {r.createdAt ? r.createdAt.slice(0, 16).replace('T', ' ') : ''}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--sage)', fontWeight: 600 }}>
              {open ? '내부 메모 숨기기 ▲' : '내부 메모 ▼'}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ marginLeft: '34px', marginTop: '10px' }}>
          {notes.length === 0 && (
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '8px' }}>내부 메모가 없어요 (사용자에게는 보이지 않아요)</div>
          )}
          {notes.map(c => (
            <div key={c.id} style={{
              fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5,
              background: 'var(--surf2)', borderRadius: '10px', padding: '8px 10px', marginBottom: '6px',
              boxShadow: 'var(--sh-sm)',
            }}>
              {c.text}
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                {c.createdAt ? c.createdAt.slice(0, 16).replace('T', ' ') : ''}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <input
              className="finp"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
              placeholder="내부 메모 남기기 (사용자에게 보이지 않음)"
              style={{ flex: 1 }}
            />
            <button
              className="bpri"
              style={{ padding: '0 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
              onClick={addNote}
              disabled={sending}
            >등록</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('전체');

  useEffect(() => {
    const db = getDb();
    const col = collection(db, REQUESTS_COLLECTION);
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, []);

  const filtered = filter === '전체' ? requests : requests.filter(r => (r.status || '접수') === filter);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>보듬 · 건의사항 관리</h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
        이 화면은 운영자용이에요. 사용자에게는 이 주소가 안내되지 않아요 — 링크를 다른 사람과 공유하지 마세요.
      </p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {['전체', ...STATUS_OPTIONS].map(opt => (
          <button
            key={opt}
            className={`sbtn${filter === opt ? ' on' : ''}`}
            onClick={() => setFilter(opt)}
          >{opt}{opt !== '전체' ? '' : ` (${requests.length})`}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty"><div className="empty-lbl">해당하는 요청이 없어요</div></div>
      )}

      {filtered.map(r => (
        <AdminRequestItem key={r.id} r={r} />
      ))}
    </div>
  );
}
