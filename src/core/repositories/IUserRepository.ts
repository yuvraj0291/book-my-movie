import { User } from "@prisma/client";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: Partial<User> & { email: string; password?: string; name?: string }): Promise<User>;
}
