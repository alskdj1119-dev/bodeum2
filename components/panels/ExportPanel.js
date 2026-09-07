'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  p2, kstDate, durStr, feedAmountMl,
  FEED_TYPE_LABEL, FEED_SUBTYPE_LABEL, FEED_SIDE_LABEL,
  DIAPER_TYPE_LABEL, DIAPER_COLOR_LABEL, DIAPER_CONSISTENCY_LABEL,
  SLEEP_PLACE_LABEL, SOLID_REACTION_LABEL, TEMP_METHOD_LABEL,
} from '../../lib/helpers';
import { ALL_TEETH, normalizeToothInfo } from '../charts/TeethChart';

const RECORD_TYPE_LABEL = { treatment: '치료', note: '특이사항', extracted: '발치' };
const VACCINE_NAME = {
  hepb1: 'B형간염 1차', bcg: 'BCG (결핵)', hepb2: 'B형간염 2차', dtap1: 'DTaP 1차', ipv1: 'IPV (폴리오) 1차',
  hib1: 'Hib 1차', pcv1: '폐렴구균 1차', rota1: '로타바이러스 1차', hepb3: 'B형간염 3차', dtap3: 'DTaP 3차',
  hib3: 'Hib 3차', pcv3: '폐렴구균 3차', hepa1: 'A형간염 1차', mmr1: 'MMR 1차', var: '수두', je1: '일본뇌염 1차',
};
const VACCINE_STATUS_LABEL = { done: '접종완료', skip: '미접종', before: '접종이전' };

const FORMAT_OPTS = [
  { code: 'both',  label: 'JSON + 엑셀' },
  { code: 'json',  label: 'JSON만' },
  { code: 'excel', label: '엑셀만' },
];

function splitDT(iso) {
  if (!iso) return { date: '', time: '' };
  const d = kstDate(new Date(iso).getTime());
  return {
    date: `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`,
    time: `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`,
  };
}

