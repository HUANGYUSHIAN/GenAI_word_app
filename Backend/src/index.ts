import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { PORT, FRONTEND_ORIGIN } from "./config/env";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import vocabularyRoutes from "./routes/vocabulary";
import couponsRoutes from "./routes/coupons";
import { ensureAdminExists } from "./bootstrap/admin";
import { seedIfEmpty } from "./bootstrap/seed";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/vocabulary", vocabularyRoutes);
app.use("/coupons", couponsRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

(async () => {
  try {
    await ensureAdminExists();
    await seedIfEmpty();
  } catch (e) {
    console.error("Failed to ensure admin exists", e);
  }
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
})();

