'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import { fmtFull, elapsedStr, useNowTick, handoffRoleLabel, handoffRoleEmoji } from '../../lib/helpers';

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
const HANDOFF_STATUS_LABEL = {
  active: '대기중',
  snoozed: '다시보기 예약',
  done: '확인 완료',
};

export default function NotifHistoryPanel() {
  const { notifLog, handoffNotes, myRole } = useApp();
  const [tab, setTab] = useState('notif'); // 'notif' | 'handoff'
  const [handoffSub, setHandoffSub] = useState('received'); // 'received' | 'sent'
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록
  const sortedNotif = [...(notifLog || [])].sort((a, b) => b.sentAt - a.sentAt);
  // 내 역할(myRole)이 받는 사람인 메모 = 받은 메시지, 내가 남긴 메모(authorRole===myRole) = 보낸 메시지.
  // 다른 역할끼리 주고받은 메모는 이 기기에서는 보이지 않는다.
  const receivedNotes = (handoffNotes || []).filter((n) => n.targetRole === myRole);
  const sentNotes = (handoffNotes || []).filter((n) => n.authorRole === myRole);
  const sortedHandoff = [...(handoffSub === 'received' ? receivedNotes : sentNotes)].sort((a, b) => b.createdAt - a.createdAt);
  const sorted = tab === 'notif' ? sortedNotif : sortedHandoff;

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">알림 · 메모 내역</span>
        <span className="badge">{sorted.length}</span>
      </div>

      <div className="modetoggle" style={{ marginBottom: tab === 'notif' ? 16 : 10 }}>
        <button
          className={`modetoggle-btn${tab === 'notif' ? ' on' : ''}`}
          onClick={() => setTab('notif')}
          style={tab === 'notif' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
        >알림</button>
        <button
          className={`modetoggle-btn${tab === 'handoff' ? ' on' : ''}`}
          onClick={() => setTab('handoff')}
          style={tab === 'handoff' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
        >잘 부탁해 메모</button>
      </div>

      {tab === 'handoff' && (
        <div className="modetoggle" style={{ marginBottom: 16 }}>
          <button
            className={`modetoggle-btn${handoffSub === 'received' ? ' on' : ''}`}
            onClick={() => setHandoffSub('received')}
            style={handoffSub === 'received' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
          >받은 메시지</button>
          <button
            className={`modetoggle-btn${handoffSub === 'sent' ? ' on' : ''}`}
            onClick={() => setHandoffSub('sent')}
            style={handoffSub === 'sent' ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
          >보낸 메시지</button>
        </div>
      )}

      {!myRole && tab === 'handoff' ? (
        <div className="empty">
          <div className="empty-ico">✎</div>
          <div className="empty-lbl">설정에서 내 역할을 먼저 선택해주세요</div>
        </div>
      ) : tab === 'notif' ? (
        sortedNotif.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🔔</div>
            <div className="empty-lbl">아직 발송된 알림이 없어요</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.5' }}>
              최근 발송된 알림 {sortedNotif.length}건이에요. 최대 50건까지 보관돼요.
            </p>
            {sortedNotif.map((n, i) => (
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
        )
      ) : (
        sortedHandoff.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">✎</div>
            <div className="empty-lbl">{handoffSub === 'received' ? '아직 받은 메모가 없어요' : '아직 보낸 메모가 없어요'}</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.5' }}>
              {handoffSub === 'received' ? '받은' : '보낸'} 메모 {sortedHandoff.length}건이에요. 최대 50건까지 보관돼요.
            </p>
            {sortedHandoff.map((n) => (
              <div key={n.id} className="ec" style={{ alignItems: 'flex-start' }}>
                <div className="edot hn" style={{ marginTop: '4px' }}></div>
                <div className="emain" style={{ flex: 1, minWidth: 0 }}>
                  <div className="epri" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {handoffRoleEmoji(n.authorRole)} {handoffRoleLabel(n.authorRole)} → {handoffRoleEmoji(n.targetRole)} {handoffRoleLabel(n.targetRole)}
                    </span>
                    <span className={`hi-badge ${n.status}`}>{HANDOFF_STATUS_LABEL[n.status] || n.status}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'pre-line', marginTop: '4px', lineHeight: '1.4' }}>
                    {n.text}
                  </div>
                  <div className="esec" style={{ fontSize: '11px', marginTop: '4px' }}>
                    {fmtFull(n.createdAt)} ({elapsedStr(n.createdAt)})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
