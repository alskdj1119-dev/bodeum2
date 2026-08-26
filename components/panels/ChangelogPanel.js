'use client';

const CHANGELOG = [
  {
    version: '1.6.0',
    date: '2026-08-26',
    items: [
      { tag: 'change', text: '설정 메뉴 개편 — 아이 정보 / 가족 코드 / 알림 설정을 각각 별도 화면으로 분리' },
      { tag: 'new', text: '알림 내역을 홈 화면 우측 상단 종 모양 아이콘으로 이동' },
      { tag: 'new', text: '브라우저 알림 허용 후에도 앱 안에서 알림을 껐다 켤 수 있는 기능 추가' },
      { tag: 'fix', text: '아이 정보 입력란 배경을 흰색으로 통일' },
      { tag: 'fix', text: '홈 화면 카드 여백을 줄여 더 촘촘하게 보이도록 개선' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-26',
    items: [
      { tag: 'new', text: '설정 > 알림 내역 메뉴 추가 (실제 발송된 알림 확인)' },
      { tag: 'new', text: '개발/운영 환경 분리 (안정성 개선)' },
      { tag: 'fix', text: '배고픔 알림 경과 시간 표기 오류 수정' },
      { tag: 'fix', text: '체온/체중 기록 삭제 시 복원 불가능하던 문제 수정 (삭제 기록에서 복원 가능하도록 통일)' },
      { tag: 'fix', text: '예방접종 체크 상태가 기기별로 따로 저장되던 문제 수정 (가족 간 동기화)' },
      { tag: 'fix', text: '사용하지 않는 중복 코드 정리' },
    ],
  },
  {
    version: '1.4.0',
    date: '2025-08-20',
    items: [
      { tag: 'new', text: '기능 요청 게시판 추가' },
      { tag: 'fix', text: '체중 차트 개선' },
      { tag: 'fix', text: '다크모드 색상 보정' },
    ],
  },
  {
    version: '1.3.0',
    date: '2025-07-15',
    items: [
      { tag: 'new', text: '수면 기록에 장소 필드 추가 (침대/품/원형쿠션)' },
      { tag: 'new', text: '홈 화면 통계 카드 추가' },
      { tag: 'fix', text: '수유 타이머 안정화' },
    ],
  },
  {
    version: '1.2.0',
    date: '2025-06-10',
    items: [
      { tag: 'new', text: '푸시 알림 기능 추가' },
      { tag: 'new', text: '오프라인 캐시 지원' },
      { tag: 'new', text: '가족 코드 공유 기능' },
    ],
  },
  {
    version: '1.1.0',
    date: '2025-05-01',
    items: [
      { tag: 'new', text: '분유/모유 구분 기록' },
      { tag: 'new', text: '기저귀 색상 기록' },
      { tag: 'new', text: '최근 기록 타임라인' },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-04-01',
    items: [
      { tag: 'new', text: '초기 출시' },
      { tag: 'new', text: '수유·기저귀·수면·체중 기록' },
      { tag: 'new', text: '파이어베이스 실시간 동기화' },
    ],
  },
];

const TAG_COLORS = {
  new: { bg: 'var(--sage)', color: '#fff' },
  fix: { bg: 'var(--s-wash)', color: 'var(--sage)' },
};

export default function ChangelogPanel() {
  return (
    <>
      <h2 className="daytitle" style={{ fontSize:'22px', marginBottom:'20px' }}>업데이트 내역</h2>

      {CHANGELOG.map(entry => (
        <div key={entry.version} className="clver">
          <div className="clver-hdr">
            <span className="clver-badge">v{entry.version}</span>
            <span className="clver-date">{entry.date}</span>
          </div>
          {entry.items.map((item, i) => {
            const tc = TAG_COLORS[item.tag] || TAG_COLORS.new;
            return (
              <div key={i} className="clver-item">
                <span className="clver-tag" style={{ background: tc.bg, color: tc.color }}>
                  {item.tag === 'new' ? 'NEW' : 'FIX'}
                </span>
                {item.text}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
