import { IUserRepository } from "@/core/repositories/IUserRepository";
import { db } from "@/lib/db";
import { User } from "@prisma/client";

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  async create(data: Partial<User> & { email: string; password?: string; name?: string }): Promise<User> {
    return db.user.create({
      data: {
        email: data.email,
        password: data.password || null,
        name: data.name || null,
        role: data.role || "USER",
      },
    });
  }
}
