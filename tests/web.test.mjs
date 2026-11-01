import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  isPrivateIp,
  isLoopbackIp,
  resolveSafeIp,
  webFetch,
  webSearch,
  parseDuckDuckGoLiteHtml,
  unescapeHtml,
  convertHtmlToMarkdown,
  MAX_RESPONSE_BYTES,
  MAX_REDIRECTS,
} from '../dist/web.js';
import { evaluateToolPolicy } from '../dist/policy.js';
import { ToolRegistry, normalizeToolInput } from '../dist/tools.js';

test('web_fetch refuses requests to private and metadata IP addresses (SSRF)', async () => {
  // 1. Unit tests for isPrivateIp
  assert.equal(isPrivateIp('127.0.0.1'), true, 'IPv4 loopback');
  assert.equal(isPrivateIp('127.255.255.255'), true, 'IPv4 loopback block');
  assert.equal(isPrivateIp('10.0.0.1'), true, '10.0.0.0/8 private');
  assert.equal(isPrivateIp('172.16.0.1'), true, '172.16.0.0/12 private');
  assert.equal(isPrivateIp('172.31.255.255'), true, '172.31.255.255 private');
  assert.equal(isPrivateIp('172.32.0.1'), false, '172.32.0.1 public');
  assert.equal(isPrivateIp('192.168.1.1'), true, '192.168.0.0/16 private');
  assert.equal(isPrivateIp('169.254.1.1'), true, '169.254.0.0/16 link-local');
  assert.equal(isPrivateIp('169.254.169.254'), true, 'Cloud metadata service');
  assert.equal(isPrivateIp('0.0.0.0'), true, 'Current network IPv4');

  // IPv6
  assert.equal(isPrivateIp('::1'), true, 'IPv6 loopback');
  assert.equal(isPrivateIp('fc00::1'), true, 'IPv6 unique local');
  assert.equal(isPrivateIp('fd12:3456:789a::1'), true, 'IPv6 unique local');
  assert.equal(isPrivateIp('fe80::1'), true, 'IPv6 link-local');
  assert.equal(isPrivateIp('fec0::1'), true, 'IPv6 site-local deprecated');
  assert.equal(isPrivateIp('2001:db8::1'), true, 'IPv6 RFC 3849 documentation range');
  assert.equal(isPrivateIp('2001:0db8:0000:0000:0000:0000:0000:0001'), true, 'IPv6 RFC 3849 uncompressed');

  // IPv4-mapped IPv6
  assert.equal(isPrivateIp('::ffff:127.0.0.1'), true, 'IPv4-mapped decimal loopback');
  assert.equal(isPrivateIp('::ffff:7f00:1'), true, 'IPv4-mapped hex loopback');
  assert.equal(isPrivateIp('::ffff:a9fe:a9fe'), true, 'IPv4-mapped hex cloud metadata');
  assert.equal(isPrivateIp('::ffff:10.0.0.1'), true, 'IPv4-mapped decimal private');

  // Public IPs
  assert.equal(isPrivateIp('8.8.8.8'), false, 'Google DNS public');
  assert.equal(isPrivateIp('1.1.1.1'), false, 'Cloudflare DNS public');
  assert.equal(isPrivateIp('2606:4700:4700::1111'), false, 'Cloudflare IPv6 public');

  // 2. Integration test: webFetch refuses private destination
  await assert.rejects(
    webFetch({ url: 'http://127.0.0.1:8080/test' }),
    /blocked|private|loopback|SSRF/i,
    'webFetch must reject direct loopback IP',
  );

  await assert.rejects(
    webFetch({ url: 'http://[::1]:8080/test' }),
    /blocked|private|loopback|SSRF/i,
    'webFetch must reject direct bracketed IPv6 loopback',
  );

  await assert.rejects(
    webFetch({ url: 'http://169.254.169.254/latest/meta-data/' }),
    /blocked|private|metadata|SSRF/i,
    'webFetch must reject cloud metadata IP',
  );
});

