import { Router } from "express";
import multer from "multer";
import xlsx from "xlsx";
import { prisma } from "../db/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth, requireRole(["ADMIN"]));

router.get("/", async (_req, res) => {
  const list = await prisma.vocabulary.findMany({
    select: {
      id: true,
      name: true,
      langUse: true,
      langExp: true,
      copyrights: true,
      establisherUserId: true,
      establisher: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(list);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const v = await prisma.vocabulary.findUnique({
    where: { id },
    include: { words: true, establisher: { select: { id: true, name: true, email: true } } },
  });
  if (!v) return res.status(404).json({ error: "Not found" });
  res.json(v);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, langUse, langExp, copyrights, words } = req.body || {};
  const exists = await prisma.vocabulary.findUnique({ where: { id }, include: { words: true } });
  if (!exists) return res.status(404).json({ error: "Not found" });
  await prisma.word.deleteMany({ where: { vocabularyId: id } });
  const updated = await prisma.vocabulary.update({
    where: { id },
    data: {
      name: name ?? exists.name,
      langUse: langUse ?? exists.langUse,
      langExp: langExp ?? exists.langExp,
      copyrights: copyrights ?? exists.copyrights,
      words: {
        create: Array.isArray(words)
          ? words.map((w: any) => ({
              word: w.word,
              spelling: w.spelling ?? null,
              explanation: w.explanation ?? null,
              partOfSpeech: w.partOfSpeech ?? null,
              sentence: w.sentence ?? null,
            }))
          : [],
      },
    },
    include: { words: true },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.word.deleteMany({ where: { vocabularyId: id } });
  await prisma.vocabulary.delete({ where: { id } });
  res.json({ ok: true });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });
  const isCsv = file.originalname.toLowerCase().endsWith(".csv");
  const isXlsx = file.originalname.toLowerCase().endsWith(".xlsx");
  if (!isCsv && !isXlsx) return res.status(400).json({ error: "Only .csv or .xlsx allowed" });

  const wb = xlsx.read(file.buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(ws, { defval: null });
  // Expected headers: Word, Spelling, Explanation, PartOfSpeech, Sentence (also supports legacy 'Sentences')
  const words = rows.map((r) => {
    const legacy = r["Sentences"]; // may be array/json/semicolon string
    const sentence = r["Sentence"] ?? (legacy ? firstFromPossiblyMulti(legacy) : null);
    return {
      word: (r["Word"] ?? "").toString(),
      spelling: r["Spelling"] ?? null,
      explanation: r["Explanation"] ?? null,
      partOfSpeech: r["PartOfSpeech"] ?? null,
      sentence: sentence ?? null,
    };
  });

  const vocab = await prisma.vocabulary.create({
    data: {
      name: req.query.name?.toString() || "Uploaded Vocabulary",
      langUse: req.query.langUse?.toString() || null,
      langExp: req.query.langExp?.toString() || null,
      copyrights: req.query.copyrights?.toString() || null,
      establisherUserId: Number((req as any).user.sub),
      words: { create: words.filter((w) => w.word && w.word.length > 0) },
    },
    include: { words: true },
  });

  res.json({ id: vocab.id, name: vocab.name, words: vocab.words.length });
});

router.post("/", async (req, res) => {
  const { name, langUse, langExp, copyrights, words } = req.body || {};
  const vocab = await prisma.vocabulary.create({
    data: {
      name: name || "Vocabulary",
      langUse: langUse ?? null,
      langExp: langExp ?? null,
      copyrights: copyrights ?? null,
      establisherUserId: Number((req as any).user.sub),
      words: {
        create: Array.isArray(words)
          ? words.map((w: any) => ({
              word: w.word,
              spelling: w.spelling ?? null,
              explanation: w.explanation ?? null,
              partOfSpeech: w.partOfSpeech ?? null,
              sentence: w.sentence ?? null,
            }))
          : [],
      },
    },
  });
  res.json(vocab);
});

function firstFromPossiblyMulti(value: any): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed[0] ?? null;
    } catch {}
    const parts = value.split(/;|\n/).map((s) => s.trim()).filter(Boolean);
    return parts[0] ?? value;
  }
  return String(value);
}

export default router;

