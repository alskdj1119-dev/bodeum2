'use client';
import { useState, useRef, useEffect } from 'react';

// 네이티브 <input type="datetime-local"|"date"|"time">를 대체하는 앱 자체 날짜/시간 선택 컴포넌트.
// 브라우저가 그리는 기본 달력/시간 팝업은 웹페이지의 CSS·폰트가 전혀 닿지 않는 영역이라
// 앱 디자인(Pretendard 폰트, 뉴모피즘 톤)과 통일하기 위해 직접 구현했다.
// value/onChange 포맷은 기존 네이티브 input과 동일하게 맞춰서 호출부 변경을 최소화한다.
//   mode="datetime" → 'YYYY-MM-DDTHH:mm'
//   mode="date"     → 'YYYY-MM-DD'
//   mode="time"     → 'HH:mm'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n) { return String(n).padStart(2, '0'); }

function daysInMonth(y, mo) { return new Date(y, mo + 1, 0).getDate(); }

function parseValue(value, mode) {
  const now = new Date();
  let y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();
  let h = now.getHours(), mi = now.getMinutes();
  if (value) {
    if (mode === 'time') {
      const [hh, mm] = value.split(':').map(Number);
      if (!isNaN(hh)) h = hh;
      if (!isNaN(mm)) mi = mm;
    } else {
      const [datePart, timePart] = value.split('T');
      const [yy, mm2, dd] = (datePart || '').split('-').map(Number);
      if (yy) { y = yy; mo = mm2 - 1; d = dd; }
      if (timePart) {
        const [hh, mi2] = timePart.split(':').map(Number);
        if (!isNaN(hh)) h = hh;
        if (!isNaN(mi2)) mi = mi2;
      }
    }
  }
  return { y, mo, d, h, mi };
}

function formatValue({ y, mo, d, h, mi }, mode) {
  if (mode === 'time') return `${pad2(h)}:${pad2(mi)}`;
  const datePart = `${y}-${pad2(mo + 1)}-${pad2(d)}`;
  if (mode === 'date') return datePart;
  return `${datePart}T${pad2(h)}:${pad2(mi)}`;
}

function displayText({ y, mo, d, h, mi }, mode, hasValue) {
  if (!hasValue) {
    if (mode === 'date') return '연도. 월. 일.';
    if (mode === 'time') return '--:--';
    return '연도. 월. 일. --:--';
  }
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const datePart = `${y}. ${pad2(mo + 1)}. ${pad2(d)}.`;
  const timePart = `${ampm} ${pad2(h12)}:${pad2(mi)}`;
  if (mode === 'date') return datePart;
  if (mode === 'time') return timePart;
  return `${datePart} ${timePart}`;
}

// 스크롤 목록 한 컬럼(시/분/오전오후 공통) — 열릴 때 선택된 항목을 가운데로 스크롤.
function TimeColumn({ items, selected, onPick }) {
  const ref = useRef(null);
  const selRef = useRef(null);
  useEffect(() => {
    if (selRef.current && ref.current) {
      selRef.current.scrollIntoView({ block: 'center' });
    }
  }, []);
  return (
    <div className="dtp-timecol" ref={ref}>
      {items.map(it => (
        <div
          key={it.value}
          ref={it.value === selected ? selRef : null}
          className={`dtp-timeitem${it.value === selected ? ' on' : ''}`}
          onClick={() => onPick(it.value)}
        >{it.label}</div>
      ))}
    </div>
  );
}

