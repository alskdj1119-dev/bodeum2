'use client';
import { useApp } from '../../lib/store';
import {
  fmtFull, elapsedStr, durStr, fmt, useNowTick,
  FEED_TYPE_LABEL as TF, FEED_SUBTYPE_LABEL as TSU, DIAPER_TYPE_LABEL as TD,
  SOLID_REACTION_LABEL as TSR,
} from '../../lib/helpers';

const TYPE_LABEL = {
  feeds: '수유',
  diapers: '기저귀',
  sleeps: '수면',
  weights: '체중',
  temps: '체온',
  solids: '이유식',
};
const TYPE_DOT = {
  feeds: 'f',
  diapers: 'd',
  sleeps: 's',
  weights: 'w',
  temps: 'w',
  solids: 'n',
};
function itemSummary(item) {
  const t = item._type;
  if (t === 'feeds') {
    const base = TF[item.type] || '수유';
    const sub = item.subtype ? ` · ${TSU[item.subtype] || ''}` : '';
    const timeStr = item.start ? fmtFull(item.start) : '';
    const dur = item.start && item.end ? ' · ' + durStr(new Date(item.end) - new Date(item.start)) : '';
    return `${base}${sub} — ${timeStr}${dur}`;
  }
  if (t === 'diapers') {
    return `${TD[item.type] || '기저귀'} — ${fmtFull(item.time)}`;
  }
  if (t === 'sleeps') {
    const dur = item.start && item.end ? durStr(new Date(item.end) - new Date(item.start)) : '-';
    const range = item.start && item.end ? ` (${fmt(item.start)} → ${fmt(item.end)})` : '';
    return `수면 ${dur}${range}`;
  }
  if (t === 'weights') {
    return `체중 ${item.kg != null ? item.kg.toFixed(2) + 'kg' : '—'} — ${fmtFull(item.time)}`;
  }
  if (t === 'temps') {
    return `체온 ${item.temp != null ? item.temp.toFixed(1) + '°C' : '—'} — ${fmtFull(item.time)}`;
  }
  if (t === 'solids') {
    const reaction = item.reaction ? ` · ${TSR[item.reaction] || ''}` : '';
    return `${item.food || '이유식'}${reaction} — ${fmtFull(item.time)}`;
  }
  return '기록';
}

export default function TrashPanel() {
  const { db, dispatch, saveDB, showToast } = useApp();
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록
  const trash = db.trash || [];

  const sorted = [...trash].sort((a, b) => new Date(b._deletedAt) - new Date(a._deletedAt));

  async function restore(trashItem) {
    const { _deletedAt, _type, ...original } = trashItem;
    const newTrash = trash.filter(x => !(x.id === trashItem.id && x._type === _type && x._deletedAt === _deletedAt));
    const collection = db[_type] || [];
    const restored = [original, ...collection];
    const newDB = { ...db, [_type]: restored, trash: newTrash };

    dispatch({ type: 'SET_TRASH', payload: newTrash });
    switch (_type) {
      case 'feeds':   dispatch({ type: 'SET_FEEDS',   payload: restored }); break;
      case 'diapers': dispatch({ type: 'SET_DIAPERS', payload: restored }); break;
      case 'sleeps':  dispatch({ type: 'SET_SLEEPS',  payload: restored }); break;
      case 'weights': dispatch({ type: 'SET_WEIGHTS', payload: restored }); break;
      case 'temps':   dispatch({ type: 'SET_TEMPS',   payload: restored }); break;
      case 'solids':  dispatch({ type: 'SET_SOLIDS',  payload: restored }); break;
    }
    await saveDB(newDB);
    showToast('복원됐어요 ✓');
  }

  async function clearAll() {
    if (!window.confirm('삭제 기록을 모두 비울까요?\n복원할 수 없어요.')) return;
    const newDB = { ...db, trash: [] };
    dispatch({ type: 'SET_TRASH', payload: [] });
    await saveDB(newDB);
    showToast('삭제 기록을 비웠어요');
  }

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">삭제 기록</span>
        <span className="badge">{sorted.length}</span>
        {sorted.length > 0 && (
          <button className="addbtn" style={{ color: 'var(--cd)' }} onClick={clearAll}>
            모두 비우기
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🗑️</div>
          <div className="empty-lbl">삭제된 기록이 없어요</div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.5' }}>
            삭제된 기록은 여기서 확인하고 복원할 수 있어요.
          </p>
          {sorted.map((item) => {
            const dotClass = TYPE_DOT[item._type] || 'f';
            return (
              <div key={`${item._type}-${item.id}-${item._deletedAt}`} className="ec" style={{ alignItems: 'flex-start' }}>
                <div className={`edot ${dotClass}`} style={{ marginTop: '4px', opacity: 0.5 }}></div>
                <div className="emain" style={{ flex: 1, minWidth: 0 }}>
                  <div className="epri" style={{ opacity: 0.7 }}>
                    <span style={{ fontSize: '11px', background: 'var(--bdr)', borderRadius: '4px', padding: '1px 5px', marginRight: '6px' }}>
                      {TYPE_LABEL[item._type] || item._type}
                    </span>
                    {itemSummary(item)}
                  </div>
                  <div className="esec" style={{ fontSize: '11px' }}>
                    삭제: {fmtFull(item._deletedAt)} ({elapsedStr(item._deletedAt)})
                  </div>
                </div>
                <button
                  onClick={() => restore(item)}
                  style={{
                    flexShrink: 0,
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1.5px solid var(--sage)',
                    background: 'transparent',
                    color: 'var(--sage)',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  복원
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
