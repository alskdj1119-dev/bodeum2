'use client';
import { HANDOFF_ROLES } from '../lib/helpers';

// 이 기기를 쓰는 사람의 역할(엄마/아빠/가족/도우미/기타)을 고르는 칩 줄.
// 처음 설정 화면(OnboardingGate)과 설정 > 아이 정보 안에서 같이 쓴다.
export default function RolePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {HANDOFF_ROLES.map((r) => {
        const on = value === r.key;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onChange(r.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '100px',
              border: '1.5px solid var(--sage)', background: on ? 'var(--sage)' : 'var(--surf)',
              color: on ? '#fff' : 'var(--sage)', fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', boxShadow: 'var(--sh-sm)',
            }}
          >
            <span>{r.emoji}</span>{r.label}
          </button>
        );
      })}
    </div>
  );
}
