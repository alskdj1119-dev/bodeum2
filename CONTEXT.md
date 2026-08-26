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
    HomePanel.js       # 홈 화면 (알림 내역 아이콘은 Header.js에 있음)
    FeedPanel.js       # 수유 전체 기록
    DiaperPanel.js     # 기저귀 전체 기록
    SleepPanel.js      # 수면 전체 기록
    HealthPanel.js     # 건강 (체온/체중/예방접종 탭)
    StatsPanel.js      # 통계
    SettingsPanel.js   # 설정 (메뉴 목록만 — 실제 내용은 아래 하위 화면들)
    BabyInfoPanel.js   # 설정 > 아이 정보 (신규)
    FamilyCodePanel.js # 설정 > 가족 코드 (신규)
    NotifSettingsPanel.js # 설정 > 알림 설정 — 권한 on/off + 경과 시간 기준 (신규)
    ChangelogPanel.js  # 업데이트 내역
    RequestsPanel.js   # 건의사항
    TrashPanel.js      # 삭제 기록 (복원 가능)
    NotifHistoryPanel.js # 알림 내역 (홈 화면 종 모양 아이콘으로 진입)

  charts/
    ChartTooltip.js       # 모든 인터랙티브 차트가 공통으로 쓰는 호버/탭 툴팁 (신규)
    WeightGainChart.js    # 홈 체중 카드 — 일별 증가율(g) 선 그래프 (신규)
    WeightValueChart.js   # 건강 > 체중 탭 — 일별 체중 추이 선 그래프 (신규, buildWeightChart 대체)
    HourBarChart.js       # Home24hModal 시간대별 막대 그래프 (신규, 수유/기저귀/수면 3곳 공통 사용)

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
| `notifPermission` | 브라우저 알림 권한 (`'unsupported'\|'default'\|'granted'\|'denied'`) |
| `requestNotifPermission()` | 알림 허용 요청 (이미 허용된 경우 `notifEnabled`도 다시 true로) |
| `notifEnabled` | 이 기기에서 알림을 받을지 여부 (브라우저 권한과 별개, 앱 안에서 껐다 켤 수 있음, 신규) |
| `disableNotif()` | 이 기기의 알림 끄기 — 브라우저 권한은 유지, 서버 FCM 토큰만 해제 (신규) |

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
| `feedAmountMl(f)` | 수유 기록의 표시용 준비량(ml) — amount 없으면 직수 시간으로 추정 |
| `feedEffectiveMl(f)` | 통계 합산용 실제 섭취량 — consumedAmount 우선, 없으면 feedAmountMl |
| `weightDailyPoints(weights, days=14)` | 체중 기록을 날짜별(같은 날은 마지막 값)로 묶어 최근 N일 포인트 배열 생성 (신규) |
| `weightGains(points)` | 연속된 포인트 간 증가량(g) 배열 계산 (신규) |
| `avgRecentGain(gains, n=7)` | 최근 n개 증가량의 평균 (신규) |
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

