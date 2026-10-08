'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';

// 직전 카드는 색을 바꾸지 않고, 경과 시간에 따라 브리딩 속도만 정한다.
export default function CardColorSettingsPanel() {
  const { cardColorSettings, saveCardColorSettings, showToast } = useApp();

  const [breathMin, setBreathMin] = useState('120');
  const [breathSec, setBreathSec] = useState('4.5');
  const [fastMin, setFastMin] = useState('180');
  const [fastSec, setFastSec] = useState('2.2');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setBreathMin(String(cardColorSettings.breathMin ?? cardColorSettings.warnMin ?? 120));
    setBreathSec(String(cardColorSettings.breathSec ?? 4.5));
    setFastMin(String(cardColorSettings.fastMin ?? cardColorSettings.alertMin ?? 180));
    setFastSec(String(cardColorSettings.fastSec ?? 2.2));
  }, [cardColorSettings]);

  function set(setter) {
    return (e) => { dirtyRef.current = true; setter(e.target.value); };
  }

  const breathMinNum = parseFloat(breathMin) || 0;
  const breathSecNum = parseFloat(breathSec) || 0;
  const fastMinNum = parseFloat(fastMin) || 0;
  const fastSecNum = parseFloat(fastSec) || 0;

  function save() {
    if (breathMinNum <= 0 || fastMinNum <= 0 || breathSecNum <= 0 || fastSecNum <= 0) {
      showToast('시간 값을 올바르게 입력해주세요');
      return;
    }
    if (!(breathMinNum < fastMinNum)) {
      showToast('빠른 브리딩은 시작 브리딩보다 더 지난 뒤에 오게 해주세요');
      return;
    }
    if (!(fastSecNum < breathSecNum)) {
      showToast('빠른 브리딩은 초 간격이 더 짧아야 해요');
      return;
    }
    saveCardColorSettings({ breathMin: breathMinNum, breathSec: breathSecNum, fastMin: fastMinNum, fastSec: fastSecNum });
    dirtyRef.current = false;
    showToast('브리딩 속도가 저장됐어요 ✓');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">브리딩 속도</span>
      </div>

      <div className="fld">
        <div className="flbl">브리딩이 시작되는 경과 (분)</div>
        <input className="finp finp-white" type="number" value={breathMin} onChange={set(setBreathMin)} placeholder="120" />
      </div>
      <div className="fld">
        <div className="flbl">그때 한 번 숨 쉬는 시간 (초)</div>
        <input className="finp finp-white" type="number" step="0.1" value={breathSec} onChange={set(setBreathSec)} placeholder="4.5" />
      </div>

      <div className="fld">
        <div className="flbl">더 빨라지는 경과 (분)</div>
        <input className="finp finp-white" type="number" value={fastMin} onChange={set(setFastMin)} placeholder="180" />
      </div>
      <div className="fld">
        <div className="flbl">그때 한 번 숨 쉬는 시간 (초)</div>
        <input className="finp finp-white" type="number" step="0.1" value={fastSec} onChange={set(setFastSec)} placeholder="2.2" />
      </div>

      <div className="sc-static" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
          홈의 <strong>직전 수유 · 기저귀</strong> 카드는 색을 바꾸지 않아요.
          기본은 2시간부터 4.5초마다, 3시간부터 2.2초마다 원래 색으로 천천히 밝아졌다 어두워져요.
        </div>
      </div>

      <button className="bpri" style={{ width: '100%' }} onClick={save}>저장</button>
    </>
  );
}