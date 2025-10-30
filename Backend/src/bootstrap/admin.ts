import { prisma } from "../db/prisma";
import { ADMIN_ACCOUNT, ADMIN_PASSWORD } from "../config/env";
import { hashPassword } from "../auth/hash";

export async function ensureAdminExists() {
  if (!ADMIN_ACCOUNT || !ADMIN_PASSWORD) return;
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_ACCOUNT } });
  if (existing) return;
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: ADMIN_ACCOUNT,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      isLocked: false,
    },
  });
  await prisma.admin.create({ data: { userId: user.id, permissions: null } });
}

