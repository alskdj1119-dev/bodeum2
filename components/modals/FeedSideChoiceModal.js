'use client';
import { useApp } from '../../lib/store';

// 직수(직접 수유) 타이머를 종료했을 때 뜨는 확인 모달 — 보통 한 번에 양쪽 가슴을 다 쓰기 때문에,
// 방금 종료한 쪽 기록은 그대로 두고 반대쪽 타이머를 이어서 시작할지 물어본다.
export default function FeedSideChoiceModal() {
  const { finishFeedSideChoice, continueOtherSideFeed } = useApp();

  return (
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: 'var(--cs)', opacity: 0.7 }} />
        <div className="mtitle">반대쪽 타이머를 시작할까요?</div>
        <div className="mbody">
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0 8px' }}>
            직수는 보통 양쪽을 이어서 진행해요. 이어서 하면 같은 기록에 반대쪽 시간이 함께 저장돼요.
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={finishFeedSideChoice}>종료</button>
          <button className="bpri" style={{ background: 'var(--cs)' }} onClick={continueOtherSideFeed}>이어서 하기</button>
        </div>
      </div>
    </div>
  );
}
