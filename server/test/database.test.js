import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { getDatabaseConfig, SERVER_ENV_PATH } from '../src/config/env.js';

const serverDir = fileURLToPath(new URL('../', import.meta.url));

test('environment URI takes precedence without being replaced by dotenv', () => {
  const env = { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/explicit-test' };
  delete env.MONGO_URI;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { getDatabaseConfig } from ${JSON.stringify(new URL('../src/config/env.js', import.meta.url).href)};
    const config = getDatabaseConfig();
    console.log(JSON.stringify({ correct: config.uri === 'mongodb://127.0.0.1:1/explicit-test', source: config.source }));
  `], { cwd: serverDir, env, encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.deepEqual(JSON.parse(child.stdout.trim()), { correct: true, source: 'environment:MONGODB_URI' });
});

test('server .env loads independently of cwd and ignores a different cwd .env', () => {
  const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'techshare-env-test-'));
  const taskEnvPath = path.join(taskDir, '.env');
  fs.writeFileSync(taskEnvPath, 'MONGODB_URI=mongodb://wrong-cwd:27017/wrong\n');
  const env = { ...process.env };
  delete env.MONGODB_URI; delete env.MONGO_URI;
  try {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import fs from 'node:fs';
      import dotenv from ${JSON.stringify(new URL('../node_modules/dotenv/lib/main.js', import.meta.url).href)};
      import { getDatabaseConfig, SERVER_ENV_PATH } from ${JSON.stringify(new URL('../src/config/env.js', import.meta.url).href)};
      const expected = dotenv.parse(fs.readFileSync(SERVER_ENV_PATH));
      console.log(JSON.stringify({ correct: getDatabaseConfig().uri === (expected.MONGODB_URI || expected.MONGO_URI), source: getDatabaseConfig().source }));
    `], { cwd: taskDir, env, encoding: 'utf8' });
    assert.equal(child.status, 0);
    const result = JSON.parse(child.stdout.trim());
    assert.equal(result.correct, true);
    assert.ok(result.source.startsWith(SERVER_ENV_PATH + ':'));
  } finally { fs.unlinkSync(taskEnvPath); fs.rmdirSync(taskDir); }
});

test('missing MongoDB configuration fails instead of falling back to localhost', () => {
  const previous = { MONGODB_URI: process.env.MONGODB_URI, MONGO_URI: process.env.MONGO_URI };
  delete process.env.MONGODB_URI; delete process.env.MONGO_URI;
  try { assert.throws(getDatabaseConfig, /Set MONGODB_URI or MONGO_URI/); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('startup validates total and not-deleted counts on its connected devices collection', async () => {
  const queries = [];
  const countDocuments = async query => { queries.push(query); return Object.keys(query).length ? 103 : 107; };
  const conn = { connection: { host: 'test-host', port: 27017, name: 'techshare', db: {
    collection: name => { assert.equal(name, 'devices'); return { countDocuments }; },
  } } };
  const logs = [];
  const mocks = [mock.method(mongoose, 'connect', async () => conn), mock.method(mongoose.connection, 'on', () => {}),
    mock.method(console, 'log', message => logs.push(message))];
  try {
    assert.equal(await connectDB(), conn);
    assert.deepEqual(queries, [{}, { isDeleted: { $ne: true } }]);
    assert.ok(logs.some(line => line.includes('devices: 107; not deleted: 103')));
  } finally { mocks.forEach(item => item.mock.restore()); }
});

test('connection failure aborts startup and never logs credentials or connected success', async () => {
  const logs = [];
  const error = new Error('mongodb://fake-user:fake-secret@private-host/test');
  const mocks = [mock.method(mongoose, 'connect', async () => { throw error; }),
    mock.method(mongoose, 'disconnect', async () => {}),
    mock.method(console, 'log', line => logs.push(line)), mock.method(console, 'error', line => logs.push(line))];
  try {
    await assert.rejects(connectDB, value => value === error);
    assert.ok(logs.some(line => line.includes('Startup validation failed')));
    assert.ok(logs.every(line => !line.includes('fake-secret') && !line.includes('Connected:')));
    assert.equal(mongoose.disconnect.mock.callCount(), 1);
  } finally { mocks.forEach(item => item.mock.restore()); }
});

test('failed startup database read rejects readiness and disconnects', async () => {
  const mocks = [mock.method(mongoose, 'connect', async () => ({ connection: { db: { collection: () => ({
    countDocuments: async () => { throw new Error('read unavailable'); },
  }) } } })), mock.method(mongoose, 'disconnect', async () => {}), mock.method(console, 'error', () => {})];
  try {
    await assert.rejects(connectDB, /read unavailable/);
    assert.equal(mongoose.disconnect.mock.callCount(), 1);
  } finally { mocks.forEach(item => item.mock.restore()); }
});

test('entry point exits nonzero and never listens when database startup fails', () => {
  const env = { ...process.env, MONGODB_URI: 'invalid-test-uri', PORT: '0' };
  delete env.MONGO_URI;
  const child = spawnSync(process.execPath, ['src/index.js'], { cwd: serverDir, env, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 1);
  assert.ok(child.stderr.includes('Backend startup aborted'));
  assert.ok(!child.stdout.includes('Server running'));
});

test('nodemon watches .env so later changes restart the development process', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  assert.ok(pkg.nodemonConfig.watch.includes('.env'));
  assert.ok(pkg.nodemonConfig.ext.split(',').includes('env'));
});