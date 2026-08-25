# 보듬(Bodeum) 베이비 케어 앱 — 프로젝트 컨텍스트

## 기본 정보
- **GitHub**: https://github.com/alskdj1119-dev/bodeum2
- **배포**: https://bodeum2.vercel.app/
- **스택**: Next.js (App Router), Firebase Firestore, JavaScript (TypeScript 아님)
- **배포 방식**: GitHub push → Vercel 자동 배포

---

## 디자인 시스템

### CSS 변수 (색상)
| 변수 | 용도 | 색상 |
|------|------|------|
| `--cf` | 수유 | 파랑 |
| `--cd` | 기저귀 | 빨강 |
| `--cs` | 수면 | 보라 |
| `--cw` | 체중/건강 | 초록 |
| `--sage` | 홈/통계/설정/기본 강조 | 보라계열 |
| `--muted` | 보조 텍스트 | 회색 |
| `--ink` | 기본 텍스트 | 진한색 |
| `--surf` | 카드 배경 | 밝은색 |
| `--bg` | 앱 배경 | |
| `--bdr` | 테두리 | |

### 배경 wash 변수
- `--fw` : 수유 배경
- `--dw` : 기저귀 배경
- `--sw` : 수면 배경
- `--ww` : 체중 배경

---

## 파일 구조

```
app/
  globals.css          # 전역 스타일
  layout.js
  page.js

components/
  BodeumApp.js         # 앱 루트 (패널 라우팅, 모달 렌더링)
  Header.js
  NavBar.js            # 하단 탭 네비게이션
  SetupScreen.js       # 패밀리 코드 설정 화면
  Toast.js

  panels/
    HomePanel.js       # 홈 화면
    FeedPanel.js       # 수유 전체 기록
    DiaperPanel.js     # 기저귀 전체 기록
    SleepPanel.js      # 수면 전체 기록
    HealthPanel.js     # 건강 (체온/체중/예방접종 탭)
    StatsPanel.js      # 통계
    SettingsPanel.js   # 설정
    WeightPanel.js     # (HealthPanel 내부에서 사용)
    ChangelogPanel.js  # 업데이트 내역
    RequestsPanel.js   # 건의사항

  modals/
    FeedModal.js       # 수유 기록 추가/수정
    DiaperModal.js     # 기저귀 기록 추가/수정
    SleepModal.js      # 수면 기록 추가/수정
    WeightModal.js     # 체중 기록 추가/수정
    TempModal.js       # 체온 기록 추가/수정
    ConsumedModal.js   # 섭취량 기록
    Home24hModal.js    # 홈 직전 24시간 상세 모달 (신규)

lib/
  store.js             # 전역 상태 (Context + useReducer)
  firebase.js          # Firestore 연결
  helpers.js           # 유틸 함수
```

---

## 전역 상태 (store.js)

### DB 구조 (Firestore)
```js
{
  feeds: [],     // 수유 기록
  diapers: [],   // 기저귀 기록
  sleeps: [],    // 수면 기록
  weights: [],   // 체중 기록
  temps: [],     // 체온 기록
}
```

### Context에서 제공하는 값
| 값 | 설명 |
|---|---|
| `db` | Firestore 데이터 전체 |
| `dispatch` | DB 업데이트 |
| `saveDB(newDB)` | Firestore에 저장 |
| `baby` | 아기 정보 (이름, 생년월일 등) |
| `activeTab` | 현재 선택된 탭 |
| `goTab(tab, dir)` | 탭 이동 |
| `openModal` | 현재 열린 모달 이름 |
| `setOpenModal` | 모달 열기/닫기 |
| `editId` | 수정 중인 레코드 ID |
| `setEditId` | 수정 ID 설정 |
| `editType` | 수정 중인 타입 (feeds/diapers/sleeps/weights/temps) |
| `setEditType` | 수정 타입 설정 |
| `healthInitTab` | 건강 패널 초기 탭 지정 (신규) |
| `setHealthInitTab` | 건강 초기 탭 설정 (신규) |
| `showToast(msg)` | 토스트 메시지 |
| `uid` | 고유 ID 생성 함수 |

---

## 탭 구조

### NavBar 탭
| ID | 라벨 | 활성 색상 |
|---|---|---|
| `home` | 홈 | `--sage` |
| `feed` | 수유 | `--cf` |
| `diaper` | 기저귀 | `--cd` |
| `sleep` | 수면 | `--cs` |
| `health` | 건강 | `--cw` |
| `stats` | 통계 | `--sage` |
| `settings` | 설정 | `--sage` |

### HealthPanel 서브 탭
- `temp` : 체온
- `weight` : 체중
- `vaccine` : 예방접종

