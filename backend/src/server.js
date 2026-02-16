import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDatabase, getDatabaseState } from './db.js';
import { createPoll, ensurePollVoteState, extractClientIp, isExpired, syncLegacyVoterLists, toPublicPoll } from './pollUtils.js';
import { deletePollById, getPollById, initStore, savePoll } from './store.js';

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';
const CORS_ORIGINS = process.env.CORS_ORIGINS || FRONTEND_ORIGIN || 'http://localhost:5173';

let clientBaseOrigin = '';
try {
  clientBaseOrigin = new URL(CLIENT_BASE_URL).origin;
} catch {
  clientBaseOrigin = '';
}

const allowedOrigins = [...new Set([...CORS_ORIGINS.split(','), clientBaseOrigin, 'http://localhost:5173'])]
  .map((origin) => origin.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;

  let parsedOrigin = null;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    parsedOrigin = null;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) {
      return true;
    }

    if (allowedOrigin.startsWith('*.')) {
      const wildcardHost = allowedOrigin.slice(2).toLowerCase();
      const originHost = parsedOrigin?.hostname?.toLowerCase();

      if (!originHost) return false;
      return originHost === wildcardHost || originHost.endsWith(`.${wildcardHost}`);
    }

    return false;
  });
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
};

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  }
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false
  })
);

function emitPollUpdate(poll) {
  io.to(poll.id).emit('vote_updated', toPublicPoll(poll));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbState: getDatabaseState() });
});

app.post('/api/polls', async (req, res) => {
  try {
    const question = String(req.body?.question ?? '').trim();
    const options = Array.isArray(req.body?.options) ? req.body.options : [];
    const expiresInMinutesRaw = req.body?.expiresInMinutes;
    const expiresInMinutes =
      expiresInMinutesRaw === undefined || expiresInMinutesRaw === null || expiresInMinutesRaw === ''
        ? null
        : Number(expiresInMinutesRaw);

    if (!question) {
      return res.status(400).json({ message: 'Question cannot be empty.' });
    }

    const poll = createPoll({ question, options, expiresInMinutes });

    if (poll.options.length < 2) {
      return res.status(400).json({ message: 'At least two valid options are required.' });
    }

    await savePoll(poll);

    return res.status(201).json({
      poll: toPublicPoll(poll),
      shareLink: `${CLIENT_BASE_URL}/poll/${poll.id}`
    });
  } catch {
    return res.status(500).json({ message: 'Failed to create poll.' });
  }
});

app.get('/api/polls/:pollId', async (req, res) => {
  try {
    const poll = await getPollById(req.params.pollId);

    if (!poll || poll.isDeleted) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    return res.json({ poll: toPublicPoll(poll) });
  } catch {
    return res.status(500).json({ message: 'Failed to load poll.' });
  }
});

app.post('/api/polls/:pollId/vote', async (req, res) => {
  try {
    const poll = await getPollById(req.params.pollId);

    if (!poll || poll.isDeleted) {
      return res.status(404).json({ message: 'Poll not found or deleted.' });
    }

    if (isExpired(poll)) {
      return res.status(410).json({ message: 'Poll has expired. Voting is closed.' });
    }

    const optionId = String(req.body?.optionId ?? '');
    const option = poll.options.find((item) => item.id === optionId);

    if (!option) {
      return res.status(400).json({ message: 'Invalid option selected.' });
    }

    const ip = extractClientIp(req);
    const deviceId = String(req.headers['x-device-id'] ?? '').trim();

    if (!deviceId) {
      return res.status(400).json({ message: 'Missing device token.' });
    }

    ensurePollVoteState(poll);

    const voterByDevice = poll.voters.find((voter) => voter.deviceId === deviceId);
    const voterByIp = poll.voters.find((voter) => voter.ip === ip);

    if (voterByIp && voterByIp.deviceId !== deviceId) {
      return res.status(409).json({ message: 'IP already used for this poll by another voter.' });
    }

    if (voterByDevice) {
      if (voterByDevice.optionId === option.id) {
        return res.json({
          message: 'You already voted for this option.',
          poll: toPublicPoll(poll)
        });
      }

      const previousOption = poll.options.find((item) => item.id === voterByDevice.optionId);
      if (previousOption && previousOption.votes > 0) {
        previousOption.votes -= 1;
      }

      option.votes += 1;
      voterByDevice.optionId = option.id;
      voterByDevice.ip = ip;
      voterByDevice.votedAt = new Date().toISOString();
    } else {
      option.votes += 1;
      poll.voters.push({
        deviceId,
        ip,
        optionId: option.id,
        votedAt: new Date().toISOString()
      });
    }

    syncLegacyVoterLists(poll);

    await savePoll(poll);
    emitPollUpdate(poll);

    return res.json({
      message: voterByDevice ? 'Vote updated.' : 'Vote accepted.',
      poll: toPublicPoll(poll)
    });
  } catch {
    return res.status(500).json({ message: 'Failed to cast vote.' });
  }
});

app.delete('/api/polls/:pollId/vote', async (req, res) => {
  try {
    const poll = await getPollById(req.params.pollId);

    if (!poll || poll.isDeleted) {
      return res.status(404).json({ message: 'Poll not found or deleted.' });
    }

    if (isExpired(poll)) {
      return res.status(410).json({ message: 'Poll has expired. Voting is closed.' });
    }

    const deviceId = String(req.headers['x-device-id'] ?? '').trim();
    if (!deviceId) {
      return res.status(400).json({ message: 'Missing device token.' });
    }

    ensurePollVoteState(poll);

    const voterIndex = poll.voters.findIndex((voter) => voter.deviceId === deviceId);
    if (voterIndex === -1) {
      return res.status(404).json({ message: 'No vote found for this device.' });
    }

    const voter = poll.voters[voterIndex];
    const option = poll.options.find((item) => item.id === voter.optionId);
    if (option && option.votes > 0) {
      option.votes -= 1;
    }

    poll.voters.splice(voterIndex, 1);
    syncLegacyVoterLists(poll);

    await savePoll(poll);
    emitPollUpdate(poll);

    return res.json({
      message: 'Vote removed.',
      poll: toPublicPoll(poll)
    });
  } catch {
    return res.status(500).json({ message: 'Failed to remove vote.' });
  }
});

app.delete('/api/polls/:pollId', async (req, res) => {
  try {
    const deleted = await deletePollById(req.params.pollId);

    if (!deleted) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    io.to(deleted.id).emit('poll_deleted', { pollId: deleted.id });

    return res.json({ message: 'Poll deleted.' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete poll.' });
  }
});

io.on('connection', (socket) => {
  socket.on('join_poll', async (pollId) => {
    try {
      const poll = await getPollById(String(pollId));

      if (!poll || poll.isDeleted) {
        socket.emit('poll_unavailable', { message: 'Poll does not exist.' });
        return;
      }

      socket.join(poll.id);
      socket.emit('vote_updated', toPublicPoll(poll));
    } catch {
      socket.emit('poll_unavailable', { message: 'Failed to join poll room.' });
    }
  });
});

async function start() {
  await connectDatabase(MONGODB_URI);
  await initStore();

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
