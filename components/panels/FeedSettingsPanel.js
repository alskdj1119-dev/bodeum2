'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';

// 직수(직접 수유) 섭취량 계산 기준을 사용자가 직접 설정하는 화면.
// "OO분 = OOml" 형태로 입력받아 1분당 ml(rate)로 환산해 저장한다.
// 기본값은 "15분 = 40ml" 기준.
export default function FeedSettingsPanel() {
  const { feedSettings, saveFeedSettings, showToast, goTab } = useApp();

  const [minutes, setMinutes] = useState('15');
  const [ml, setMl] = useState('40');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    const rate = feedSettings.directFeedRateMlPerMin || (40 / 15);
    // 저장돼 있는 건 "1분당 ml"뿐이라, 보기 좋은 기본 분 단위(15분)를 기준으로 역산해서 보여준다.
    setMinutes('15');
    setMl((rate * 15).toFixed(1).replace(/\.0$/, ''));
  }, [feedSettings]);

  function set(setter) {
    return (e) => { dirtyRef.current = true; setter(e.target.value); };
  }

  const minutesNum = parseFloat(minutes) || 0;
  const mlNum = parseFloat(ml) || 0;
  const currentRate = minutesNum > 0 ? mlNum / minutesNum : 0;

  function save() {
    if (minutesNum <= 0 || mlNum <= 0) {
      showToast('분/ml 값을 올바르게 입력해주세요');
      return;
    }
    saveFeedSettings({ directFeedRateMlPerMin: mlNum / minutesNum });
    dirtyRef.current = false;
    showToast('직수 계산 기준이 저장됐어요 ✓');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">직수 계산 설정</span>
      </div>

      <div className="fld">
        <div className="flbl">직수 섭취량 계산 기준</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="finp finp-white" type="number" value={minutes} onChange={set(setMinutes)}
            style={{ textAlign: 'center' }} placeholder="15" />
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>분 =</span>
          <input className="finp finp-white" type="number" value={ml} onChange={set(setMl)}
            style={{ textAlign: 'center' }} placeholder="40" />
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>ml</span>
        </div>
      </div>

      <div className="sc-static" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
          직수 섭취량은 <strong>{minutesNum || 'OO'}분</strong> 유축 시 나오는 양을 기준으로 보면 돼요.
        </div>
        {currentRate > 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            → 1분당 약 {currentRate.toFixed(2)}ml로 계산돼요 (홈/수유 기록/통계 등 모든 곳에 동일하게 적용)
          </div>
        )}
      </div>

      <button className="bpri" style={{ width: '100%' }} onClick={save}>저장</button>

      <button
        onClick={() => goTab('recalcFeeds', 'forward')}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '100px',
          border: '1.5px solid var(--sage)',
          background: 'transparent',
          color: 'var(--sage)',
          cursor: 'pointer',
        }}
      >
        기존 기록 다시 계산하기
      </button>
    </>
  );
}