export default function DateTimePicker({ value, onChange, mode = 'datetime', className = '', style }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const parsed = parseValue(value, mode);
  const [viewY, setViewY] = useState(parsed.y);
  const [viewMo, setViewMo] = useState(parsed.mo);
  const hasValue = !!value;

  useEffect(() => {
    if (open) { setViewY(parsed.y); setViewMo(parsed.mo); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // 팝업이 열릴 때, 팝업 전체가 보이도록 감싸는 스크롤 영역(바텀시트 .msheet)을 스크롤해준다.
  // 그렇지 않으면 인풋이 화면 아래쪽에 있을 때 펼쳐진 달력이 시트 밖으로 잘려 보이는 문제가 있었음.
  useEffect(() => {
    if (!open || !popRef.current) return;
    const t = setTimeout(() => {
      popRef.current && popRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  function commit(patch) {
    onChange(formatValue({ ...parsed, ...patch }, mode));
  }

  function prevMonth() {
    let y = viewY, mo = viewMo - 1;
    if (mo < 0) { mo = 11; y -= 1; }
    setViewY(y); setViewMo(mo);
  }
  function nextMonth() {
    let y = viewY, mo = viewMo + 1;
    if (mo > 11) { mo = 0; y += 1; }
    setViewY(y); setViewMo(mo);
  }
  function goToday() {
    const now = new Date();
    setViewY(now.getFullYear()); setViewMo(now.getMonth());
    commit({ y: now.getFullYear(), mo: now.getMonth(), d: now.getDate() });
  }

  const showCalendar = mode !== 'time';
  const showTime = mode !== 'date';

  const firstWeekday = new Date(viewY, viewMo, 1).getDay();
  const total = daysInMonth(viewY, viewMo);
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d) => d != null && viewY === today.getFullYear() && viewMo === today.getMonth() && d === today.getDate();
  const isSelected = (d) => hasValue && d != null && showCalendar && viewY === parsed.y && viewMo === parsed.mo && d === parsed.d;

  const hourItems = Array.from({ length: 24 }, (_, h) => {
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { value: h, label: pad2(h12), ampm };
  }).filter(it => it.ampm === (parsed.h < 12 ? '오전' : '오후'));
  const minuteItems = Array.from({ length: 60 }, (_, m) => ({ value: m, label: pad2(m) }));
  const ampmItems = [{ value: 'am', label: '오전' }, { value: 'pm', label: '오후' }];

  return (
    <div className="dtp-wrap" style={style} ref={wrapRef}>
      <button type="button" className={`finp dtp-btn ${className}`} onClick={() => setOpen(o => !o)}>
        <span className={hasValue ? '' : 'dtp-placeholder'}>{displayText(parsed, mode, hasValue)}</span>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" />
        </svg>
      </button>

      {open && (
        <div className="dtp-pop" ref={popRef}>
          {showCalendar && (
            <div className="dtp-cal">
              <div className="dtp-cal-head">
                <span className="dtp-cal-title">{viewY}년 {viewMo + 1}월</span>
                <div className="dtp-cal-nav">
                  <button type="button" onClick={prevMonth} aria-label="이전 달">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button type="button" onClick={nextMonth} aria-label="다음 달">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
              </div>
              <div className="dtp-cal-wd">{WEEKDAYS.map(w => <span key={w}>{w}</span>)}</div>
              <div className="dtp-cal-grid">
                {cells.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={d == null}
                    className={`dtp-cal-cell${isToday(d) ? ' today' : ''}${isSelected(d) ? ' selected' : ''}`}
                    onClick={() => d != null && pickDate(d)}
                  >{d || ''}</button>
                ))}
              </div>
            </div>
          )}

          {showTime && (
            <div className="dtp-time">
              <TimeColumn
                items={hourItems.map(it => ({ value: it.value, label: it.label }))}
                selected={parsed.h}
                onPick={(h) => commit({ h })}
              />
              <TimeColumn
                items={minuteItems}
                selected={parsed.mi}
                onPick={(mi) => commit({ mi })}
              />
              <TimeColumn
                items={ampmItems}
                selected={parsed.h < 12 ? 'am' : 'pm'}
                onPick={(v) => {
                  const isPm = parsed.h >= 12;
                  const wantPm = v === 'pm';
                  if (isPm === wantPm) return;
                  const h12 = parsed.h % 12 === 0 ? 12 : parsed.h % 12;
                  const newH = wantPm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                  commit({ h: newH });
                }}
              />
            </div>
          )}

          <div className="dtp-foot">
            <button type="button" className="dtp-foot-clear" onClick={() => { onChange(''); setOpen(false); }}>삭제</button>
            <button type="button" className="dtp-foot-today" onClick={goToday}>오늘</button>
          </div>
        </div>
      )}
    </div>
  );

  function pickDate(d) {
    commit({ y: viewY, mo: viewMo, d });
  }
}
