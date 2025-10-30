import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole(["ADMIN"]));

router.get("/", async (_req, res) => {
  const list = await prisma.coupon.findMany({ select: { id: true, text: true, period: true, link: true, supplierId: true } });
  res.json(list);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
});

router.post("/", async (req, res) => {
  const { text, period, link, supplierId } = req.body || {};
  const c = await prisma.coupon.create({ data: {
    text: text ?? null,
    period: period ? new Date(period) : null,
    link: link ?? null,
    supplierId: supplierId ?? null,
  }});
  res.status(201).json(c);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { text, period, link, supplierId } = req.body || {};
  const c = await prisma.coupon.update({ where: { id }, data: {
    text: text ?? undefined,
    period: period ? new Date(period) : undefined,
    link: link ?? undefined,
    supplierId: supplierId ?? undefined,
  }});
  res.json(c);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.coupon.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

