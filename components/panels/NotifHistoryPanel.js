'use client';
import { useApp } from '../../lib/store';
import { fmtFull, elapsedStr } from '../../lib/helpers';

const KEY_LABEL = {
  hunger: '배고픔',
  feedTimer: '수유 타이머',
  sleepTimer: '수면 타이머',
  diaper: '기저귀',
};
const KEY_DOT = {
  hunger: 'f',
  feedTimer: 'f',
  sleepTimer: 's',
  diaper: 'd',
};

export default function NotifHistoryPanel() {
  const { notifLog } = useApp();
  const sorted = [...(notifLog || [])].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">알림 내역</span>
        <span className="badge">{sorted.length}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🔔</div>
          <div className="empty-lbl">아직 발송된 알림이 없어요</div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.5' }}>
            최근 발송된 알림 {sorted.length}건이에요. 최대 50건까지 보관돼요.
          </p>
          {sorted.map((n, i) => (
            <div key={`${n.sentAt}-${i}`} className="ec" style={{ alignItems: 'flex-start' }}>
              <div className={`edot ${KEY_DOT[n.key] || 'f'}`} style={{ marginTop: '4px' }}></div>
              <div className="emain" style={{ flex: 1, minWidth: 0 }}>
                <div className="epri">
                  <span style={{ fontSize: '11px', background: 'var(--bdr)', borderRadius: '4px', padding: '1px 5px', marginRight: '6px' }}>
                    {KEY_LABEL[n.key] || n.key}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'pre-line', marginTop: '4px', lineHeight: '1.4' }}>
                  {n.body}
                </div>
                <div className="esec" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {fmtFull(n.sentAt)} ({elapsedStr(n.sentAt)})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
