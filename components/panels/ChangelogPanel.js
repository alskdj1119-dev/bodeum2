'use client';

const CHANGELOG = [
  {
    version: '1.8.3',
    date: '2026-08-27',
    items: [
      { tag: 'change', text: '홈 화면 체중 카드 그래프 — 체중·증감량을 각 점 위에 말풍선(툴팁) 모양으로 항상 표시하고, 점 아래에는 날짜를 표시하도록 변경' },
    ],
  },
  {
    version: '1.8.2',
    date: '2026-08-27',
    items: [
      { tag: 'fix', text: '홈 화면 체중 카드 그래프에서 맨 처음/마지막 날짜의 체중·증감량 라벨이 그래프 밖으로 잘려 보이던 문제 수정 (양 끝 라벨을 안쪽으로 붙는 정렬로 변경)' },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-08-27',
    items: [
      { tag: 'fix', text: '수유/수면 기록 수정 시 종료 시간을 시작 시간보다 이전으로 저장하지 못하도록 저장 전 검증 추가 (자정을 넘기는 기록에서 날짜가 잘못 표시/저장되는 걸 방지)' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-08-27',
    items: [
      { tag: 'fix', text: '홈 화면 "직전" 카드, 수유/기저귀/수면/알림내역/삭제내역 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되지 않고 "방금"에 멈춰있던 문제 수정 — 새 기록이 들어올 때만 화면이 다시 그려져서 생긴 문제로, 30초마다 자동으로 갱신되도록 수정' },
    ],
  },
  {
    version: '1.7.9',
    date: '2026-08-26',
    items: [
      { tag: 'change', text: '홈 화면 체중 카드 그래프 — 하단 고정 요약 박스를 없애고, 그래프 안 각 날짜 점 아래에 그날의 체중/증감량을 바로 표시 (증가는 파란색 ▲, 감소는 빨간색 ▼)' },
    ],
  },
  {
    version: '1.7.8',
    date: '2026-08-26',
    items: [
      { tag: 'change', text: '홈 화면 체중 카드 그래프 — 누르는 동안만 보이던 값을 없애고, 최신 날짜의 체중/증가량을 그래프 아래에 항상 고정 표시 (체중은 검은색, 증가는 파란색 ▲, 감소는 빨간색 ▼)' },
    ],
  },
  {
    version: '1.7.7',
    date: '2026-08-26',
    items: [
      { tag: 'change', text: '홈 화면 체중 카드 그래프에 최근 기록 있는 날짜 기준 최대 7일치만 표시' },
      { tag: 'change', text: '홈 화면 체중 카드 그래프 툴팁에서 날짜 표시 제거 (하단에 별도 표시)' },
      { tag: 'fix', text: '홈 화면 체중 카드에서 차트를 누른 채로 움직이면 간헐적으로 툴팁이 사라지던 문제 수정 — 드래그 추적 대신 누르면 표시, 떼면 사라지는 방식으로 변경' },
    ],
  },
  {
    version: '1.7.6',
    date: '2026-08-26',
    items: [
      { tag: 'fix', text: '차트를 누른 채로 드래그할 때 손가락이 살짝만 위아래로 흔들려도 툴팁이 갑자기 사라지던 문제 수정' },
    ],
  },
  {
    version: '1.7.5',
    date: '2026-08-26',
    items: [
      { tag: 'fix', text: '앱이 하얗게 뜨거나 "페이지를 불러올 수 없음" 오류가 반복해서 뜨던 진짜 원인 수정 — 체중 차트 컴포넌트에서 리액트 훅 순서 규칙을 어긴 버그(데이터 개수가 바뀌는 순간 화면 전체가 죽었음)' },
    ],
  },
  {
    version: '1.7.4',
    date: '2026-08-26',
    items: [
      { tag: 'fix', text: '간헐적으로 "페이지를 불러올 수 없음" 오류가 뜨던 문제 수정 — 서비스워커가 브라우저의 특수 프리페치 요청을 잘못 가로채던 버그' },
    ],
  },
  {
    version: '1.7.3',
    date: '2026-08-26',
    items: [
      { tag: 'change', text: '차트를 누른 채로 좌우로 움직이면 매번 다시 누르지 않아도 지나간 위치의 툴팁이 실시간으로 갱신되도록 개선' },
      { tag: 'fix', text: '통계 분석 "7일 평균"이 기록 안 한 날짜까지 7로 나눠 평균이 낮게 나오던 문제 수정 — 실제 기록이 있었던 날짜 수로 계산, ml 평균도 추가' },
      { tag: 'fix', text: '통계 분석에서 수유 간격이 0일 때 화면에 엉뚱한 "0"이 표시되던 문제 수정' },
      { tag: 'change', text: '통계 분석 카드의 "N" 다음 줄에 있던 "회"를 숫자 옆으로 붙여서 표시' },
    ],
  },
  {
    version: '1.7.2',
    date: '2026-08-26',
    items: [
      { tag: 'fix', text: '차트 툴팁을 누르는 동안만 보이고 손을 떼면 바로 사라지도록 수정 (기존엔 기기마다 반응이 들쭉날쭉했음)' },
      { tag: 'change', text: '앱 전체에서 길게 눌렀을 때 뜨는 텍스트 선택/복사 팝업 제거 (입력창은 그대로 선택 가능)' },
      { tag: 'fix', text: '알림 설정 등 정적인 안내 박스에서 안의 버튼만 눌러도 박스 전체가 눌리는 것처럼 흔들리던 문제 수정' },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-08-26',
    items: [
      { tag: 'fix', text: '차트 툴팁이 카드 가장자리에서 화면 밖으로 잘려 보이던 문제 수정' },
      { tag: 'change', text: '모든 날짜·시간 입력/표시 기준을 기기 시간대가 아닌 한국(KST) 시간대로 통일 — 가족이 다른 시간대 기기를 써도 같은 날짜로 보이도록 개선' },
      { tag: 'fix', text: '홈 화면 체중 차트에서 특정 날짜 기록이 누락되어 보이던 문제 수정' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-26',
    items: [
      { tag: 'new', text: '홈 체중 카드에 일별 증가율 선 그래프 추가' },
      { tag: 'new', text: '체중/수유/기저귀/수면 그래프에 마우스 오버(모바일은 탭) 시 세부 수치를 보여주는 툴팁 추가' },
    ],
  },
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