### 2026-08-25 세션 3
**작업 내용:**
- 설정 > 알림설정: "조용한 시간대" → "방해 금지 시간대" 문구 변경, "설정하지 않음" 체크박스 추가 (`quietDisabled`) → 체크 시 24시간 알림 수신 (시간 선택 UI는 유지, 체크 시 비활성화 표시만)
- 설정 > 알림설정: "수유 경과 알림" 옵션 추가 (2시간/3시간/4시간/끔, `feedAlertH`) — 기존 하드코딩된 2.5시간 배고픔 알림을 설정값 기반으로 교체
- `SettingsPanel.js` 저장 로직: `diaperAlertH`/`sleepAlertH`/`feedAlertH` "끔(0)"이 `Number(0)||3` 폴백에 의해 무시되던 기존 버그 수정 (`Number.isFinite` 체크로 변경)
- `public/sw.js`: `isQuietTime()`이 `quietDisabled`를 확인하도록 수정, 배고픔 알림을 `feedAlertH` 설정 기반으로 리팩터링
- 앱 내 "김이엘" 하드코딩 제거: `store.js`의 `initialBaby.name` 기본값을 '아이'로 변경 (실사용 이름은 이미 전역에서 `baby.name`으로 동적 참조되고 있었음 — 유일한 하드코딩 지점이었음)
- 홈 "직전 24시간" 카드 순서: 수면·수유·기저귀 → 수유·기저귀·수면으로 변경 (직전 섹션과 동일한 순서로 통일)
- 홈 체중 카드 텍스트 크기 확대 (20px→26px), `WeightModal` 체중 표시(22px→28px)·다이얼(28px→30px), `Home24hModal` 통계 값(20px→22px)·제목(18px→19px), 전역 `.finp`(15px→16px)·`.mtitle`(18px→19px) 확대, 미정의 상태였던 `.modal-desc`/`.modal-hint` 클래스 정의 추가 — 모두 모달 폭 안에서 줄바꿈 없이 표시되도록 처리
- 수유 기록: `FeedModal`에서 "섭취량" 입력 필드 제거, "준비량(수유량)"은 직수를 제외하고 필수값으로 변경(미입력 시 저장 차단). 섭취량은 `ConsumedModal`(타이머 종료 시 팝업)에서만 입력하며 필수값으로 변경, "건너뛰기" 버튼 제거
- `FeedPanel.stopFeed()` / `SleepPanel.stopSleep()`(연동 수유): 타이머 종료 시 모든 수유 타입(직수/유축/분유)에서 섭취량 팝업이 뜨도록 변경 (기존엔 직수만 팝업)
- **수유 타이머 종료 시 "저장 실패" 오류 수정**: 원인은 `lib/firebase.js`에서 `getFirestore()` 기본 설정 사용 — 앱 전반에서 흔한 `field: cond ? value : undefined` 패턴으로 생성된 필드에 `undefined` 값이 들어있으면 Firestore `setDoc()`이 예외를 던짐. `initializeFirestore(app, { ignoreUndefinedProperties: true })`로 교체하여 undefined 필드를 자동 무시하도록 수정 (전체 저장 경로에 적용되는 근본 수정)

**DB 변경:**
- `notifSettings`: `feedAlertH`(수유 경과 알림, 기본 3), `quietDisabled`(방해 금지 시간대 미사용 여부, 기본 false) 필드 추가
- `feeds[].consumedAmount`: 이제 `ConsumedModal`을 통해서만 기록됨 (모든 타입 공통)

---

### 2026-08-26 세션 4
**작업 내용:**
- 설정 메뉴 개편: 기존에 한 화면에 몰려있던 아이 정보 / 가족 코드 / 알림 설정을 각각 별도 하위 화면(`BabyInfoPanel`, `FamilyCodePanel`, `NotifSettingsPanel`)으로 분리. `SettingsPanel.js`는 이제 메뉴 목록만 렌더링
- 알림 내역(`NotifHistoryPanel`) 진입점을 설정 메뉴에서 홈 화면 `Header.js` 우측 상단 종 모양 아이콘으로 이동 (뒤로가기 시 홈으로 복귀하도록 `BACK_TARGET.notifHistory = 'home'`)
- `BodeumApp.js`: 기존 `SWIPE_BACK_TARGET`(스와이프 전용)과 `handleBack()`의 하드코딩된 분기를 하나의 `BACK_TARGET` 맵으로 통합 — 새 하위 화면(`babyInfo`/`notifSettings`/`familyCode`) 추가 시 이 맵에만 등록하면 되도록 정리
- 알림 권한 on/off 기능 추가: 브라우저 `Notification` 권한은 한 번 허용하면 앱에서 되돌릴 수 없으므로, 별도의 앱 레벨 `notifEnabled` 플래그(`store.js`, localStorage `bodeum_notif_enabled`)를 도입. "끄기"를 누르면 이 기기의 FCM 토큰을 서버 문서에서 `arrayRemove`(신규 `unregisterFcmToken()`)하여 실제 발송을 중단시키고, 다시 "알림 허용하기"를 누르면 (권한이 이미 granted 상태이므로 브라우저 팝업 없이) 즉시 토큰을 재등록
- 아이 정보 입력란 배경을 흰색으로 고정: `.finp-white` 클래스 추가 (다크모드에서도 항상 흰 배경 + 어두운 글자)
- 홈 화면 카드 전반의 여백 축소: `.sc`/`.qbtn`/`.ec`/`.settmenu` 패딩, `.sgrid`/`.qgrid`/`.sr` 간격, `HomePanel.js`의 섹션 간 여백(`marginBottom`) 축소 — 카드가 더 꽉 차 보이도록 조정

