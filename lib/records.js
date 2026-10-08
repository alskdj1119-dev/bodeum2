// 가족 문서에서 빼 내는 기록 종류. 각 항목은 families/{code}/{kind}/{id} 문서 하나다.
export const RECORD_KEYS = ['feeds', 'diapers', 'sleeps', 'weights', 'temps', 'solids', 'visits', 'symptoms', 'heights', 'headCircs', 'trash'];

export function cleanRecords(list) {
  return JSON.parse(JSON.stringify(list || []));
}

export function listsFromFamily(data) {
  const out = {};
  for (const key of RECORD_KEYS) out[key] = data && Array.isArray(data[key]) ? data[key] : [];
  return out;
}

export function hasLegacyRecords(data) {
  return RECORD_KEYS.some((key) => Array.isArray(data && data[key]) && data[key].length > 0);
}

function babyKey(item, firstId) {
  return (item && item.babyId) || firstId || '_all';
}

export function buildRecordSummary(db, babies) {
  const firstId = babies && babies[0] && babies[0].id;
  const groups = new Map();
  function bucket(item) {
    const id = babyKey(item, firstId);
    if (!groups.has(id)) groups.set(id, { feeds: [], diapers: [], sleeps: [] });
    return groups.get(id);
  }
  for (const item of (db && db.feeds) || []) bucket(item).feeds.push(item);
  for (const item of (db && db.diapers) || []) bucket(item).diapers.push(item);
  for (const item of (db && db.sleeps) || []) bucket(item).sleeps.push(item);
  const byBaby = {};
  for (const [id, group] of groups) {
    const ended = group.feeds.filter((f) => f.end && f.start).sort((a, b) => (a.start < b.start ? 1 : -1));
    const activeFeed = group.feeds.find((f) => f.start && !f.end);
    const diapers = [...group.diapers].sort((a, b) => ((a.time || '') < (b.time || '') ? 1 : -1));
    const activeSleep = group.sleeps.find((s) => s.start && !s.end);
    byBaby[id] = {
      lastFeedTime: ended[0] ? ended[0].start : null,
      activeFeedStart: activeFeed ? activeFeed.start : null,
      lastDiaperTime: diapers[0] ? diapers[0].time : null,
      activeSleepStart: activeSleep ? activeSleep.start : null,
    };
  }
  return { byBaby };
}

export function diffList(prev, next) {
  const prevMap = new Map((prev || []).filter((x) => x && x.id).map((x) => [x.id, x]));
  const nextMap = new Map((next || []).filter((x) => x && x.id).map((x) => [x.id, x]));
  const upserts = [];
  const deletes = [];
  for (const [id, item] of nextMap) {
    const old = prevMap.get(id);
    if (!old || JSON.stringify(old) !== JSON.stringify(item)) upserts.push(item);
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) deletes.push(id);
  }
  return { upserts, deletes };
}
