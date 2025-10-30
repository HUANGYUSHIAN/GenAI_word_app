import { Router } from "express";
import { prisma } from "../db/prisma";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/hash";
import { signToken } from "../auth/jwt";

const router = Router();

const registerSchema = z.object({
  role: z.enum(["student", "supplier"]).transform((v) => v.toUpperCase()),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  birthday: z.string().optional(),
  name: z.string().min(1),
  password: z.string().min(8),
  language: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { role, email, phoneNumber, birthday, name, password, language } = parsed.data as any;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already exists" });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      phoneNumber: phoneNumber ?? null,
      birthday: birthday ? new Date(birthday) : null,
      name,
      passwordHash,
      language: language ?? null,
      role: role as any,
    },
  });
  // Create role-specific record
  if (user.role === "STUDENT") {
    await prisma.student.create({ data: { userId: user.id } });
  } else if (user.role === "SUPPLIER") {
    await prisma.supplier.create({ data: { userId: user.id } });
  }
  return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isLocked) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.post("/logout", async (_req, res) => {
  res.clearCookie("token");
  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const token = (req as any).cookies?.token as string | undefined;
  if (!token) return res.status(200).json({ user: null });
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user) return res.json({ user: null });
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    return res.json({ user: null });
  }
});

export default router;

