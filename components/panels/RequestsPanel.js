'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { getDb, collection, addDoc, query, orderBy, onSnapshot } from '../../lib/firebase';

const REQUESTS_COLLECTION = 'bodeum_requests';

const STATUS_STYLES = {
  '접수':  { bg:'rgba(125,91,56,.12)',  color:'var(--cd)', border:'rgba(125,91,56,.25)' },
  '처리중': { bg:'rgba(61,90,120,.12)',  color:'var(--cs)', border:'rgba(61,90,120,.25)' },
  '완료':  { bg:'rgba(120,120,120,.1)', color:'var(--muted)', border:'rgba(120,120,120,.2)' },
};

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

      {requests.map(r => {
        const s = STATUS_STYLES[r.status] || STATUS_STYLES['접수'];
        return (
          <div key={r.id} style={{
            display:'flex', alignItems:'flex-start', gap:'10px',
            padding:'12px 0', borderBottom:'1px solid var(--line)'
          }}>
            <span style={{
              flexShrink:0, fontSize:'11px', fontWeight:700,
              padding:'2px 8px', borderRadius:'100px',
              background:s.bg, color:s.color, border:`1.5px solid ${s.border}`,
              marginTop:2,
            }}>{r.status || '접수'}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', color:'var(--ink)', lineHeight:1.5 }}>{r.text}</div>
              <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:3 }}>
                {r.createdAt ? r.createdAt.slice(0,10) : ''}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
