'use client';
import { useApp } from '../../lib/store';
import { HANDOFF_ROLES } from '../../lib/helpers';

// "잘 부탁해 메모"를 주고받을 때 이 기기가 어떤 역할인지 고르는 화면.
// 이름을 직접 입력하는 대신 정해진 역할(엄마/아빠/가족/도우미/기타) 중에서만 고르게 해서,
// 메모를 보낼 때도 같은 역할 목록 안에서 대상을 지정하고 서버가 그 역할의 기기로만 푸시를 보낼 수 있다.
export default function MyRoleSettingsPanel() {
  const { myRole, saveMyRole } = useApp();

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">내 역할 (잘 부탁해 메모)</span>
      </div>

      <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '18px' }}>
        이 기기를 쓰는 사람의 역할을 골라두면, "잘 부탁해 메모"를 남기거나 받을 때 이 역할로 구분돼요.
        메모를 남길 때는 이 목록 안에서 받을 사람을 고르게 되고, 그 역할로 등록된 기기에만 알림이 가요.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {HANDOFF_ROLES.map((r) => {
          const on = myRole === r.key;
          return (
            <button
              key={r.key}
              onClick={() => saveMyRole(r.key)}
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

      {!myRole && (
        <p style={{ fontSize: '12px', color: 'var(--warn)', marginTop: '16px', lineHeight: '1.5' }}>
          아직 역할을 고르지 않았어요 — 역할을 고르기 전엔 "잘 부탁해 메모"를 남길 수 없어요.
        </p>
      )}
    </>
  );
}