**DB/상태 변경:**
- (Firestore 문서 아님, localStorage만) `bodeum_notif_enabled`: 이 기기의 알림 on/off 상태 (`'true'`/`'false'`)

### 2026-08-26 세션 5
**작업 내용:**
- 홈 체중 카드에 "일별 증가율" 선 그래프 추가 (`WeightGainChart.js`, 신규) — 카드 안 여백이 너무 많다는 피드백에 대응, 전일 대비 증가/감소량(g)을 라인으로 표시
- 기존 건강 > 체중 탭의 `buildWeightChart()`(문자열 SVG 조립 + `dangerouslySetInnerHTML`)를 `WeightValueChart.js`(신규, 진짜 JSX+React state 기반)로 교체
- 모든 차트에 호버(데스크톱)/탭(모바일) 시 세부 수치를 보여주는 툴팁 추가: 체중 추이/증가율 그래프는 점 위에 `날짜 · 체중 · 증가량`, Home24hModal의 시간대별 막대 그래프(수유/기저귀/수면 3곳)는 막대 위에 `N시대: 값` — 공통 `ChartTooltip.js` + `chart-tip`/`chart-wrap`/`chart-hit` CSS 클래스 사용
- Home24hModal의 반복되던 3개의 시간대별 막대그래프 코드를 `HourBarChart.js`(신규) 하나로 통합
- `lib/helpers.js`: `weightDailyPoints()`/`weightGains()`/`avgRecentGain()` 추가 — 체중 관련 계산 로직을 두 체중 차트 컴포넌트가 공통으로 사용하도록 통합 (기존 HealthPanel 안에 있던 중복 로직 제거)
- 새 `components/charts/` 디렉토리 신설

**참고:** 이 세션에서 Playwright로 실제 Firestore 저장을 거치는 흐름은 샌드박스 네트워크 제약으로 `setDoc()`이 응답하지 않아 검증하지 못했음 (배포 환경에서는 정상 동작하는 기존 코드 경로). 대신 차트 컴포넌트만 별도로 렌더링하는 임시 테스트 페이지로 렌더링/호버 툴팁 동작을 확인한 뒤 삭제함.

