import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve against this module, never against the shell's working directory.
export const SERVER_ENV_PATH = fileURLToPath(new URL('../../.env', import.meta.url));
const inheritedMongoKey = process.env.MONGODB_URI ? 'MONGODB_URI' :
  process.env.MONGO_URI ? 'MONGO_URI' : null;
dotenv.config({ path: SERVER_ENV_PATH });

export const getDatabaseConfig = () => {
  const key = process.env.MONGODB_URI ? 'MONGODB_URI' : 'MONGO_URI';
  const uri = process.env[key];
  if (!uri) throw new Error('Set MONGODB_URI or MONGO_URI before starting the backend.');
  return {
    uri,
    source: inheritedMongoKey === key ? 'environment:' + key : SERVER_ENV_PATH + ':' + key,
  };
};

export const getJwtConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Set JWT_SECRET in environment before starting in production.');
  }
  const primarySecret = secret || 'techshare_jwt_dev_local_secret';
  const fallbackSecret = process.env.JWT_SECRET_FALLBACK;
  const secrets = [primarySecret, fallbackSecret].filter(Boolean);

  return {
    secret: primarySecret,
    secrets,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
};
