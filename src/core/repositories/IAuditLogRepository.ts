export interface IAuditLogRepository {
  create(
    userId: string | null,
    action: string,
    details: string,
    ipAddress?: string
  ): Promise<void>;
}