### 2026-08-26 세션 6
**작업 내용:**
- **툴팁 잘림 버그 수정**: `ChartTooltip.js`를 `.chart-wrap` 기준 퍼센트 절대배치 → `createPortal(document.body)` + `position:fixed` 방식으로 전면 재작성. 차트(svg 또는 막대 행) `ref`의 `getBoundingClientRect()`로 뷰포트 좌표를 구하고, 툴팁 자신의 렌더된 크기를 측정해 뷰포트 안에 들어오도록 위치를 보정(가장자리 근처에서는 화살표만 원래 지점을 계속 가리키도록 이동). `.sc`/`.panel`의 `overflow:hidden`에 더 이상 잘리지 않음. `WeightGainChart`/`WeightValueChart`/`HourBarChart`에 `svgRef`/`rowRef` 추가해 `containerRef`로 전달. `globals.css`: `.chart-tip`을 `position:fixed`로, 화살표를 `::after` 대신 별도 `.chart-tip-arrow`(위/아래 반전 가능) 엘리먼트로 변경
- **날짜/시간 전체 한국(KST, UTC+9) 기준 통일**: 기존에는 `nowISO`/`toLocal`/`fromLocal`/`fmt`/`fmtFull`/`dayLabel` 등이 "보는 사람 기기의 시간대"(`getTimezoneOffset()`, 로컬 getter)를 기준으로 동작해, 가족 구성원이 서로 다른 시간대 기기를 쓰면 같은 기록이 다른 날짜로 보일 수 있었음. `lib/helpers.js`에 `kstDate(ms)`(UTC+9 shift 후 UTC getter로 읽으면 한국 시각이 나오는 트릭) + `KST_OFFSET_MS` 상수를 추가하고, 위 함수들을 모두 이 기준으로 재작성. `weightDailyPoints()`의 날짜별 그룹핑도 기존 UTC 슬라이스(`w.time.slice(0,10)`) 대신 `toLocal()`(KST) 기준으로 변경 — 이것이 "23일 체중이 홈 차트에서 빠져 보인다"던 버그의 근본 원인이었음
- 위 헬퍼 변경에 맞춰 기기 시간대 getter를 직접 쓰던 나머지 위치도 모두 KST 기준으로 수정: `Header.js`(상단 날짜 표시), `Home24hModal.js`(수유/기저귀/수면 시간대별 버킷 3곳), `HomePanel.js`(만난지 며칠째 `dayCount`), `HealthPanel.js`(예방접종 만 며칠 `age` 및 권장 접종일 `targetDate` 표시), `StatsPanel.js`(오늘/어제/최근 7일 날짜 경계, 낮잠/밤잠 구분 시각, 요일 라벨)
- `_deletedAt`/`createdAt`/`endTime`/피드·수면 시작시각처럼 "특정 순간"을 나타내는 절대 타임스탬프(`new Date().toISOString()`)는 시간대와 무관하므로 그대로 둠 — 사람이 읽는 달력 날짜/시각으로 변환되는 지점만 수정
- 검증: `weights` mock 데이터로 `toLocal`/`fromLocal`/`fmt`/`weightDailyPoints`를 node에서 직접 호출해 UTC↔KST 변환이 의도대로 동작하는지 확인 (예: UTC 23:30 → KST 다음날 08:30), 임시 테스트 페이지(`app/dbgcharttest2`, 삭제됨)에서 Playwright로 차트 좌/우 끝 지점에 마우스 호버해 툴팁이 뷰포트 밖으로 잘리지 않고 카드 안에 잘 보정되어 표시되는지 스크린샷으로 확인. `npm run build` 정상 통과

