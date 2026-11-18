import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/summary-stats', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const today = new Date().toISOString().slice(0, 10);

  // Sales today
  const salesToday = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
    FROM sales
    WHERE DATE(created_at) = DATE('now', 'localtime') AND status = 'completed' AND company_id = ?
  `).get(companyId) as { count: number; total: number };

  // OS stats
  const osStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status NOT IN ('Finalizada', 'Cancelada', 'Finalizada sem reparo') THEN 1 END) as open_os,
      COUNT(CASE WHEN status = 'Pronta' THEN 1 END) as ready_os,
      COUNT(CASE WHEN DATE(entry_date) = DATE('now', 'localtime') THEN 1 END) as os_today
    FROM service_orders
    WHERE company_id = ?
  `).get(companyId) as { open_os: number; ready_os: number; os_today: number };

  // Total customers
  const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').get(companyId) as { count: number };

  // Active cash register
  const openCash = db.prepare(`
    SELECT id, user_name, opening_balance, opened_at
    FROM cash_sessions
    WHERE status = 'open' AND company_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(companyId);

  return res.json({
    sales_today_count: salesToday.count,
    sales_today_total: salesToday.total,
    open_os: osStats.open_os,
    ready_os: osStats.ready_os,
    os_today: osStats.os_today,
    total_customers: customersCount.count,
    active_cash: openCash || null
  });
});

router.get('/upcoming-deadlines', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osList = db.prepare(`
    SELECT so.id, so.code, so.status, so.deadline_date, so.reported_defects,
           c.name as customer_name, c.phone as customer_phone,
           cd.brand as device_brand, cd.model as device_model
    FROM service_orders so
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN customer_devices cd ON cd.id = so.device_id
    WHERE so.status NOT IN ('Finalizada', 'Cancelada', 'Finalizada sem reparo')
      AND so.deadline_date IS NOT NULL
      AND so.company_id = ?
    ORDER BY so.deadline_date ASC
    LIMIT 10
  `).all(companyId);

  return res.json(osList);
});

router.get('/charts', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { period = 'monthly', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  // Monthly services count
  const servicesChart = db.prepare(`
    SELECT strftime('%Y-%m', so.created_at) as month,
           COUNT(soi.id) as services_count,
           COALESCE(SUM(soi.total_price), 0) as services_total
    FROM service_order_items soi
    JOIN service_orders so ON so.id = soi.os_id
    WHERE soi.item_type = 'service' AND so.company_id = ?
    GROUP BY strftime('%Y-%m', so.created_at)
    ORDER BY month DESC LIMIT 6
  `).all(companyId);

  // Monthly items sold count
  const itemsChart = db.prepare(`
    SELECT strftime('%Y-%m', s.created_at) as month,
           COUNT(si.id) as items_count,
           COALESCE(SUM(si.total_price), 0) as items_total
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status = 'completed' AND s.company_id = ?
    GROUP BY strftime('%Y-%m', s.created_at)
    ORDER BY month DESC LIMIT 6
  `).all(companyId);

  return res.json({
    services: servicesChart,
    items: itemsChart
  });
});

export default router;
