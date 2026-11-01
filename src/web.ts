import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import type { PolicyDecision } from './policy.js';

export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_REDIRECTS = 5;
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface WebFetchOptions {
  url: string;
  format?: 'markdown' | 'text' | 'html';
  timeoutMs?: number;
  maxRedirects?: number;
  /** Cap the content handed to the caller (the model context), not the download. */
  maxContentChars?: number;
  policy?: { evaluate?: (tool: string, resource: string) => PolicyDecision };
  /** Asked when a redirect target needs user approval; no callback means deny. */
  approve?: (request: { tool: string; input: unknown; signal: AbortSignal }) => Promise<boolean>;
  allowLoopbackForTesting?: boolean;
  signal?: AbortSignal;
}

export interface WebFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  format: 'markdown' | 'text' | 'html';
  content: string;
  byteLength: number;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface WebSearchResult {
  query: string;
  provider: 'duckduckgo' | 'tinyfish' | 'parallel';
  results: WebSearchResultItem[];
}

export interface WebSearchOptions {
  query: string;
  limit?: number;
  policy?: { evaluate?: (tool: string, resource: string) => PolicyDecision };
  signal?: AbortSignal;
  mockEngines?: {
    ddg?: (query: string) => Promise<WebSearchResultItem[]>;
    tinyfish?: (query: string) => Promise<WebSearchResultItem[]>;
    parallel?: (query: string) => Promise<WebSearchResultItem[]>;
  };
}

/**
 * Validates if an IP address is private, loopback, link-local, or cloud metadata.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return false;

  const lower = ip.toLowerCase();

  // IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:7f00:1, 0:0:0:0:0:ffff:...)
  if (lower.startsWith('::ffff:') || lower.startsWith('0:0:0:0:0:ffff:')) {
    const colonParts = lower.split(':');
    const last = colonParts[colonParts.length - 1];
    if (net.isIPv4(last)) {
      return isPrivateIp(last);
    }
    // Hex IPv4-mapped notation (e.g. ::ffff:7f00:1 or ::ffff:a9fe:a9fe)
    if (colonParts.length >= 2) {
      const g1 = parseInt(colonParts[colonParts.length - 2], 16);
      const g2 = parseInt(colonParts[colonParts.length - 1], 16);
      if (!Number.isNaN(g1) && !Number.isNaN(g2)) {
        const v4 = `${(g1 >> 8) & 0xff}.${g1 & 0xff}.${(g2 >> 8) & 0xff}.${g2 & 0xff}`;
        return isPrivateIp(v4);
      }
    }
    // Any unrecognized mapped address fails closed as private
    return true;
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [b0, b1, b2] = parts;

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (b0 === 10) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (b0 === 192 && b1 === 168) return true;
    // 169.254.0.0/16 (Link-local, includes 169.254.169.254 metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 192.0.0.0/24 and 192.0.2.0/24 (TEST-NET-1)
    if (b0 === 192 && b1 === 0 && (b2 === 0 || b2 === 2)) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    // 192.88.99.0/24 (6to4 relay anycast)
    if (b0 === 192 && b1 === 88 && b2 === 99) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (b0 >= 224 && b0 <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future)
    if (b0 >= 240) return true;

    return false;
  }

  // IPv6
  const normalized = lower;
  // ::1 (Loopback)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // :: (Unspecified)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  // fc00::/7 (Unique local address: fc... or fd...)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // fe80::/10 (Link-local: fe8..feb) & fec0::/10 (Site-local: fec..fef)
  if (/^fe[89a-f]/i.test(normalized)) return true;
  // ff00::/8 (Multicast)
  if (normalized.startsWith('ff')) return true;
  // 2002::/16 (6to4) and 64:ff9b::/96 (NAT64)
  if (normalized.startsWith('2002:') || normalized.startsWith('64:ff9b:')) return true;
  // Deprecated IPv4-compatible form (::127.0.0.1 or ::7f00:1)
  if (normalized.startsWith('::')) {
    const rest = normalized.slice(2);
    if (net.isIPv4(rest)) return isPrivateIp(rest);
    const groups = rest.split(':');
    if (groups.length === 2) {
      const g1 = parseInt(groups[0], 16);
      const g2 = parseInt(groups[1], 16);
      if (!Number.isNaN(g1) && !Number.isNaN(g2)) {
        return isPrivateIp(`${(g1 >> 8) & 0xff}.${g1 & 0xff}.${(g2 >> 8) & 0xff}.${g2 & 0xff}`);
      }
    }
  }

  return false;
}

/**
 * Checks if an IP is loopback.
 */
