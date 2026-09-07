'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';
import {
  agoStr, durStr, fmtFull, elapsedStr, feedAmountMl, feedEffectiveMl, timerStr,
  kstDate, KST_OFFSET_MS, useNowTick, elapsedTier,
  FEED_TYPE_LABEL as TF, DIAPER_TYPE_LABEL as TD,
} from '../../lib/helpers';
import Home24hModal from '../modals/Home24hModal';

// 최근 기록 스와이프 삭제 — 쓰레기통 폭(px). CSS .rtrash의 width와 반드시 같아야 한다.
const TRASH_W = 58;

// 타이머 배너와 "직전" 카드의 디밍 블링크(.blink-live, 주기 1.8s)가 서로 다른 시점에 마운트돼도
// 항상 같은 박자로 깜빡이도록 — 각 요소가 마운트되는 순간의 실제 시각(Date.now())을 기준으로
// 음수 animation-delay를 계산해서 모두 같은 벽시계 위상에 맞춘다.
const BLINK_PERIOD_MS = 1800;
function useBlinkDelay() {
  const [delay, setDelay] = useState('0ms');
  useEffect(() => {
    setDelay(`${-(Date.now() % BLINK_PERIOD_MS)}ms`);
  }, []);
  return delay;
}

// "직전" 카드는 가로 폭이 좁아 "23시간 59분 전"처럼 긴 경과시간이 잘릴 수 있음.
// 카드 안에서 항상 안 잘리도록: 끝의 " 전"을 생략(라벨이 이미 "직전"이라 의미는 충분히 전달됨) + 폰트 축소.
function agoShort(iso) {
  return agoStr(iso).replace(/ 전$/, '');
}

// 홈 화면 좌측 상단 — 앱을 열 때마다(재접속 시) 랜덤하게 하나씩 보여주는 부모 응원 문구.
// 길이가 짧은 것부터 긴 것까지 섞여 있어서, 아래 encourageFontSize로 길이에 맞게 폰트를 줄여 표시한다.
const HOME_ENCOURAGE_PHRASES = [
  '잘하고 있어요.',
  '오늘도 정말 애썼네요,\n수고 많았어요.',
  '천천히, 그러나 꾸준히.',
  '완벽하지 않아도 괜찮아요.',
  '지금 이 순간도 충분히 잘하고 있어요.',
  '오늘도 아기를 위해 애쓴 당신, \n정말 잘하고 있어요.',
  '지친 하루였어도, \n당신은 이미 충분히 해냈어요.',
  '완벽하지 않아도, \n당신의 손은 따뜻하고 충분해요.',
  '천천히 가도 괜찮아요,\n당신은 꾸준히 걸어가고 있어요.',
  '매일이 처음처럼 낯설어도, \n당신은 조금씩 성장하고 있어요',
  '작은 실수 하나쯤은 괜찮아요,\n사랑이 더 크니까요.',
  '지금 이 순간, \n당신은 이미 좋은 부모예요.',
  '매일이 처음이라 버거워도, \n당신은 해내고 있어요.',
  '아기를 안아주는 그 손이, \n이미 가장 좋은 손이에요',
  '작은 하루가 쌓여 큰 사랑이 되고 있어요.',
  '지금 이 모습 그대로도, \n당신은 충분히 잘하고 있어요.',
  '천천히, 그러나 당신답게,\n그게 제일 좋아요.',
  '걱정이 많아서 힘들죠. \n그래도 당신은 오늘도 아기를 위해 애썼어요.',
  '부모가 된다는 건 원래 한 번에 완성되지 않아요,\n천천히 가도 돼요.',
  '걱정과 피로가 밀려와도, \n당신은 오늘도 최선을 다했어요.',
  '힘들고 지치고, 어떻게 해야 할지 몰라서 걱정되는 마음… \n다 알아요. 그래도 당신은 잘하고 있어요.',
  '오늘은 아무것도 못한 것 같아도,\n당신은 이미 충분히 애썼어요.',
  '걱정이 많아도, \n아기를 위해 고민하는 그 마음이 가장 소중해요.',
  '지쳐 쓰러질 것 같아도, \n당신은 오늘도 해냈어요.',
  '초보 엄마·아빠인 당신도, \n함께 잘 자라고 있어요.',
];

