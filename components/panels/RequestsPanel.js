'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { getDb, collection, doc, addDoc, updateDoc, query, where, orderBy, onSnapshot } from '../../lib/firebase';
import { fmtFull } from '../../lib/helpers';

const REQUESTS_COLLECTION = 'bodeum_requests';

// 건의사항 게시판 — 예전에는 전체 요청 목록과 댓글을 모든 사용자에게 그대로 보여줬는데,
// 그 문서에 작성자의 familyCode가 같이 저장돼 있어서 평범한 사용자도 다른 가족의 코드를
// 읽고 그 가족의 건강 기록 전체를 열 수 있는 문제가 있었다(정밀 진단 지적 사항).
// 그래서 familyCode 대신, 이 기기에서만 쓰는 익명 ID(submitterId — 다른 데이터와 연결되지
// 않는 무작위 값, 로컬에만 저장)로 "내가 쓴 글"만 걸러서 보여준다. 다른 사람이 쓴 글의
// 전체 목록은 여전히 볼 수 없고(관리자 전용 페이지에서만), 내가 쓴 글의 상태·댓글·수정은
// 이 기기(같은 submitterId)에서 확인할 수 있다.
const SUBMITTER_ID_KEY = 'bodeum_requests_submitter_id';
function getSubmitterId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(SUBMITTER_ID_KEY);
    if (!id) {
      id = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SUBMITTER_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return null;
  }
}

const STATUS_STYLES = {
  '접수':     { bg: 'rgba(125,91,56,.12)',  color: 'var(--cd, #7d5b38)', border: 'rgba(125,91,56,.25)' },
  '처리중':   { bg: 'rgba(61,90,120,.12)',  color: 'var(--cs, #3d5a78)', border: 'rgba(61,90,120,.25)' },
  '처리완료': { bg: 'rgba(127,175,145,.12)', color: 'var(--sage)', border: 'rgba(127,175,145,.25)' },
  '미진행':   { bg: 'rgba(120,120,120,.1)', color: 'var(--muted)', border: 'rgba(120,120,120,.2)' },
  '완료':     { bg: 'rgba(127,175,145,.12)', color: 'var(--sage)', border: 'rgba(127,175,145,.25)' },
};

function MyRequestItem({ r, showToast }) {
  const s = STATUS_STYLES[r.status] || STATUS_STYLES['접수'];
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.text);
  const [saving, setSaving] = useState(false);

  // 펼쳐졌을 때만 관리자 댓글을 구독 — 내 요청 개수만큼 리스너를 항상 열어두지 않기 위함.
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

  function startEdit(e) {
    e.stopPropagation();
    setDraft(r.text);
    setEditing(true);
  }

  async function saveEdit(e) {
    e.stopPropagation();
    const t = draft.trim();
    if (!t) return;
    setSaving(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, REQUESTS_COLLECTION, r.id), {
        text: t,
        updatedAt: new Date().toISOString(),
      });
      setEditing(false);
    } catch (e2) {
      showToast('수정 중 오류가 발생했어요: ' + e2.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--bdr)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{
          flexShrink: 0, fontSize: '11px', fontWeight: 700,
          padding: '2px 8px', borderRadius: '100px',
          background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
          marginTop: 1, whiteSpace: 'nowrap',
        }}>{r.status || '접수'}</span>

        <div style={{ flex: 1 }}>
          {editing ? (
            <div onClick={e => e.stopPropagation()}>
              <textarea
                className="finp"
                rows={3}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{ resize: 'vertical', minHeight: 70, width: '100%', marginBottom: 6 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="bcan" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setEditing(false)}>취소</button>
                <button className="bpri" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveEdit} disabled={saving}>저장</button>
              </div>
            </div>
          ) : (
            <div style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
              <div style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.text}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {r.createdAt ? r.createdAt.slice(0, 10) : ''}
                </span>
                {r.updatedAt && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    (수정됨) · {fmtFull(r.updatedAt)}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: 'var(--sage)', fontWeight: 600 }} onClick={startEdit}>
                  수정 ✎
                </span>
                <span style={{ fontSize: '11px', color: 'var(--sage)', fontWeight: 600 }}>
                  {open ? '답변 숨기기 ▲' : '답변 보기 ▼'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {open && !editing && (
        <div style={{ marginLeft: '48px', marginTop: '10px' }}>
          {comments.length === 0 && (
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>아직 관리자 답변이 없어요</div>
          )}
          {comments.map(c => (
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
        </div>
      )}
    </div>
  );
}

export default function RequestsPanel() {
  const { showToast } = useApp();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [submitterId, setSubmitterId] = useState(null);

  useEffect(() => {
    setSubmitterId(getSubmitterId());
  }, []);

  useEffect(() => {
    if (!submitterId) return;
    const db = getDb();
    const col = collection(db, REQUESTS_COLLECTION);
    // where + orderBy 조합은 복합 색인이 필요할 수 있어, 정렬은 클라이언트에서 처리한다.
    const q = query(col, where('submitterId', '==', submitterId));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setMyRequests(items);
    }, () => {});
    return () => unsub();
  }, [submitterId]);

  async function submit() {
    const t = text.trim();
    if (!t || !submitterId) return;
    setLoading(true);
    try {
      const db = getDb();
      const col = collection(db, REQUESTS_COLLECTION);
      await addDoc(col, {
        text: t,
        status: '접수',
        submitterId,
        createdAt: new Date().toISOString(),
      });
      setText('');
      showToast('요청이 접수됐어요! 소중한 의견 감사해요 🌿');
    } catch (e) {
      showToast('오류가 발생했어요: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: '22px', marginBottom: '8px' }}>기능 요청</h2>
      <p className="setup-hint" style={{ marginBottom: '20px' }}>
        원하는 기능이나 개선사항을 자유롭게 남겨주세요! 다른 사람이 남긴 요청은 볼 수 없고,
        내가 남긴 요청과 그에 대한 답변만 아래에서 확인할 수 있어요.
      </p>

      <div className="fld">
        <div className="flbl">요청 내용</div>
        <textarea
          className="finp"
          rows={5}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="예: 수유량 통계 그래프를 보고 싶어요"
          style={{ resize: 'vertical', minHeight: 110 }}
        />
      </div>
      <button className="bpri" style={{ width: '100%', marginBottom: '28px' }} onClick={submit} disabled={loading || !text.trim()}>
        {loading ? '접수 중...' : '요청 보내기'}
      </button>

      <p className="seclbl" style={{ marginBottom: '12px' }}>내가 보낸 요청</p>

      {myRequests.length === 0 && (
        <div className="empty"><div className="empty-lbl">아직 보낸 요청이 없어요</div></div>
      )}

      {myRequests.map(r => (
        <MyRequestItem key={r.id} r={r} showToast={showToast} />
      ))}
    </>
  );
}
