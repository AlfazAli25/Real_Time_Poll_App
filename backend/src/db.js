import mongoose from 'mongoose';

export async function connectDatabase(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
}

export function getDatabaseState() {
  return mongoose.connection.readyState;
}
