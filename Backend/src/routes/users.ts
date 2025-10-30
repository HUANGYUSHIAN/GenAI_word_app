import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole(["ADMIN"]));

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isLocked: true } });
  res.json(users);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

router.post("/", async (req, res) => {
  const { email, name, password, role, language, phoneNumber, birthday } = req.body || {};
  if (!email || !name || !password || !role) return res.status(400).json({ error: "Missing fields" });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email exists" });
  const passwordHash = await (await import("../auth/hash")).hashPassword(password);
  const user = await prisma.user.create({ data: {
    email, name, passwordHash, role, language: language ?? null,
    phoneNumber: phoneNumber ?? null,
    birthday: birthday ? new Date(birthday) : null,
  }});
  if (user.role === "STUDENT") await prisma.student.create({ data: { userId: user.id } });
  if (user.role === "SUPPLIER") await prisma.supplier.create({ data: { userId: user.id } });
  if (user.role === "ADMIN") await prisma.admin.create({ data: { userId: user.id } });
  res.status(201).json(user);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, role, language, phoneNumber, birthday, isLocked } = req.body || {};
  const user = await prisma.user.update({ where: { id }, data: {
    name: name ?? undefined,
    role: role ?? undefined,
    language: language ?? undefined,
    phoneNumber: phoneNumber ?? undefined,
    birthday: birthday ? new Date(birthday) : undefined,
    isLocked: typeof isLocked === "boolean" ? isLocked : undefined,
  }});
  res.json(user);
});

router.patch("/:id/lock", async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.user.update({ where: { id }, data: { isLocked: true } });
  res.json({ id: updated.id, isLocked: updated.isLocked });
});

router.patch("/:id/unlock", async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.user.update({ where: { id }, data: { isLocked: false } });
  res.json({ id: updated.id, isLocked: updated.isLocked });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  // clean role tables if exist
  await prisma.student.deleteMany({ where: { userId: id } });
  await prisma.supplier.deleteMany({ where: { userId: id } });
  await prisma.admin.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

