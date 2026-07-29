const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'https://be-production-dcb3.up.railway.app/api/v1';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Password123!';

const TEST_USERS = {
  owner: process.env.OWNER_EMAIL || 'owner1@hr.vn',
  jockey: process.env.JOCKEY_EMAIL || 'jockey1@hr.vn',
  referee: process.env.REFEREE_EMAIL || 'referee1@hr.vn',
  spectator: process.env.SPECTATOR_EMAIL || 'spectator1@hr.vn',
};

function request(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `${API_BASE_URL.replace(/\/+$/, '')}/`);
    const client = url.protocol === 'https:' ? https : http;
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            reject(new Error(`${method} ${url.pathname} returned non-JSON: ${raw.slice(0, 160)}`));
            return;
          }

          if (res.statusCode >= 400) {
            reject(new Error(`${method} ${url.pathname} -> ${res.statusCode}: ${parsed?.message || parsed?.error || raw}`));
            return;
          }

          resolve(parsed && typeof parsed === 'object' && 'success' in parsed ? parsed.data : parsed);
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function expectArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} should be an array`);
  }
}

function expectObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} should be an object`);
  }
}

async function login(email) {
  const auth = await request('POST', 'auth/login', {
    body: { email, password: TEST_PASSWORD },
  });
  const token = auth?.token || auth?.accessToken;
  if (!token) throw new Error(`Missing auth token for ${email}`);
  return token;
}

async function step(name, fn) {
  process.stdout.write(`- ${name}... `);
  await fn();
  process.stdout.write('ok\n');
}

async function run() {
  console.log(`Production read smoke: ${API_BASE_URL}`);

  const tokens = {};
  await step('auth login OWNER/JOCKEY/REFEREE/SPECTATOR', async () => {
    tokens.owner = await login(TEST_USERS.owner);
    tokens.jockey = await login(TEST_USERS.jockey);
    tokens.referee = await login(TEST_USERS.referee);
    tokens.spectator = await login(TEST_USERS.spectator);
  });

  await step('OWNER read endpoints', async () => {
    expectObject(await request('GET', 'owner/dashboard', { token: tokens.owner }), 'owner dashboard');
    expectObject(await request('GET', 'owner/profile', { token: tokens.owner }), 'owner profile');
    expectArray(await request('GET', 'owner/horses', { token: tokens.owner }), 'owner horses');
    expectArray(await request('GET', 'owner/race-registrations', { token: tokens.owner }), 'owner race registrations');
    expectArray(await request('GET', 'owner/jockey-invitations', { token: tokens.owner }), 'owner jockey invitations');
    expectArray(await request('GET', 'tournaments/owner/open', { token: tokens.owner }), 'owner open tournaments');
    expectObject(await request('GET', 'notifications?size=5', { token: tokens.owner }), 'owner notifications');
    expectObject(await request('GET', 'notifications/unread-count', { token: tokens.owner }), 'owner unread notifications');
  });

  await step('JOCKEY read endpoints', async () => {
    expectObject(await request('GET', 'jockey/dashboard', { token: tokens.jockey }), 'jockey dashboard');
    expectArray(await request('GET', 'jockey/races', { token: tokens.jockey }), 'jockey races');
    expectObject(await request('GET', 'jockey/performance', { token: tokens.jockey }), 'jockey performance');
    expectArray(await request('GET', 'jockey/prizes', { token: tokens.jockey }), 'jockey prizes');
    expectObject(await request('GET', 'jockey/profile', { token: tokens.jockey }), 'jockey profile');
    expectArray(await request('GET', 'jockey/invitations', { token: tokens.jockey }), 'jockey invitations');
    expectObject(await request('GET', 'notifications?size=5', { token: tokens.jockey }), 'jockey notifications');
    expectObject(await request('GET', 'notifications/unread-count', { token: tokens.jockey }), 'jockey unread notifications');
  });

  await step('REFEREE read endpoints', async () => {
    expectObject(await request('GET', 'referee/dashboard', { token: tokens.referee }), 'referee dashboard');
    const races = await request('GET', 'referee/races', { token: tokens.referee });
    expectArray(races, 'referee races');
    expectArray(await request('GET', 'referee/payments', { token: tokens.referee }), 'referee payments');
    expectArray(await request('GET', 'referee/invitations', { token: tokens.referee }), 'referee invitations');
    expectArray(await request('GET', 'referee/violations', { token: tokens.referee }), 'referee violations');
    expectObject(await request('GET', 'notifications?size=5', { token: tokens.referee }), 'referee notifications');
    expectObject(await request('GET', 'notifications/unread-count', { token: tokens.referee }), 'referee unread notifications');

    if (races[0]?.id) {
      expectArray(
        await request('GET', `referee/races/${races[0].id}/participants`, { token: tokens.referee }),
        'referee race participants',
      );
    }
  });

  await step('SPECTATOR read endpoints', async () => {
    expectObject(await request('GET', 'spectator/dashboard', { token: tokens.spectator }), 'spectator dashboard');
    expectArray(await request('GET', 'users/me/bettable-races', { token: tokens.spectator }), 'spectator bettable races');
    expectArray(await request('GET', 'users/me/bets', { token: tokens.spectator }), 'spectator bets');
    expectArray(await request('GET', 'tournaments', { token: tokens.spectator }), 'spectator tournaments');
    expectArray(await request('GET', 'horses', { token: tokens.spectator }), 'spectator horses');
    expectArray(await request('GET', 'news', { token: tokens.spectator }), 'spectator news');
    expectObject(await request('GET', 'notifications?size=5', { token: tokens.spectator }), 'spectator notifications');
    expectObject(await request('GET', 'notifications/unread-count', { token: tokens.spectator }), 'spectator unread notifications');
  });
}

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
