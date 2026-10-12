import { useEffect, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const completed = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', completed);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', completed);
    };
  }, []);

  const install = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    setError(false);
    try { await prompt.prompt(); }
    catch { setError(true); }
    finally { setPrompt(null); setBusy(false); }
  };

  return { canInstall: !!prompt, installed, busy, error, install };
}