// 문구 길이에 따라 폰트 크기를 단계적으로 줄여서, 짧은 문구는 기존 크기를 유지하고
// 긴 문구는 헤더 레이아웃이 과도하게 커지거나 어색하게 보이지 않도록 한다.
function encourageFontSize(text) {
  const len = text.length;
  if (len <= 12) return 19;
  if (len <= 19) return 17;
  if (len <= 27) return 15;
  if (len <= 35) return 13.5;
  return 12;
}

// 직전에 보여줬던 문구를 기기에 기록해뒀다가, 다음에 뽑을 때는 후보에서 제외한다.
// (완전 종료 후 재실행 / 백그라운드 복귀 어느 경우든 바로 직전과 같은 문구가 연달아 나오지 않도록)
const LAST_ENCOURAGE_KEY = 'bodeum_last_encourage_phrase';
function pickEncouragePhrase() {
  let last = null;
  try { last = localStorage.getItem(LAST_ENCOURAGE_KEY); } catch (_) {}
  const candidates = last
    ? HOME_ENCOURAGE_PHRASES.filter(p => p !== last)
    : HOME_ENCOURAGE_PHRASES;
  const pool = candidates.length > 0 ? candidates : HOME_ENCOURAGE_PHRASES;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(LAST_ENCOURAGE_KEY, picked); } catch (_) {}
  return picked;
}

