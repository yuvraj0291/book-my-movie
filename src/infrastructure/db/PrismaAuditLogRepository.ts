import { IAuditLogRepository } from "@/core/repositories/IAuditLogRepository";
import { db } from "@/lib/db";

export class PrismaAuditLogRepository implements IAuditLogRepository {
  async create(
    userId: string | null,
    action: string,
    details: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId,
          action,
          details,
          ipAddress,
        },
      });
    } catch (e) {
      console.error("PrismaAuditLogRepository.create failed:", e);
    }
  }
}
