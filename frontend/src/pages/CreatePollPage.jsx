import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { createPoll } from '../api';
import CreativeAlert from '../components/CreativeAlert';

const DEFAULT_OPTIONS = ['', ''];

export default function CreatePollPage() {
  const containerRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [expiresInMinutes, setExpiresInMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.create-enter',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const updateOption = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addOption = () => setOptions((prev) => [...prev, '']);

  const removeOption = (index) => {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setCreated(null);

    const trimmedQuestion = question.trim();
    const cleanedOptions = options.map((opt) => opt.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      setError('Question cannot be empty.');
      return;
    }

    if (cleanedOptions.length < 2) {
      setError('Please provide at least two valid options.');
      return;
    }

    const expiry = expiresInMinutes === '' ? null : Number(expiresInMinutes);
    if (expiry !== null && (!Number.isFinite(expiry) || expiry <= 0)) {
      setError('Expiry must be a positive number of minutes.');
      return;
    }

    setLoading(true);

    try {
      const result = await createPoll({
        question: trimmedQuestion,
        options: cleanedOptions,
        expiresInMinutes: expiry
      });
      setCreated(result);
      setQuestion('');
      setOptions(DEFAULT_OPTIONS);
      setExpiresInMinutes('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to create poll.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="panel shadow-glow">
      <div className="create-enter mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display-font text-3xl font-semibold text-slate-100">Create Poll</h2>
          <p className="mt-1 text-sm text-slate-400">Design your question, share link instantly, and watch votes update live.</p>
        </div>
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
          Single-choice · Realtime sync · Fair vote protection
        </div>
      </div>

      <div className="create-enter mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="soft-card hover-lift">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Step 1</p>
          <p className="mt-1 text-sm text-slate-200">Write clear question</p>
        </div>
        <div className="soft-card hover-lift">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Step 2</p>
          <p className="mt-1 text-sm text-slate-200">Add answer options</p>
        </div>
        <div className="soft-card hover-lift">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Step 3</p>
          <p className="mt-1 text-sm text-slate-200">Share and track votes</p>
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={onSubmit}>
        <label className="create-enter block text-sm text-slate-300">
          <span className="mb-2 block">Question</span>
          <input
            className="field"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should we order for lunch?"
            disabled={loading}
          />
        </label>

        <div className="create-enter rounded-2xl border border-slate-700/60 bg-slate-900/45 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="display-font text-sm font-semibold text-slate-200">Options</span>
            <button className="btn-muted" type="button" onClick={addOption} disabled={loading}>
              + Add option
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {options.map((option, index) => (
              <div className="flex items-center gap-2 hover-lift" key={`option-${index}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-700/70 bg-slate-800/70 text-xs text-slate-300">
                  {index + 1}
                </span>
                <input
                  className="field"
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={loading}
                />
                <button className="btn-muted" type="button" onClick={() => removeOption(index)} disabled={loading || options.length <= 2}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="create-enter block text-sm text-slate-300">
          <span className="mb-2 block">Expiry in minutes (optional)</span>
          <input
            className="field"
            type="number"
            min="1"
            value={expiresInMinutes}
            onChange={(event) => setExpiresInMinutes(event.target.value)}
            placeholder="e.g. 60"
            disabled={loading}
          />
        </label>

        <button className="btn create-enter" type="submit" disabled={loading}>
          {loading ? 'Creating poll...' : 'Create poll'}
        </button>
      </form>

      <CreativeAlert message={error} type="error" title="Could not create poll" />

      {created ? (
        <div className="create-enter mt-4 space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm">
          <p className="text-emerald-200">Poll created successfully.</p>
          <a className="block break-all text-blue-300 transition hover:text-blue-200" href={created.shareLink} target="_blank" rel="noreferrer">
            {created.shareLink}
          </a>
          <Link className="mt-1 block text-blue-300 transition hover:text-blue-200" to={`/poll/${created.poll.id}`}>
            Open Room
          </Link>
        </div>
      ) : null}
    </div>
  );
}