test('web_fetch re-checks IP safety and policy after every redirect', async () => {
  // Start mock HTTP server
  let redirectServerPort = 0;
  const redirectServer = http.createServer((req, res) => {
    if (req.url === '/redirect-to-private') {
      res.writeHead(302, { Location: 'http://169.254.169.254/secret' });
      res.end();
    } else if (req.url === '/redirect-loop') {
      res.writeHead(302, { Location: `http://127.0.0.1:${redirectServerPort}/redirect-loop` });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    }
  });

  await new Promise((resolve) => redirectServer.listen(0, '127.0.0.1', resolve));
  redirectServerPort = redirectServer.address().port;

  try {
    // Redirect target policy must be re-evaluated before the hop is followed.
    await assert.rejects(
      webFetch({
        url: `http://127.0.0.1:${redirectServerPort}/redirect-to-private`,
        allowLoopbackForTesting: true,
        policy: {
          evaluate: (_tool, url) => (url.includes('169.254.169.254') ? 'deny' : 'allow'),
        },
      }),
      /denied|policy/i,
      'Redirect target must be re-evaluated by policy',
    );

    // Redirect to private IP must be refused even if initial URL passed (simulated bypass)
    await assert.rejects(
      webFetch({
        url: `http://127.0.0.1:${redirectServerPort}/redirect-to-private`,
        allowLoopbackForTesting: true, // test flag to allow initial hop only
      }),
      /blocked|private|redirect/i,
      'Redirect to private destination must be refused',
    );

    // Redirect loop exceeding MAX_REDIRECTS must fail
    await assert.rejects(
      webFetch({
        url: `http://127.0.0.1:${redirectServerPort}/redirect-loop`,
        allowLoopbackForTesting: true,
      }),
      /too many redirects/i,
      `Redirect loop exceeding ${MAX_REDIRECTS} must fail`,
    );
  } finally {
    await new Promise((resolve) => redirectServer.close(resolve));
  }
});

test('web_fetch pins resolved IP address to prevent DNS rebinding', async () => {
  // Test resolveSafeIp
  await assert.rejects(
    resolveSafeIp('localhost'),
    /private|loopback/i,
    'resolveSafeIp must reject hostname resolving to loopback',
  );

  // A public IP literal needs no DNS, so this assertion is deterministic offline.
  const safeIp = await resolveSafeIp('8.8.8.8');
  assert.equal(safeIp, '8.8.8.8');
  assert.equal(isPrivateIp(safeIp), false, 'Resolved IP must be public');
});

test('web_search queries DuckDuckGo Lite and falls back to TinyFish/Parallel keyless', async () => {
  // 1. Test parseDuckDuckGoLiteHtml with mock HTML
  const mockHtml = `
    <tr>
      <td><a href="/l/?uddg=https%3A%2F%2Fexample.com%2Ftest" class="result-link">Example Title</a></td>
    </tr>
    <tr>
      <td class="result-snippet">This is an <b>example</b> snippet text.</td>
    </tr>
  `;

  const parsed = parseDuckDuckGoLiteHtml(mockHtml);
  assert.equal(parsed.length, 1, 'Must parse 1 result');
  assert.equal(parsed[0].title, 'Example Title');
  assert.equal(parsed[0].url, 'https://example.com/test');
  assert.equal(parsed[0].snippet, 'This is an example snippet text.');

  // 2. Test search execution with fallback mechanism
  const result = await webSearch({
    query: 'typescript',
    mockEngines: {
      ddg: async () => {
        throw new Error('HTTP 429 Too Many Requests');
      },
      tinyfish: async () => [
        { title: 'TinyFish TS', url: 'https://tinyfish.ai/ts', snippet: 'TS Info' },
      ],
    },
  });

  assert.equal(result.provider, 'tinyfish', 'Must fallback to tinyfish on DDG 429');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].title, 'TinyFish TS');
});

