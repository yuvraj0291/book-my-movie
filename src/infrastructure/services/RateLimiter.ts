import { redis } from "@/lib/redis";

export class RedisRateLimiter {
  /**
   * Checks if a request should be rate-limited.
   * Uses a sliding window log implemented via Redis Sorted Sets (zset).
   * 
   * @param key The Redis key to track rate limits for (e.g. rate_limit:hold_seats:user_123)
   * @param limit The maximum number of allowed requests in the window
   * @param windowSeconds The duration of the sliding window in seconds
   * @returns true if rate limited, false otherwise
   */
  async isRateLimited(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    const now = Date.now();
    const clearBefore = now - windowSeconds * 1000;

    try {
      const pipeline = redis.pipeline();
      
      // Remove timestamps older than the sliding window boundary
      pipeline.zremrangebyscore(key, 0, clearBefore);
      
      // Add the current request timestamp with a unique suffix member to allow multiple hits in same millisecond
      const member = `${now}-${Math.random().toString(36).substring(2, 6)}`;
      pipeline.zadd(key, { score: now, member });
      
      // Count the total number of hits within the active window
      pipeline.zcard(key);
      
      // Set key expiry to save storage space
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();
      
      // ZCARD result is the third operation in the pipeline (index 2)
      const count = results[2] as number;
      
      return count > limit;
    } catch (e) {
      console.error(`RedisRateLimiter.isRateLimited error for key "${key}":`, e);
      // Fail-open to avoid disrupting checkout flow if Redis REST endpoint is slow/unreachable
      return false;
    }
  }
}
