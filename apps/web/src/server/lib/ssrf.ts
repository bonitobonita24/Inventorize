/**
 * SSRF Prevention Utility (V28)
 * Validates URLs before server-side outbound fetches.
 * Rejects private/internal IP ranges to prevent SSRF attacks.
 *
 * Usage:
 *   import { validateOutboundUrl } from '@/server/lib/ssrf'
 *   validateOutboundUrl(userProvidedUrl) // throws if unsafe
 *   const response = await fetch(userProvidedUrl)
 */

import dns from 'dns/promises';

/** CIDR ranges to block (RFC 1918 + loopback + link-local + unspecified) */
const BLOCKED_CIDRS: Array<{ base: bigint; mask: bigint; bits: number }> = [
  // IPv4 loopback
  { base: ipToBigInt('127.0.0.0'), mask: cidrMask(8), bits: 32 },
  // IPv4 private class A
  { base: ipToBigInt('10.0.0.0'), mask: cidrMask(8), bits: 32 },
  // IPv4 private class B
  { base: ipToBigInt('172.16.0.0'), mask: cidrMask(12), bits: 32 },
  // IPv4 private class C
  { base: ipToBigInt('192.168.0.0'), mask: cidrMask(16), bits: 32 },
  // IPv4 link-local (includes AWS metadata: 169.254.169.254)
  { base: ipToBigInt('169.254.0.0'), mask: cidrMask(16), bits: 32 },
  // IPv4 unspecified
  { base: ipToBigInt('0.0.0.0'), mask: cidrMask(8), bits: 32 },
];

function cidrMask(prefixLen: number): bigint {
  return ((1n << 32n) - 1n) - ((1n << BigInt(32 - prefixLen)) - 1n);
}

function ipToBigInt(ip: string): bigint {
  return ip.split('.').reduce((acc, octet) => (acc << 8n) | BigInt(parseInt(octet, 10)), 0n);
}

function isBlockedIpv4(ip: string): boolean {
  let addr: bigint;
  try {
    addr = ipToBigInt(ip);
  } catch {
    return true; // unparseable — block it
  }
  return BLOCKED_CIDRS.some(({ base, mask }) => (addr & mask) === (base & mask));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  // Block loopback and private
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

/**
 * Validates a URL is safe for server-side outbound fetches.
 * Throws an Error if the URL resolves to a private/internal address.
 *
 * @param rawUrl - The URL to validate (may be user-supplied)
 * @throws {Error} if the URL is unsafe (private IP, bad format, blocked scheme)
 */
export async function validateOutboundUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are permitted for outbound requests.');
  }

  const hostname = parsed.hostname;

  // Reject numeric IPv4 directly — no DNS lookup needed
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(hostname)) {
    if (isBlockedIpv4(hostname)) {
      throw new Error('Outbound request to private or internal IP address is not permitted.');
    }
    return; // numeric IPv4, passed check
  }

  // Reject IPv6 literals directly
  const ipv6Pattern = /^\[?[0-9a-fA-F:]+\]?$/;
  if (ipv6Pattern.test(hostname)) {
    if (isBlockedIpv6(hostname)) {
      throw new Error('Outbound request to private or internal IPv6 address is not permitted.');
    }
    return;
  }

  // Resolve hostname → IPs (DNS rebinding prevention)
  let addresses: string[];
  try {
    addresses = await dns.resolve(hostname);
  } catch {
    throw new Error(`Unable to resolve hostname: ${hostname}`);
  }

  for (const addr of addresses) {
    if (isBlockedIpv4(addr)) {
      throw new Error(
        `Hostname ${hostname} resolves to a private or internal IP address. Outbound request blocked.`
      );
    }
    if (isBlockedIpv6(addr)) {
      throw new Error(
        `Hostname ${hostname} resolves to a private or internal IPv6 address. Outbound request blocked.`
      );
    }
  }
}
