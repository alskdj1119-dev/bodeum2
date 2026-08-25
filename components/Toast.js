'use client';
import { useApp } from '../lib/store';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast${toast.show ? ' show' : ''}`}>{toast.msg}</div>
  );
}
