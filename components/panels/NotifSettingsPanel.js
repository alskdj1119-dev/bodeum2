'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';

export default function NotifSettingsPanel() {
  const {
    showToast, notifSettings, saveNotifSettings,
    notifPermission, requestNotifPermission, notifEnabled, disableNotif,
  } = useApp();

  const [ns, setNs] = useState({
    diaperAlertH: 3,
    sleepAlertH: 2,
    feedAlertH: 3,
    feedTimerAlertMin: 30,
    hungerRepeatMin: 5,
    quietStart: 23,
    quietEnd: 7,
    quietDisabled: false,
  });

  useEffect(() => {
    if (notifSettings) setNs({ ...notifSettings });
  }, [notifSettings]);

  function setN(k, v) { setNs(p => ({ ...p, [k]: v })); }

  function saveNotif() {
    const parsed = {
      diaperAlertH: Number.isFinite(Number(ns.diaperAlertH)) ? Number(ns.diaperAlertH) : 3,
      sleepAlertH: Number.isFinite(Number(ns.sleepAlertH)) ? Number(ns.sleepAlertH) : 2,
      feedAlertH: Number.isFinite(Number(ns.feedAlertH)) ? Number(ns.feedAlertH) : 3,
      feedTimerAlertMin: Number.isFinite(Number(ns.feedTimerAlertMin)) ? Number(ns.feedTimerAlertMin) : 30,
      hungerRepeatMin: Number.isFinite(Number(ns.hungerRepeatMin)) && Number(ns.hungerRepeatMin) > 0 ? Number(ns.hungerRepeatMin) : 5,
      quietStart: Number(ns.quietStart),
      quietEnd: Number(ns.quietEnd),
      quietDisabled: !!ns.quietDisabled,
    };
    saveNotifSettings(parsed);
    showToast('알림 설정이 저장됐어요 ✓');
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isOn = notifPermission === 'granted' && notifEnabled;
  const isOff = notifPermission === 'granted' && !notifEnabled;

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">알림 설정</span>
      </div>

      {/* 알림 권한 상태 */}
      <div className="sc-static" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="flbl" style={{ marginBottom: 4 }}>기기 알림 권한</div>
          {isOn && (
            <div style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>허용됨 — 아래 알림을 받을 수 있어요 ✓</div>
          )}
          {isOff && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>꺼짐 — 이 기기로는 알림이 오지 않아요.</div>
          )}
          {notifPermission === 'default' && (
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>아직 허용하지 않았어요. 버튼을 눌러 허용해주세요.</div>
          )}
          {notifPermission === 'denied' && (
            <div style={{ fontSize: 13, color: 'var(--cd)' }}>차단됨 — 기기/브라우저 설정에서 이 앱의 알림을 직접 허용해야 해요.</div>
          )}
          {notifPermission === 'unsupported' && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>이 기기/브라우저는 알림을 지원하지 않아요.</div>
          )}
        </div>
        {isOn && (
          <button className="bcan" style={{ padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap' }} onClick={disableNotif}>
            끄기
          </button>
        )}
        {(isOff || notifPermission === 'default') && (
          <button className="bpri" style={{ padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap' }} onClick={requestNotifPermission}>
            알림 허용하기
          </button>
        )}
      </div>

      <div className="sc-static">
        <div className="fld" style={{ marginBottom: 10 }}>
          <div className="flbl">기저귀 경과 알림 (시간)</div>
          <div className="seg">
            {[2, 3, 4, 0].map(h => (
              <button key={h} className={`sbtn${Number(ns.diaperAlertH) === h ? ' on' : ''}`}
                onClick={() => setN('diaperAlertH', h)}>
                {h === 0 ? '끔' : h + '시간'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>마지막 기저귀 교체 후 해당 시간이 지나면 알림</div>
        </div>

        <div className="fld" style={{ marginBottom: 10 }}>
          <div className="flbl">수면 타이머 알림 (시간)</div>
          <div className="seg">
            {[1, 2, 3, 0].map(h => (
              <button key={h} className={`sbtn${Number(ns.sleepAlertH) === h ? ' on' : ''}`}
                onClick={() => setN('sleepAlertH', h)}>
                {h === 0 ? '끔' : h + '시간'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>수면 타이머 시작 후 해당 시간이 지나면 알림</div>
        </div>

        <div className="fld" style={{ marginBottom: 10 }}>
          <div className="flbl">수유 경과 알림 (시간)</div>
          <div className="seg">
            {[2, 3, 4, 0].map(h => (
              <button key={h} className={`sbtn${Number(ns.feedAlertH) === h ? ' on' : ''}`}
                onClick={() => setN('feedAlertH', h)}>
                {h === 0 ? '끔' : h + '시간'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>마지막 수유 후 해당 시간이 지나면 알림</div>
        </div>

        <div className="fld" style={{ marginBottom: 10, opacity: Number(ns.feedAlertH) === 0 ? 0.45 : 1, pointerEvents: Number(ns.feedAlertH) === 0 ? 'none' : 'auto' }}>
          <div className="flbl">배고픔 알림 반복 간격 (분)</div>
          <div className="seg">
            {[5, 10, 15, 30].map(m => (
              <button key={m} className={`sbtn${Number(ns.hungerRepeatMin) === m ? ' on' : ''}`}
                onClick={() => setN('hungerRepeatMin', m)}>
                {m}분마다
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>수유 경과 알림 조건이 계속되는 동안 이 간격으로 반복 알림</div>
        </div>

        <div className="fld" style={{ marginBottom: 10 }}>
          <div className="flbl">수유 타이머 알림 (분)</div>
          <div className="seg">
            {[20, 30, 40, 0].map(m => (
              <button key={m} className={`sbtn${Number(ns.feedTimerAlertMin) === m ? ' on' : ''}`}
                onClick={() => setN('feedTimerAlertMin', m)}>
                {m === 0 ? '끔' : m + '분'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>수유 타이머를 켠 채로 해당 시간이 지나면 알림</div>
        </div>

        <div className="fld" style={{ marginBottom: 10 }}>
          <div className="flbl">방해 금지 시간대</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: ns.quietDisabled ? 0.45 : 1, pointerEvents: ns.quietDisabled ? 'none' : 'auto' }}>
            <select className="finp" style={{ flex: 1 }} value={ns.quietStart} onChange={e => setN('quietStart', Number(e.target.value))}>
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>~</span>
            <select className="finp" style={{ flex: 1 }} value={ns.quietEnd} onChange={e => setN('quietEnd', Number(e.target.value))}>
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ns.quietDisabled} onChange={e => setN('quietDisabled', e.target.checked)} />
            <span style={{ fontSize: 12, color: 'var(--ink)' }}>설정하지 않음 (24시간 알림 수신)</span>
          </label>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {ns.quietDisabled ? '방해 금지 시간대 없이 24시간 알림을 받아요' : '해당 시간대에는 알림이 오지 않아요'}
          </div>
        </div>

        <button className="bpri" style={{ width: '100%', marginTop: 4 }} onClick={saveNotif}>알림 설정 저장</button>
      </div>
    </>
  );
}
