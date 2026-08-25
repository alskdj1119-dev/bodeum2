'use client';

const CHANGELOG = [
  {
    version: '1.4.0',
    date: '2025-08-20',
    items: [
      '기능 요청 게시판 추가',
      '체중 차트 개선',
      '다크모드 색상 보정',
    ],
  },
  {
    version: '1.3.0',
    date: '2025-07-15',
    items: [
      '수면 기록에 장소 필드 추가 (침대/품/원형쿠션)',
      '홈 화면 통계 카드 추가',
      '수유 타이머 안정화',
    ],
  },
  {
    version: '1.2.0',
    date: '2025-06-10',
    items: [
      '푸시 알림 기능 추가',
      '오프라인 캐시 지원',
      '가족 코드 공유 기능',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-05-01',
    items: [
      '분유/모유 구분 기록',
      '기저귀 색상 기록',
      '최근 기록 타임라인',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-04-01',
    items: [
      '초기 출시',
      '수유·기저귀·수면·체중 기록',
      '파이어베이스 실시간 동기화',
    ],
  },
];

export default function ChangelogPanel() {
  return (
    <>
      <h2 className="daytitle" style={{ fontSize:'22px', marginBottom:'20px' }}>업데이트 내역</h2>

      {CHANGELOG.map(entry => (
        <div key={entry.version} style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:'var(--ink)' }}>v{entry.version}</span>
            <span style={{ fontSize:'12px', color:'var(--muted)' }}>{entry.date}</span>
          </div>
          <ul style={{ margin:0, paddingLeft:'18px', listStyle:'disc' }}>
            {entry.items.map((item, i) => (
              <li key={i} style={{ fontSize:'14px', color:'var(--sub)', lineHeight:1.7 }}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
