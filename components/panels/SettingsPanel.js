'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';

export default function SettingsPanel() {
  const { baby, saveBaby, familyCode, showToast, goTab, notifSettings, saveNotifSettings } = useApp();

  const [form, setForm] = useState({
    name: '',
    prenatal: '',
    birthDate: '',
    birthTime: '',
    birthWeight: '',
  });

  const [ns, setNs] = useState({
    diaperAlertH: 3,
    sleepAlertH: 2,
    quietStart: 23,
    quietEnd: 7,
  });

  useEffect(() => {
    setForm({
      name: baby.name || '',
      prenatal: baby.prenatal || '',
      birthDate: baby.birthDate || '',
      birthTime: baby.birthTime || '',
      birthWeight: baby.birthWeight || '',
    });
  }, [baby]);

  useEffect(() => {
    if (notifSettings) setNs({ ...notifSettings });
  }, [notifSettings]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setN(k, v) { setNs(p => ({ ...p, [k]: v })); }

  function save() {
    const nb = { ...baby, ...form, name: (form.name || '').trim() || '아이' };
    saveBaby(nb);
    showToast('아이 정보가 저장됐어요 ✓');
  }

  function saveNotif() {
    const parsed = {
      diaperAlertH: Number(ns.diaperAlertH) || 3,
      sleepAlertH: Number(ns.sleepAlertH) || 2,
      quietStart: Number(ns.quietStart),
      quietEnd: Number(ns.quietEnd),
    };
    saveNotifSettings(parsed);
    showToast('알림 설정이 저장됐어요 ✓');
  }

  function copyCode() {
    if (!familyCode) return;
    navigator.clipboard.writeText(familyCode)
      .then(() => showToast('코드가 복사됐어요 ✓'))
      .catch(() => showToast(familyCode));
  }

  function changeFamily() {
    if (!window.confirm('다른 가족 코드로 변경하시겠어요?\n현재 기기의 연결이 해제됩니다.')) return;
    try { localStorage.removeItem('bodeum_family_code'); } catch(_) {}
    window.location.reload();
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      <h2 className="daytitle" style={{ fontSize:'22px', marginBottom:'20px' }}>설정</h2>

      {/* ─── 아이 정보 ─── */}
      <div className="fld">
        <div className="flbl">이름</div>
        <input className="finp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="아기 이름" />
      </div>
      <div className="fld">
        <div className="flbl">태명</div>
        <input className="finp" value={form.prenatal} onChange={e => set('prenatal', e.target.value)} placeholder="태명 (선택)" />
      </div>
      <div className="fld">
        <div className="flbl">생년월일</div>
        <input className="finp" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 시간</div>
        <input className="finp" type="time" value={form.birthTime} onChange={e => set('birthTime', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 체중 (kg)</div>
        <input className="finp" type="number" step="0.001" value={form.birthWeight} onChange={e => set('birthWeight', e.target.value)} placeholder="예: 3.250" />
      </div>
      <button className="bpri" style={{ width:'100%', marginBottom:'24px' }} onClick={save}>아이 정보 저장</button>

      {/* ─── 가족 코드 ─── */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>가족 코드</p>
      <div className="code-display" style={{ marginBottom:'8px' }}>{familyCode || '—'}</div>
      <p className="setup-hint" style={{ marginBottom:'8px' }}>파트너와 같은 코드를 사용하면 기록이 실시간으로 공유돼요</p>
      <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
        <button className="bcan" style={{ flex:1 }} onClick={copyCode}>코드 복사</button>
        <button className="bcan" style={{ flex:1 }} onClick={changeFamily}>코드 변경</button>
      </div>

      {/* ─── 알림 설정 ─── */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>알림 설정</p>
      <div className="sc" style={{ marginBottom: 20 }}>
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
          <div className="flbl">조용한 시간대 (방해 금지)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select className="finp" style={{ flex: 1 }} value={ns.quietStart} onChange={e => setN('quietStart', Number(e.target.value))}>
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>~</span>
            <select className="finp" style={{ flex: 1 }} value={ns.quietEnd} onChange={e => setN('quietEnd', Number(e.target.value))}>
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>해당 시간대에는 알림이 오지 않아요</div>
        </div>

        <button className="bpri" style={{ width: '100%', marginTop: 4 }} onClick={saveNotif}>알림 설정 저장</button>
      </div>

      {/* ─── 메뉴 ─── */}
      <p className="seclbl" style={{ marginBottom:'10px' }}>기타</p>
      <button className="settmenu" onClick={() => goTab('stats', 'forward')}>
        <div className="settmenu-ico" style={{ background:'var(--fw)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--cf)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">통계 분석</div>
          <div className="settmenu-sub">수유·수면·기저귀 패턴 분석</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
      <button className="settmenu" onClick={() => goTab('health', 'forward')}>
        <div className="settmenu-ico" style={{ background:'#FFF0EE' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#E05A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/>
            <circle cx="12" cy="7" r="2"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">건강 기록</div>
          <div className="settmenu-sub">체온 기록 및 예방접종 스케줄</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
      <button className="settmenu" onClick={() => goTab('changelog', 'forward')}>
        <div className="settmenu-ico" style={{ background:'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">업데이트 내역</div>
          <div className="settmenu-sub">새로운 기능과 개선사항</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
      <button className="settmenu" onClick={() => goTab('requests', 'forward')}>
        <div className="settmenu-ico" style={{ background:'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">기능 요청 / 건의사항</div>
          <div className="settmenu-sub">원하는 기능을 알려주세요</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
    </>
  );
}
