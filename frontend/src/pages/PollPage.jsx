import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, useParams } from 'react-router-dom';
import CreativeAlert from '../components/CreativeAlert';
import PollChart from '../components/PollChart';
import { deletePoll, getPoll, removeVotePoll, votePoll } from '../api';
import { createPollSocket } from '../socket';

function relativeExpiryText(expiresAt) {
  if (!expiresAt) return 'No expiry';
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.ceil(remaining / 60000);
  return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
}

export default function PollPage() {
  const { pollId } = useParams();
  const containerRef = useRef(null);

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteMessage, setVoteMessage] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const isClosed = useMemo(() => !poll || poll.isDeleted || poll.isExpired, [poll]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.poll-enter', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out' });
    }, containerRef);

    return () => ctx.revert();
  }, [pollId]);

  useEffect(() => {
    let active = true;
    const socket = createPollSocket();

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getPoll(pollId);
        if (active) {
          setPoll(response.poll);
          setCanDelete(Boolean(response.canDelete));
          setSelectedOptionId((prev) => prev || response.poll.options[0]?.id || '');
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || 'Unable to load this poll.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    socket.on('connect', () => {
      setDisconnected(false);
      socket.emit('join_poll', pollId);
    });

    socket.on('disconnect', () => {
      setDisconnected(true);
    });

    socket.on('vote_updated', (updatedPoll) => {
      setPoll(updatedPoll);
      setSelectedOptionId((prev) => prev || updatedPoll.options[0]?.id || '');
    });

    socket.on('poll_unavailable', (payload) => {
      setError(payload?.message || 'Poll unavailable.');
    });

    socket.on('poll_deleted', () => {
      setPoll((prev) => (prev ? { ...prev, isDeleted: true } : prev));
      setError('This poll has been deleted. Voting is closed.');
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [pollId]);

  const submitVote = async () => {
    setVoteMessage('');

    if (!selectedOptionId) {
      setVoteMessage('Select an option first.');
      return;
    }

    setVoteLoading(true);
    try {
      const result = await votePoll(pollId, selectedOptionId);
      setPoll(result.poll);
      setCanDelete(Boolean(result.canDelete));
      setVoteMessage(result.message || 'Your vote has been recorded.');
    } catch (requestError) {
      if (!requestError.response) {
        setVoteMessage('Network error. Please check your connection and try again.');
      } else {
        setVoteMessage(requestError.response?.data?.message || 'Vote failed.');
      }
    } finally {
      setVoteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!poll) return;

    setVoteMessage('');
    setVoteLoading(true);
    try {
      await deletePoll(poll.id);
      setPoll((prev) => (prev ? { ...prev, isDeleted: true } : prev));
      setError('Poll deleted successfully.');
    } catch (requestError) {
      setVoteMessage(requestError?.response?.data?.message || 'Delete failed.');
    } finally {
      setVoteLoading(false);
    }
  };

  const handleRemoveVote = async () => {
    setVoteMessage('');
    setVoteLoading(true);
    try {
      const result = await removeVotePoll(pollId);
      setPoll(result.poll);
      setCanDelete(Boolean(result.canDelete));
      setVoteMessage('Your vote has been removed. You can vote again.');
    } catch (requestError) {
      if (!requestError.response) {
        setVoteMessage('Network error. Please check your connection and try again.');
      } else {
        setVoteMessage(requestError.response?.data?.message || 'Remove vote failed.');
      }
    } finally {
      setVoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <p className="text-sm text-slate-400">Loading poll...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="panel">
        <CreativeAlert message={error} type="error" title="Poll unavailable" />
        <Link to="/" className="mt-3 inline-block text-blue-300 transition hover:text-blue-200">
          Create a new poll
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="panel shadow-glow">
      <div className="poll-enter flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-blue-300/80">Polling Room</p>
          <h2 className="display-font text-3xl font-semibold text-slate-100">{poll?.question}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-200">
            {relativeExpiryText(poll?.expiresAt)}
          </span>
          <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-3 py-1 text-xs text-slate-300">{poll?.options?.length || 0} options</span>
        </div>
      </div>

      {disconnected ? <CreativeAlert message="Realtime connection lost. Reconnecting..." type="warning" title="Connection issue" /> : null}
      {error ? <CreativeAlert message={error} type="warning" title="Poll status" /> : null}

      <div className="poll-enter mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/45 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="display-font text-sm font-semibold text-slate-200">Cast your vote</p>
          <p className="text-xs text-slate-400">Single choice only</p>
        </div>
        <div className="grid gap-2">
        {poll?.options.map((option) => (
          <label
            key={option.id}
            className="vote-option relative overflow-hidden flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-3 hover:border-blue-400/60"
          >
            <span
              className="pointer-events-none absolute inset-y-0 left-0 rounded-r-xl bg-blue-500/12"
              style={{ width: `${Math.min(100, option.percentage)}%` }}
            />
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="vote"
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => setSelectedOptionId(option.id)}
                disabled={isClosed || voteLoading}
                className="relative z-10 h-4 w-4 accent-blue-500"
              />
              <span className="relative z-10 text-sm font-medium text-slate-100">{option.text}</span>
            </div>
            <span className="relative z-10 text-xs text-slate-300">
              {option.votes} vote{option.votes === 1 ? '' : 's'} · {option.percentage.toFixed(2)}%
            </span>
          </label>
        ))}
        </div>
      </div>

      <div className="poll-enter mt-4 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={submitVote} disabled={isClosed || voteLoading}>
          {voteLoading ? 'Submitting...' : 'Vote'}
        </button>
        <button className="btn-muted" onClick={handleRemoveVote} disabled={isClosed || voteLoading}>
          Remove Vote
        </button>
        {canDelete ? (
          <button className="btn-danger" onClick={handleDelete} disabled={!poll || poll.isDeleted || voteLoading}>
            Delete poll
          </button>
        ) : null}
      </div>

      {voteMessage ? (
        <CreativeAlert
          message={voteMessage}
          type={
            voteMessage.toLowerCase().includes('recorded') ||
            voteMessage.toLowerCase().includes('removed') ||
            voteMessage.toLowerCase().includes('updated')
              ? 'success'
              : voteMessage.toLowerCase().includes('failed') || voteMessage.toLowerCase().includes('error')
                ? 'error'
                : 'info'
          }
          title="Vote update"
        />
      ) : null}

      {poll ? <PollChart options={poll.options} /> : null}

      <p className="poll-enter mt-4 text-sm text-slate-300">Total votes: <span className="display-font text-base font-semibold text-blue-300">{poll?.totalVotes ?? 0}</span></p>
      <Link to="/" className="poll-enter mt-2 inline-block text-sm text-blue-300 transition hover:text-blue-200">
        Create another poll
      </Link>
    </div>
  );
}
