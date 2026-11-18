import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Company info
router.get('/company', (req: AuthRequest, res: Response) => {
  const company = db.prepare('SELECT * FROM companies LIMIT 1').get();
  return res.json(company || {});
});

router.put('/company', (req: AuthRequest, res: Response) => {
  const {
    name, trade_name, cnpj, phone, email, address,
    city, state, zip_code, logo, warranty_terms, receipt_notes,
    primary_color, secondary_color, theme_mode
  } = req.body;

  db.prepare(`
    UPDATE companies
    SET name = ?, trade_name = ?, cnpj = ?, phone = ?, email = ?,
        address = ?, city = ?, state = ?, zip_code = ?, logo = ?,
        warranty_terms = ?, receipt_notes = ?,
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        theme_mode = COALESCE(?, theme_mode)
    WHERE id = 1
  `).run(
    name, trade_name, cnpj, phone, email, address,
    city, state, zip_code, logo !== undefined ? logo : null, warranty_terms !== undefined ? warranty_terms : null, receipt_notes !== undefined ? receipt_notes : null,
    primary_color || null, secondary_color || null, theme_mode || null
  );

  logAudit(req.user!.id, req.user!.name, 'Configurações', 'Edição', 'Atualizou os dados da empresa, personalização visual (tema escuro/claro e cores) e termos de garantia');

  return res.json({ success: true });
});

// Users
router.get('/users', (req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, commission_rate, active, created_at FROM users ORDER BY name ASC').all();
  return res.json(users);
});

router.post('/users', (req: AuthRequest, res: Response) => {
  const { name, email, password, role = 'technician', commission_rate = 0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const ins = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, commission_rate, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(name, email, passwordHash, role, Number(commission_rate));

  logAudit(req.user!.id, req.user!.name, 'Equipe', 'Novo Utilizador', `Cadastrou o usuário "${name}" (${role})`, Number(ins.lastInsertRowid));

  return res.status(201).json({ id: ins.lastInsertRowid });
});

router.put('/users/:id', (req: AuthRequest, res: Response) => {
  const { name, email, password, role, commission_rate, active } = req.body;

  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, password_hash = ?, role = ?, commission_rate = ?, active = ?
      WHERE id = ?
    `).run(name, email, passwordHash, role, Number(commission_rate), active !== undefined ? Number(active) : 1, req.params.id);
  } else {
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, role = ?, commission_rate = ?, active = ?
      WHERE id = ?
    `).run(name, email, role, Number(commission_rate), active !== undefined ? Number(active) : 1, req.params.id);
  }

  logAudit(req.user!.id, req.user!.name, 'Equipe', 'Edição de Utilizador', `Editou o usuário ID ${req.params.id}`, Number(req.params.id));

  return res.json({ success: true });
});

// Profiles & Permissions
router.get('/profiles', (req: AuthRequest, res: Response) => {
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY name ASC').all() as any[];

  const fullProfiles = profiles.map(p => {
    const permissions = db.prepare('SELECT * FROM profile_permissions WHERE profile_id = ?').all(p.id);
    return { ...p, permissions };
  });

  return res.json(fullProfiles);
});

router.post('/profiles', (req: AuthRequest, res: Response) => {
  const { name, description, modules } = req.body;
  // modules: array of { module: 'os'|'caixa'|'estoque'|'financeiro'|'equipe', is_admin: boolean }

  if (!name) return res.status(400).json({ error: 'Nome do perfil é obrigatório' });

  const tx = db.transaction(() => {
    const pIns = db.prepare('INSERT INTO profiles (name, description) VALUES (?, ?)').run(name, description || null);
    const profileId = pIns.lastInsertRowid;

    if (Array.isArray(modules)) {
      const insPerm = db.prepare(`
        INSERT INTO profile_permissions (profile_id, module, is_admin, can_view, can_create, can_edit, can_delete)
        VALUES (?, ?, ?, 1, 1, 1, ?)
      `);
      modules.forEach(m => {
        insPerm.run(profileId, m.module, m.is_admin ? 1 : 0, m.is_admin ? 1 : 0);
      });
    }

    logAudit(req.user!.id, req.user!.name, 'Perfis', 'Novo Perfil', `Criou o perfil de acesso "${name}"`, Number(profileId));
    return profileId;
  });

  const profileId = tx();
  return res.status(201).json({ id: profileId });
});

// Audit Logs
router.get('/audit', (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, q } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereSql = '';
  let params: any[] = [];

  if (q) {
    whereSql = 'WHERE user_name LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ?';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const total = db.prepare(`SELECT count(*) as count FROM audit_logs ${whereSql}`).get(...params) as { count: number };

  const logs = db.prepare(`
    SELECT * FROM audit_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return res.json({
    data: logs,
    total: total.count,
    page: Number(page),
    limit: Number(limit)
  });
});

export default router;
