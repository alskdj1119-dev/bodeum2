'use client';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useApp } from '../../lib/store';

const TYPE_COLOR = { bottle: 'var(--cd)', pumped: 'var(--cf)' };

// 직수 타이머가 완전히 끝난 직후 뜨는 "보충수유 하실 건가요?" 프롬프트.
// "네"를 누르면 분유/유축 중 하나를 고르고 준비량을 입력받아 바로 그 타이머를 시작한다 —
// 이렇게 시작된 기록은 방금 끝난 직수 기록과 같은 groupId로 연결되어, 목록에는
// 하나의 "수유 세션"으로 합쳐서 보인다(lib/helpers.js의 groupFeedsForDisplay 참고).
export default function SupplementPromptModal() {
  const { startSupplementFeed, dismissSupplementPrompt } = useApp();
  // 'ask' — 보충수유 할지 물어보는 1단계, 'amount' — 종류/준비량 입력하는 2단계
  const [step, setStep] = useState('ask');
  const [kind, setKind] = useState('bottle'); // 'bottle' | 'pumped'
  const [amount, setAmount] = useState('');

  function start() {
    if (!amount || Number.isNaN(parseFloat(amount))) return;
    const type = kind === 'bottle' ? 'bottle' : 'breast';
    const subtype = kind === 'pumped' ? 'pumped' : undefined;
    startSupplementFeed(type, subtype, amount);
  }

  if (step === 'ask') {
    return createPortal(
      <div className="mbg open">
        <div className="msheet" onClick={e => e.stopPropagation()}>
          <div className="mhandle" style={{ background: 'var(--cs)', opacity: 0.7 }} />
          <div className="mtitle">보충수유 하실 건가요?</div>
          <div className="mbody">
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0 8px' }}>
              직수로 모자랐던 양을 분유나 유축으로 보충하실 거면, 바로 이어서 타이머를 시작할게요.
              이 기록은 방금 끝난 직수와 하나의 수유로 묶여서 보여요.
            </div>
          </div>
          <div className="mfoot">
            <button className="bcan" onClick={dismissSupplementPrompt}>아니요</button>
            <button className="bpri" style={{ background: 'var(--cs)' }} onClick={() => setStep('amount')}>네, 시작할게요</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="mbg open">
      <div className="msheet" onClick={e => e.stopPropagation()}>
        <div className="mhandle" style={{ background: TYPE_COLOR[kind], opacity: 0.7 }} />
        <div className="mtitle">보충수유 시작</div>
        <div className="mbody">
          <div className="fld">
            <div className="flbl">종류</div>
            <div className="seg">
              <button className={`sbtn${kind === 'bottle' ? ' on' : ''}`}
                style={kind === 'bottle' ? { background: TYPE_COLOR.bottle, borderColor: TYPE_COLOR.bottle } : {}}
                onClick={() => setKind('bottle')}>분유</button>
              <button className={`sbtn${kind === 'pumped' ? ' on' : ''}`}
                style={kind === 'pumped' ? { background: TYPE_COLOR.pumped, borderColor: TYPE_COLOR.pumped } : {}}
                onClick={() => setKind('pumped')}>유축</button>
            </div>
          </div>
          <div className="fld">
            <div className="flbl">준비량 (ml) <span>· 필수</span></div>
            <input className="finp" type="number" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="예: 40" autoFocus />
          </div>
        </div>
        <div className="mfoot">
          <button className="bcan" onClick={dismissSupplementPrompt}>취소</button>
          <button className="bpri" style={{ background: TYPE_COLOR[kind], flex: 1 }} onClick={start} disabled={!amount}>타이머 시작</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
