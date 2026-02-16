import { PollModel } from './models/Poll.js';

export async function initStore() {
  await PollModel.createIndexes();
}

export async function getPollById(pollId) {
  return PollModel.findOne({ id: pollId }).lean();
}

export async function savePoll(poll) {
  await PollModel.findOneAndUpdate({ id: poll.id }, poll, { upsert: true, new: true, setDefaultsOnInsert: true });
  return poll;
}

export async function deletePollById(pollId) {
  const deletedAt = new Date().toISOString();

  const updated = await PollModel.findOneAndUpdate(
    { id: pollId },
    {
      $set: {
        isDeleted: true,
        deletedAt
      }
    },
    { new: true }
  ).lean();

  return updated;
}
