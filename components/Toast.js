'use client';
import { useApp } from '../lib/store';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast${toast.show ? ' show' : ''}`}>
      <span>{toast.msg}</span>
      {toast.action && (
        <button type="button" className="toast-action" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
