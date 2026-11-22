import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET, authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();

// In-memory rate limiting against brute-force login attacks
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (now - record.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= 15;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

router.post('/login', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Muitas tentativas incorretas. Por segurança, aguarde alguns minutos para tentar novamente.' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  let user = await db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email) as any;
  if (!user && (email === 'admin@techos.com.br' || email === 'admin@assistenciashop.com.br')) {
    user = await db.prepare("SELECT * FROM users WHERE email IN ('admin@techos.com.br', 'admin@assistenciashop.com.br') AND active = 1 LIMIT 1").get() as any;
  }
  if (!user) {
    recordFailedAttempt(clientIp);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    recordFailedAttempt(clientIp);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Clear failed attempts upon successful login
  loginAttempts.delete(clientIp);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id || 1 },
    JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );

  await logAudit(user.id, user.name, 'Autenticação', 'Login', `Usuário ${user.name} efetuou login no sistema.`, user.id, clientIp, user.company_id || 1);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      commission_rate: user.commission_rate
    }
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await db.prepare('SELECT id, name, email, role, commission_rate, active FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  return res.json(user);
});

export default router;
