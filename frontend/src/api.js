import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000
});

const DEVICE_KEY = 'realtime_poll_device_id';

export function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export async function createPoll(payload) {
  const { data } = await api.post('/polls', payload);
  return data;
}

export async function getPoll(pollId) {
  const { data } = await api.get(`/polls/${pollId}`);
  return data;
}

export async function votePoll(pollId, optionId) {
  const deviceId = getOrCreateDeviceId();
  const { data } = await api.post(
    `/polls/${pollId}/vote`,
    { optionId },
    {
      headers: {
        'x-device-id': deviceId
      }
    }
  );
  return data;
}

export async function removeVotePoll(pollId) {
  const deviceId = getOrCreateDeviceId();
  const { data } = await api.delete(`/polls/${pollId}/vote`, {
    headers: {
      'x-device-id': deviceId
    }
  });
  return data;
}

export async function deletePoll(pollId) {
  const { data } = await api.delete(`/polls/${pollId}`);
  return data;
}
