import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Company info
router.get('/company', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  return res.json(company || {});
});

router.put('/company', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    name, trade_name, cnpj, phone, email, address,
    city, state, zip_code, logo, warranty_terms, receipt_notes,
    primary_color, secondary_color, theme_mode
  } = req.body;

  await db.prepare(`
    UPDATE companies
    SET name = ?, trade_name = ?, cnpj = ?, phone = ?, email = ?,
        address = ?, city = ?, state = ?, zip_code = ?, logo = ?,
        warranty_terms = ?, receipt_notes = ?,
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        theme_mode = COALESCE(?, theme_mode)
    WHERE id = ?
  `).run(
    name, trade_name, cnpj, phone, email, address,
    city, state, zip_code, logo !== undefined ? logo : null, warranty_terms !== undefined ? warranty_terms : null, receipt_notes !== undefined ? receipt_notes : null,
    primary_color || null, secondary_color || null, theme_mode || null, companyId
  );

  await logAudit(req.user!.id, req.user!.name, 'Configurações', 'Edição', 'Atualizou os dados da empresa, personalização visual (tema escuro/claro e cores) e termos de garantia', companyId, undefined, companyId);

  return res.json({ success: true });
});

// Users
router.get('/users', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const users = await db.prepare('SELECT id, name, email, role, commission_rate, active, created_at FROM users WHERE company_id = ? ORDER BY name ASC').all(companyId);
  return res.json(users);
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { name, email, password, role = 'technician', commission_rate = 0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const ins = await db.prepare(`
    INSERT INTO users (company_id, name, email, password_hash, role, commission_rate, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(companyId, name, email, passwordHash, role, Number(commission_rate));

  await logAudit(req.user!.id, req.user!.name, 'Equipe', 'Novo Utilizador', `Cadastrou o usuário "${name}" (${role})`, Number(ins.lastInsertRowid), undefined, companyId);

  return res.status(201).json({ id: ins.lastInsertRowid });
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { name, email, password, role, commission_rate, active } = req.body;

  // Verify target user belongs to this company
  const targetUser = await db.prepare('SELECT id FROM users WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado ou não pertence a esta empresa.' });
  }

  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    await db.prepare(`
      UPDATE users
      SET name = ?, email = ?, password_hash = ?, role = ?, commission_rate = ?, active = ?
      WHERE id = ? AND company_id = ?
    `).run(name, email, passwordHash, role, Number(commission_rate), active !== undefined ? Number(active) : 1, req.params.id, companyId);
  } else {
    await db.prepare(`
      UPDATE users
      SET name = ?, email = ?, role = ?, commission_rate = ?, active = ?
      WHERE id = ? AND company_id = ?
    `).run(name, email, role, Number(commission_rate), active !== undefined ? Number(active) : 1, req.params.id, companyId);
  }

  await logAudit(req.user!.id, req.user!.name, 'Equipe', 'Edição de Utilizador', `Editou o usuário ID ${req.params.id}`, Number(req.params.id), undefined, companyId);

  return res.json({ success: true });
});

// Profiles & Permissions
router.get('/profiles', async (req: AuthRequest, res: Response) => {
  const profiles = await db.prepare('SELECT * FROM profiles ORDER BY name ASC').all() as any[];

  const fullProfiles = await Promise.all(profiles.map(async p => {
    const permissions = await db.prepare('SELECT * FROM profile_permissions WHERE profile_id = ?').all(p.id);
    return { ...p, permissions };
  }));

  return res.json(fullProfiles);
});

router.post('/profiles', async (req: AuthRequest, res: Response) => {
  const { name, description, modules } = req.body;
  // modules: array of { module: 'os'|'caixa'|'estoque'|'financeiro'|'equipe', is_admin: boolean }

  if (!name) return res.status(400).json({ error: 'Nome do perfil é obrigatório' });

  const tx = db.transaction(async () => {
    const pIns = await db.prepare('INSERT INTO profiles (name, description) VALUES (?, ?)').run(name, description || null);
    const profileId = pIns.lastInsertRowid;

    if (Array.isArray(modules)) {
      const insPerm = await db.prepare(`
        INSERT INTO profile_permissions (profile_id, module, is_admin, can_view, can_create, can_edit, can_delete)
        VALUES (?, ?, ?, 1, 1, 1, ?)
      `);
      for (const m of modules) {
        await insPerm.run(profileId, m.module, m.is_admin ? 1 : 0, m.is_admin ? 1 : 0);
      }
    }

    await logAudit(req.user!.id, req.user!.name, 'Perfis', 'Novo Perfil', `Criou o perfil de acesso "${name}"`, Number(profileId));
    return profileId;
  });

  const profileId = await tx();
  return res.status(201).json({ id: profileId });
});

// Audit Logs
router.get('/audit', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { page = 1, limit = 50, q } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClauses: string[] = ['(company_id = ? OR company_id IS NULL)'];
  let params: any[] = [companyId];

  if (q) {
    whereClauses.push('(user_name LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const total = await db.prepare(`SELECT count(*) as count FROM audit_logs ${whereSql}`).get(...params) as { count: number };

  const logs = await db.prepare(`
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
