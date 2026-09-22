'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import { getDb, collection, addDoc } from '../../lib/firebase';

const REQUESTS_COLLECTION = 'bodeum_requests';

// 건의사항 게시판 — 이전에는 전체 요청 목록과 댓글을 모든 사용자에게 그대로 보여줬는데,
// 그 문서에 작성자의 familyCode가 같이 저장돼 있어서 평범한 사용자도 다른 가족의 코드를
// 읽고 그 가족의 건강 기록 전체를 열 수 있는 문제가 있었다(정밀 진단 지적 사항).
// 그래서 사용자 화면에서는 "작성"만 가능하게 하고(목록/댓글 비공개), familyCode도 아예
// 저장하지 않도록 바꿨다. 접수된 내용은 별도의(공개되지 않은) 관리자 페이지에서만 확인한다.
export default function RequestsPanel() {
  const { showToast } = useApp();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

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
        원하는 기능이나 개선사항을 자유롭게 남겨주세요! 보내주신 내용은 운영자만 확인해요.
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
      <button className="bpri" style={{ width: '100%' }} onClick={submit} disabled={loading || !text.trim()}>
        {loading ? '접수 중...' : '요청 보내기'}
      </button>
    </>
  );
}