### 2026-08-26 세션 7
**작업 내용:**
- **차트 툴팁 상호작용 방식 변경 (누르는 동안만 표시)**: 기존 `onMouseEnter`/`onMouseLeave`(호버) + `onClick`(토글) 혼용 방식이 모바일 터치에서 기기/브라우저마다 이벤트 순서가 달라 "눌렀다 바로 사라짐" / "계속 떠 있음" / "무반응"이 뒤섞이는 문제가 있었음. `WeightGainChart.js`/`WeightValueChart.js`/`HourBarChart.js`의 히트 영역을 Pointer Events(`onPointerDown`→표시, `onPointerUp`/`onPointerLeave`/`onPointerCancel`→닫기)로 통일 — 누르고 있는 동안만 보이고 떼면 즉시 사라짐. 마우스/터치 모두 동일하게 동작. Playwright로 mouse.down→툴팁 표시, mouse.up→즉시 사라짐을 확인
- **앱 전체 텍스트 선택/iOS 콜아웃 방지**: `globals.css`에 `html,body,#__next{user-select:none;-webkit-touch-callout:none}`을 추가해 앱 전체에서 길게 눌러도 "복사하기/찾아보기/번역/웹 검색" 같은 네이티브 팝업이 뜨지 않게 함. 단 `input,textarea,[contenteditable="true"]`는 `user-select:text`로 다시 풀어줘서 아이 정보 등 직접 입력하는 필드는 그대로 선택 가능
- **정적 박스의 잘못된 눌림 애니메이션 제거**: `.sc`(클릭 시 `scale(.97)`로 눌리는 카드용 클래스)가 실제로는 클릭 이동하지 않는 정적 그룹 박스에도 재사용되고 있어서, 그 안의 버튼(`.sbtn` 등)을 누르면 `:active`가 조상인 `.sc`까지 전파되어 박스 전체가 눌리는 것처럼 보이는 문제가 있었음(알림 설정 화면에서 최초 발견). 전체 코드베이스에서 `.sc` 사용처 15곳을 전수 조사해 클릭 카드(7곳, `HomePanel.js`)와 정적 박스(8곳)를 구분: 시각적으로 동일하되 `cursor:pointer`/`:active` 눌림이 없는 `.sc-static` 클래스를 신설하고, `HomePanel.js`(알림 권한 안내 배너 1곳), `HealthPanel.js`(체온 최신값/예방접종 안내 박스 2곳), `NotifSettingsPanel.js`(권한 상태/세부 설정 박스 2곳), `StatsPanel.js`(수유/수면/기저귀 통계 요약 박스 3곳)의 `className="sc"`를 `"sc-static"`으로 교체
- 이번 세션은 사용자 요청에 따라 각 변경 전 계획을 설명하고 명시적 확인("시작해")을 받은 뒤에만 코드를 수정하는 방식으로 진행함. `npm run build` 정상 통과

### 2026-08-26 세션 8
**작업 내용:**
- **차트를 누른 채로 드래그하면 실시간으로 툴팁 갱신**: 기존엔 각 데이터 포인트(circle)마다 개별 `onPointerDown`을 걸어놔서, 터치 특성상 처음 누른 요소가 포인터를 계속 붙잡고 있어 다른 점으로 이동해도 반응하지 않고 매번 손을 떼고 다시 눌러야 했음. `WeightGainChart.js`/`WeightValueChart.js`(svg 전체) / `HourBarChart.js`(막대 행 전체)에서 `onPointerDown` 시 `e.currentTarget.setPointerCapture(e.pointerId)`로 포인터를 컨테이너에 캡처하고, `onPointerMove`에서 현재 x좌표에 가장 가까운 데이터 포인트/시간대를 계산해 `setActive()` — 누른 채로 좌우 이동 시 지나가는 위치의 툴팁이 계속 갱신되고, 뗄 때(`onPointerUp`/`onPointerCancel`)만 닫힘. `touchAction:'pan-y'`로 세로 스크롤은 그대로 허용. Playwright로 왼쪽에서 누른 뒤 떼지 않고 오른쪽으로 드래그 → 툴팁 내용이 실시간으로 바뀌는 것을 확인
- **통계 분석 "7일 평균" 계산 수정**: 기존엔 `feed7d.length / 7`(고정 7)로 나눠서, 기록을 안 한 날이 있으면 평균이 부당하게 낮아 보였음(예: 7일 중 2일만 기록해도 7로 나눔). `StatsPanel.js`에 `feedActiveDays`(최근 7일 중 실제로 기록이 있었던 날짜 수)를 구해 횟수/ml 평균 모두 이 값으로 나누도록 수정(`avgFeedCount7d`, `avgFeedMl7d`). 정확히 사용자가 예시로 든 방식(기록 없는 날 제외하고 남은 날짜 수로 나눔)대로 계산. 기록이 하나도 없으면 평균은 `null`(화면엔 "—")
- **수유 간격 0일 때 "0" 잘못 표시되던 버그 수정**: `{s.interval && <div>...}` 형태의 JSX는 `s.interval`이 숫자 `0`일 때 `0 && <div>`가 `0`으로 평가되어 그 숫자가 그대로 화면에 찍히는 React/JS의 잘 알려진 함정이었음. `{!!s.interval && <div>...}`로 명시적으로 boolean 변환해 해결
- **"회" 단위를 줄바꿈 없이 숫자 옆에 표시**: 기존 `{s.count}`와 `회`가 별도의 두 줄(div)로 떨어져 있던 것을 하나의 div 안에 `<span>` 인라인으로 붙여서 "2회"처럼 한 줄에 보이도록 수정
- 이번에도 각 항목 계획 설명 → 확인("시작해") → 적용 순서로 진행. `npm run build` 정상 통과, Playwright로 드래그 동작 검증, node로 활성 일수 기준 평균 계산 로직 별도 검증

