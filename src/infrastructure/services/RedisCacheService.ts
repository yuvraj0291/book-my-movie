import { ICacheService } from "@/core/services/ICacheService";
import { redis } from "@/lib/redis";

export class RedisCacheService implements ICacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await redis.get<T>(key);
    } catch (e) {
      console.error(`RedisCacheService.get error for key "${key}":`, e);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await redis.set(key, value, { ex: ttlSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (e) {
      console.error(`RedisCacheService.set error for key "${key}":`, e);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (e) {
      console.error(`RedisCacheService.del error for key "${key}":`, e);
    }
  }

  async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await redis.set(key, value, {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    } catch (e) {
      console.error(`RedisCacheService.acquireLock error for key "${key}":`, e);
      return false;
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await redis.eval(luaScript, [key], [value]);
      return result === 1;
    } catch (e) {
      console.error(`RedisCacheService.releaseLock error for key "${key}":`, e);
      return false;
    }
  }
}
