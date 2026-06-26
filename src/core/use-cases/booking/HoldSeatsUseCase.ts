import { IShowRepository } from "@/core/repositories/IShowRepository";
import { ICacheService } from "@/core/services/ICacheService";
import { ShowSeatStatus } from "@prisma/client";

export class HoldSeatsUseCase {
  constructor(
    private showRepository: IShowRepository,
    private cacheService: ICacheService
  ) {}

  async execute(showId: string, seatIds: string[], userId: string): Promise<boolean> {
    const lockTtlSeconds = 480; // 8 minutes seat hold
    const lockValue = userId;
    const acquiredLocks: string[] = [];

    try {
      const showSeats = await this.showRepository.findSeatsByShowId(showId);
      const targetSeats = showSeats.filter(s => seatIds.includes(s.seatId));

      if (targetSeats.length !== seatIds.length) {
        return false;
      }

      for (const seat of targetSeats) {
        if (seat.status === ShowSeatStatus.BOOKED) {
          return false;
        }
      }

      for (const seatId of seatIds) {
        const lockKey = `lock:show:${showId}:seat:${seatId}`;
        const acquired = await this.cacheService.acquireLock(lockKey, lockValue, lockTtlSeconds);
        
        if (!acquired) {
          for (const key of acquiredLocks) {
            await this.cacheService.releaseLock(key, lockValue);
          }
          return false;
        }
        acquiredLocks.push(lockKey);
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
