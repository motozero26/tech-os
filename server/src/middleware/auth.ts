import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'assistencia-shop-super-secret-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    company_id?: number;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string; email: string; role: string; company_id?: number };
    req.user = decoded;

    // Check if store subscription is overdue/expired for write operations (POST, PUT, PATCH, DELETE)
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.user.role !== 'superadmin') {
        const path = req.originalUrl || req.baseUrl + req.path;
        const isExempt = path.includes('/subscription') ||
                         path.includes('/auth/logout') ||
                         path.includes('/auth/me') ||
                         path.includes('/saas');

        if (!isExempt) {
          const companyId = req.user.company_id || (db.prepare('SELECT company_id FROM users WHERE id = ?').get(req.user.id) as any)?.company_id || 1;
          const company = db.prepare('SELECT id, subscription_status, access_expires_at FROM companies WHERE id = ?').get(companyId) as any;
          if (company) {
            const now = new Date();
            const expiresAt = company.access_expires_at ? new Date(company.access_expires_at) : null;
            const isOverdue = company.subscription_status === 'overdue' ||
                              company.subscription_status === 'suspended' ||
                              (expiresAt !== null && expiresAt < now);

            if (isOverdue) {
              return res.status(403).json({
                error: 'Acesso em Modo Somente Leitura: O pagamento da assinatura do sistema está atrasado. O sistema permite consultas, mas bloqueia novas criações, edições e exclusões até a regularização do pagamento.',
                code: 'SUBSCRIPTION_OVERDUE',
                read_only: true,
                access_expires_at: company.access_expires_at,
                subscription_status: company.subscription_status
              });
            }
          }
        }
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou token inválido' });
  }
}

export function logAudit(userId: number | null, userName: string | null, module: string, action: string, description: string, entityId?: number, ip?: string) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, module, action, description, entity_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId || null, userName || 'Sistema', module, action, description, entityId || null, ip || '127.0.0.1');
  } catch (error) {
    console.error('Erro ao gravar log de auditoria:', error);
  }
}

export { JWT_SECRET };
