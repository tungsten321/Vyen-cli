import { test } from 'node:test';
import assert from 'node:assert/strict';
import { McpManager, mcpToolName } from '../dist/mcp.js';
import { ToolRegistry } from '../dist/tools.js';
import { fixture, call, signal, stdio as baseStdio } from './helpers.mjs';

const stdio = extra => baseStdio({ readOnlyTools: ['sample', 'elicit'], ...extra }, ['--sampling']);

test('sampling request enforces 2048 token limit and timeout guard', async t => {
  const f = await fixture(t);
  const registry = new ToolRegistry(f.cwd);
  const manager = new McpManager(stdio(), f.cwd);
  t.after(() => manager.close());

  let observedLimit = 0;
  manager.setSamplingHandler(async (params, tokenLimit) => {
    observedLimit = tokenLimit;
    return {
      model: 'test-model',
      stopReason: 'endTurn',
      role: 'assistant',
      content: { type: 'text', text: 'sampled-result' },
    };
  });

  await manager.connect(registry);

  const res = await registry.execute(
    call(mcpToolName('local', 'sample'), { maxTokens: 99999 }),
    signal(),
  );

  const parsed = JSON.parse(res.text);
  assert.equal(observedLimit, 2048, 'Sampling must cap tokens at 2048');
  assert.equal(parsed.content.text, 'sampled-result');
});

test('headless elicitation fails closed with declined response', async t => {
  const f = await fixture(t);
  const registry = new ToolRegistry(f.cwd);
  const manager = new McpManager(stdio(), f.cwd);
  t.after(() => manager.close());
  await manager.connect(registry);

  const res = await registry.execute(
    call(mcpToolName('local', 'elicit'), {}),
    signal(),
  );

  const parsed = JSON.parse(res.text);
  assert.deepEqual(parsed, { action: 'decline' }, 'Headless elicitation must decline by default and nothing else');
});

test('sampling request rejects on timeout when handler hangs', async t => {
  const f = await fixture(t);
  const registry = new ToolRegistry(f.cwd);
  const manager = new McpManager(stdio({ timeoutMs: 5000, toolTimeoutMs: 200 }), f.cwd);
  t.after(() => manager.close());

  manager.setSamplingHandler(async () => {
    await new Promise(r => setTimeout(r, 1000));
    return {
      model: 'test-model',
      stopReason: 'endTurn',
      role: 'assistant',
      content: { type: 'text', text: 'too-late' },
    };
  });

  await manager.connect(registry);

  await assert.rejects(
    () => registry.execute(call(mcpToolName('local', 'sample'), {}), signal()),
    /timed out/i,
  );
});
