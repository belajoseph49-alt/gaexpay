/**
 * mini-services/payment-service/src/middlewares/auth.middleware.ts
 *
 * Middleware d'authentification par JWT compatible avec le format GaexPay.
 * - Vérification HMAC-SHA256 du JWT (signature symétrique partagée avec identity-service).
 * - Expose req.userId, req.kycTier, req.role sur la requête typée.
 * - En développement local (secret "mock"), accepte un header X-Dev-User-Id.
 */

import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  kycTier?: number;
  role?: string;
  rawBody?: Buffer; // défini dans app.ts via express.json verify
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

interface JwtClaims {
  sub: string;
  kycTier?: number;
  role?: string;
  exp?: number;
}

function verifyToken(token: string, secret: string): JwtClaims | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  // Recalcule la signature HMAC-SHA256 avec la clé secrète partagée
  const expectedSig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest();

  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sig);
  } catch {
    return null;
  }

  // Comparaison en temps constant pour prévenir les timing attacks
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  // Signature valide — décoder et vérifier le payload
  let payload: JwtClaims;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as JwtClaims;
  } catch {
    return null;
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;

  // Vérification expiration
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
    return null; // Token expiré
  }

  return payload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.GAEXPAY_JWT_SECRET || "mock_jwt_secret";
  const isMock = secret.startsWith("mock_");

  // Mode dev : accepte X-Dev-User-Id sans JWT si le secret n'est pas configuré
  if (isMock && process.env.NODE_ENV !== "production") {
    const devUserId = req.headers["x-dev-user-id"];
    if (devUserId && typeof devUserId === "string") {
      req.userId = devUserId;
      req.kycTier = parseInt((req.headers["x-dev-kyc-tier"] as string) || "1", 10);
      req.role = (req.headers["x-dev-role"] as string) || "USER";
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.substring(7);
  const claims = verifyToken(token, secret);

  if (!claims) {
    res.status(401).json({ error: "Invalid or expired authentication token" });
    return;
  }

  req.userId = claims.sub;
  req.kycTier = claims.kycTier ?? 0;
  req.role = claims.role ?? "USER";
  next();
}

/**
 * Middleware d'auth inter-services (S2S) via clé API partagée.
 * Utilisé uniquement sur les routes /internal/...
 */
export function requireInternalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const internalKey = process.env.GXP_INTERNAL_API_KEY || "mock_internal_key";
  const provided = req.headers["x-api-key"];

  if (!provided || provided !== internalKey) {
    res.status(403).json({ error: "Forbidden: Invalid internal API key" });
    return;
  }
  next();
}
