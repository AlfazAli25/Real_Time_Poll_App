import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import AnimatedBackground from './components/AnimatedBackground';
import CreatePollPage from './pages/CreatePollPage';
import PollPage from './pages/PollPage';

function NotFoundPage() {
  return (
    <div className="panel mx-auto max-w-4xl shadow-glow">
      <h2 className="display-font text-xl font-semibold text-slate-100">Page not found</h2>
      <p className="mt-2 text-slate-300">The page you requested does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-blue-300 transition hover:text-blue-200">
        Go back
      </Link>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const routeRef = useRef(null);

  useLayoutEffect(() => {
    if (!routeRef.current) return;
    gsap.fromTo(routeRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen px-4 py-6 sm:px-6">
      <AnimatedBackground />
      <header className="mx-auto mb-6 max-w-4xl rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="display-font text-xl font-semibold tracking-tight text-slate-100 transition hover:text-blue-300">
              Poll Rooms
            </Link>
            <p className="text-xs text-slate-400">Create, share, and track live voting in one beautiful dashboard.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs text-blue-200">Live Results</span>
            <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-3 py-1 text-xs text-slate-300">One vote per user</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl">
        <div ref={routeRef} key={location.pathname}>
          <Routes>
            <Route path="/" element={<CreatePollPage />} />
            <Route path="/poll/:pollId" element={<PollPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
