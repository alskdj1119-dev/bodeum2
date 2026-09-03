'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { getDb, collection, doc, addDoc, updateDoc, query, orderBy, onSnapshot } from '../../lib/firebase';

const REQUESTS_COLLECTION = 'bodeum_requests';

const STATUS_OPTIONS = ['접수', '처리중', '처리완료', '미진행'];

const STATUS_STYLES = {
  '접수':   { bg:'rgba(125,91,56,.12)',  color:'var(--cd)', border:'rgba(125,91,56,.25)' },
  '처리중': { bg:'rgba(61,90,120,.12)',  color:'var(--cs)', border:'rgba(61,90,120,.25)' },
  '처리완료': { bg:'rgba(127,175,145,.12)', color:'var(--sage)', border:'rgba(127,175,145,.25)' },
  '미진행': { bg:'rgba(120,120,120,.1)', color:'var(--muted)', border:'rgba(120,120,120,.2)' },
  // 예전에 저장된 문서에 남아있을 수 있는 옛 상태값('완료') 호환용
  '완료':   { bg:'rgba(127,175,145,.12)', color:'var(--sage)', border:'rgba(127,175,145,.25)' },
};

function RequestItem({ r, familyCode, showToast }) {
  const s = STATUS_STYLES[r.status] || STATUS_STYLES['접수'];
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // 펼쳐졌을 때만 코멘트를 구독 — 목록에 있는 요청마다 항상 리스너를 열어두지 않기 위함.
  useEffect(() => {
    if (!open) return;
    const db = getDb();
    const col = collection(db, REQUESTS_COLLECTION, r.id, 'comments');
    const q = query(col, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [open, r.id]);

  async function changeStatus(status) {
    try {
      const db = getDb();
      await updateDoc(doc(db, REQUESTS_COLLECTION, r.id), { status });
    } catch (e) {
      showToast('상태 변경 중 오류가 발생했어요: ' + e.message);
    }
  }

  async function sendComment() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const db = getDb();
      const col = collection(db, REQUESTS_COLLECTION, r.id, 'comments');
      await addDoc(col, {
        text: t,
        familyCode: familyCode || '',
        createdAt: new Date().toISOString(),
      });
      setText('');
    } catch (e) {
      showToast('코멘트 등록 중 오류가 발생했어요: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding:'12px 0', borderBottom:'1px solid var(--line)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
        <select
          value={r.status || '접수'}
          onChange={e => changeStatus(e.target.value)}
          style={{
            flexShrink:0, fontSize:'11px', fontWeight:700,
            padding:'2px 6px', borderRadius:'100px',
            background:s.bg, color:s.color, border:`1.5px solid ${s.border}`,
            marginTop:1, WebkitAppearance:'none', appearance:'none',
            cursor:'pointer', textAlignLast:'center',
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div style={{ flex:1, cursor:'pointer' }} onClick={() => setOpen(o => !o)}>
          <div style={{ fontSize:'14px', color:'var(--ink)', lineHeight:1.5 }}>{r.text}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:3 }}>
            <span style={{ fontSize:'11px', color:'var(--muted)' }}>
              {r.createdAt ? r.createdAt.slice(0,10) : ''}
            </span>
            <span style={{ fontSize:'11px', color:'var(--sage)', fontWeight:600 }}>
              {open ? '댓글 숨기기 ▲' : '댓글 달기 ▼'}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ marginLeft:'34px', marginTop:'10px' }}>
          {comments.length === 0 && (
            <div style={{ fontSize:'12.5px', color:'var(--muted)', marginBottom:'8px' }}>아직 댓글이 없어요</div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{
              fontSize:'13px', color:'var(--ink)', lineHeight:1.5,
              background:'var(--surf2)', borderRadius:'10px', padding:'8px 10px', marginBottom:'6px',
            }}>
              {c.text}
              <div style={{ fontSize:'10.5px', color:'var(--muted)', marginTop:'2px' }}>
                {c.createdAt ? c.createdAt.slice(0,16).replace('T', ' ') : ''}
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:'6px', marginTop:'6px' }}>
            <input
              className="finp"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendComment(); }}
              placeholder="댓글을 남겨보세요"
              style={{ flex:1 }}
            />
            <button
              className="bpri"
              style={{ padding:'0 16px', fontSize:'13px', whiteSpace:'nowrap' }}
              onClick={sendComment}
              disabled={sending}
            >등록</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestsPanel() {
  const { showToast, familyCode } = useApp();
  const [requests, setRequests] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const db = getDb();
    const col = collection(db, REQUESTS_COLLECTION);
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(items);
    }, () => {});
    return () => unsub();
  }, []);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    try {
      const db = getDb();
      const col = collection(db, REQUESTS_COLLECTION);
      await addDoc(col, {
        text: t,
        status: '접수',
        familyCode: familyCode || '',
        createdAt: new Date().toISOString(),
      });
      setText('');
      showToast('요청이 접수됐어요!');
    } catch (e) {
      showToast('오류가 발생했어요: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="daytitle" style={{ fontSize:'22px', marginBottom:'8px' }}>기능 요청</h2>
      <p className="setup-hint" style={{ marginBottom:'20px' }}>원하는 기능이나 개선사항을 자유롭게 남겨주세요!</p>

      <div className="fld">
        <div className="flbl">요청 내용</div>
        <textarea
          className="finp"
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="예: 수유량 통계 그래프를 보고 싶어요"
          style={{ resize:'vertical', minHeight:80 }}
        />
      </div>
      <button className="bpri" style={{ width:'100%', marginBottom:'28px' }} onClick={submit} disabled={loading}>
        {loading ? '접수 중...' : '요청 보내기'}
      </button>

      <p className="seclbl" style={{ marginBottom:'12px' }}>전체 요청 목록</p>

      {requests.length === 0 && (
        <div className="empty"><div className="empty-lbl">아직 요청이 없어요</div></div>
      )}

      {requests.map(r => (
        <RequestItem key={r.id} r={r} familyCode={familyCode} showToast={showToast} />
      ))}
    </>
  );
}
