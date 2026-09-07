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

const FORMAT_OPTS = [
  { code: 'both', label: 'JSON + CSV' },
  { code: 'json', label: 'JSON만' },
  { code: 'csv',  label: 'CSV만' },
];

function fmtDT(iso) {
  if (!iso) return '';
  const d = kstDate(new Date(iso).getTime());
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function feedDetail(f) {
  const base = FEED_TYPE_LABEL[f.type] || '수유';
  const sub = f.subtype ? FEED_SUBTYPE_LABEL[f.subtype] : '';
  const label = sub ? `${base} · ${sub}` : base;
  const amt = feedAmountMl(f);
  const amtStr = f.consumedAmount != null && amt != null ? `준비 ${amt}ml / 섭취 ${f.consumedAmount}ml`
    : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
    : amt ? `${amt}ml` : '';
  let durMs = null;
  if (f.sideTimes) durMs = Object.values(f.sideTimes).reduce((acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0);
  else if (f.start && f.end) durMs = new Date(f.end) - new Date(f.start);
  const dur = durMs ? durStr(durMs) : '';
  const side = f.side ? FEED_SIDE_LABEL[f.side] : '';
  return [label, amtStr, dur, side, f.note || ''].filter(Boolean).join(' · ');
}

function diaperDetail(d) {
  const base = DIAPER_TYPE_LABEL[d.type] || d.type;
  const color = d.color ? DIAPER_COLOR_LABEL[d.color] : '';
  const cons = d.consistency ? DIAPER_CONSISTENCY_LABEL[d.consistency] : '';
  const rash = d.rash ? '기저귀 발진' : '';
  return [base, color, cons, rash, d.note || ''].filter(Boolean).join(' · ');
}

function sleepDetail(s) {
  const place = s.place ? SLEEP_PLACE_LABEL[s.place] : '';
  const dur = (s.start && s.end) ? durStr(new Date(s.end) - new Date(s.start)) : '진행 중';
  return ['수면', place, dur, s.note || ''].filter(Boolean).join(' · ');
}

function tempDetail(t) {
  const method = t.method ? TEMP_METHOD_LABEL[t.method] : '';
  return [`체온 ${t.temp}℃`, method, t.note || ''].filter(Boolean).join(' · ');
}

function solidDetail(s) {
  const reaction = s.reaction ? SOLID_REACTION_LABEL[s.reaction] : '';
  const amt = s.amount != null ? `${s.amount}g` : '';
  return [s.food, amt, reaction, s.note || ''].filter(Boolean).join(' · ');
}

function visitDetail(v) {
  const followUp = v.followUpDate ? `다음 방문 ${v.followUpDate}` : '';
  return [v.hospital, v.reason, v.diagnosis, v.prescription, followUp, v.note].filter(Boolean).join(' · ');
}

function symptomDetail(s) {
  const med = s.medicine ? `${s.medicine}${s.dose ? ' ' + s.dose : ''}` : '';
  return [s.symptom, med, s.resolved ? '호전됨' : '진행 중', s.note].filter(Boolean).join(' · ');
}

// 모든 기록 카테고리를 "날짜 · 카테고리 · 내용" 한 줄짜리 표로 합친다 (CSV용).
function buildRows(data, teethStatus, vaccineStatus) {
  const rows = [];
  (data.feeds || []).forEach(f => rows.push({ date: fmtDT(f.start || f.time), category: '수유', detail: feedDetail(f) }));
  (data.diapers || []).forEach(d => rows.push({ date: fmtDT(d.time), category: '기저귀', detail: diaperDetail(d) }));
  (data.sleeps || []).forEach(s => rows.push({ date: fmtDT(s.start), category: '수면', detail: sleepDetail(s) }));
  (data.weights || []).forEach(w => rows.push({ date: fmtDT(w.time), category: '체중', detail: `${w.kg}kg` }));
  (data.heights || []).forEach(h => rows.push({ date: fmtDT(h.time), category: '키', detail: `${h.cm}cm` }));
  (data.headCircs || []).forEach(c => rows.push({ date: fmtDT(c.time), category: '머리둘레', detail: `${c.cm}cm` }));
  (data.temps || []).forEach(t => rows.push({ date: fmtDT(t.time), category: '체온', detail: tempDetail(t) }));
  (data.solids || []).forEach(s => rows.push({ date: fmtDT(s.time), category: '이유식', detail: solidDetail(s) }));
  (data.visits || []).forEach(v => rows.push({ date: fmtDT(v.time), category: '병원방문', detail: visitDetail(v) }));
  (data.symptoms || []).forEach(s => rows.push({ date: fmtDT(s.time), category: '증상·투약', detail: symptomDetail(s) }));

  Object.entries(teethStatus || {}).forEach(([id, v]) => {
    const info = normalizeToothInfo(v);
    if (!info) return;
    const tooth = ALL_TEETH.find(t => t.id === id);
    const label = tooth?.label || id;
    rows.push({ date: info.date, category: '치아', detail: `${label} 남` });
    (info.records || []).forEach(r => rows.push({
      date: r.date, category: '치아',
      detail: `${label} · ${RECORD_TYPE_LABEL[r.type] || r.type}${r.memo ? ' · ' + r.memo : ''}`,
    }));
  });

  Object.entries(vaccineStatus || {}).forEach(([code, v]) => {
    const info = typeof v === 'string' ? { status: v, doneDate: '' } : (v || {});
    if (info.status === 'done' && info.doneDate) {
      rows.push({ date: info.doneDate, category: '예방접종', detail: `${VACCINE_NAME[code] || code} 접종완료` });
    }
  });

  rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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

  function exportCSV(data) {
    const rows = buildRows(data, teethStatus, vaccineStatus);
    const lines = [['날짜', '카테고리', '내용'].join(',')]
      .concat(rows.map(r => [csvCell(r.date), csvCell(r.category), csvCell(r.detail)].join(',')));
    // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
    download(fileName('csv'), '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }

  function handleDownload() {
    const data = buildDataset();
    const total = CATEGORIES.reduce((acc, k) => acc + data[k].length, 0)
      + Object.keys(teethStatus || {}).length + Object.keys(vaccineStatus || {}).length;
    if (total === 0) {
      showToast('내려받을 기록이 없어요');
      return;
    }
    if (format === 'json' || format === 'both') exportJSON(data);
    if (format === 'csv' || format === 'both') exportCSV(data);
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
          <b>CSV</b> — 날짜순으로 한 줄씩 정리한 표, 엑셀/구글시트로 열어 병원에 보여드리기 좋아요.
        </div>

        <button className="bpri" style={{ width: '100%' }} onClick={handleDownload}>
          다운로드
        </button>
      </div>
    </>
  );
}
