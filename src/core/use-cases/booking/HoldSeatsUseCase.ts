import { IShowRepository } from "@/core/repositories/IShowRepository";
import { ICacheService } from "@/core/services/ICacheService";

export class HoldSeatsUseCase {
  constructor(
    private showRepository: IShowRepository,
    private cacheService: ICacheService
  ) {}

  async execute(showId: string, seatIds: string[], userId: string): Promise<boolean> {
    const lockTtlSeconds = 300; // 5 minutes seat hold
    const lockValue = `${userId}_${Date.now()}`;
    const acquiredLocks: string[] = [];

    try {
      // 1. Acquire distributed locks in cache for each seat
      for (const seatId of seatIds) {
        const lockKey = `lock:show:${showId}:seat:${seatId}`;
        const acquired = await this.cacheService.acquireLock(lockKey, lockValue, lockTtlSeconds);
        
        if (!acquired) {
          // Release all previously acquired locks if this request failed to lock a seat
          for (const key of acquiredLocks) {
            await this.cacheService.releaseLock(key, lockValue);
          }
          return false;
        }
        acquiredLocks.push(lockKey);
      }

      // 2. Persist the lock in the Database
      const dbLocked = await this.showRepository.lockSeats(showId, seatIds, userId, lockTtlSeconds);
      
      if (!dbLocked) {
        // Release cache locks if DB write failed
        for (const key of acquiredLocks) {
          await this.cacheService.releaseLock(key, lockValue);
        }
        return false;
      }

      return true;
    } catch (e) {
      console.error("HoldSeatsUseCase error:", e);
      for (const key of acquiredLocks) {
        await this.cacheService.releaseLock(key, lockValue);
      }
      return false;
    }
  }
}