function download(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── 카테고리별 상세 컬럼으로 나눈 행(row) 빌더들 (엑셀 시트용) ──
function feedRow(f) {
  const { date, time } = splitDT(f.start || f.time);
  const amt = feedAmountMl(f);
  let durMs = null;
  if (f.sideTimes) durMs = Object.values(f.sideTimes).reduce((acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0);
  else if (f.start && f.end) durMs = new Date(f.end) - new Date(f.start);
  return {
    날짜: date, 시간: time,
    종류: FEED_TYPE_LABEL[f.type] || f.type || '',
    세부: f.subtype ? (FEED_SUBTYPE_LABEL[f.subtype] || '') : '',
    방향: f.side ? (FEED_SIDE_LABEL[f.side] || '') : '',
    '준비량(ml)': amt ?? '',
    '섭취량(ml)': f.consumedAmount ?? '',
    수유시간: durMs ? durStr(durMs) : '',
    메모: f.note || '',
  };
}

function diaperRow(d) {
  const { date, time } = splitDT(d.time);
  return {
    날짜: date, 시간: time,
    구분: DIAPER_TYPE_LABEL[d.type] || d.type || '',
    색상: d.color ? (DIAPER_COLOR_LABEL[d.color] || '') : '',
    상태: d.consistency ? (DIAPER_CONSISTENCY_LABEL[d.consistency] || '') : '',
    발진: d.rash ? 'Y' : '',
    메모: d.note || '',
  };
}

function sleepRow(s) {
  const start = splitDT(s.start);
  const end = splitDT(s.end);
  const dur = (s.start && s.end) ? durStr(new Date(s.end) - new Date(s.start)) : '진행 중';
  return {
    날짜: start.date, 시작시간: start.time, 종료시간: s.end ? end.time : '',
    장소: s.place ? (SLEEP_PLACE_LABEL[s.place] || '') : '',
    수면시간: dur,
    메모: s.note || '',
  };
}

function weightRow(w) { const { date, time } = splitDT(w.time); return { 날짜: date, 시간: time, '체중(kg)': w.kg ?? '' }; }
function heightRow(h) { const { date, time } = splitDT(h.time); return { 날짜: date, 시간: time, '키(cm)': h.cm ?? '' }; }
function headCircRow(c) { const { date, time } = splitDT(c.time); return { 날짜: date, 시간: time, '머리둘레(cm)': c.cm ?? '' }; }

function tempRow(t) {
  const { date, time } = splitDT(t.time);
  return { 날짜: date, 시간: time, '체온(℃)': t.temp ?? '', 측정부위: t.method ? (TEMP_METHOD_LABEL[t.method] || '') : '', 메모: t.note || '' };
}

function solidRow(s) {
  const { date, time } = splitDT(s.time);
  return { 날짜: date, 시간: time, 음식: s.food || '', '양(g)': s.amount ?? '', 반응: s.reaction ? (SOLID_REACTION_LABEL[s.reaction] || '') : '', 메모: s.note || '' };
}

function visitRow(v) {
  const { date, time } = splitDT(v.time);
  return { 날짜: date, 시간: time, 병원명: v.hospital || '', 방문사유: v.reason || '', 진단: v.diagnosis || '', 처방: v.prescription || '', 다음방문일: v.followUpDate || '', 메모: v.note || '' };
}

function symptomRow(s) {
  const { date, time } = splitDT(s.time);
  return { 날짜: date, 시간: time, 증상: s.symptom || '', 약물: s.medicine || '', 용량: s.dose || '', 호전여부: s.resolved ? '호전됨' : '진행 중', 메모: s.note || '' };
}

function buildTeethRows(teethStatus) {
  const rows = [];
  ALL_TEETH.forEach(t => {
    const info = normalizeToothInfo(teethStatus?.[t.id]);
    if (!info) return;
    rows.push({ 치아: t.label, 난날짜: info.date, 기록종류: '남', 기록날짜: info.date, 메모: '' });
    [...info.records].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(r => {
      rows.push({ 치아: t.label, 난날짜: info.date, 기록종류: RECORD_TYPE_LABEL[r.type] || r.type, 기록날짜: r.date, 메모: r.memo || '' });
    });
  });
  return rows;
}

function buildVaccineRows(vaccineStatus) {
  const rows = [];
  Object.entries(vaccineStatus || {}).forEach(([code, v]) => {
    const info = typeof v === 'string' ? { status: v, doneDate: '' } : (v || {});
    rows.push({
      백신명: VACCINE_NAME[code] || code,
      상태: VACCINE_STATUS_LABEL[info.status] || '접종이전',
      접종완료일: info.doneDate || '',
    });
  });
  return rows;
}

export default function ExportPanel() {
  const { db, baby, teethStatus, vaccineStatus, filterByActiveBaby, showToast } = useApp();
  const [format, setFormat] = useState('both');

  const CATEGORIES = ['feeds', 'diapers', 'sleeps', 'weights', 'temps', 'solids', 'visits', 'symptoms', 'heights', 'headCircs'];

  function buildDataset() {
    const data = {};
    CATEGORIES.forEach(k => { data[k] = filterByActiveBaby(db[k] || []); });
    return data;
  }

  function fileName(ext) {
    const name = (baby?.name || '아기').replace(/[^\w가-힣]/g, '') || '아기';
    const date = kstDate(Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
    return `보듬_${name}_기록_${date}.${ext}`;
  }

  function exportJSON(data) {
    const payload = {
      exportedAt: new Date().toISOString(),
      baby: { name: baby?.name, birthDate: baby?.birthDate, gender: baby?.gender },
      records: data,
      teethStatus: teethStatus || {},
      vaccineStatus: vaccineStatus || {},
    };
    download(fileName('json'), JSON.stringify(payload, null, 2), 'application/json');
  }

  // 카테고리별로 시트를 나눈 엑셀(.xlsx) 파일 생성. 라이브러리는 다운로드 시점에만 불러와
  // (동적 import) 이 화면을 쓰지 않는 사람의 초기 로딩 용량에는 영향이 없게 한다.
  async function exportExcel(data) {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const addSheet = (name, rows) => {
      const sheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['기록 없음']]);
      XLSX.utils.book_append_sheet(wb, sheet, name);
    };
    addSheet('수유', data.feeds.map(feedRow));
    addSheet('기저귀', data.diapers.map(diaperRow));
    addSheet('수면', data.sleeps.map(sleepRow));
    addSheet('체중', data.weights.map(weightRow));
    addSheet('키', data.heights.map(heightRow));
    addSheet('머리둘레', data.headCircs.map(headCircRow));
    addSheet('체온', data.temps.map(tempRow));
    addSheet('이유식', data.solids.map(solidRow));
    addSheet('병원방문', data.visits.map(visitRow));
    addSheet('증상투약', data.symptoms.map(symptomRow));
    addSheet('치아', buildTeethRows(teethStatus));
    addSheet('예방접종', buildVaccineRows(vaccineStatus));
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(fileName('xlsx'), new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }

  async function handleDownload() {
    const data = buildDataset();
    const total = CATEGORIES.reduce((acc, k) => acc + data[k].length, 0)
      + Object.keys(teethStatus || {}).length + Object.keys(vaccineStatus || {}).length;
    if (total === 0) {
      showToast('내려받을 기록이 없어요');
      return;
    }
    if (format === 'json' || format === 'both') exportJSON(data);
    if (format === 'excel' || format === 'both') await exportExcel(data);
    showToast('다운로드가 시작됐어요');
  }

  return (
    <>
      <span className="logtitle" style={{ display: 'block', marginBottom: 16 }}>기록 내보내기</span>

      <div className="setup-card" style={{ width: '100%', maxWidth: 'none', padding: '20px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          {baby?.name || '아이'}의 전체 기록을 파일로 저장해요
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
          수유·기저귀·수면·체온·이유식·병원방문·증상투약·치아·예방접종·키·몸무게·머리둘레 등 지금까지 쌓인 모든 기록(삭제된 항목 제외)을 내려받아요.
          병원 진료 때 보여드리거나, AI 분석에 활용하기 좋아요. 파일은 서버를 거치지 않고 이 기기에서 바로 만들어져요.
        </div>

        <div className="fld">
          <div className="flbl">저장 형식</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {FORMAT_OPTS.map(opt => (
              <button
                key={opt.code}
                className={`sbtn${format === opt.code ? ' on' : ''}`}
                onClick={() => setFormat(opt.code)}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', margin: '10px 0 16px', lineHeight: 1.6 }}>
          <b>JSON</b> — 모든 원본 데이터를 그대로 담은 백업 파일, AI 분석에 붙여넣기 좋아요.<br/>
          <b>엑셀</b> — 카테고리별로 시트가 나뉘고, 입력값도 세부 항목별 열로 정리돼요. 병원 진료 때 보여드리기 좋아요.
        </div>

        <button className="bpri" style={{ width: '100%' }} onClick={handleDownload}>
          다운로드
        </button>
      </div>
    </>
  );
}
