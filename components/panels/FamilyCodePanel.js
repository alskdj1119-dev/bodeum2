'use client';
import { useApp } from '../../lib/store';

export default function FamilyCodePanel() {
  const { familyCode, showToast } = useApp();

  function copyCode() {
    if (!familyCode) return;
    navigator.clipboard.writeText(familyCode)
      .then(() => showToast('코드가 복사됐어요 ✓'))
      .catch(() => showToast(familyCode));
  }

  function changeFamily() {
    if (!window.confirm('다른 가족 코드로 변경하시겠어요?\n현재 기기의 연결이 해제됩니다.')) return;
    try { localStorage.removeItem('bodeum_family_code'); } catch (_) {}
    window.location.reload();
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">가족 코드</span>
      </div>

      <div className="code-display" style={{ marginBottom: '8px' }}>{familyCode || '—'}</div>
      <p className="setup-hint" style={{ marginBottom: '16px' }}>파트너와 같은 코드를 사용하면 기록이 실시간으로 공유돼요</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="bcan" style={{ flex: 1 }} onClick={copyCode}>코드 복사</button>
        <button className="bcan" style={{ flex: 1 }} onClick={changeFamily}>코드 변경</button>
      </div>
    </>
  );
}
