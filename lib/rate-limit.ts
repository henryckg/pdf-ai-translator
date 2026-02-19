
const ipCache = new Map<string, { count: number; lastReset: number }>();

/**
 * Simple in-memory rate limiter.
 * @param ip Client IP address
 * @param limit Maximum number of requests allowed within the window
 * @param windowMs Time window in milliseconds
 * @returns true if the request is rate limited (blocked), false otherwise
 */
export function isRateLimited(ip: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record) {
    ipCache.set(ip, { count: 1, lastReset: now });
    return false;
  }

  if (now - record.lastReset > windowMs) {
    record.count = 1;
    record.lastReset = now;
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count += 1;
  return false;
}

// Cleanup old entries every hour
const interval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipCache.entries()) {
    if (now - record.lastReset > 3600000) { // 1 hour
      ipCache.delete(ip);
    }
  }
}, 3600000);

if (interval.unref) {
  interval.unref();
}
