'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/store';

const GENDER_OPTS = [
  { code: '',     label: '미설정' },
  { code: 'boy',  label: '남아' },
  { code: 'girl', label: '여아' },
];

const emptyForm = { id: null, name: '', prenatal: '', birthDate: '', birthTime: '', birthWeight: '', gender: '' };

export default function BabyInfoPanel() {
  const { baby, babies, activeBabyId, saveBaby, switchBaby, deleteBaby, showToast } = useApp();

  const [form, setForm] = useState(emptyForm);
  // 사용자가 폼을 직접 수정했으면(다른 아이 편집 중이면) 활성 아이 변경에 폼을 덮어쓰지 않음
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setForm({
      id: baby.id || null,
      name: baby.name || '',
      prenatal: baby.prenatal || '',
      birthDate: baby.birthDate || '',
      birthTime: baby.birthTime || '',
      birthWeight: baby.birthWeight || '',
      gender: baby.gender || '',
    });
  }, [baby]);

  function set(k, v) { dirtyRef.current = true; setForm(p => ({ ...p, [k]: v })); }

  function save() {
    const nb = { ...form, name: (form.name || '').trim() || '아이' };
    saveBaby(nb);
    dirtyRef.current = false;
    showToast(form.id ? '아이 정보가 저장됐어요 ✓' : '아이가 추가됐어요 ✓');
  }

  function startNewBaby() {
    dirtyRef.current = true; // 활성 아이가 바뀌어도(위 useEffect) 새 아이 폼을 덮어쓰지 않도록
    setForm(emptyForm);
  }

  function editBaby(b) {
    dirtyRef.current = true;
    setForm({
      id: b.id, name: b.name || '', prenatal: b.prenatal || '',
      birthDate: b.birthDate || '', birthTime: b.birthTime || '',
      birthWeight: b.birthWeight || '', gender: b.gender || '',
    });
  }

  function selectAsActive(b, e) {
    e.stopPropagation();
    switchBaby(b.id);
    showToast(`${b.name || '아이'}(으)로 전환했어요`);
  }

  function removeBaby(b, e) {
    e.stopPropagation();
    if (!window.confirm(`'${b.name || '아이'}' 정보를 삭제하시겠어요?\n이미 기록된 수유·기저귀·수면 등의 기록은 삭제되지 않고 남아있어요.`)) return;
    deleteBaby(b.id);
    if (form.id === b.id) { dirtyRef.current = false; setForm(emptyForm); }
    showToast('삭제됐어요');
  }

  const isEditingNew = !form.id;

  return (
    <>
      <div className="loghdr">
        <span className="logtitle">아이 정보</span>
      </div>

      {babies.length > 0 && (
        <>
          <p className="seclbl" style={{ marginBottom: 8 }}>등록된 아이</p>
          {babies.map(b => {
            const isActive = b.id === activeBabyId;
            const isEditingThis = b.id === form.id;
            const genderIcon = b.gender === 'boy' ? '👦' : b.gender === 'girl' ? '👧' : '🧒';
            return (
              <div
                key={b.id}
                className="ec"
                style={isEditingThis ? { outline: '2px solid var(--sage)', outlineOffset: -2 } : undefined}
                onClick={() => editBaby(b)}
              >
                <div className="edot" style={{ background: 'transparent', fontSize: 16, width: 20, textAlign: 'center' }}>{genderIcon}</div>
                <div className="emain">
                  <div className="epri">
                    {b.name || '아이'}
                    {isActive && <span style={{ fontSize: 10, background: 'var(--fw)', color: 'var(--sage)', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>보는 중</span>}
                  </div>
                  <div className="esub">{b.birthDate || '생년월일 미입력'}</div>
                </div>
                {!isActive && (
                  <button className="bcan" style={{ padding: '5px 10px', fontSize: 11, marginRight: 6 }} onClick={(e) => selectAsActive(b, e)}>전환</button>
                )}
                <button className="edel" onClick={(e) => removeBaby(b, e)}>
                  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            );
          })}
          <button className="bcan" style={{ width: '100%', marginTop: 4, marginBottom: 20 }} onClick={startNewBaby}>
            + 새 아기 추가
          </button>
        </>
      )}

      <p className="seclbl" style={{ marginBottom: 8 }}>
        {isEditingNew ? '새 아이 정보' : `${form.name || '아이'} 정보 수정`}
      </p>

      <div className="fld">
        <div className="flbl">이름</div>
        <input className="finp finp-white" value={form.name} onChange={e => set('name', e.target.value)} placeholder="아기 이름" />
      </div>
      <div className="fld">
        <div className="flbl">태명</div>
        <input className="finp finp-white" value={form.prenatal} onChange={e => set('prenatal', e.target.value)} placeholder="태명 (선택)" />
      </div>
      <div className="fld">
        <div className="flbl">성별</div>
        <div className="seg">
          {GENDER_OPTS.map(opt => (
            <button key={opt.code || 'none'} className={`sbtn${form.gender === opt.code ? ' on' : ''}`}
              onClick={() => set('gender', opt.code)}>{opt.label}</button>
          ))}
        </div>
      </div>
      <div className="fld">
        <div className="flbl">생년월일</div>
        <input className="finp finp-white" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 시간</div>
        <input className="finp finp-white" type="time" value={form.birthTime} onChange={e => set('birthTime', e.target.value)} />
      </div>
      <div className="fld">
        <div className="flbl">출생 체중 (kg)</div>
        <input className="finp finp-white" type="number" step="0.001" value={form.birthWeight} onChange={e => set('birthWeight', e.target.value)} placeholder="예: 3.250" />
      </div>
      <button className="bpri" style={{ width: '100%' }} onClick={save}>
        {isEditingNew ? '아이 추가' : '아이 정보 저장'}
      </button>
    </>
  );
}