test('web_fetch and web_search enforce size limits and respect domain policy', async () => {
  // 1. Test size limit enforcement
  assert.equal(MAX_RESPONSE_BYTES, 5 * 1024 * 1024, 'MAX_RESPONSE_BYTES must be 5MB');
  assert.equal(MAX_REDIRECTS, 5, 'MAX_REDIRECTS must be 5');

  // 2. Domain policy rejection
  await assert.rejects(
    webFetch({
      url: 'https://evil.internal/data',
      policy: {
        evaluate: (tool, resource) => (resource.includes('evil.internal') ? 'deny' : 'allow'),
      },
    }),
    /denied|policy/i,
    'Policy deny must refuse web fetch',
  );

  // 3. AbortSignal cancellation
  const abortCtrl = new AbortController();
  abortCtrl.abort();
  await assert.rejects(
    webFetch({ url: 'https://example.com', signal: abortCtrl.signal }),
    /aborted|cancelled/i,
    'webFetch must honor aborted signal',
  );

  // 4. unescapeHtml single-pass
  assert.equal(unescapeHtml('&amp;lt;'), '&lt;', 'unescapeHtml must not double unescape');
});

test('web_fetch fetches a hostname through the pinned lookup contract', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Hello</h1><p>World</p></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const result = await webFetch({
      url: `http://localhost:${port}/`,
      allowLoopbackForTesting: true,
    });
    assert.equal(result.status, 200);
    assert.match(result.content, /Hello/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web_fetch converts only HTML bodies to Markdown', async () => {
  const body = '{"html":"<div>keep me</div>","x":1}';
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const result = await webFetch({
      url: `http://127.0.0.1:${port}/data.json`,
      format: 'markdown',
      allowLoopbackForTesting: true,
    });
    assert.equal(result.content, body, 'JSON must not be tag-stripped or entity-decoded');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web_fetch re-evaluates domain policy on redirects and refuses an unapproved ask', async () => {
  const target = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('secret');
  });
  await new Promise((resolve) => target.listen(0, '127.0.0.1', resolve));
  const targetPort = target.address().port;

  const source = http.createServer((_req, res) => {
    res.writeHead(302, { Location: `http://127.0.0.1:${targetPort}/secret` });
    res.end();
  });
  await new Promise((resolve) => source.listen(0, '127.0.0.1', resolve));
  const sourcePort = source.address().port;

  const startUrl = `http://127.0.0.1:${sourcePort}/start`;
  const targetUrl = `http://127.0.0.1:${targetPort}/secret`;
  const seen = [];

  try {
    await assert.rejects(
      webFetch({
        url: startUrl,
        allowLoopbackForTesting: true,
        policy: {
          evaluate: (_tool, url) => {
            seen.push(url);
            return url === startUrl ? 'allow' : 'ask';
          },
        },
      }),
      /approval|denied|policy/i,
    );
    assert.deepEqual(seen, [startUrl, targetUrl]);
  } finally {
    await new Promise((resolve) => source.close(resolve));
    await new Promise((resolve) => target.close(resolve));
  }
});

test('web_fetch treats a redirect without Location as an error', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(302);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    await assert.rejects(
      webFetch({ url: `http://127.0.0.1:${port}/missing`, allowLoopbackForTesting: true }),
      /redirect|location/i,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web_fetch rejects a response larger than MAX_RESPONSE_BYTES', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 'a'));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    await assert.rejects(
      webFetch({ url: `http://127.0.0.1:${port}/large`, allowLoopbackForTesting: true }),
      /maximum size limit/i,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web_fetch truncates content before it reaches the model', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('a'.repeat(5000));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const result = await webFetch({
      url: `http://127.0.0.1:${port}/long`,
      allowLoopbackForTesting: true,
      maxContentChars: 1000,
    });
    assert.ok(result.content.length < 2000, 'model-visible content must be capped');
    assert.match(result.content, /truncated/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web_fetch enforces a total deadline, not only socket inactivity', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    const timer = setInterval(() => {
      try {
        res.write('x');
      } catch {}
    }, 50);
    res.on('close', () => clearInterval(timer));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const started = Date.now();
    const outcome = await Promise.race([
      webFetch({
        url: `http://127.0.0.1:${port}/drip`,
        allowLoopbackForTesting: true,
        timeoutMs: 300,
      }).then(() => 'resolved', () => 'rejected'),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 2000)),
    ]);
    assert.equal(outcome, 'rejected', 'a slow-drip body must not outlive the deadline');
    assert.ok(Date.now() - started < 1500, 'must stop near the advertised timeout');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('parseDuckDuckGoLiteHtml filters ads and unescapes hrefs', () => {
  const html = `
    <tr><td><a href="https://duckduckgo.com/y.js?ad_domain=evil.example" class="result-link">Sponsored</a></td></tr>
    <tr><td><a href="https://example.com/a?x=1&amp;y=2" class="result-link">Real</a></td></tr>
    <tr><td class="result-snippet">Sponsored snippet</td></tr>
    <tr><td class="result-snippet">Real snippet</td></tr>
  `;

  const parsed = parseDuckDuckGoLiteHtml(html);
  assert.equal(parsed.length, 1, 'ads must not be returned as organic results');
  assert.equal(parsed[0].title, 'Real');
  assert.equal(parsed[0].url, 'https://example.com/a?x=1&y=2');
  assert.equal(parsed[0].snippet, 'Real snippet');
});

