import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';

import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import osRouter from './routes/os.js';
import cashRouter from './routes/cash.js';
import salesRouter from './routes/sales.js';
import productsRouter from './routes/products.js';
import customersRouter from './routes/customers.js';
import financialRouter from './routes/financial.js';
import usedDevicesRouter from './routes/used_devices.js';
import settingsRouter from './routes/settings.js';
import subscriptionRouter from './routes/subscription.js';
import saasRouter from './routes/saas.js';
import fiscalRouter from './routes/fiscal.js';

dotenv.config();

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/os', osRouter);
app.use('/api/cash', cashRouter);
app.use('/api/sales', salesRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/financial', financialRouter);
app.use('/api/used-devices', usedDevicesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/saas', saasRouter);
app.use('/api/fiscal', fiscalRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'TechOS API', time: new Date() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Erro interno no servidor' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[TechOS API] Servidor rodando na porta ${PORT}`);
  });
}

export default app;
export { app };