export function isLoopbackIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1') return true;
  if (clean.startsWith('::ffff:')) {
    const v4 = clean.slice(7);
    if (net.isIPv4(v4) && v4.startsWith('127.')) return true;
    const parts = clean.split(':');
    if (parts.length >= 2) {
      const g1 = parseInt(parts[parts.length - 2], 16);
      if (((g1 >> 8) & 0xff) === 127) return true;
    }
  }
  if (net.isIPv4(clean) && clean.startsWith('127.')) return true;
  return false;
}

export interface SafeAddress {
  address: string;
  family: number;
}

/**
 * Resolves a hostname to every safe IP address. Throws if any resolved IP is private/loopback.
 * Returning all records lets Node's happy-eyeballs path fall back between IPv6 and IPv4.
 */
export async function resolveSafeAddresses(
  hostname: string,
  options?: { allowLoopback?: boolean },
): Promise<SafeAddress[]> {
  const cleanHostname = hostname.replace(/^\[|\]$/g, '');

  // If hostname is already a direct IP literal
  if (net.isIP(cleanHostname)) {
    if (options?.allowLoopback && isLoopbackIp(cleanHostname)) {
      return [{ address: cleanHostname, family: net.isIPv6(cleanHostname) ? 6 : 4 }];
    }
    if (isPrivateIp(cleanHostname)) {
      throw new Error(`SSRF blocked: Direct destination IP ${cleanHostname} is private/loopback/metadata.`);
    }
    return [{ address: cleanHostname, family: net.isIPv6(cleanHostname) ? 6 : 4 }];
  }

  const results = await dns.lookup(cleanHostname, { all: true });
  if (!results.length) {
    throw new Error(`DNS resolution failed for hostname: ${cleanHostname}`);
  }

  for (const record of results) {
    if (options?.allowLoopback && isLoopbackIp(record.address)) {
      continue;
    }
    if (isPrivateIp(record.address)) {
      throw new Error(
        `SSRF blocked: Hostname "${cleanHostname}" resolves to private/loopback address (${record.address}).`,
      );
    }
  }

  return results.map(record => ({ address: record.address, family: record.family }));
}

/**
 * Resolves a hostname to one safe IP address. Throws if any resolved IP is private/loopback.
 */
export async function resolveSafeIp(
  hostname: string,
  options?: { allowLoopback?: boolean },
): Promise<string> {
  const addresses = await resolveSafeAddresses(hostname, options);
  return addresses[0].address;
}

/**
 * Unescapes common HTML entities.
 */
export function unescapeHtml(html: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
  };
  return html.replace(/&(?:amp|lt|gt|quot|apos|#39|#x27|#x2F|nbsp);/g, (match) => entityMap[match] ?? match);
}

/**
 * Simple streaming / regex HTML to Markdown converter.
 */
export function convertHtmlToMarkdown(html: string): string {
  // Remove script, style, noscript, svg tags completely
  let text = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');

  // Convert headings
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');

  // Convert links
  text = text.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Convert blockquotes and paragraphs
  text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n');
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Unescape entities and collapse whitespace
  text = unescapeHtml(text);
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isDuckDuckGoAd(href: string): boolean {
  return href.includes('duckduckgo.com/y.js')
    || href.includes('ad_domain=')
    || href.includes('duckduckgo.com/duckduckgo-help-pages');
}

/**
 * Parses organic results from DuckDuckGo Lite HTML.
 */
export function parseDuckDuckGoLiteHtml(html: string): WebSearchResultItem[] {
  const results: WebSearchResultItem[] = [];

  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=['"]([^'"]+)['"](?:\s+[^>]*?)?class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a\s+(?:[^>]*?\s+)?class=['"]result-link['"](?:\s+[^>]*?)?href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]+class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const links = [...html.matchAll(linkRegex)].map((m) => ({
    href: unescapeHtml(m[1] || m[3]),
    text: unescapeHtml((m[2] || m[4]).replace(/<[^>]+>/g, '').trim()),
  }));

  const snippets = [...html.matchAll(snippetRegex)].map((m) =>
    unescapeHtml(m[1].replace(/<[^>]+>/g, '').trim()),
  );

  const count = Math.min(links.length, snippets.length);
  for (let i = 0; i < count; i++) {
    const link = links[i];
    // Keep the index aligned with snippets, but never return ads or help links.
    if (!link.href || isDuckDuckGoAd(link.href)) continue;

    let url = link.href;
    const uddgMatch = url.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }

    results.push({
      title: link.text,
      url,
      snippet: snippets[i],
    });
  }

  return results;
}

function isTextualContentType(contentType: string): boolean {
  const type = contentType.split(';', 1)[0].trim().toLowerCase();
  return type.startsWith('text/')
    || type === 'application/json'
    || type === 'application/xml'
    || type === 'application/xhtml+xml'
    || type === 'application/javascript'
    || type === 'application/x-www-form-urlencoded'
    || type.endsWith('+json')
    || type.endsWith('+xml');
}

