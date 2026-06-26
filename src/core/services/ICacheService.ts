export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string, value: string): Promise<boolean>;
}
