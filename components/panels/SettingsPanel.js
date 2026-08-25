'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';

export default function SettingsPanel() {
  const { baby, saveBaby, familyCode, launchApp, showToast, goTab } = useApp();

  const [form, setForm] = useState({
    name: '',
    prenatal: '',
    birthDate: '',
    birthTime: '',
    birthWeight: '',
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

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function save() {
    const nb = { ...baby, ...form, name: (form.name || '').trim() || '아이' };
    saveBaby(nb);
    showToast('아이 정보가 저장됐어요 ✓');
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

  return (
    <>
      <h2 className="daytitle" style={{ fontSize:'22px', marginBottom:'20px' }}>설정</h2>

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

      <p className="seclbl" style={{ marginBottom:'10px' }}>가족 코드</p>
      <div className="code-display" style={{ marginBottom:'8px' }}>{familyCode || '—'}</div>
      <p className="setup-hint" style={{ marginBottom:'8px' }}>파트너와 같은 코드를 사용하면 기록이 실시간으로 공유돼요</p>
      <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
        <button className="bcan" style={{ flex:1 }} onClick={copyCode}>코드 복사</button>
        <button className="bcan" style={{ flex:1 }} onClick={changeFamily}>코드 변경</button>
      </div>

      <p className="seclbl" style={{ marginBottom:'10px' }}>기타</p>
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
