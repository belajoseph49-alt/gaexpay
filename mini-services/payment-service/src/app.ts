/**
 * mini-services/payment-service/src/app.ts
 *
 * Point d'entrée principal pour le service de paiement CinetPay.
 */

import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import paymentRouter from "./routes/payment.routes";
import { startReconciliationScheduler } from "./jobs/reconciliation.job";

dotenv.config();

const app = express();
const port = process.env.PORT || 3010;

// Configuration de sécurité basique
app.use(helmet());
app.use(
  cors({
    origin: process.env.GXP_ALLOWED_ORIGINS
      ? process.env.GXP_ALLOWED_ORIGINS.split(",")
      : "*",
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// Rate-limiting global : 100 requêtes par 15 minutes par IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please retry after 15 minutes." },
  skip: (req) => req.path === "/health", // ne pas limiter le health-check
});
app.use(globalLimiter);

// Rate-limiting strict sur les endpoints financiers : 10 requêtes / 5 minutes / IP
const financialLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment requests. Please wait 5 minutes." },
});
app.use("/api/payments/payin", financialLimiter);
app.use("/api/payments/payout", financialLimiter);

// Capture du body brut pour la vérification HMAC sur les webhooks
app.use(
  express.json({
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

// Enregistrement des routes de paiement
app.use(paymentRouter);

// Handler de santé simple
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", service: "payment-service", timestamp: new Date().toISOString() });
});

// Middleware global de gestion des erreurs
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[GLOBAL_ERROR]", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

// Boot du serveur si non importé pour les tests
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[PAYMENT-SERVICE] Running on port ${port} in ${process.env.NODE_ENV || "development"} mode.`);
    // Démarrage du job de réconciliation automatique (toutes les 5 minutes)
    startReconciliationScheduler(5 * 60 * 1000);
    console.log("[PAYMENT-SERVICE] Reconciliation scheduler started (every 5 minutes).");
  });
}

export default app;
