'use client';
import { AppProvider } from '../lib/store';
import BodeumApp from '../components/BodeumApp';

export default function Home() {
  return (
    <AppProvider>
      <BodeumApp />
    </AppProvider>
  );
}
