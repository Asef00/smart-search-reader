import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useInstall } from '../hooks/useInstall';
import { Icon } from './Icon';

export function AppStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [failed, setFailed] = useState(false);
  const { offlineReady: [ready], needRefresh: [refresh, setRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: () => setFailed(true),
  });
  const installation = useInstall();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const status = failed ? 'ذخیرهٔ آفلاین انجام نشد' : !online ? 'در حال مطالعهٔ آفلاین'
    : ready ? 'آمادهٔ استفادهٔ آفلاین' : 'متن‌خوان هوشمند';

  return <div className="app-status">
    <span className={`connection ${failed ? 'connection-warning' : ''}`} role="status"><i />{status}</span>
    {!installation.installed && (installation.canInstall
      ? <button className="install-button" onClick={() => void installation.install()} disabled={installation.busy}>
        <Icon name="download" size={17} />نصب برنامه
      </button>
      : <details className="install-help"><summary><Icon name="download" size={17} />راهنمای نصب</summary>
        <div className="install-popover">
          <strong>متن‌خوان روی دستگاه شما</strong>
          <p>در iPhone یا iPad، از منوی اشتراک‌گذاری Safari گزینهٔ Add to Home Screen را بزنید.</p>
          <p>در مرورگرهای پشتیبان Android و دسکتاپ، گزینهٔ Install app یا نصب برنامه را از منوی مرورگر انتخاب کنید.</p>
          <small>اگر گزینهٔ نصب وجود ندارد، می‌توانید برنامه را در مرورگر استفاده کنید.</small>
        </div>
      </details>)}
    {installation.error && <p className="status-notice" role="alert">نصب انجام نشد؛ از منوی مرورگر دوباره امتحان کنید.</p>}
    {refresh && <div className="update-notice" role="status">
      <span>نسخهٔ تازه‌ای آماده است.</span>
      <button onClick={() => { void updateServiceWorker(true).catch(() => setFailed(true)); }}>به‌روزرسانی</button>
      <button aria-label="بستن پیام به‌روزرسانی" onClick={() => setRefresh(false)}><Icon name="close" size={16} /></button>
    </div>}
  </div>;
}