export default function HomePanel() {
  const {
    db, dispatch, saveDB, showToast, baby, babies, setOpenModal, setEditId, setEditType,
    feedTimerMs, sleepTimerMs, stopActiveFeed, stopActiveSleep,
    notifPermission, requestNotifPermission,
    filterByActiveBaby, activeBabyId, switchBaby,
  } = useApp();
  // 아이가 2명 이상 등록돼 있으면 지금 보고 있는 아이의 기록만 걸러서 보여준다.
  const feeds = filterByActiveBaby(db.feeds);
  const diapers = filterByActiveBaby(db.diapers);
  const sleeps = filterByActiveBaby(db.sleeps);

  // "직전"/"최근 기록"의 경과시간 텍스트가 시간이 지나도 갱신되도록 주기적으로 리렌더링
  useNowTick();

  // 블링크 동기화용 delay — 각 대상별로 자신이 마운트된 시점 기준으로 계산됨
  const feedTimerBlinkDelay = useBlinkDelay();
  const sleepTimerBlinkDelay = useBlinkDelay();
  const feedTierBlinkDelay = useBlinkDelay();
  const diaperTierBlinkDelay = useBlinkDelay();

  // "오늘 N건 기록했어요" 배너 — 평소엔 접혀 있다가 탭하면 직전 24시간 상세가 펼쳐짐
  const [summaryOpen, setSummaryOpen] = useState(false);
  // 배너 안 3개 카드(수유/기저귀/수면)를 "직전 24시간" 기준으로 볼지 "당일" 기준으로 볼지
  const [sumMode, setSumMode] = useState('recent24h');

  // 우측 상단 "+" 버튼 — 탭하면 수유/기저귀/수면 선택 메뉴가 펼쳐짐
  const [quickOpen, setQuickOpen] = useState(false);
  function openQuick(modal) {
    setQuickOpen(false);
    setEditId(null); setEditType(null); setOpenModal(modal);
  }

  // "최근 기록" 카드 — 왼쪽 기준으로 살짝 축소되며 오른쪽에 쓰레기통이 나타나는 스와이프 삭제.
  // 누르고 일정 시간(LONG_PRESS_MS) 이상 유지한 뒤 가로로 움직였을 때만 스와이프로 인정한다.
  // 그 전에(짧게 누르자마자) 조금이라도 움직이면 — 위아래든 대각선이든 — 스크롤로 확정하고
  // 스와이프는 이번 터치 동안 다시 활성화되지 않는다.
  const LONG_PRESS_MS = 180;
  const [swipedKey, setSwipedKey] = useState(null);
  const [swipeScale, setSwipeScale] = useState(0.84);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const touchKeyRef = useRef(null);
  const touchAxisRef = useRef(null); // 'x' | 'y' | null — 'y'가 되면 이번 터치 동안 스와이프 불가(스크롤 확정)
  const touchWidthRef = useRef(0);
  function handleCardTouchStart(key, e) {
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    touchStartTimeRef.current = Date.now();
    touchKeyRef.current = key;
    touchAxisRef.current = null;
    touchWidthRef.current = e.currentTarget.getBoundingClientRect().width;
  }
  function handleCardTouchMove(key, e) {
    if (touchKeyRef.current !== key || touchStartXRef.current == null) return;
    if (touchAxisRef.current === 'y') return; // 이미 스크롤로 확정됨
    const t = e.touches[0];
    const dx = t.clientX - touchStartXRef.current;
    const dy = t.clientY - touchStartYRef.current;
    const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
    if (!moved) return;
    const heldLongEnough = (Date.now() - touchStartTimeRef.current) >= LONG_PRESS_MS;
    if (!heldLongEnough) {
      // 롱프레스 시간이 되기 전에 움직였다면 방향과 무관하게 스크롤로 확정
      touchAxisRef.current = 'y';
      return;
    }
    if (touchAxisRef.current == null) {
      // 충분히 누른 뒤 처음 움직인 방향 — 가로 성분이 세로보다 뚜렷하게 클 때만 스와이프로 인정
      touchAxisRef.current = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
    }
    if (touchAxisRef.current === 'x') e.stopPropagation();
  }
  function handleCardTouchEnd(key, e) {
    if (touchStartXRef.current == null || touchKeyRef.current !== key) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    const isHorizontal = touchAxisRef.current === 'x';
    const width = touchWidthRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchAxisRef.current = null;
    if (!isHorizontal) return; // 스크롤이었으면 스와이프로 취급하지 않음
    e.stopPropagation();
    if (dx < -24) {
      // 쓰레기통 폭(TRASH_W)만큼만 정확히 줄어들도록, 카드 실제 폭을 기준으로 축소 비율 계산
      setSwipeScale(width > 0 ? Math.max(0.7, (width - TRASH_W) / width) : 0.84);
      setSwipedKey(key);
    } else if (dx > 24) {
      setSwipedKey(prev => (prev === key ? null : prev));
    }
  }

  // 진행 중인 타이머 (홈 최상단 요약 배너용)
  const activeFeed = feeds.find(f => f.start && !f.end);
  const activeSleep = sleeps.find(s => s.start && !s.end);

  // 직전 24시간 상세 모달 — detail24Date가 있으면 그 날짜의 "당일" 모드로 열림
  const [detail24, setDetail24] = useState(null); // null | 'feed' | 'diaper' | 'sleep'
  const [detail24Date, setDetail24Date] = useState(null); // "YYYY-MM-DD"(KST) | null
  const [detail24Mode, setDetail24Mode] = useState('recent24h'); // 배너 아코디언에서 연 경우, 그때 선택돼 있던 모드 그대로 전달

  // 요일 스트립에서 기록 있는 날짜를 탭하면 그 날짜의 "당일" 상세를 봄 (직전 24시간 토글은 불필요하므로 숨김)
  function openDayDetail(dateStr) {
    setDetail24Date(dateStr);
    setDetail24('feed');
  }

  // 홈 상단 응원 문구 — 앱을 처음 열 때 랜덤으로 고르고, 이후 탭을 오가는 동안에는 유지하되,
  // 앱이 백그라운드로 내려갔다가 다시 화면에 보이게 될 때(visibilitychange)마다 새로 랜덤으로 뽑는다.
  const [encouragePhrase, setEncouragePhrase] = useState(() => pickEncouragePhrase());
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        setEncouragePhrase(pickEncouragePhrase());
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 오늘 자정(KST) 기준 시각 — dayCount 계산과 "오늘 N건" 집계에 공통으로 사용
  const nowKst = kstDate(Date.now());
  const todayStartMs = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate(), 0, 0) - KST_OFFSET_MS;

  // Day count
  let dayCount = null;
  if (baby.birthDate) {
    // 생년월일은 항상 "한국 날짜"로 해석 — 기기 시간대와 무관하게 동일한 만난지 일수가 나오도록.
    const [by, bm, bd] = baby.birthDate.split('-').map(Number);
    const birthMs = Date.UTC(by, bm - 1, bd, 0, 0) - KST_OFFSET_MS;
    const d = Math.floor((todayStartMs - birthMs) / 86400000) + 1;
    if (d >= 1) dayCount = d;
  }

  // Last events
  const sortedFeeds = [...feeds].filter(f => f.end || f.time).sort((a,b) => new Date(b.start||b.time) - new Date(a.start||a.time));
  const lastFeed = sortedFeeds[0];
  const lastDiaper = [...diapers].sort((a,b) => new Date(b.time) - new Date(a.time))[0];
  const lastSleep = [...sleeps].filter(s => s.end).sort((a,b) => new Date(b.start) - new Date(a.start))[0];

  // 24h stats
  const h24 = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const feed24 = feeds.filter(f => (now - new Date(f.start||f.time).getTime()) <= h24);
  const diaper24 = diapers.filter(d => (now - new Date(d.time).getTime()) <= h24);
  const sleep24 = sleeps.filter(s => s.end && (now - new Date(s.start).getTime()) <= h24);
  const sleepMs = sleep24.reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
  const diaperWet24 = diaper24.filter(d => d.type === 'wet' || d.type === 'both').length;
  const diaperSoiled24 = diaper24.filter(d => d.type === 'soiled' || d.type === 'both').length;
  const feedMl = feed24.reduce((acc, f) => acc + feedEffectiveMl(f), 0);

  // "오늘 N건 기록했어요" 배너 — 24시간 롤링이 아니라 달력상 "오늘"(KST 자정 이후) 기준 총 건수
  const todayFeedCount = feeds.filter(f => new Date(f.start || f.time).getTime() >= todayStartMs).length;
  const todayDiaperCount = diapers.filter(d => new Date(d.time).getTime() >= todayStartMs).length;
  const todaySleepCount = sleeps.filter(s => s.end && new Date(s.start).getTime() >= todayStartMs).length;
  const todayCount = todayFeedCount + todayDiaperCount + todaySleepCount;
  const todayDateStr = `${nowKst.getUTCMonth() + 1}월 ${nowKst.getUTCDate()}일(${['일','월','화','수','목','금','토'][nowKst.getUTCDay()]})`;

  // 배너 안 3개 카드용 "당일"(달력상 오늘) 기준 데이터 — sumMode === 'day'일 때 24시간 롤링 대신 이걸 사용
  const feedToday = feeds.filter(f => new Date(f.start || f.time).getTime() >= todayStartMs);
  const diaperToday = diapers.filter(d => new Date(d.time).getTime() >= todayStartMs);
  const sleepToday = sleeps.filter(s => s.end && new Date(s.start).getTime() >= todayStartMs);
  const sleepMsToday = sleepToday.reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
  const diaperWetToday = diaperToday.filter(d => d.type === 'wet' || d.type === 'both').length;
  const diaperSoiledToday = diaperToday.filter(d => d.type === 'soiled' || d.type === 'both').length;
  const feedMlToday = feedToday.reduce((acc, f) => acc + feedEffectiveMl(f), 0);

  const sumFeedList = sumMode === 'day' ? feedToday : feed24;
  const sumDiaperList = sumMode === 'day' ? diaperToday : diaper24;
  const sumSleepList = sumMode === 'day' ? sleepToday : sleep24;
  const sumFeedMl = sumMode === 'day' ? feedMlToday : feedMl;
  const sumSleepMs = sumMode === 'day' ? sleepMsToday : sleepMs;
  const sumDiaperWet = sumMode === 'day' ? diaperWetToday : diaperWet24;
  const sumDiaperSoiled = sumMode === 'day' ? diaperSoiledToday : diaperSoiled24;

  // 이번 주(일~토) 요일 스트립 — 각 요일에 기록이 있는지(점 표시), 오늘 요일(밑줄 표시)
  const weekStartMs = todayStartMs - nowKst.getUTCDay() * 86400000;
  const WEEK_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDays = WEEK_LABEL.map((label, i) => {
    const dayStartMs = weekStartMs + i * 86400000;
    const dayEndMs = dayStartMs + 86400000;
    const has =
      feeds.some(f => { const t = new Date(f.start || f.time).getTime(); return t >= dayStartMs && t < dayEndMs; }) ||
      diapers.some(d => { const t = new Date(d.time).getTime(); return t >= dayStartMs && t < dayEndMs; }) ||
      sleeps.some(s => { const t = new Date(s.start).getTime(); return t >= dayStartMs && t < dayEndMs; });
    const dateNum = kstDate(dayStartMs).getUTCDate();
    return {
      label, has, today: dayStartMs === todayStartMs,
      dateLabel: (dateNum < 10 ? '0' + dateNum : '' + dateNum) + '일',
      dateStr: kstDate(dayStartMs).toISOString().slice(0, 10),
    };
  });

  // 직전 카드 클릭 → 수정 팝업
  function openEditFeed(f) {
    if (!f) return;
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
  }
  function openEditDiaper(d) {
    if (!d) return;
    setEditId(d.id);
    setEditType('diapers');
    setOpenModal('diaper');
  }
  function openEditSleep(s) {
    if (!s) return;
    setEditId(s.id);
    setEditType('sleeps');
    setOpenModal('sleep');
  }

  // "직전" 수유/기저귀 카드 — 경과 시간이 오래될수록 눈에 띄게 색을 바꿔서
  // 한눈에 "슬슬 확인해야 할 때"를 알 수 있도록 함. 1시간 미만은 평소 그대로.
  const ELAPSED_TIER_STYLE = {
    caution: { border: 'var(--cd-wet)', bg: 'var(--dw-wet)' },
    warn:    { border: 'var(--warn)',   bg: 'var(--warn-wash)' },
    alert:   { border: 'var(--alert)',  bg: 'var(--alert-wash)' },
  };
  function tierCardStyle(tier) {
    if (!tier) return undefined;
    const t = ELAPSED_TIER_STYLE[tier];
    return {
      background: t.bg, borderColor: t.border,
      '--blink-base': t.bg,
      '--blink-light': `color-mix(in srgb, ${t.border} 45%, white)`,
    };
  }
  function tierIcoStyle(tier) {
    if (!tier) return undefined;
    return { background: ELAPSED_TIER_STYLE[tier].bg };
  }
  function tierSvgStyle(tier) {
    if (!tier) return undefined;
    return { stroke: ELAPSED_TIER_STYLE[tier].border };
  }
  function tierValStyle(tier) {
    if (!tier) return undefined;
    return { color: ELAPSED_TIER_STYLE[tier].border, fontWeight: 700 };
  }

  const feedTier = elapsedTier(lastFeed ? (lastFeed.start || lastFeed.time) : null);
  const diaperTier = elapsedTier(lastDiaper ? lastDiaper.time : null);

  // Recent timeline
  const all = [];
  feeds.forEach(f => {
    const t = f.start || f.time;
    const fAmt = feedAmountMl(f);
    const amtStr = f.consumedAmount != null && fAmt != null ? `준비 ${fAmt}ml / 섭취 ${f.consumedAmount}ml`
      : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
      : fAmt ? `${fAmt}ml` : '';
    const durTxt = (f.start && f.end) ? ' · ' + durStr(new Date(f.end) - new Date(f.start)) : '';
    all.push({ t: 'f', time: t, label: '수유 — ' + (TF[f.type] || ''), sub: amtStr + durTxt, raw: f });
  });
  diapers.forEach(d => all.push({ t: 'd', time: d.time, label: '기저귀 — ' + (TD[d.type] || ''), sub: d.note || '', raw: d }));
  sleeps.filter(s => s.end).forEach(s => all.push({ t: 's', time: s.start, label: '수면', sub: durStr(new Date(s.end) - new Date(s.start)), raw: s }));
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recent = all.slice(0, 10);

  // "최근 기록" 카드 아이콘 — 종류별 아이콘
  function recentIcon(t) {
    if (t === 'f') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
    if (t === 'd') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg>;
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
  }

  // 최근 기록 클릭 → 수정 팝업 (스와이프로 열려있는 카드는 탭해서 다시 닫기만 함)
  function handleRecentClick(e, key) {
    if (swipedKey) { setSwipedKey(null); return; }
    if (!e.raw) return;
    if (e.t === 'f') openEditFeed(e.raw);
    else if (e.t === 'd') openEditDiaper(e.raw);
    else if (e.t === 's') openEditSleep(e.raw);
  }

  // 최근 기록 카드 — 스와이프로 열린 쓰레기통을 한 번 더 탭하면 삭제
  const RECENT_TYPE_MAP = {
    f: { key: 'feeds', action: 'SET_FEEDS' },
    d: { key: 'diapers', action: 'SET_DIAPERS' },
    s: { key: 'sleeps', action: 'SET_SLEEPS' },
  };
  function deleteRecent(e) {
    const conf = RECENT_TYPE_MAP[e.t];
    if (!conf || !e.raw) return;
    const list = db[conf.key];
    const item = list.find(x => x.id === e.raw.id);
    if (!item) return;
    const trashItem = { ...item, _deletedAt: new Date().toISOString(), _type: conf.key };
    const newList = list.filter(x => x.id !== e.raw.id);
    const newTrash = [trashItem, ...(db.trash || [])];
    const newDB = { ...db, [conf.key]: newList, trash: newTrash };
    dispatch({ type: conf.action, payload: newList });
    dispatch({ type: 'SET_TRASH', payload: newTrash });
    saveDB(newDB);
    showToast('삭제됐어요 (설정 > 삭제 기록에서 복원 가능)');
    setSwipedKey(null);
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', gap:'10px' }}>
        <h1 className="daytitle" style={{ fontSize: encourageFontSize(encouragePhrase) + 'px', wordBreak:'keep-all', whiteSpace:'pre-line', marginBottom:0, flex:1 }}>
          {encouragePhrase}
        </h1>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <button
              className={`qplus${quickOpen ? ' open' : ''}`}
              aria-label="빠른 기록"
              onClick={() => setQuickOpen(v => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            {quickOpen && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:19 }} onClick={() => setQuickOpen(false)} />
                <div className="qmenu">
                  <button onClick={() => openQuick('feed')}>
                    <span className="mico f"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></span>
                    수유
                  </button>
                  <button onClick={() => openQuick('diaper')}>
                    <span className="mico d"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></span>
                    기저귀
                  </button>
                  <button onClick={() => openQuick('sleep')}>
                    <span className="mico s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                    수면
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 요일 스트립 — 이번 주 기록 있는 날엔 점, 오늘 요일엔 포인트색 밑줄 */}
      <div className="weekstrip">
        {weekDays.map((d, i) => (
          <div
            key={i}
            className={`wday${d.has ? ' has' : ''}${d.today ? ' today' : ''}${d.has ? ' clickable' : ''}`}
            onClick={d.has ? () => openDayDetail(d.dateStr) : undefined}
          >
            <span className="wlbl">{d.label}</span>
            <span className="wdate">{d.dateLabel}</span>
            <span className="wdot"></span>
            <span className="wbar"></span>
          </div>
        ))}
      </div>

      {/* 아이 전환 칩 — 아이가 1명뿐이어도 칩 1개는 항상 보이고, 그 옆(맨 오른쪽)에 "만난지 N일차"가 붙는다 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 2 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: '1 1 auto', minWidth: 0 }}>
          {babies.map(b => {
            const on = b.id === activeBabyId;
            const icon = b.gender === 'boy' ? '👦' : b.gender === 'girl' ? '👧' : '🧒';
            return (
              <button key={b.id} onClick={() => switchBaby(b.id)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: on ? 700 : 500,
                color: on ? '#fff' : 'var(--ink)',
                background: on ? 'var(--sage)' : 'var(--surf)',
                border: on ? '1.5px solid var(--sage)' : '1.5px solid var(--btn-bdr)',
                boxShadow: on ? 'var(--sh-sm)' : 'var(--sh-inset)',
              }}>
                <span>{icon}</span>{b.name || '아이'}
              </button>
            );
          })}
        </div>
        {dayCount !== null && (
          <div style={{ flexShrink: 0, marginLeft: 'auto', textAlign: 'right', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
            <strong style={{ fontSize: '15px', color: 'var(--sage)' }}>{baby.name || '아이'}이와</strong><br/>
            만난지 <strong style={{ color: 'var(--sage)' }}>{dayCount}일차</strong>
          </div>
        )}
      </div>

      {/* 알림 권한 아직 결정 안 됨 → 눈에 띄게 한 번 안내 */}
      {notifPermission === 'default' && (
        <div className="sc-static" style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', padding:'12px 14px' }}>
          <span style={{ fontSize:'18px', lineHeight:1 }}>🔔</span>
          <span style={{ flex:1, fontSize:'12.5px', color:'var(--ink)' }}>수유·수면·기저귀 알림을 받으려면 알림을 허용해주세요.</span>
          <button className="bpri" style={{ padding:'8px 14px', fontSize:'12.5px', whiteSpace:'nowrap' }} onClick={requestNotifPermission}>허용하기</button>
        </div>
      )}

      {/* 진행 중인 타이머 — 얇은 한 줄 요약 배너 */}
      {(activeFeed || activeSleep) && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
          {activeFeed && (
            <div className="slive-mini banner-in blink-live" style={{ cursor:'pointer', '--blink-base':'color-mix(in srgb, var(--cf) 22%, var(--surf))', '--blink-light':'color-mix(in srgb, var(--cf) 40%, white)', animationDelay: feedTimerBlinkDelay }}
              onClick={() => { setEditId(activeFeed.id); setEditType('feeds'); setOpenModal('activeTimerEdit'); }}>
              <span className="slive-mini-dot" style={{ background:'var(--cf)' }} />
              <span className="slive-mini-lbl">수유 중</span>
              <span className="slive-mini-timer">{timerStr(feedTimerMs)}</span>
              <button className="slive-mini-stop" style={{ background:'var(--cf)' }} onClick={e => { e.stopPropagation(); stopActiveFeed(); }}>종료</button>
            </div>
          )}
          {activeSleep && (
            <div className="slive-mini banner-in blink-live" style={{ cursor:'pointer', '--blink-base':'color-mix(in srgb, var(--cs) 22%, var(--surf))', '--blink-light':'color-mix(in srgb, var(--cs) 40%, white)', animationDelay: sleepTimerBlinkDelay }}
              onClick={() => { setEditId(activeSleep.id); setEditType('sleeps'); setOpenModal('activeTimerEdit'); }}>
              <span className="slive-mini-dot" style={{ background:'var(--cs)' }} />
              <span className="slive-mini-lbl">수면 중</span>
              <span className="slive-mini-timer">{timerStr(sleepTimerMs)}</span>
              <button className="slive-mini-stop" style={{ background:'var(--cs)' }} onClick={e => { e.stopPropagation(); stopActiveSleep(); }}>종료</button>
            </div>
          )}
        </div>
      )}

      {/* 오늘 요약 배너 — 평소엔 접혀 있다가 탭하면 "직전 24시간" 상세가 펼쳐짐 */}
      <div className={`sumcard${summaryOpen ? ' open' : ''}`} onClick={() => setSummaryOpen(v => !v)}>
        <div className="sumhead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>
          <div className="txt">{todayDateStr} &middot; 오늘 <b>{todayCount}건</b> 기록했어요</div>
          <svg className="sumchev" style={{ transform: summaryOpen ? 'rotate(90deg)' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
        </div>
        {summaryOpen && (
          <>
            <div className="sumdiv"></div>
            <div className="modetoggle" style={{ marginBottom: 12 }} onClick={ev => ev.stopPropagation()}>
              <button
                className={`modetoggle-btn${sumMode === 'recent24h' ? ' on' : ''}`}
                onClick={() => setSumMode('recent24h')}
                style={sumMode === 'recent24h' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
              >직전 24시간</button>
              <button
                className={`modetoggle-btn${sumMode === 'day' ? ' on' : ''}`}
                onClick={() => setSumMode('day')}
                style={sumMode === 'day' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
              >당일</button>
            </div>
            <div className="sgrid" style={{ gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)' }}>
              <div className="sc" onClick={ev => { ev.stopPropagation(); setDetail24Date(null); setDetail24Mode(sumMode); setDetail24('feed'); }}>
                <div className="sr"><div className="slbl">수유</div><div className="sico f"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div></div>
                <div className="sval" style={{ fontSize:'15px' }}>{sumFeedMl > 0 ? `총 ${sumFeedMl}ml` : `${sumFeedList.length}회`}</div>
                <div className="ssub">{sumFeedList.length > 0 ? `${sumFeedList.length}회 수유` : '기록 없음'}</div>
              </div>
              <div className="sc" onClick={ev => { ev.stopPropagation(); setDetail24Date(null); setDetail24Mode(sumMode); setDetail24('diaper'); }}>
                <div className="sr"><div className="slbl">기저귀</div><div className="sico d"><svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div></div>
                <div className="sval" style={{ fontSize:'15px', whiteSpace:'nowrap' }}>{sumDiaperList.length}회</div>
                <div className="ssub">소변 {sumDiaperWet} &middot; 대변 {sumDiaperSoiled}</div>
              </div>
              <div className="sc" onClick={ev => { ev.stopPropagation(); setDetail24Date(null); setDetail24Mode(sumMode); setDetail24('sleep'); }}>
                <div className="sr"><div className="slbl">수면</div><div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div></div>
                <div className="sval" style={{ fontSize:'15px' }}>{sumSleepMs > 0 ? durStr(sumSleepMs) : '0분'}</div>
                <div className="ssub">{sumSleepList.length}회</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 직전 — 클릭 시 수정 팝업 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>직전</p>
      <div className="sgrid" style={{ gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', marginBottom:'16px' }}>
        <div className={`sc${feedTier ? ' blink-live' : ''}`} onClick={() => openEditFeed(lastFeed)} style={feedTier ? { ...tierCardStyle(feedTier), animationDelay: feedTierBlinkDelay } : tierCardStyle(feedTier)}>
          <div className="sr">
            <div className="slbl">수유</div>
            <div className="sico f" style={tierIcoStyle(feedTier)}><svg viewBox="0 0 24 24" style={tierSvgStyle(feedTier)}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap', ...tierValStyle(feedTier) }}>{lastFeed ? agoShort(lastFeed.start || lastFeed.time) : '—'}</div>
          <div className="ssub">{lastFeed ? fmtFull(lastFeed.start || lastFeed.time) : '기록 없음'}</div>
        </div>
        <div className={`sc${diaperTier ? ' blink-live' : ''}`} onClick={() => openEditDiaper(lastDiaper)} style={diaperTier ? { ...tierCardStyle(diaperTier), animationDelay: diaperTierBlinkDelay } : tierCardStyle(diaperTier)}>
          <div className="sr">
            <div className="slbl">기저귀</div>
            <div className="sico d" style={tierIcoStyle(diaperTier)}><svg viewBox="0 0 24 24" style={tierSvgStyle(diaperTier)}><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap', ...tierValStyle(diaperTier) }}>{lastDiaper ? agoShort(lastDiaper.time) : '—'}</div>
          <div className="ssub">{lastDiaper ? fmtFull(lastDiaper.time) : '기록 없음'}</div>
        </div>
        <div className="sc" onClick={() => openEditSleep(lastSleep)}>
          <div className="sr">
            <div className="slbl">수면</div>
            <div className="sico s"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
          </div>
          <div className="sval" style={{ fontSize:'13px', whiteSpace:'nowrap' }}>{lastSleep ? agoShort(lastSleep.start) : '—'}</div>
          <div className="ssub">{lastSleep ? durStr(new Date(lastSleep.end) - new Date(lastSleep.start)) : '기록 없음'}</div>
        </div>
      </div>

      {/* 최근 기록 — 클릭 시 수정 팝업 */}
      <p className="seclbl" style={{ marginBottom:'8px' }}>최근 기록</p>
      {recent.length === 0 ? (
        <div className="empty"><div className="empty-lbl" style={{ fontSize:'15px' }}>아직 기록이 없어요 🌿</div></div>
      ) : (
        <div className="rcards">
          {recent.map((e, i) => {
            const key = `${e.t}-${e.raw ? e.raw.id : i}`;
            return (
              <div key={key} className="rswipe">
                <div className="rtrash" onClick={ev => { ev.stopPropagation(); deleteRecent(e); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </div>
                <div
                  className={`rcard${swipedKey === key ? ' swiped' : ''}`}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    transform: swipedKey === key ? `scale(${swipeScale})` : undefined,
                  }}
                  onClick={() => handleRecentClick(e, key)}
                  onTouchStart={ev => handleCardTouchStart(key, ev)}
                  onTouchMove={ev => handleCardTouchMove(key, ev)}
                  onTouchEnd={ev => handleCardTouchEnd(key, ev)}
                >
                  <div className={`rico ${e.t}`}>{recentIcon(e.t)}</div>
                  <div className="rbody">
                    <div className="rti">{e.label}</div>
                    {e.sub && <div className="rsub">{e.sub}</div>}
                  </div>
                  <div className="rval">
                    <div className="rvaltime">{fmtFull(e.time)}</div>
                    <div className="rvalago">{elapsedStr(e.time)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 직전 24시간 상세 모달 */}
      {detail24 && (
        <Home24hModal
          type={detail24}
          initialDate={detail24Date}
          initialMode={detail24Mode}
          onClose={() => { setDetail24(null); setDetail24Date(null); }}
        />
      )}
    </>
  );
}
