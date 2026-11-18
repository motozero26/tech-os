import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET, authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  let user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email) as any;
  if (!user && (email === 'admin@techos.com.br' || email === 'admin@assistenciashop.com.br')) {
    user = db.prepare("SELECT * FROM users WHERE email IN ('admin@techos.com.br', 'admin@assistenciashop.com.br') AND active = 1 LIMIT 1").get() as any;
  }
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id || 1 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, user.name, 'Autenticação', 'Login', `Usuário ${user.name} efetuou login no sistema.`, user.id);

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

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, commission_rate, active FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  return res.json(user);
});

export default router;
