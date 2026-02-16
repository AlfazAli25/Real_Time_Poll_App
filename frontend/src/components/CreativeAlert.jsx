import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const styles = {
  error: {
    ring: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
    iconBg: 'bg-rose-400/20 text-rose-200',
    title: 'Action needed'
  },
  warning: {
    ring: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
    iconBg: 'bg-amber-400/20 text-amber-100',
    title: 'Heads up'
  },
  success: {
    ring: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    iconBg: 'bg-emerald-400/20 text-emerald-100',
    title: 'Success'
  },
  info: {
    ring: 'border-blue-400/40 bg-blue-500/10 text-blue-100',
    iconBg: 'bg-blue-400/20 text-blue-100',
    title: 'Info'
  }
};

function Icon({ type }) {
  if (type === 'success') return <span>✓</span>;
  if (type === 'warning') return <span>!</span>;
  if (type === 'info') return <span>i</span>;
  return <span>×</span>;
}

export default function CreativeAlert({ message, type = 'error', title }) {
  const ref = useRef(null);
  const theme = styles[type] ?? styles.error;

  useLayoutEffect(() => {
    if (!message || !ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: -10, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
  }, [message]);

  if (!message) return null;

  return (
    <div ref={ref} className={`mt-3 rounded-xl border px-3 py-3 ${theme.ring}`} role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${theme.iconBg}`}>
          <Icon type={type} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title || theme.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}