test('parseDuckDuckGoLiteHtml handles ads without snippets without misaligning organic results', () => {
  const html = `
    <tr><td><a href="https://duckduckgo.com/y.js?ad_domain=evil.example" class="result-link">Sponsored No Snippet</a></td></tr>
    <tr><td><a href="https://example.com/organic" class="result-link">Organic Title</a></td></tr>
    <tr><td class="result-snippet">Organic snippet text</td></tr>
  `;

  const parsed = parseDuckDuckGoLiteHtml(html);
  assert.equal(parsed.length, 1, 'must return organic result even if preceding ad had no snippet');
  assert.equal(parsed[0].title, 'Organic Title');
  assert.equal(parsed[0].url, 'https://example.com/organic');
  assert.equal(parsed[0].snippet, 'Organic snippet text');
});

test('web_fetch domain policy matches case-insensitively and ignores a trailing dot', () => {
  assert.equal(
    evaluateToolPolicy(
      { tool: 'web_fetch', input: 'https://GitHub.com./x' },
      { projectRules: { deny: ['web_fetch(domain:github.com)'] } },
    ),
    'deny',
  );
  assert.equal(
    evaluateToolPolicy(
      { tool: 'web_fetch', input: 'https://EVIL.internal./x' },
      { projectRules: { ask: ['web_fetch(domain:*.internal)'] } },
    ),
    'ask',
  );
});

test('web tools are registered as read-only, parallel-safe tools with input aliases', () => {
  const registry = new ToolRegistry(process.cwd(), async () => true);
  const names = Object.keys(registry.schemas());
  assert.ok(names.includes('web_fetch'));
  assert.ok(names.includes('web_search'));
  assert.equal(registry.isReadOnly('web_fetch'), true);
  assert.equal(registry.isReadOnly('web_search'), true);
  assert.equal(registry.canBatchParallel('web_fetch'), true);
  assert.equal(registry.canBatchParallel('web_search'), true);
  assert.deepEqual(normalizeToolInput('web_fetch', 'https://example.com'), { url: 'https://example.com' });
  assert.deepEqual(normalizeToolInput('web_fetch', { target: 'https://example.com' }), { url: 'https://example.com' });
  assert.deepEqual(normalizeToolInput('web_search', { q: 'typescript' }), { query: 'typescript' });
});

test('web_search falls back to Parallel keyless when DuckDuckGo and TinyFish fail', async () => {
  const result = await webSearch({
    query: 'typescript',
    mockEngines: {
      ddg: async () => {
        throw new Error('429 Too Many Requests');
      },
      tinyfish: async () => {
        throw new Error('503 Service Unavailable');
      },
      parallel: async () => [
        { title: 'Parallel TS', url: 'https://parallel.ai/ts', snippet: 'TS Info' },
      ],
    },
  });

  assert.equal(result.provider, 'parallel');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].title, 'Parallel TS');
});

