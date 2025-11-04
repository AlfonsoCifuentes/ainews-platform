/**
 * SSRF Protection Utility
 * 
 * Prevents Server-Side Request Forgery by blocking requests to:
 * - Private IP ranges (RFC 1918)
 * - Loopback addresses
 * - Link-local addresses
 * - Reserved IP ranges
 * - Localhost/internal hostnames
 */

import dns from 'dns/promises';

// Private IP ranges (RFC 1918 + others)
const PRIVATE_IP_RANGES = [
  /^127\./,                    // Loopback (127.0.0.0/8)
  /^10\./,                     // Private class A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B (172.16.0.0/12)
  /^192\.168\./,               // Private class C (192.168.0.0/16)
  /^169\.254\./,               // Link-local (169.254.0.0/16)
  /^0\./,                      // Reserved (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Shared address space (100.64.0.0/10)
  /^192\.0\.0\./,              // IETF Protocol Assignments (192.0.0.0/24)
  /^192\.0\.2\./,              // TEST-NET-1 (192.0.2.0/24)
  /^198\.51\.100\./,           // TEST-NET-2 (198.51.100.0/24)
  /^203\.0\.113\./,            // TEST-NET-3 (203.0.113.0/24)
  /^224\./,                    // Multicast (224.0.0.0/4)
  /^240\./,                    // Reserved (240.0.0.0/4)
  /^255\.255\.255\.255$/,      // Broadcast
];

// IPv6 private/reserved ranges
const PRIVATE_IPV6_RANGES = [
  /^::1$/,                     // Loopback
  /^::$/,                      // Unspecified
  /^fc00:/,                    // Unique local address (fc00::/7)
  /^fd00:/,                    // Unique local address (fd00::/8)
  /^fe80:/,                    // Link-local (fe80::/10)
  /^ff00:/,                    // Multicast (ff00::/8)
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
];

/**
 * Check if IP address is in private/reserved range
 */
function isPrivateIP(ip: string): boolean {
  // Check IPv4
  if (ip.includes('.')) {
    return PRIVATE_IP_RANGES.some(range => range.test(ip));
  }
  
  // Check IPv6
  if (ip.includes(':')) {
    return PRIVATE_IPV6_RANGES.some(range => range.test(ip));
  }
  
  return false;
}

/**
 * Check if hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(blocked => 
    lower === blocked || lower.endsWith(`.${blocked}`)
  );
}

/**
 * Resolve hostname to IP and check if it's private
 */
async function resolveAndValidate(hostname: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Try IPv4 first
    const addresses = await dns.resolve4(hostname);
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        return { valid: false, reason: `Hostname resolves to private IP: ${ip}` };
      }
    }
  } catch {
    // Try IPv6
    try {
      const addresses = await dns.resolve6(hostname);
      for (const ip of addresses) {
        if (isPrivateIP(ip)) {
          return { valid: false, reason: `Hostname resolves to private IPv6: ${ip}` };
        }
      }
    } catch {
      // DNS resolution failed - may be invalid hostname
      // We'll allow it to fail naturally in the fetch
      return { valid: true };
    }
  }
  
  return { valid: true };
}

/**
 * Validate URL for SSRF protection
 * Returns { valid: true } if safe, { valid: false, reason: string } if blocked
 */
export async function validateUrlForSSRF(url: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: `Protocol not allowed: ${urlObj.protocol}` };
    }
    
    const hostname = urlObj.hostname;
    
    // Check if hostname is blocked
    if (isBlockedHostname(hostname)) {
      return { valid: false, reason: `Hostname is blocked: ${hostname}` };
    }
    
    // Check if hostname is an IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      // IPv4 address
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: `Private IP address: ${hostname}` };
      }
    } else if (/^[0-9a-f:]+$/i.test(hostname)) {
      // IPv6 address
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: `Private IPv6 address: ${hostname}` };
      }
    } else {
      // Hostname - resolve to check IPs
      const validation = await resolveAndValidate(hostname);
      if (!validation.valid) {
        return validation;
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, reason: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Validate URL synchronously (without DNS resolution)
 * Faster but less thorough - use when DNS lookup is not feasible
 */
export function validateUrlForSSRFSync(url: string): { valid: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: `Protocol not allowed: ${urlObj.protocol}` };
    }
    
    const hostname = urlObj.hostname;
    
    // Check if hostname is blocked
    if (isBlockedHostname(hostname)) {
      return { valid: false, reason: `Hostname is blocked: ${hostname}` };
    }
    
    // Check if hostname is an IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      // IPv4 address
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: `Private IP address: ${hostname}` };
      }
    } else if (/^[0-9a-f:]+$/i.test(hostname)) {
      // IPv6 address
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: `Private IPv6 address: ${hostname}` };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, reason: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
