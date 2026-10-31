import mongoose from 'mongoose';
import { env } from './env.js';

function hintFor(err) {
  const text = `${err.message} ${err.cause?.message ?? ''} ${JSON.stringify(err.reason ?? '')}`;
  if (/tlsv1 alert|ssl3_read_bytes|whitelist|IP.*access list/i.test(text)) {
    return "MongoDB Atlas refused the connection. In Atlas → Network Access, add 0.0.0.0/0 and wait until it shows 'Active'. Also check the cluster isn't paused.";
  }
  if (/bad auth|authentication failed/i.test(text)) {
    return 'Wrong database username or password in MONGO_URI (make sure the <db_password> placeholder and its < > were replaced).';
  }
  if (/ENOTFOUND|querySrv/i.test(text)) return 'The cluster address in MONGO_URI looks wrong. Copy the connection string from Atlas again.';
  return null;
}

export async function connectDb() {
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    const hint = hintFor(err);
    if (hint) console.error(`\n[database] ${hint}\n`);
    throw err;
  }
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
