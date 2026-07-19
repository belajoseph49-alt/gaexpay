import { Request, Response, NextFunction } from 'express';

// Middleware basique pour l'auth S2S via clé API partagée
export function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');
  const internalKey = process.env.GXP_INTERNAL_API_KEY;

  if (!internalKey || apiKey !== internalKey) {
    return res.status(403).json({ error: 'Forbidden: Invalid internal API key' });
  }

  next();
}

// Middleware mocké pour l'auth utilisateur via JWT
// Dans un vrai scénario, cela utiliserait jsonwebtoken pour vérifier le token
export function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // MOCK: On considère que le token contient l'ID de l'utilisateur pour le test
  const token = authHeader.split(' ')[1];
  (req as any).user = { id: token }; // En prod: jwt.verify(...)

  next();
}
