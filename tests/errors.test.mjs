import test from 'node:test';
import assert from 'node:assert/strict';
import { safeError } from '../dist/errors.js';

test('safeError redacts the configured key and truncates the message', () => {
  assert.equal(safeError(new Error('bad key sk-secret'), 'sk-secret'), 'bad key [REDACTED]');
  assert.equal(safeError(new Error('a sk-secret b'), 'sk-secret'), 'a [REDACTED] b');
  assert.equal(safeError(new Error('no secret'), 'sk-secret'), 'no secret');
  assert.equal(safeError('plain failure'), 'plain failure');
  assert.equal(safeError(new Error('x'.repeat(2_500))).length, 2_000);
  assert.equal(safeError(new Error('x'.repeat(2_500))).endsWith('x'), true);
});
test('safeError extracts actionable upstream detail from provider responseBody and statusCode', () => {
  // 1. OpenRouter rate limit format with metadata.raw
  const openRouterErr = new Error('Provider returned error');
  openRouterErr.statusCode = 429;
  openRouterErr.responseBody = JSON.stringify({
    error: {
      message: 'Provider returned error',
      code: 429,
      metadata: {
        raw: 'recursive/flint-v1.0:free is temporarily rate-limited upstream. Please retry shortly.',
      },
    },
  });
  assert.equal(
    safeError(openRouterErr),
    '[429] recursive/flint-v1.0:free is temporarily rate-limited upstream. Please retry shortly.'
  );

  // 2. OpenAI / standard error format with error.message and key redaction
  const standardErr = new Error('Provider returned error');
  standardErr.statusCode = 401;
  standardErr.responseBody = JSON.stringify({
    error: {
      message: 'Incorrect API key provided: sk-secret-12345',
      type: 'invalid_request_error',
      code: 'invalid_api_key',
    },
  });
  assert.equal(
    safeError(standardErr, 'sk-secret-12345'),
    '[401] Incorrect API key provided: [REDACTED]'
  );

  // 3. Fallback when responseBody is plain text
  const rawErr = new Error('Provider returned error');
  rawErr.statusCode = 502;
  rawErr.responseBody = 'Bad Gateway: upstream timed out';
  assert.equal(safeError(rawErr), '[502] Bad Gateway: upstream timed out');

  // 4. Normal errors without responseBody keep original message
  const normalErr = new Error('Network timeout after 5000ms');
  assert.equal(safeError(normalErr), 'Network timeout after 5000ms');
});

test('safeError never prints [object Object] for a thrown provider payload', () => {
  // The AI SDK re-throws the provider's raw JSON when a stream fails mid-way.
  assert.equal(
    safeError({ type: 'invalid_request_error', message: 'upstream rejected key sk-live-abcdefghijklmnopqrstuv' }),
    'upstream rejected key [REDACTED]',
  );
  assert.equal(safeError({ error: { message: 'context length exceeded' } }), 'context length exceeded');
  assert.equal(safeError({ status: 500 }), '{"status":500}');
  assert.equal(safeError({}), 'Unknown provider error.');
  assert.equal(safeError({ responseBody: 'quota exhausted' }), 'quota exhausted');
  const cyclic = { message: '' };
  cyclic.self = cyclic;
  assert.equal(safeError(cyclic), 'Unknown provider error.');
});

test('safeError redacts URI passwords and protected environment secrets', () => {
  assert.equal(
    safeError(new Error('connection failed to postgres://admin:supersecretpassword@db.example.com:5432/mydb')),
    'connection failed to postgres://admin:[REDACTED]@db.example.com:5432/mydb',
  );
  assert.equal(
    safeError(new Error('failed connecting to redis://:mypassword@localhost:6379')),
    'failed connecting to redis://:[REDACTED]@localhost:6379',
  );
  assert.equal(
    safeError(new Error('request failed: https://token:secret123@api.service.com/v1')),
    'request failed: https://token:[REDACTED]@api.service.com/v1',
  );
  assert.equal(
    safeError(new Error('fetching http://localhost:5173/@vite/client failed')),
    'fetching http://localhost:5173/@vite/client failed',
  );
  assert.equal(
    safeError(new Error('registry request to http://registry:4873/@scope/pkg failed')),
    'registry request to http://registry:4873/@scope/pkg failed',
  );

  const prevEnv = process.env.GITHUB_TOKEN;
  try {
    process.env.GITHUB_TOKEN = 'gh_test_secret_environment_token_999';
    assert.equal(
      safeError(new Error('error with token gh_test_secret_environment_token_999 occurred')),
      'error with token [REDACTED] occurred',
    );
  } finally {
    if (prevEnv !== undefined) process.env.GITHUB_TOKEN = prevEnv;
    else delete process.env.GITHUB_TOKEN;
  }
});