### 2026-08-26 세션 9
**작업 내용:**
- **간헐적 "This page couldn't load" 브라우저 에러 수정**: dev 브랜치 Vercel 배포에서 데스크톱/모바일 모두 페이지가 잠깐 떴다가 브라우저 자체의 네트워크 에러 화면으로 바뀌는 문제가 보고됨. Vercel 요청 로그는 전부 200/304로 정상이라 서버 문제는 배제. 원인은 `public/sw.js`의 `fetch` 이벤트 핸들러 — `fetch(e.request)`로 가로챈 요청을 그대로 재요청하는데, 브라우저가 링크 프리페치/뒤로가기 캐시 확인용으로 만드는 `cache:'only-if-cached'` + `mode!=='same-origin'` 조합의 특수 요청을 그대로 넘기면 `fetch()`가 동기적으로 TypeError를 던져 `respondWith()`가 아예 호출되지 못하고, 그 네비게이션 자체가 브라우저 레벨 오류로 처리됨(정확히 신고된 증상과 일치). `fetch` 핸들러 맨 앞에 `if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;` 가드 한 줄 추가로 해당 요청은 서비스워커를 거치지 않고 브라우저 기본 처리에 맡기도록 수정. 캐시 버전도 `bodeum-v5`→`v6`으로 올려서 새 서비스워커가 즉시 교체되도록 함
- 이 버그는 이번 세션의 다른 수정과 무관한, 원래부터 있던 서비스워커의 잠재 버그였음(발생 여부가 브라우저 내부 프리페치 타이밍에 좌우돼 들쭉날쭉하게 재현됨)
- `npm run build` 정상 통과 (sw.js는 정적 파일이라 빌드 파이프라인 영향 없음)
- **(세션 10에서 밝혀짐) 위 sw.js 진단은 오진이었음** — 실제 원인은 아래 세션 10 참고

### 2026-08-26 세션 10
**작업 내용:**
- **"페이지를 불러올 수 없음" 반복 오류의 진짜 원인 발견 및 수정**: sw.js 수정 후에도 배포(Ready) 확인 + 여러 기기/브라우저에서 동일 재현됨. Claude in Chrome으로 직접 dev 배포 URL에 접속해 재현에 성공하고 브라우저 콘솔을 확인한 결과 **`Error: Minified React error #310`**(리액트 훅 규칙 위반 — 렌더마다 훅 호출 개수/순서가 달라짐) 발견. 원인은 세션 8에서 `WeightGainChart.js`/`WeightValueChart.js`에 드래그 기능용 `const pressedRef = useRef(false);`를 추가할 때, 이미 있던 `if (gains.length < 1) return null;` / `if (points.length < 2) return null;` 조건부 반환문 **뒤에** 넣어버린 것. 체중 기록이 아직 로드되기 전(0~1개)엔 이 훅이 호출되지 않다가, Firestore에서 데이터가 로드되어 조건을 넘기는 순간 훅 개수가 달라지면서 리액트 트리 전체가 크래시 — "잠깐 뜸(로드 전 화면) → 에러(로드 완료 순간 크래시)"라는 신고된 증상과 정확히 일치. 두 파일 모두 `pressedRef` 선언 위치를 `return null`보다 위, 다른 훅들과 함께 있도록 이동해서 수정
- 이전 세션의 sw.js 수정(`only-if-cached` 가드)은 실제로는 문제와 무관했지만, 정상적인 방어 코드라 그대로 유지함
- 검증: Claude in Chrome으로 dev 배포에 재접속해 정상적으로 로드되는지, 콘솔에 더 이상 React #310 에러가 없는지 확인. `npm run build` 정상 통과
- **교훈**: 서버 로그가 깨끗해도(200/304) 클라이언트 크래시는 서버 로그에 안 잡힌다는 것, 그리고 "조건부 return 이전에 모든 훅 선언"이라는 리액트 규칙을 앞으로 차트/모달 컴포넌트 수정 시 항상 재확인할 것

