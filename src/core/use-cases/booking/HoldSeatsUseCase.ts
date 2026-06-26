import { IShowRepository } from "@/core/repositories/IShowRepository";
import { ICacheService } from "@/core/services/ICacheService";
import { IAuditLogRepository } from "@/core/repositories/IAuditLogRepository";
import { ShowSeatStatus } from "@prisma/client";

export class HoldSeatsUseCase {
  constructor(
    private showRepository: IShowRepository,
    private cacheService: ICacheService,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(showId: string, seatIds: string[], userId: string): Promise<boolean> {
    const lockTtlSeconds = 480; // 8 minutes seat hold
    const lockValue = userId;

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

      const lockKeys = seatIds.map(seatId => `lock:show:${showId}:seat:${seatId}`);
      const acquired = await this.cacheService.acquireMultipleLocks(lockKeys, lockValue, lockTtlSeconds);

      if (acquired) {
        await this.auditLogRepository.create(
          userId,
          "SEAT_HOLD",
          `Held seats ${seatIds.join(", ")} for show ${showId}`
        );
      }

      return acquired;
    } catch (e) {
      console.error("HoldSeatsUseCase error:", e);
      return false;
    }
  }
}
