import { v4 as uuidv4 } from 'uuid';

export function normalizeOptions(options = []) {
  return options
    .map((text) => String(text ?? '').trim())
    .filter(Boolean)
    .map((text) => ({ id: uuidv4(), text, votes: 0 }));
}

export function createPoll({ question, options, expiresInMinutes, creatorDeviceId }) {
  const now = Date.now();
  const hasExpiry = Number.isFinite(expiresInMinutes) && expiresInMinutes > 0;

  return {
    id: uuidv4(),
    question: question.trim(),
    options: normalizeOptions(options),
    createdAt: new Date(now).toISOString(),
    expiresAt: hasExpiry ? new Date(now + expiresInMinutes * 60_000).toISOString() : null,
    isDeleted: false,
    deletedAt: null,
    creatorDeviceId,
    voters: [],
    voterIps: [],
    voterDevices: []
  };
}

export function isExpired(poll) {
  return Boolean(poll.expiresAt && Date.now() > new Date(poll.expiresAt).getTime());
}

export function toPublicPoll(poll) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const options = poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option.votes,
    percentage: totalVotes === 0 ? 0 : Number(((option.votes / totalVotes) * 100).toFixed(2))
  }));

  return {
    id: poll.id,
    question: poll.question,
    options,
    totalVotes,
    createdAt: poll.createdAt,
    expiresAt: poll.expiresAt,
    isExpired: isExpired(poll),
    isDeleted: Boolean(poll.isDeleted),
    deletedAt: poll.deletedAt ?? null
  };
}

export function extractClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
    return xForwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0];
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function ensurePollVoteState(poll) {
  if (!Array.isArray(poll.voters)) {
    poll.voters = [];
  }

  if (!Array.isArray(poll.voterIps)) {
    poll.voterIps = [];
  }

  if (!Array.isArray(poll.voterDevices)) {
    poll.voterDevices = [];
  }

  if (poll.voters.length === 0) {
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    if (totalVotes === 1 && poll.voterDevices.length === 1) {
      const votedOption = poll.options.find((option) => option.votes > 0);
      if (votedOption) {
        poll.voters.push({
          deviceId: poll.voterDevices[0],
          ip: poll.voterIps[0] ?? 'unknown',
          optionId: votedOption.id,
          votedAt: poll.createdAt
        });
      }
    }
  }
}

export function syncLegacyVoterLists(poll) {
  const uniqueDevices = new Set();
  const uniqueIps = new Set();

  for (const voter of poll.voters) {
    if (voter?.deviceId) uniqueDevices.add(voter.deviceId);
    if (voter?.ip) uniqueIps.add(voter.ip);
  }

  poll.voterDevices = Array.from(uniqueDevices);
  poll.voterIps = Array.from(uniqueIps);
}