---

## 주요 UX 동작 (현재 구현 상태)

### 홈 화면
- **직전 섹션** (수유/기저귀/수면 카드): 클릭 시 해당 기록 **수정 팝업** 오픈
- **직전 24시간 섹션** (수면/수유/기저귀 카드): 클릭 시 **Home24hModal** 오픈
  - 수유: 총 섭취량 / 횟수 / 회당 평균 + 시간대별 바 차트 + 기록 리스트
  - 기저귀: 총 횟수 / 유형별 비율 + 시간대별 분포 + 기록 리스트
  - 수면: 총 수면 / 횟수 / 평균 + 시간대별 분포 + 기록 리스트
  - 모달 내 각 기록 클릭 → 수정 팝업 연결
- **체중 카드**: 클릭 시 건강 패널 > 체중 탭으로 이동
- **최근 기록 타임라인**: 각 항목 클릭 시 수정 팝업 오픈
- **빠른 기록 버튼**: 새 기록 추가 모달 오픈

### NavBar
- 선택된 탭: 해당 색상으로 아이콘+텍스트 강조 + 하단 언더라인 표시

### 모달 수정 패턴
```js
setEditId(record.id);
setEditType('feeds'); // or 'diapers', 'sleeps', 'weights', 'temps'
setOpenModal('feed'); // or 'diaper', 'sleep', 'weight', 'temp'
```

### 새 기록 추가 패턴
```js
setEditId(null);
setEditType(null);
setOpenModal('feed');
```

---

## 통계 기준
- **당일 통계**: 00:00 ~ 23:59
- **직전 24시간**: 현재 시각 기준 -24h

---

## 주요 helpers 함수
| 함수 | 설명 |
|---|---|
| `fmt(iso)` | HH:MM |
| `fmtFull(iso)` | YYYY년 MM월 DD일 HH:MM |
| `agoStr(iso)` | N분 전 / N시간 전 |
| `elapsedStr(iso)` | 경과 시간 문자열 |
| `durStr(ms)` | N시간 N분 |
| `directFeedMl(start, end)` | 직수 수유량 추정 (ml) |
| `groupByDay(arr, getter)` | 날짜별 그룹핑 |
| `nowISO()` | 현재 시각 ISO |
| `toLocal(iso)` / `fromLocal(str)` | datetime-local 변환 |
| `uid()` | 고유 ID 생성 |

---

## 세션 이력

### 2026-08-25 세션 1
**작업 내용:**
- NavBar 선택 탭 색상 강조 + 언더라인
- 홈 직전 카드 → 수정 팝업 연결
- 홈 최근 기록 → 수정 팝업 연결
- 홈 체중 카드 → 건강>체중 탭 이동 (`healthInitTab` 상태 추가)
- 홈 직전 24시간 카드 → Home24hModal (상세 기록 + 통계 그래프)
- `Home24hModal.js` 신규 생성

### 2026-08-25 세션 2
**작업 내용:**
- 홈 우측 상단: `{name}이와 / 만난지 N일차` 형식으로 변경
- 수유 모달: 모든 타입(직수/유축/분유) → 타이머 시작 방식으로 통일 (end 없이 start만 저장)
- 수유 모달: 직수 신규 기록 시 섭취량 항목 숨김, 기록자 엄마 자동 고정 (UI에 표시)
- 수유 모달: 연동 수면 자동 생성 제거 → 수유 배너 항상 "수유 중" 표시
- 수유 모달: 시작 시간 `new Date().toISOString()` (초 단위 포함) → 타이머 0초부터 시작
- 섭취량 팝업(ConsumedModal): 기본값 0으로 변경, 예상 섭취량은 힌트로만 표시
- 삭제 기능: soft delete 도입 (수유/기저귀/수면) → `db.trash[]`에 `_deletedAt`, `_type` 포함 저장
- `TrashPanel.js` 신규 생성: 삭제 기록 목록 + 개별 복원 + 전체 비우기
- `SettingsPanel.js`: "삭제 기록" 메뉴 항목 추가 → trash 탭으로 이동
- `BodeumApp.js`: trash 패널 추가 (SUB_PANELS, SWIPE_BACK_TARGET 포함)
- `store.js`: `initialDB.trash`, `SET_TRASH` 리듀서, Firestore 연동 추가

**DB 변경:**
- `db.trash`: 삭제된 항목 배열. 각 항목에 `_deletedAt` (ISO), `_type` ('feeds'|'diapers'|'sleeps'|...) 필드 추가

---

## 다음 세션 사용법

새 대화 시작 시 이 문서 전체를 붙여넣고:

```
[컨텍스트 문서 붙여넣기]

이번 세션 목표: ___________
```