/**
 * Fetches content from a URL with SSRF protection, DNS pinning, and redirect re-evaluation.
 */
export async function webFetch(options: WebFetchOptions): Promise<WebFetchResult> {
  const format = options.format ?? 'markdown';
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;

  let currentUrl = options.url;
  let redirects = 0;

  try {
    while (true) {
      signal.throwIfAborted();

      const parsed = new URL(currentUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Invalid protocol ${parsed.protocol}: Only http:// and https:// are supported.`);
      }

      // Policy check. The first hop was already evaluated (and approved) by the tool
      // registry; redirects are re-evaluated here and fail closed when approval is needed.
      if (options.policy?.evaluate) {
        const decision = options.policy.evaluate('web_fetch', currentUrl);
        if (decision === 'deny') {
          throw new Error(`Access to ${currentUrl} is denied by policy.`);
        }
        if (decision === 'ask' && redirects > 0) {
          const approved = options.approve
            ? await options.approve({ tool: 'web_fetch', input: { url: currentUrl }, signal })
            : false;
          if (!approved) {
            throw new Error(`Access to ${currentUrl} requires approval and was not approved.`);
          }
        }
      }

      // SSRF & DNS Pinning: validate every resolved record and pin the whole safe set.
      const safeAddresses = await resolveSafeAddresses(parsed.hostname, {
        allowLoopback: options.allowLoopbackForTesting,
      });

      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      // Pin IP addresses directly into connection options to eliminate DNS rebinding.
      const reqOptions: http.RequestOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        agent: false, // Ensure dedicated socket per request, avoiding connection reuse that bypasses DNS pinning
        signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Vyen/0.6.0; +https://github.com/nguyenhuumanh/vyen)',
          Accept: 'text/html,application/xhtml+xml,text/plain,text/markdown;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        lookup: (_hostname, lookupOptions, cb) => {
          const family = lookupOptions.family === 4 || lookupOptions.family === 6
            ? lookupOptions.family
            : 0;
          const addresses = safeAddresses
            .filter(entry => family === 0 || entry.family === family)
            .map(entry => ({ address: entry.address, family: entry.family }));
          if (!addresses.length) {
            const error = Object.assign(
              new Error(`No safe address for ${parsed.hostname}`),
              { code: 'ENOTFOUND' },
            );
            cb(error, [], 0);
            return;
          }
          // Node calls lookup with { all: true } when autoSelectFamily is enabled.
          if (lookupOptions.all) cb(null, addresses);
          else cb(null, addresses[0].address, addresses[0].family);
        },
      };

      const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = client.request(reqOptions, resolve);
        req.on('error', reject);
        req.end();
      });

      const status = res.statusCode ?? 200;

      // Handle 3xx Redirects
      if (status >= 300 && status < 400) {
        const location = res.headers.location;
        if (!location) {
          res.resume();
          throw new Error(`HTTP redirect ${status} without a Location header`);
        }
        redirects++;
        if (redirects > maxRedirects) {
          res.resume();
          throw new Error(`Too many redirects (exceeded ${maxRedirects})`);
        }
        res.resume(); // discard unused body
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      if (status < 200 || status >= 400) {
        res.resume();
        throw new Error(`HTTP fetch failed with status ${status}`);
      }

      const contentType = String(res.headers['content-type'] ?? 'text/plain');
      if (!isTextualContentType(contentType)) {
        res.destroy();
        throw new Error(`Unsupported content type "${contentType}"`);
      }

      // Collect bounded body
      const chunks: Buffer[] = [];
      let bytesCollected = 0;

      for await (const chunk of res) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytesCollected += buf.length;
        if (bytesCollected > MAX_RESPONSE_BYTES) {
          res.destroy();
          throw new Error(`Response exceeded maximum size limit of ${MAX_RESPONSE_BYTES} bytes`);
        }
        chunks.push(buf);
      }

      const rawBody = Buffer.concat(chunks).toString('utf8');
      const isHtml = /(?:^|;)\s*(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType);
      let content = rawBody;
      if (format === 'markdown' && isHtml) {
        content = convertHtmlToMarkdown(rawBody);
      } else if (format === 'text' && isHtml) {
        content = unescapeHtml(rawBody.replace(/<[^>]+>/g, '').trim());
      }

      if (options.maxContentChars && content.length > options.maxContentChars) {
        content = `${content.slice(0, options.maxContentChars)}\n\n[Content truncated to ${options.maxContentChars} characters.]`;
      }

      return {
        url: options.url,
        finalUrl: currentUrl,
        status,
        contentType,
        format,
        content,
        byteLength: bytesCollected,
      };
    }
  } catch (error) {
    if (options.signal?.aborted) {
      throw new Error(`web_fetch request aborted: ${options.signal.reason ?? 'aborted'}`);
    }
    if (deadline.aborted) {
      throw new Error(`web_fetch request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Searches the web using DuckDuckGo Lite, falling back to TinyFish and Parallel keyless MCP endpoints.
 */
export async function webSearch(options: WebSearchOptions): Promise<WebSearchResult> {
  const query = options.query.trim();
  if (!query) throw new Error('Search query cannot be empty.');

  // Policy check
  if (options.policy?.evaluate) {
    const decision = options.policy.evaluate('web_search', query);
    if (decision === 'deny') {
      throw new Error(`Web search for "${query}" is denied by policy.`);
    }
  }

  const createEngineSignal = (timeoutMs = 10_000): AbortSignal => {
    const timeoutSig = AbortSignal.timeout(timeoutMs);
    return options.signal ? AbortSignal.any([options.signal, timeoutSig]) : timeoutSig;
  };

  // Engine 1: DuckDuckGo Lite
  try {
    let results: WebSearchResultItem[];
    if (options.mockEngines?.ddg) {
      results = await options.mockEngines.ddg(query);
    } else {
      const body = new URLSearchParams({ q: query }).toString();
      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        body,
        signal: createEngineSignal(10_000),
      });

      if (!res.ok) throw new Error(`DDG Lite HTTP ${res.status}`);
      const html = await res.text();
      results = parseDuckDuckGoLiteHtml(html);
    }

    if (results.length > 0) {
      return {
        query,
        provider: 'duckduckgo',
        results: options.limit ? results.slice(0, options.limit) : results,
      };
    }
  } catch {
    // Proceed to Fallback 1: TinyFish Keyless
  }

  // Engine 2: TinyFish Keyless MCP
  try {
    let results: WebSearchResultItem[];
    if (options.mockEngines?.tinyfish) {
      results = await options.mockEngines.tinyfish(query);
    } else {
      const res = await fetch('https://agent.tinyfish.ai/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TinyFish-Access-Mode': 'keyless',
          'User-Agent': 'Mozilla/5.0 (compatible; Vyen/0.6.0)',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'search',
            arguments: { query },
          },
        }),
        signal: createEngineSignal(10_000),
      });

      if (!res.ok) throw new Error(`TinyFish HTTP ${res.status}`);
      const json = (await res.json()) as Record<string, unknown>;
      const rawText = (json?.result as Record<string, unknown>)?.content as Array<{ text?: string }> | undefined;
      const textContent = rawText?.[0]?.text;
      const parsed = textContent ? (JSON.parse(textContent) as { results?: Array<Record<string, unknown>> }) : null;
      results = (parsed?.results ?? []).map((item) => ({
        title: String(item.title ?? item.site_name ?? item.url ?? ''),
        url: String(item.url ?? ''),
        snippet: String(item.snippet ?? ''),
        date: typeof item.date === 'string' ? item.date : undefined,
      }));
    }

    if (results.length > 0) {
      return {
        query,
        provider: 'tinyfish',
        results: options.limit ? results.slice(0, options.limit) : results,
      };
    }
  } catch {
    // Proceed to Fallback 2: Parallel Keyless MCP
  }

  // Engine 3: Parallel Keyless MCP
  try {
    let results: WebSearchResultItem[];
    if (options.mockEngines?.parallel) {
      results = await options.mockEngines.parallel(query);
    } else {
      const res = await fetch('https://search.parallel.ai/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Vyen/0.6.0)',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'web_search',
            arguments: {
              objective: query,
              search_queries: [query],
            },
          },
        }),
        signal: createEngineSignal(10_000),
      });

      if (!res.ok) throw new Error(`Parallel HTTP ${res.status}`);
      const json = (await res.json()) as Record<string, unknown>;
      const rawText = (json?.result as Record<string, unknown>)?.content as Array<{ text?: string }> | undefined;
      const textContent = rawText?.[0]?.text;
      const parsed = textContent ? (JSON.parse(textContent) as { results?: Array<Record<string, unknown>> }) : null;
      results = (parsed?.results ?? []).map((item) => ({
        title: String(item.title ?? item.url ?? ''),
        url: String(item.url ?? ''),
        snippet: Array.isArray(item.excerpts) ? item.excerpts.join('\n\n') : '',
      }));
    }

    return {
      query,
      provider: 'parallel',
      results: options.limit ? results.slice(0, options.limit) : results,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`All web search engines failed. Last error: ${message}`);
  }
}
