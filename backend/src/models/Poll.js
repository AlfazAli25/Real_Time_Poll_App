import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    votes: { type: Number, default: 0 }
  },
  { _id: false }
);

const VoterSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    ip: { type: String, required: true },
    optionId: { type: String, required: true },
    votedAt: { type: Date, required: true }
  },
  { _id: false }
);

const PollSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true },
    options: { type: [OptionSchema], default: [] },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    creatorDeviceId: { type: String, default: '' },
    voters: { type: [VoterSchema], default: [] },
    voterIps: { type: [String], default: [] },
    voterDevices: { type: [String], default: [] }
  },
  {
    versionKey: false
  }
);

export const PollModel = mongoose.models.Poll || mongoose.model('Poll', PollSchema);