### 2026-08-26 세션 11
**작업 내용:**
- **차트 드래그 중 손가락이 살짝 흔들리면 툴팁이 사라지는 문제 수정**: 세션 10 크래시 수정 후 사용자가 실기기에서 드래그 상호작용을 테스트하니, 누른 채로 옮기는 도중 가끔 툴팁이 사라진다고 보고. 트래킹 로직(`nearestIndex`로 가장 가까운 데이터 포인트 찾기) 자체는 화면 전체를 빈틈없이 커버하는 방식이라 문제가 아님— 원인은 svg/막대 행에 걸어둔 `touchAction:'pan-y'` 설정. 이 값은 "세로 스크롤은 브라우저가 처리해도 됨"을 의미하는데, 터치 드래그가 완벽히 수평이 아니고 조금이라도 위아래로 흔들리면 브라우저가 이를 스크롤 제스처로 판단해 우리 JS의 포인터 캡처를 가로채고 `pointercancel`을 발생시켜 손을 뗀 것처럼 처리됨. `WeightGainChart.js`/`WeightValueChart.js`/`HourBarChart.js` 3곳 모두 `touchAction:'pan-y'` → `'none'`으로 변경해 드래그 중에는 브라우저가 제스처를 가로채지 못하도록 수정(차트 영역 위에서 시작한 터치로는 스크롤이 안 되는 트레이드오프는 인터랙티브 차트에서 일반적으로 허용되는 동작)
- `npm run build` 정상 통과

### 2026-08-26 세션 12
**작업 내용:**
- **세션 11의 `touchAction:'none'` 수정 후에도 홈 화면 체중 카드에서만 드래그 중 툴팁이 계속 사라짐**: 건강탭 체중 그래프/시간대별 그래프는 정상인데 홈 화면 체중 카드(`WeightGainChart` 사용처)만 계속 재현됨. 코드 구조를 비교해보니, 홈 카드만 `<div className="sc" onClick={openHealthWeight}>` 로 카드 전체가 클릭 가능한 영역으로 감싸여 있고, `.sc:active{transform:scale(.97)}` 눌림 애니메이션이 걸려있음 — 다른 두 차트에는 이런 클릭 가능한 부모 카드가 없음. 손가락을 대고 드래그하는 동안 부모가 계속 `scale(.97)`로 애니메이션되며 화면 좌표가 미세하게 바뀌는 게 iOS 터치 제스처 인식과 충돌해 `pointercancel`을 유발하는 것으로 추정(브라우저 자동화 도구로는 마우스 기반이라 터치 전용 취소 현상을 직접 재현/확인은 못 함)
- 사용자가 이 문제를 근본적으로 우회하기로 결정: 홈 화면 체중 카드 그래프는 **드래그 추적 기능 자체를 제거**하고, 누르면(pointerdown) 그 위치와 가장 가까운 점의 툴팁을 보여주고 손을 떼면(pointerup/cancel) 사라지는 단순한 press-and-hold 방식으로 되돌림 (`onPointerMove` 핸들러 삭제). 이동 중 지속 추적이 없으니 부모 카드 애니메이션과 충돌할 여지 자체가 사라짐
- 추가로 요청받은 UX 변경 2건도 함께 적용:
  1. `weightDailyPoints(weights, 14)` → `weightDailyPoints(weights, 7)`: 최근 기록이 있는 날짜 기준 최대 7일치까지만 표시
  2. 툴팁에서 날짜(`<b>{date}</b>`) 줄 제거, `증가량 · 체중`(예: `+30g · 12.34kg`) 형식만 유지