test('web_search throws aggregated error when all engines return zero results', async () => {
  await assert.rejects(
    webSearch({
      query: 'nonexistent-query-xyz-123',
      mockEngines: {
        ddg: async () => [],
        tinyfish: async () => [],
        parallel: async () => [],
      },
    }),
    /All web search engines failed.*zero results/i,
  );
});
test('isPrivateIp and isLoopbackIp recognize uncompressed IPv6 addresses with leading zeros', () => {
  assert.equal(isPrivateIp('0000:0000:0000:0000:0000:0000:0000:0001'), true, 'uncompressed IPv6 loopback');
  assert.equal(isLoopbackIp('0000:0000:0000:0000:0000:0000:0000:0001'), true, 'uncompressed IPv6 loopback');
  assert.equal(isPrivateIp('0000:0000:0000:0000:0000:ffff:127.0.0.1'), true, 'uncompressed IPv4-mapped loopback');
  assert.equal(isPrivateIp('0000:0000:0000:0000:0000:0000:0000:0000'), true, 'uncompressed IPv6 unspecified');
  assert.equal(isPrivateIp('fd00:0000:0000:0000:0000:0000:0000:0001'), true, 'uncompressed IPv6 ULA');
  assert.equal(isPrivateIp('fe80:0000:0000:0000:0000:0000:0000:0001'), true, 'uncompressed IPv6 link-local');
});

test('convertHtmlToMarkdown separates block elements and supports multiline tags', () => {
  const listHtml = '<ul><li>First item</li><li>Second item</li></ul>';
  assert.equal(convertHtmlToMarkdown(listHtml), '- First item\n- Second item');

  const divHtml = '<div>Block 1</div><div>Block 2</div>';
  assert.equal(convertHtmlToMarkdown(divHtml), 'Block 1\nBlock 2');

  const tableHtml = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
  assert.equal(convertHtmlToMarkdown(tableHtml), 'Cell 1 Cell 2');

  const multilineHeading = '<h1>First Line\nSecond Line</h1>';
  assert.equal(convertHtmlToMarkdown(multilineHeading), '# First Line\nSecond Line');

  const multilineLink = '<a href="https://example.com">\nLink Text\n</a>';
  assert.equal(convertHtmlToMarkdown(multilineLink), '[Link Text](https://example.com)');
});

test('webSearch standalone policy check rejects ask decision', async () => {
  await assert.rejects(
    webSearch({
      query: 'secret term',
      policy: {
        evaluate: () => 'ask',
      },
    }),
    /approval|policy/i,
  );
});

test('webSearch standalone policy check rejects deny decision', async () => {
  await assert.rejects(
    webSearch({
      query: 'forbidden query',
      policy: {
        evaluate: () => 'deny',
      },
    }),
    /denied by policy/i,
  );
});test('isPrivateIp recognizes bracketed and whitespace-padded IPv4 and IPv6 addresses', () => {
  assert.equal(isPrivateIp('[127.0.0.1]'), true, 'bracketed IPv4 loopback');
  assert.equal(isPrivateIp(' 127.0.0.1 '), true, 'whitespace-padded IPv4 loopback');
  assert.equal(isPrivateIp('[169.254.169.254]'), true, 'bracketed cloud metadata');
  assert.equal(isPrivateIp(' [::1] '), true, 'whitespace-padded bracketed IPv6 loopback');
  assert.equal(isPrivateIp(' [::ffff:127.0.0.1] '), true, 'whitespace-padded IPv4-mapped loopback');
});

test('ToolRegistry allows web_search when user approves ask policy decision', async () => {
  let promptCount = 0;
  const registry = new ToolRegistry(
    process.cwd(),
    async () => {
      promptCount++;
      return true; // user approves
    },
  );
  registry.policy = () => 'ask';
  const result = await registry.execute(
    {
      callId: 'c1',
      toolName: 'web_search',
      input: { query: 'test query' },
    },
    new AbortController().signal,
  );
  assert.equal(result.denied, undefined);
  assert.equal(promptCount, 1);
  assert.equal(result.decision, 'ask_approved');
});

test('convertHtmlToMarkdown handles unclosed li tags cleanly', () => {
  const unclosedList = '<ul><li>First<li>Second</ul>';
  assert.equal(convertHtmlToMarkdown(unclosedList), '- First\n- Second');
});
