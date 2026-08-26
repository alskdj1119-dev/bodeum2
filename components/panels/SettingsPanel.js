'use client';
import { useApp } from '../../lib/store';

export default function SettingsPanel() {
  const { goTab } = useApp();

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: '22px', marginBottom: '18px' }}>설정</h2>

      <button className="settmenu" onClick={() => goTab('babyInfo', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">아이 정보</div>
          <div className="settmenu-sub">이름, 태명, 생년월일, 출생 체중</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>

      <button className="settmenu" onClick={() => goTab('familyCode', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">가족 코드</div>
          <div className="settmenu-sub">파트너와 기록 실시간 공유</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>

      <button className="settmenu" onClick={() => goTab('notifSettings', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">알림 설정</div>
          <div className="settmenu-sub">알림 권한, 경과 시간 기준</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>

      <p className="seclbl" style={{ margin: '18px 0 10px' }}>기타</p>

      <button className="settmenu" onClick={() => goTab('changelog', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">업데이트 내역</div>
          <div className="settmenu-sub">새로운 기능과 개선사항</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
      <button className="settmenu" onClick={() => goTab('requests', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--s-wash)' }}>
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">기능 요청 / 건의사항</div>
          <div className="settmenu-sub">원하는 기능을 알려주세요</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
      <button className="settmenu" onClick={() => goTab('trash', 'forward')}>
        <div className="settmenu-ico" style={{ background: 'var(--dw)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--cd)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <div className="settmenu-inf">
          <div className="settmenu-title">삭제 기록</div>
          <div className="settmenu-sub">삭제된 기록 확인 및 개별 복원</div>
        </div>
        <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
    </>
  );
}
