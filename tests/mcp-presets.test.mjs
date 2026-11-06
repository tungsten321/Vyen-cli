import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolvePreset, listPresets } from '../dist/mcp-presets.js';
import { loadProjectMcpConfig, saveProjectMcpConfig } from '../dist/mcp.js';
import { fixture, cli } from './helpers.mjs';

test('resolvePreset returns exact server configuration for every official preset', () => {
  const expected = {
    memory: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], readOnlyTools: [] },
    sequentialthinking: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'], readOnlyTools: ['sequentialthinking'] },
    fetch: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'], readOnlyTools: ['fetch'] },
    git: { command: 'uvx', args: ['mcp-server-git'], readOnlyTools: ['git_status', 'git_diff', 'git_log'] },
    filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'], readOnlyTools: ['read_file', 'list_directory'] },
    time: { command: 'uvx', args: ['mcp-server-time'], readOnlyTools: ['get_current_time'] },
    everything: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'], readOnlyTools: ['echo'] },
  };
  for (const [name, want] of Object.entries(expected)) {
    const cfg = resolvePreset(name);
    assert.equal(cfg.transport, 'stdio', name);
    assert.equal(cfg.command, want.command, name);
    assert.deepEqual(cfg.args, want.args, name);
    assert.deepEqual(cfg.readOnlyTools, want.readOnlyTools, name);
  }
});

test('resolvePreset fuzzy-matches the multi-word preset name', () => {
  for (const alias of ['sequential-thinking', 'sequential_thinking', 'SequentialThinking']) {
    assert.equal(resolvePreset(alias).command, 'npx', alias);
  }
});

test('resolvePreset throws actionable error for unknown preset', () => {
  assert.throws(
    () => resolvePreset('unknown-preset-xyz'),
    /Unknown MCP preset: "unknown-preset-xyz"\. Available presets: memory, sequentialthinking, fetch, git, filesystem, time, everything/i,
  );
});

test('listPresets returns the full catalog of official presets with descriptions', () => {
  const list = listPresets();
  assert.deepEqual(list.map(p => p.name).sort(), ['everything', 'fetch', 'filesystem', 'git', 'memory', 'sequentialthinking', 'time']);
  for (const p of list) assert.equal(typeof p.description, 'string', p.name);
});

test('preset can be saved to project MCP configuration preserving policy fields', async t => {
  const f = await fixture(t);
  const preset = resolvePreset('git');
  const cfg = await loadProjectMcpConfig(f.cwd);
  cfg.servers['git'] = preset;
  await saveProjectMcpConfig(f.cwd, cfg);

  const reloaded = await loadProjectMcpConfig(f.cwd);
  assert.equal(reloaded.servers['git'].command, 'uvx');
  assert.deepEqual(reloaded.servers['git'].args, ['mcp-server-git']);
  assert.deepEqual(reloaded.servers['git'].readOnlyTools, ['git_status', 'git_diff', 'git_log']);
  // timeoutMs/disableSampling come from the mcpServerSchema defaults (src/mcp.ts:140-141),
  // not from literals in the preset — presets no longer spell them out.
  assert.equal(reloaded.servers['git'].timeoutMs, 30_000);
});

test('preset CLI honours --trust flag for user servers', async t => {
  const f = await fixture(t);
  const userMcpPath = join(f.config, 'vyen', 'mcp.json');
  const res = await cli(f, false, ['mcp', 'add', '--preset', 'memory', '--trust'], { baseUrl: false }).done;
  assert.equal(res.code, 0, res.stderr);

  const raw = await readFile(userMcpPath, 'utf8');
  const json = JSON.parse(raw);
  assert.equal(json.servers.memory.command, 'npx');
  assert.deepEqual(json.servers.memory.args, ['-y', '@modelcontextprotocol/server-memory']);
  assert.equal(json.servers.memory.trust, true);
});

test('mcp presets CLI command lists available presets as JSON', async t => {
  const f = await fixture(t);
  const res = await cli(f, false, ['mcp', 'presets'], { baseUrl: false }).done;
  assert.equal(res.code, 0, res.stderr);
  const parsed = JSON.parse(res.stdout);
  assert.deepEqual(parsed.map(p => p.name).sort(), ['everything', 'fetch', 'filesystem', 'git', 'memory', 'sequentialthinking', 'time']);
  for (const p of parsed) assert.equal(typeof p.description, 'string', p.name);
});
