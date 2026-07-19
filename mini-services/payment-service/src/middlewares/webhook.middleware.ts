/**
 * mini-services/payment-service/src/middlewares/webhook.middleware.ts
 *
 * Middleware pour valider les webhooks CinetPay :
 *  - Whitelist des IPs d'origine.
 *  - Vérification du header HMAC X-TOKEN.
 *  - Enregistrement systématique de l'événement en base de données pour audit (mâtiné de chiffrement pour la confidentialité).
 */

import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../lib/db";
import { encrypt } from "../lib/crypto";

export interface WebhookRequest extends Request {
  rawBody?: Buffer;
  webhookEventId?: string;
  isSignatureValid?: boolean;
}

export async function validateCinetPayWebhook(
  req: WebhookRequest,
  res: Response,
  next: NextFunction
) {
  const provider = "CINETPAY";
  
  // 1. IP Whitelisting
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : rawIp[0].trim();
  
  const whitelistEnv = process.env.CINETPAY_WEBHOOK_IP_WHITELIST || "127.0.0.1,::1";
  const whitelistedIps = whitelistEnv.split(",").map((ip) => ip.trim());
  
  const isIpWhitelisted = whitelistedIps.includes(ip);
  if (!isIpWhitelisted && process.env.NODE_ENV === "production") {
    console.error(`Unauthorized webhook source IP: ${ip}`);
    return res.status(403).json({ error: "Forbidden: IP not whitelisted" });
  }

  // 2. HMAC X-Token Verification
  const cinetpayToken = req.headers["x-token"] || req.headers["x-token"];
  const secretKey = process.env.CINETPAY_SECRET_KEY || "mock_secretkey";
  
  let isSignatureValid = false;
  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";

  if (cinetpayToken && typeof cinetpayToken === "string") {
    // CinetPay calcule la signature HMAC (généralement SHA256) du payload brut
    const computedSignature = createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    try {
      isSignatureValid = timingSafeEqual(
        Buffer.from(cinetpayToken),
        Buffer.from(computedSignature)
      );
    } catch {
      isSignatureValid = false;
    }
  }

  // En cas d'environnement de test/dev sans clé, on tolère la signature
  if (secretKey === "mock_secretkey" && !cinetpayToken) {
    isSignatureValid = true;
  }

  // 3. Persistance de l'événement Webhook pour audit (chiffré au repos)
  let transactionId: string | null = null;
  let parsedPayload: any = {};
  
  try {
    parsedPayload = JSON.parse(rawBody);
    // CinetPay transmet généralement le transaction_id (notre transactionRef) sous 'cpm_trans_id'
    const transactionRef = parsedPayload.cpm_trans_id || parsedPayload.transaction_id;
    
    if (transactionRef) {
      const tx = await db.paymentTransaction.findUnique({
        where: { transactionRef },
      });
      if (tx) {
        transactionId = tx.id;
      }
    }
  } catch (err) {
    console.warn("Failed to parse webhook raw payload as JSON:", err);
  }

  // Chiffre le payload brut avant de le stocker pour PCI-DSS
  const encryptedPayload = encrypt(rawBody);

  try {
    const webhookEvent = await db.webhookEvent.create({
      data: {
        provider,
        signatureValid: isSignatureValid,
        sourceIp: ip,
        rawPayload: encryptedPayload,
        transactionId,
        processed: false,
      },
    });

    req.webhookEventId = webhookEvent.id;
    req.isSignatureValid = isSignatureValid;
  } catch (dbErr) {
    console.error("Failed to store WebhookEvent for audit:", dbErr);
  }

  if (!isSignatureValid) {
    console.error(`Invalid webhook signature from ${ip}. Event stored for security audit.`);
    return res.status(400).json({ error: "Invalid signature" });
  }

  next();
}
