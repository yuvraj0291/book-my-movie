import { handlers } from "@/auth";

export const { GET, POST } = handlers;
export const runtime = "nodejs"; // Prisma pg adapter requires Node.js runtime, not Edge, for api routes