- 카드 눌림 애니메이션(`.sc:active`)과 클릭 시 건강탭 체중 기록으로 이동하는 기능은 그대로 유지, 건강탭의 `WeightValueChart`/`HourBarChart`는 이번 변경과 무관하게 기존 드래그 추적 방식 그대로 둠
- `npm run build` 정상 통과

### 2026-08-26 세션 13
**작업 내용:**
- **홈 화면 체중 카드 그래프 — 누르기 상호작용 완전 제거, 항상 고정 표시로 전환**: 세션 12에서 press-and-hold 방식으로 되돌렸지만, 사용자가 아예 상호작용 자체를 없애고 그래프 아래에 최신 날짜의 값을 상시 표시하는 방식을 요청. `WeightGainChart.js`에서 포인터 이벤트(`onPointerDown`/`onPointerUp`/`onPointerCancel`)와 `ChartTooltip` 사용을 전부 제거하고, 마지막 데이터 포인트(`points[points.length-1]`, `gains[gains.length-1]`)를 그래프 바로 아래 고정 텍스트로 표시:
  - 체중: `4.500kg` 형식, `var(--ink)` 검은색 굵게
  - 증가량: `▲ 25g 증가`(늘었을 때) / `▼ 25g 감소`(줄었을 때) — 새로 추가한 CSS 변수 `--up`(파란색)/`--down`(빨간색)로 색상 구분. `app/globals.css`의 라이트/다크 테마 각 블록(`:root`, 다크 미디어 쿼리, `[data-theme="dark"]`, `[data-theme="light"]`)에 모두 추가함
- 상호작용이 사라지면서 차트를 감싸던 `onClick={e=>e.stopPropagation()}`도 제거 — 이제 그래프 영역을 탭해도 카드 전체와 동일하게 건강탭으로 이동함(의도된 동작)
- 기존 "최근 7일 평균 +Xg/일" 문구는 그대로 유지
- 건강탭의 `WeightValueChart`/`HourBarChart`는 이번 변경과 무관, 기존 press-and-hold 방식 그대로 유지
- `npm run build` 정상 통과

### 2026-08-26 세션 14
**작업 내용:**
- **홈 화면 체중 카드 그래프 — 하단 고정 요약 대신 점마다 라벨 표시**: 세션 13에서 만든 "그래프 아래 최신 날짜 체중/증가량 고정 박스"를 없애고, 그 대신 그래프 안에서 각 날짜 점 바로 아래(고정된 행, `H-mb+13`/`H-mb+27` — 건강탭 `WeightValueChart`의 날짜/증가량 라벨과 같은 방식)에 그날의 체중(`p.kg.toFixed(2)`, 검은색)과 증감량(`▲/▼ Ng`, 늘었으면 `var(--up)` 파란색·줄었으면 `var(--down)` 빨간색)을 항상 표시하도록 변경. 점의 실제 높이와 무관하게 고정된 행에 라벨을 그려서 값이 크든 작든 잘리지 않게 함
- 라벨 두 줄이 들어갈 공간을 위해 `mb`(하단 여백)를 20→40으로, 전체 높이 `H`를 108→140으로 늘림(카드가 그만큼 살짝 커짐)
- "최근 7일 평균 +Xg/일" 문구는 그대로 유지
- `npm run build` 정상 통과

---

## 다음 세션 사용법

새 대화 시작 시 이 문서 전체를 붙여넣고:

```
[컨텍스트 문서 붙여넣기]

이번 세션 목표: ___________
```
