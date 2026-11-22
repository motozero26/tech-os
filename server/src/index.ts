import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, db, isPostgres, pool, getEffectiveConnectionString } from './db.js';

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

// Patch Express 4 Layer to automatically catch rejected promises in async route handlers
try {
  const Layer = require('express/lib/router/layer');
  const origHandle = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function (req: any, res: any, next: any) {
    if (this.handle.length > 3) {
      return origHandle.apply(this, arguments);
    }
    try {
      const p = this.handle.apply(this, arguments);
      if (p && typeof p.catch === 'function') {
        p.catch(next);
      }
    } catch (e) {
      next(e);
    }
  };
} catch (e) {
  console.warn('Could not patch Express router Layer for async errors:', e);
}

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

app.get('/api/health', async (req, res) => {
  const isDiag = req.query.diag === '1';
  if (!isDiag) {
    return res.json({ status: 'ok', system: 'TechOS API', time: new Date() });
  }

  const envKeys = [
    'POSTGRES_URL', 'DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING',
    'SUPABASE_URL', 'POSTGRES_HOST', 'POSTGRES_PORT'
  ].filter(k => Boolean(process.env[k]));

  let dbHost = 'none';
  let dbPort = 'none';
  const effectiveConn = getEffectiveConnectionString();
  if (effectiveConn) {
    try {
      const parsed = new URL(effectiveConn.replace(/^postgres(ql)?:\/\//, 'http://'));
      dbHost = parsed.hostname;
      dbPort = parsed.port || '5432';
    } catch {}
  }

  let dbTest: any = { status: 'untested' };
  try {
    const start = Date.now();
    const testRes = await Promise.race([
      (async () => {
        const ping = await db.prepare('SELECT 1 as connected').get();
        const reg = await pool.query("SELECT to_regclass('public.plans') as tbl");
        let count = 0;
        if (reg.rows[0]?.tbl) {
          const c = await pool.query("SELECT count(*) as count FROM plans");
          count = Number(c.rows[0]?.count);
        }
        return { ping, has_plans_table: Boolean(reg.rows[0]?.tbl), plans_count: count };
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout (3000ms)')), 3000))
    ]);
    dbTest = { status: 'connected', latency_ms: Date.now() - start, result: testRes };
  } catch (err: any) {
    dbTest = { status: 'error', error: err.message };
  }

  res.json({
    status: 'ok',
    system: 'TechOS API',
    time: new Date(),
    diagnostics: {
      isPostgres,
      available_env_vars: envKeys,
      db_host: dbHost,
      db_port: dbPort,
      db_test: dbTest
    }
  });
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
