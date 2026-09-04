'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';

// "직전" 카드(수유/기저귀)의 경과시간별 색상 단계 기준을 사용자가 직접 설정하는 화면.
// 분 단위로 입력받아 caution(연한 노랑) < warn(주황) < alert(빨강) 순서로 저장한다.
export default function CardColorSettingsPanel() {
  const { cardColorSettings, saveCardColorSettings, showToast, goTab } = useApp();

  const [cautionMin, setCautionMin] = useState('60');
  const [warnMin, setWarnMin] = useState('120');
  const [alertMin, setAlertMin] = useState('180');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setCautionMin(String(cardColorSettings.cautionMin ?? 60));
    setWarnMin(String(cardColorSettings.warnMin ?? 120));
    setAlertMin(String(cardColorSettings.alertMin ?? 180));
  }, [cardColorSettings]);

  function set(setter) {
    return (e) => { dirtyRef.current = true; setter(e.target.value); };
  }

  const cautionNum = parseFloat(cautionMin) || 0;
  const warnNum = parseFloat(warnMin) || 0;
  const alertNum = parseFloat(alertMin) || 0;

  function save() {
    if (cautionNum <= 0 || warnNum <= 0 || alertNum <= 0) {
      showToast('시간 값을 올바르게 입력해주세요');
      return;
    }
    if (!(cautionNum < warnNum && warnNum < alertNum)) {
      showToast('연한 노랑 < 주황 < 빨강 순서로, 서로 다른 값을 입력해주세요');
      return;
    }
    saveCardColorSettings({ cautionMin: cautionNum, warnMin: warnNum, alertMin: alertNum });
    dirtyRef.current = false;
    showToast('카드 색상 기준이 저장됐어요 ✓');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">카드 색상 설정</span>
      </div>

      <div className="fld">
        <div className="flbl">연한 노랑으로 바뀌는 시점 (분)</div>
        <input className="finp finp-white" type="number" value={cautionMin} onChange={set(setCautionMin)}
          placeholder="60" />
      </div>

      <div className="fld">
        <div className="flbl">주황으로 바뀌는 시점 (분)</div>
        <input className="finp finp-white" type="number" value={warnMin} onChange={set(setWarnMin)}
          placeholder="120" />
      </div>

      <div className="fld">
        <div className="flbl">빨강으로 바뀌는 시점 (분)</div>
        <input className="finp finp-white" type="number" value={alertMin} onChange={set(setAlertMin)}
          placeholder="180" />
      </div>

      <div className="sc-static" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
          홈 화면의 <strong>직전 수유 · 기저귀</strong> 카드는 마지막 기록 후 경과 시간에 따라
          색이 단계적으로 바뀌어요 (기본 → 연한 노랑 → 주황 → 빨강). 여기서 각 단계로 넘어가는
          기준 시간을 분 단위로 직접 정할 수 있어요.
        </div>
      </div>

      <button className="bpri" style={{ width: '100%' }} onClick={save}>저장</button>
    </>
  );
}
