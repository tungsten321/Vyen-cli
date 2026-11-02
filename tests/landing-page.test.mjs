import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const HTML_PATH = 'docs/index.html';

test('landing page exists, has no BOM, and includes mobile responsive viewport meta tag', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const buffer = await readFile(HTML_PATH);
  assert.ok(
    buffer.length < 3 || buffer[0] !== 0xef || buffer[1] !== 0xbb || buffer[2] !== 0xbf,
    'docs/index.html carries a UTF-8 BOM',
  );
  const html = buffer.toString('utf8');
  assert.match(html, /<!DOCTYPE\s+html>/i, 'missing HTML5 DOCTYPE');
  assert.match(html, /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']/i, 'missing mobile viewport meta');
  assert.match(html, /<title>.*vyen.*<\/title>/i, 'missing title with vyen');
});

test('landing page hero contains punchy copy, copyable install snippet, and terminal mockup', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /npm\s+install\s+-g\s+@nguyenhuumanh\/vyen/, 'missing global npm install command');
  assert.match(html, /terminal-mockup|terminal-window/i, 'missing interactive terminal mockup element');
  assert.match(html, /data-copy|copy-btn|copy-command/i, 'missing copy command button or interaction');
  assert.match(html, /Termux/i, 'hero copy must mention Termux');
});

test('landing page features section contains all four core USP pillars', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /Termux/i, 'missing Termux pillar');
  assert.match(html, /(OpenAI|Anthropic|Bring Your Own Key|BYOK)/i, 'missing Multi-Provider / BYOK pillar');
  assert.match(html, /(Workspace Trust|Lifecycle Hooks|Bảo mật|Hook)/i, 'missing Security / Trust / Hooks pillar');
  assert.match(html, /(Subagent|MCP|Model Context Protocol|Pair)/i, 'missing Extensibility / Subagents / MCP pillar');
});

test('landing page quick start provides multi-platform tabs including Termux and setup wizard', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /Termux/i, 'missing Termux quick start tab');
  assert.match(html, /Linux/i, 'missing Linux quick start tab');
  assert.match(html, /(macOS|Darwin)/i, 'missing macOS quick start tab');
  assert.match(html, /(Windows|PowerShell)/i, 'missing Windows quick start tab');
  assert.match(html, /vyen\s+setup/i, 'missing vyen setup wizard guide');
});

test('landing page changelog timeline renders v0.5.0 and release history matching package.json and CHANGELOG.md', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, new RegExp(`v?${pkg.version}`), `missing current package version ${pkg.version}`);
  assert.match(html, /0\.4\.0/, 'missing 0.4.0 in release history');
  assert.match(html, /0\.3\.1/, 'missing 0.3.1 in release history');
  assert.match(html, /0\.3\.0/, 'missing 0.3.0 in release history');
});

test('landing page implements mobile touch optimizations, canonical link, and JSON-LD schema', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /<link\s+rel=["']canonical["']\s+href=["']https:\/\/vyen\.nx\.kg\/?["']/i, 'missing canonical link to vyen.nx.kg');
  assert.match(html, /viewport-fit=cover/i, 'missing viewport-fit=cover for notch/safe-area compatibility');
  assert.match(html, /touch-action:\s*manipulation/i, 'missing touch-action: manipulation for instant touch responsiveness');
  assert.match(html, /-webkit-tap-highlight-color:\s*transparent/i, 'missing transparent tap highlight');
  assert.match(html, /application\/ld\+json/i, 'missing JSON-LD structured data');
  assert.match(html, /"SoftwareApplication"/i, 'missing SoftwareApplication in JSON-LD');
});

test('landing page includes multi-scenario terminal playground and package manager switcher', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /data-scenario/i, 'missing multi-scenario terminal selector');
  assert.match(html, /(Auto-fix|Headless|Pair|Fail-Closed|Hook)/i, 'missing terminal scenario definitions');
  assert.match(html, /data-pkg/i, 'missing package manager selector (npm, pnpm, yarn, bun)');
  assert.match(html, /pnpm/i, 'missing pnpm support in install box');
  assert.match(html, /bun/i, 'missing bun support in install box');
});

test('landing page implements critical anti-FOUC CSS, collision-free toast, modifier shortcut guards, and XSS escaping', async () => {
  assert.ok(existsSync(HTML_PATH), `${HTML_PATH} does not exist`);
  const html = await readFile(HTML_PATH, 'utf8');
  assert.match(html, /html\s*\{\s*background-color:\s*#07090E/i, 'missing critical anti-FOUC background color');
  assert.match(html, /id=["']shortcut-toast["'][^>]*bottom-6\s+left-/i, 'shortcut toast must be positioned at bottom left to avoid colliding with scroll-to-top button');
  assert.match(html, /e\.ctrlKey\s*\|\|\s*e\.metaKey\s*\|\|\s*e\.altKey/i, 'missing keyboard shortcut modifier isolation guard');
  assert.match(html, /function\s+escapeHtml/i, 'missing escapeHtml sanitizer for dynamic Git commit ingestion');
});

