import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import internalRoutes from './routes/internal.routes';
import publicRoutes from './routes/public.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3011;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/internal/wallets', internalRoutes);
app.use('/api/wallets', publicRoutes);

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'wallet-service' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Wallet Service Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[WALLET-SERVICE] Running on port ${port}`);
  });
}

export default app;
