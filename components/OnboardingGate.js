'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import DateTimePicker from './DateTimePicker';
import RolePicker from './RolePicker';

const GENDER_OPTS = [
  { code: '',     label: '미설정' },
  { code: 'boy',  label: '남아' },
  { code: 'girl', label: '여아' },
];

// 가족 코드로 접속한 직후 "아이 정보"와 "내 역할"이 없으면 앱을 쓰기 전에 반드시 채우게 하는 전체 화면.
//  - 아이 정보: 가족 문서에 등록된 아이가 하나도 없을 때만 (파트너가 이미 등록해뒀다면 건너뜀)
//  - 내 역할: 이 기기에 저장된 역할이 없을 때 (역할은 기기마다 따로 정한다)
// 역할이 없으면 기록이 저장되지 않으므로, 이 화면이 닫히기 전엔 아무 기록도 남길 수 없다.
export default function OnboardingGate({ needsBaby, needsRole }) {
  const { saveBaby, saveMyRole, showToast } = useApp();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);

  const babyOk = !needsBaby || (name.trim() && birthDate);
  const roleOk = !needsRole || !!role;
  const ready = babyOk && roleOk;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    if (needsBaby) {
      saveBaby({ id: null, name: name.trim(), prenatal: '', birthDate, birthTime: '', birthWeight: '', gender });
    }
    if (needsRole) await saveMyRole(role);
    setBusy(false);
    showToast('설정이 완료됐어요');
  }

  return (
    <div className="setup-ov" style={{ overflowY: 'auto', alignItems: 'flex-start' }}>
      <div className="setup-card" style={{ margin: 'auto', padding: '32px 24px 24px' }}>
        <div className="setup-logo" style={{ marginBottom: 20 }}>
          <span className="setup-title">처음 설정</span>
          <span className="setup-sub">
            {needsBaby ? '아이 정보와 내 역할을 알려주세요' : '이 기기에서 기록하는 사람을 알려주세요'}
          </span>
        </div>

        {needsBaby && (
          <>
            <div className="fld">
              <div className="flbl">아이 이름 <span style={{ color: 'var(--cd)' }}>*</span></div>
              <input className="finp finp-white" value={name} onChange={e => setName(e.target.value)} placeholder="아기 이름" />
            </div>
            <div className="fld">
              <div className="flbl">성별</div>
              <div className="seg">
                {GENDER_OPTS.map(opt => (
                  <button key={opt.code || 'none'} className={`sbtn${gender === opt.code ? ' on' : ''}`}
                    onClick={() => setGender(opt.code)}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="fld">
              <div className="flbl">생년월일 <span style={{ color: 'var(--cd)' }}>*</span></div>
              <DateTimePicker mode="date" className="finp-white" value={birthDate} onChange={setBirthDate} />
            </div>
          </>
        )}

        {needsRole && (
          <div className="fld">
            <div className="flbl">내 역할 <span style={{ color: 'var(--cd)' }}>*</span></div>
            <RolePicker value={role} onChange={setRole} />
            <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, margin: '10px 2px 0' }}>
              기록할 때 기록자로 자동 저장되고, "잘 부탁해 메모"도 이 역할로 주고받아요. 나중에 설정 &gt; 아이 정보에서 바꿀 수 있어요.
            </p>
          </div>
        )}

        <button className="bpri setup-start-btn" style={{ marginTop: 8, marginBottom: 0 }} onClick={submit} disabled={!ready || busy}>
          시작하기
        </button>
      </div>
    </div>
  );
}
