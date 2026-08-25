'use client';

const CHANGELOG = [
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
