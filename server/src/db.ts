import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { AsyncLocalStorage } from 'async_hooks';

export interface DbInterface {
  prepare(sql: string): {
    all(...params: any[]): any;
    get(...params: any[]): any;
    run(...params: any[]): any;
  };
  exec(sql: string): any;
  pragma(sql: string, options?: any): any;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
}

export function getEffectiveConnectionString(): string | undefined {
  const candidates = [
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.SUPABASE_DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING
  ].filter(Boolean) as string[];

  // Prioritize pooler URL (IPv4 compatible with Vercel Serverless Functions)
  const pooler = candidates.find(c => c.includes('pooler.supabase.com'));
  if (pooler) return pooler;

  return candidates[0];
}

const connectionString = getEffectiveConnectionString();
const isPostgres = Boolean(connectionString);

let dbInstance: DbInterface;
let pool: any = null;
const txStorage = new AsyncLocalStorage<any>();

if (isPostgres) {
  console.log('[TechOS Database] Inicializando conexão nativa não-bloqueante com Supabase PostgreSQL...');
  const { Pool } = require('pg');

  const conn = connectionString || '';
  if (conn.includes('supabase') || conn.includes('pooler')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const cleanConn = conn.replace(/([?&])sslmode=[^&]+(&|$)/, (m, p1, p2) => (p2 === '&' ? p1 : '')).replace(/[?&]$/, '');

  pool = new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
    statement_timeout: 8000,
  });

  pool.on('error', (err: any) => {
    console.error('[TechOS Database] Erro capturado no pool do PostgreSQL:', err?.message || err);
  });

  function adaptSql(sql: string, type: string): string {
    let out = sql.replace(/strftime\s*\(\s*'%Y-%m'\s*,\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");
    out = out.replace(/strftime\s*\(\s*'%Y-%m-%d'\s*,\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')");
    out = out.replace(/strftime\s*\(\s*'%Y'\s*,\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY')");
    out = out.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'NOW()');

    let paramIndex = 1;
    let inString = false;
    let converted = '';
    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (ch === "'") {
        inString = !inString;
        converted += ch;
      } else if (ch === '?' && !inString) {
        converted += `$${paramIndex++}`;
      } else {
        converted += ch;
      }
    }
    out = converted;

    if (type === 'run' && /^\s*INSERT\s+INTO/i.test(out) && !/\bRETURNING\b/i.test(out)) {
      out += ' RETURNING id';
    }

    return out;
  }

  function flattenParams(params: any[]): any[] {
    if (Array.isArray(params) && params.length === 1 && Array.isArray(params[0])) {
      return params[0];
    }
    return params || [];
  }

  async function executePg(type: string, sql: string, params: any[] = []) {
    const pgSql = adaptSql(sql, type);
    const cleanParams = (params || []).map(p => p === undefined ? null : p);

    const client = txStorage.getStore() || pool;

    if (type === 'exec') {
      await client.query(pgSql);
      return { rows: [], lastInsertRowid: 0, changes: 0 };
    }

    const res = await client.query(pgSql, cleanParams);

    if (type === 'run') {
      const firstRow = res.rows && res.rows[0];
      const lastId = firstRow && firstRow.id !== undefined ? Number(firstRow.id) : 0;
      return {
        rows: [],
        lastInsertRowid: lastId,
        changes: res.rowCount || 0
      };
    }

    return {
      rows: res.rows || [],
      lastInsertRowid: 0,
      changes: res.rowCount || 0
    };
  }

  dbInstance = {
    prepare(sql: string) {
      return {
        async all(...params: any[]) {
          const p = flattenParams(params);
          const res = await executePg('all', sql, p);
          return res.rows;
        },
        async get(...params: any[]) {
          const p = flattenParams(params);
          const res = await executePg('get', sql, p);
          return (res.rows as any[]).length > 0 ? (res.rows as any[])[0] : undefined;
        },
        async run(...params: any[]) {
          const p = flattenParams(params);
          const res = await executePg('run', sql, p);
          return {
            lastInsertRowid: res.lastInsertRowid,
            changes: res.changes
          };
        }
      };
    },
    async exec(sql: string) {
      await executePg('exec', sql);
    },
    pragma(_cmd: string) {
      return [];
    },
    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return async function (...args: any[]) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await txStorage.run(client, async () => {
            return await fn(...args);
          });
          await client.query('COMMIT');
          return result;
        } catch (err) {
          try { await client.query('ROLLBACK'); } catch {}
          throw err;
        } finally {
          client.release();
        }
      } as unknown as T;
    }
  };
} else {
  // Local SQLite fallback
  const Database = require('better-sqlite3');
  const baseDir = process.cwd().endsWith('server') ? path.resolve(process.cwd(), '..') : process.cwd();
  const dbDir = process.env.VERCEL ? path.join('/tmp', 'data') : path.resolve(baseDir, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'assistencia_shop.db');
  dbInstance = new Database(dbPath);

  // Enable WAL mode & foreign keys
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
}

export const db: DbInterface = dbInstance;
export { isPostgres, pool };

export async function initDatabase() {
  if (isPostgres) {
    try {
      console.log('[TechOS Database] Verificando tabelas no Supabase PostgreSQL...');
      const reg = await pool.query("SELECT to_regclass('public.plans') as tbl");
      const hasPlans = reg.rows && reg.rows[0]?.tbl !== null;

      if (!hasPlans) {
        console.log('[TechOS Database] Tabelas não encontradas no Supabase. Executando auto-migration do schema...');
        const candidatePaths = [
          path.resolve(__dirname, 'schema.sql'),
          path.resolve(__dirname, '..', 'src', 'schema.sql'),
          path.resolve(process.cwd(), 'supabase', 'schema.sql'),
          path.resolve(process.cwd(), '..', 'supabase', 'schema.sql'),
          path.resolve(process.cwd(), 'src', 'schema.sql')
        ];
        let schemaSql = '';
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            schemaSql = fs.readFileSync(p, 'utf8');
            break;
          }
        }
        if (schemaSql) {
          const statements = schemaSql
            .split(/;\s*[\r\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

          for (const stmt of statements) {
            try {
              await pool.query(stmt);
            } catch (stmtErr: any) {
              console.warn('[TechOS Database Migration Warning]:', stmtErr.message);
            }
          }
          console.log('[TechOS Database] Schema PostgreSQL inicializado com sucesso no Supabase!');
        } else {
          console.warn('[TechOS Database] Arquivo schema.sql não localizado para auto-migration.');
        }
      } else {
        const plansCount = (await db.prepare('SELECT count(*) as count FROM plans').get()) as any;
        console.log(`[TechOS Database] Supabase PostgreSQL conectado com sucesso! Planos cadastrados: ${plansCount?.count ?? 0}`);
      }

      // Ensure admin user has valid bcrypt hash in Supabase
      try {
        const adminCheck = (await db.prepare("SELECT id, password_hash FROM users WHERE email IN ('admin@techos.com.br', 'admin@techos.com', 'admin@assistenciashop.com.br') LIMIT 1").get()) as any;
        const validAdminHash = bcrypt.hashSync('admin123', 10);
        if (!adminCheck) {
          await db.prepare(`
            INSERT INTO users (company_id, name, email, password_hash, role, active)
            VALUES (1, 'MACKSON WEIBER', 'admin@techos.com.br', ?, 'master', 1)
          `).run(validAdminHash);
        } else {
          if (!bcrypt.compareSync('admin123', adminCheck.password_hash) && !bcrypt.compareSync('123456', adminCheck.password_hash)) {
            await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(validAdminHash, adminCheck.id);
          }
        }
      } catch (userErr: any) {
        console.warn('[TechOS Database] Aviso ao sincronizar admin:', userErr.message);
      }
    } catch (err: any) {
      console.error('[TechOS Database] Erro ao verificar/inicializar Supabase:', err.message);
    }
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price_monthly REAL NOT NULL,
      price_yearly REAL NOT NULL,
      max_users INTEGER DEFAULT 5,
      max_devices INTEGER DEFAULT 1000,
      features TEXT, -- JSON array of feature strings
      is_popular INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_code TEXT UNIQUE,
      name TEXT NOT NULL,
      trade_name TEXT,
      cnpj TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      logo TEXT,
      primary_color TEXT DEFAULT '#2563eb',
      secondary_color TEXT DEFAULT '#1e293b',
      theme_mode TEXT DEFAULT 'dark',
      warranty_terms TEXT,
      receipt_notes TEXT,
      plan_id INTEGER,
      plan_name TEXT DEFAULT 'Teste Grátis',
      subscription_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'overdue', 'suspended', 'canceled'
      trial_ends_at DATETIME,
      access_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL, -- 'monthly', 'quarterly', 'semiannual', 'annual'
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'PIX', 'Cartão de crédito', 'Boleto'
      payment_gateway TEXT DEFAULT 'PIX Direto', -- 'MercadoPago', 'Asaas', 'PIX Direto'
      gateway_payment_id TEXT,
      pix_qrcode TEXT,
      pix_copia_cola TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'canceled'
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY,
      active_gateway TEXT DEFAULT 'manual_pix', -- 'manual_pix', 'mercadopago', 'infinitepay', 'asaas'
      mercadopago_token TEXT,
      mercadopago_public_key TEXT,
      infinitepay_api_key TEXT,
      infinitepay_handle TEXT,
      infinitepay_environment TEXT DEFAULT 'production', -- 'production', 'sandbox'
      asaas_api_key TEXT,
      asaas_environment TEXT DEFAULT 'sandbox', -- 'sandbox' ou 'production'
      pix_key TEXT,
      pix_key_type TEXT DEFAULT 'CNPJ', -- 'CNPJ', 'CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA'
      pix_receiver_name TEXT,
      webhook_secret TEXT,
      trial_days_default INTEGER DEFAULT 7,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fiscal_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL UNIQUE,
      tax_regime TEXT DEFAULT 'mei', -- 'mei', 'simples_nacional', 'regime_normal'
      nfe_environment TEXT DEFAULT 'homologacao', -- 'homologacao', 'producao'
      
      -- Configuração NF-e / NFC-e (Produtos com Certificado Digital A1)
      certificate_a1_filename TEXT,
      certificate_a1_base64 TEXT,
      certificate_password TEXT,
      certificate_expiration DATETIME,
      certificate_subject TEXT,
      certificate_valid INTEGER DEFAULT 0,
      nfe_series INTEGER DEFAULT 1,
      nfe_next_number INTEGER DEFAULT 1,
      nfce_series INTEGER DEFAULT 1,
      nfce_next_number INTEGER DEFAULT 1,
      csc_id TEXT,
      csc_token TEXT,
      
      -- Configuração NFS-e (Serviços para MEI - Padrão Nacional sem Certificado)
      is_mei INTEGER DEFAULT 1,
      nfse_mei_user TEXT,
      nfse_mei_password TEXT,
      nfse_mei_token TEXT,
      nfse_series TEXT DEFAULT 'E',
      nfse_next_number INTEGER DEFAULT 1,
      default_service_code TEXT DEFAULT '14.01',
      default_cnae TEXT DEFAULT '9511-8/00',
      service_description_pattern TEXT DEFAULT 'Serviço técnico prestado referente à Ordem de Serviço #{os_code}',
      aliquota_iss REAL DEFAULT 0.0,
      
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS fiscal_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      invoice_type TEXT NOT NULL, -- 'nfe_product', 'nfce_product', 'nfse_service_mei'
      reference_type TEXT, -- 'sale', 'os', 'manual'
      reference_id INTEGER,
      number INTEGER NOT NULL,
      series TEXT NOT NULL,
      access_key TEXT,
      protocol TEXT,
      status TEXT DEFAULT 'authorized', -- 'pending', 'authorized', 'rejected', 'canceled'
      nature_of_operation TEXT DEFAULT 'Venda / Prestação de Serviços',
      customer_name TEXT,
      customer_cpf_cnpj TEXT,
      customer_email TEXT,
      customer_city TEXT,
      customer_state TEXT,
      total_products REAL DEFAULT 0,
      total_services REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      xml_content TEXT,
      rejection_reason TEXT,
      cancel_reason TEXT,
      canceled_at DATETIME,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'technician', -- 'master', 'admin', 'technician', 'attendant', 'superadmin'
      commission_rate REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profile_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      module TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      can_view INTEGER DEFAULT 1,
      can_create INTEGER DEFAULT 1,
      can_edit INTEGER DEFAULT 1,
      can_delete INTEGER DEFAULT 0,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      cpf_cnpj TEXT,
      email TEXT,
      zip_code TEXT,
      address TEXT,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      device_type TEXT DEFAULT 'Celular',
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      imei_serial TEXT,
      color TEXT,
      unlock_password TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'product',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      cnpj TEXT,
      contact_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      barcode TEXT,
      sku TEXT,
      name TEXT NOT NULL,
      category_id INTEGER,
      brand_id INTEGER,
      supplier_id INTEGER,
      cost_price REAL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 2,
      is_part INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS services_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      category_id INTEGER,
      default_price REAL NOT NULL DEFAULT 0,
      estimated_time_minutes INTEGER DEFAULT 60,
      default_commission_percent REAL DEFAULT 10,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      code INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      device_id INTEGER,
      status TEXT NOT NULL DEFAULT 'Aguardando avaliação',
      entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      deadline_date DATETIME,
      exit_date DATETIME,
      reported_defects TEXT,
      entry_notes TEXT,
      entry_photos TEXT,
      technical_report TEXT,
      internal_notes TEXT,
      advance_payment REAL DEFAULT 0,
      advance_payment_method TEXT,
      warranty_period INTEGER DEFAULT 90,
      warranty_unit TEXT DEFAULT 'Dias',
      total_services REAL DEFAULT 0,
      total_parts REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      technician_id INTEGER,
      attendant_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (device_id) REFERENCES customer_devices(id),
      FOREIGN KEY (technician_id) REFERENCES users(id),
      FOREIGN KEY (attendant_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS service_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      product_id INTEGER,
      service_id INTEGER,
      description TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL DEFAULT 1,
      total_price REAL NOT NULL DEFAULT 0,
      warranty_period INTEGER DEFAULT 90,
      warranty_unit TEXT DEFAULT 'Dias',
      technician_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (service_id) REFERENCES services_catalog(id) ON DELETE SET NULL,
      FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS service_order_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      item_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'nao',
      notes TEXT,
      FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_order_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      from_status TEXT,
      to_status TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      code INTEGER NOT NULL,
      session_id INTEGER,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      total_products REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      installments INTEGER DEFAULT 1,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES cash_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS used_device_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      type TEXT NOT NULL,
      session_id INTEGER,
      user_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      imei_serial TEXT NOT NULL,
      color TEXT,
      condition_grade TEXT,
      price REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'stock',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES cash_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      due_date DATE NOT NULL,
      payment_date DATE,
      amount REAL NOT NULL,
      payment_method TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      card_type TEXT NOT NULL,
      installments INTEGER NOT NULL,
      rate_percent REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      user_id INTEGER,
      user_name TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      entity_id INTEGER,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate columns if table already existed without new SaaS columns
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN plan_id INTEGER").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN plan_name TEXT DEFAULT 'Teste Grátis'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'trial'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN trial_ends_at DATETIME").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN access_expires_at DATETIME").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN company_code TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE companies ADD COLUMN theme_mode TEXT DEFAULT 'dark'").run();
  } catch (e) {}

  // Migrate columns for fiscal_invoices (National NFS-e & SEFAZ NF-e Products)
  const fiscalInvoiceCols = [
    'service_code TEXT',
    'cnae_code TEXT',
    'service_description TEXT',
    'competence_date DATE',
    'service_city TEXT',
    'service_state TEXT',
    'iss_retention INTEGER DEFAULT 0',
    'iss_rate REAL DEFAULT 0',
    'discount_amount REAL DEFAULT 0',
    'customer_phone TEXT',
    'customer_zip_code TEXT',
    'customer_address TEXT',
    'customer_number TEXT',
    'customer_neighborhood TEXT',
    'customer_ie TEXT',
    'items_json TEXT',
    'cfop TEXT DEFAULT \'5102\'',
    'payment_method TEXT DEFAULT \'01\'',
    'freight_mode TEXT DEFAULT \'9\'',
    'freight_amount REAL DEFAULT 0',
    'additional_info TEXT'
  ];
  for (const col of fiscalInvoiceCols) {
    try {
      db.prepare(`ALTER TABLE fiscal_invoices ADD COLUMN ${col}`).run();
    } catch {}
  }

  // Migrate columns for products (NCM & commercial unit)
  try {
    db.prepare("ALTER TABLE products ADD COLUMN ncm TEXT DEFAULT '8517.13.00'").run();
  } catch {}
  try {
    db.prepare("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'UN'").run();
  } catch {}

  seedDefaultData();
}

function seedDefaultData() {
  // Ensure only 2 monthly plans exist: Prata (49.90) and Ouro (79.90)
  // Exclusive difference between plans is fiscal invoice emission (Gold Exclusive)
  db.prepare("UPDATE plans SET active = 0 WHERE name NOT IN ('Prata', 'Ouro')").run();

  const prataFeatures = JSON.stringify([
    'Ordens de Serviço e Checklist Técnico',
    'Frente de Caixa (PDV) e Balcão',
    'Controle de Estoque e Peças de Reposição',
    'Financeiro Completo, DRE e Taxas de Cartão',
    'Compra e Venda de Smartphones Seminovos',
    'Até 5 Usuários e Acessos Simultâneos',
    'Sem Emissão de Notas Fiscais'
  ]);

  const prataExists = db.prepare("SELECT id FROM plans WHERE name = 'Prata'").get() as any;
  if (!prataExists) {
    db.prepare(`
      INSERT INTO plans (name, description, price_monthly, price_yearly, max_users, max_devices, features, is_popular, active)
      VALUES ('Prata', 'Gestão completa para assistência técnica e PDV. Não inclui emissão fiscal.', 49.90, 49.90, 5, 2000, ?, 0, 1)
    `).run(prataFeatures);
  } else {
    db.prepare(`
      UPDATE plans
      SET description = 'Gestão completa para assistência técnica e PDV. Não inclui emissão fiscal.',
          price_monthly = 49.90,
          price_yearly = 49.90,
          features = ?,
          active = 1,
          is_popular = 0
      WHERE id = ?
    `).run(prataFeatures, prataExists.id);
  }

  const ouroFeatures = JSON.stringify([
    'Tudo incluso no Plano Prata',
    'Emissão Exclusiva de Notas Fiscais (NF-e com Certificado A1 + NFS-e MEI)',
    'Emissão de NF-e de Produtos com Puxada do Estoque',
    'Emissão de NFS-e de Serviços MEI (Padrão Nacional)',
    'Controle de Numeração, Séries e Lotes Fiscais',
    'Geração e Impressão de DANFE / DANFSE em PDF',
    'Download de XML e Cancelamento de Notas na SEFAZ',
    'Utilizadores e Aparelhos Ilimitados',
    'Suporte Técnico VIP Prioritário'
  ]);

  const ouroExists = db.prepare("SELECT id FROM plans WHERE name IN ('Ouro', 'Ouro (Pro)')").get() as any;
  if (!ouroExists) {
    db.prepare(`
      INSERT INTO plans (name, description, price_monthly, price_yearly, max_users, max_devices, features, is_popular, active)
      VALUES ('Ouro', 'Plano Completo com Emissão Exclusiva de Notas Fiscais (NF-e com Certificado A1 + NFS-e MEI).', 79.90, 79.90, 999, 99999, ?, 1, 1)
    `).run(ouroFeatures);
  } else {
    db.prepare(`
      UPDATE plans
      SET name = 'Ouro',
          description = 'Plano Completo com Emissão Exclusiva de Notas Fiscais (NF-e com Certificado A1 + NFS-e MEI).',
          price_monthly = 79.90,
          price_yearly = 79.90,
          features = ?,
          active = 1,
          is_popular = 1
      WHERE id = ?
    `).run(ouroFeatures, ouroExists.id);
  }

  // Reatribuir empresas que porventura estejam vinculadas a planos inativos para o plano Ouro
  const ouroPlan = db.prepare("SELECT id FROM plans WHERE name = 'Ouro' LIMIT 1").get() as any;
  if (ouroPlan) {
    db.prepare(`
      UPDATE companies
      SET plan_id = ?
      WHERE plan_id NOT IN (SELECT id FROM plans WHERE name IN ('Prata', 'Ouro'))
    `).run(ouroPlan.id);
  }

  // Pre-seed Platform Settings
  const platCount = db.prepare('SELECT count(*) as count FROM platform_settings').get() as { count: number };
  if (platCount.count === 0) {
    db.prepare(`
      INSERT INTO platform_settings (
        id, active_gateway, asaas_environment, pix_key, pix_key_type, pix_receiver_name, trial_days_default
      ) VALUES (
        1, 'manual_pix', 'sandbox', '12.345.678/0001-90', 'CNPJ', 'TechOS SaaS', 7
      )
    `).run();
  }

  // Ensure SaaS columns exist on companies table (migration for existing DBs)
  const companyColumnsToEnsure = [
    'company_code TEXT',
    'plan_id INTEGER',
    "plan_name TEXT DEFAULT 'Teste Grátis'",
    "subscription_status TEXT DEFAULT 'trial'",
    'trial_ends_at DATETIME',
    'access_expires_at DATETIME',
    "primary_color TEXT DEFAULT '#2563eb'",
    "secondary_color TEXT DEFAULT '#1e293b'"
  ];
  for (const colDef of companyColumnsToEnsure) {
    try {
      db.prepare(`ALTER TABLE companies ADD COLUMN ${colDef}`).run();
    } catch {
      // Column already exists
    }
  }

  // Ensure entry_photos column on service_orders
  try {
    db.prepare('ALTER TABLE service_orders ADD COLUMN entry_photos TEXT').run();
  } catch {
    // Column already exists
  }

  // Ensure multi-tenant company_id exists on related tables
  const tablesForCompanyId = ['users', 'service_orders', 'sales', 'cash_sessions', 'products', 'customers', 'audit_logs', 'expenses', 'card_rates', 'used_device_trades'];
  for (const tbl of tablesForCompanyId) {
    try {
      db.prepare(`ALTER TABLE ${tbl} ADD COLUMN company_id INTEGER DEFAULT 1`).run();
    } catch {
      // Column already exists
    }
  }

  // Ensure InfinitePay columns exist on platform_settings
  const platformColumnsToEnsure = [
    'infinitepay_api_key TEXT',
    'infinitepay_handle TEXT',
    "infinitepay_environment TEXT DEFAULT 'production'"
  ];
  for (const colDef of platformColumnsToEnsure) {
    try {
      db.prepare(`ALTER TABLE platform_settings ADD COLUMN ${colDef}`).run();
    } catch {
      // Column already exists
    }
  }

  // Check if company exists and set trial expiration
  const companyCount = db.prepare('SELECT count(*) as count FROM companies').get() as { count: number };
  if (companyCount.count === 0) {
    const trialDate = new Date();
    trialDate.setDate(trialDate.getDate() + 7);

    db.prepare(`
      INSERT INTO companies (
        company_code, name, trade_name, cnpj, phone, email, address, city, state, zip_code,
        warranty_terms, receipt_notes, plan_id, plan_name, subscription_status, trial_ends_at, access_expires_at
      ) VALUES (
        'ctnh9fbj',
        'Minha Loja e Assistência LTDA',
        'Minha Loja',
        '12.345.678/0001-90',
        '(11) 99999-8888',
        'contato@minhaloja.com.br',
        'Rua Principal, 1000 - Centro',
        'São Paulo',
        'SP',
        '01001-000',
        'Garantia legal de 90 dias conforme artigo 26 do Código de Defesa do Consumidor exclusivamente sobre os serviços executados e peças substituídas descritas nesta ordem. A garantia perde a validade em caso de queda, contato com líquidos, violação dos selos de garantia ou intervenção de terceiros não autorizados. Aparelhos não retirados em até 90 dias após notificação de conclusão serão considerados abandonados na forma da lei.',
        'Obrigado pela preferência! Guarde esta via para retirar o seu aparelho.',
        2,
        'Prata',
        'trial',
        ?,
        ?
      )
    `).run(trialDate.toISOString(), trialDate.toISOString());
  } else {
    // Ensure company has expiration date and plan
    const comp = db.prepare('SELECT id, access_expires_at, plan_name FROM companies WHERE id = 1').get() as any;
    if (!comp?.access_expires_at) {
      const trialDate = new Date();
      trialDate.setDate(trialDate.getDate() + 7);
      db.prepare(`
        UPDATE companies
        SET plan_id = 2, plan_name = 'Prata', subscription_status = 'trial',
            trial_ends_at = ?, access_expires_at = ?, company_code = 'ctnh9fbj'
        WHERE id = 1
      `).run(trialDate.toISOString(), trialDate.toISOString());
    }

    // Clean any legacy company name for company 1
    db.prepare(`
      UPDATE companies 
      SET name = 'Minha Loja e Assistência LTDA', trade_name = 'Minha Loja'
      WHERE id = 1 AND (LOWER(name) LIKE '%assistencia shop%' OR LOWER(trade_name) LIKE '%assistencia shop%')
    `).run();
  }

  // Pre-seed Fiscal Settings for default company
  const fiscalSettingsCount = db.prepare('SELECT count(*) as count FROM fiscal_settings WHERE company_id = 1').get() as { count: number };
  if (fiscalSettingsCount.count === 0) {
    db.prepare(`
      INSERT INTO fiscal_settings (
        company_id, tax_regime, nfe_environment, nfe_series, nfe_next_number,
        nfce_series, nfce_next_number, is_mei, nfse_series, nfse_next_number,
        default_service_code, default_cnae, service_description_pattern
      ) VALUES (
        1, 'mei', 'homologacao', 1, 1, 1, 1, 1, 'E', 1, '14.01', '9511-8/00',
        'Serviço técnico prestado referente à Ordem de Serviço #{os_code} - Manutenção técnica especializada.'
      )
    `).run();
  }

  // Master user
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (company_id, name, email, password_hash, role, commission_rate, active)
      VALUES (1, 'MACKSON WEIBER', 'admin@assistenciashop.com.br', ?, 'master', 15.0, 1)
    `).run(passwordHash);

    const techHash = bcrypt.hashSync('123456', 10);
    db.prepare(`
      INSERT INTO users (company_id, name, email, password_hash, role, commission_rate, active)
      VALUES (1, 'Técnico Principal', 'tecnico@assistenciashop.com.br', ?, 'technician', 20.0, 1)
    `).run(techHash);
  }

  // Pre-populate card rates if empty
  const cardRatesCount = db.prepare('SELECT count(*) as count FROM card_rates').get() as { count: number };
  if (cardRatesCount.count === 0) {
    const insertRate = db.prepare('INSERT INTO card_rates (card_type, installments, rate_percent) VALUES (?, ?, ?)');
    insertRate.run('debit', 1, 1.49);
    insertRate.run('credit', 1, 3.19);
    insertRate.run('credit', 2, 4.49);
    insertRate.run('credit', 3, 5.29);
    insertRate.run('credit', 4, 6.09);
    insertRate.run('credit', 5, 6.89);
    insertRate.run('credit', 6, 7.69);
    insertRate.run('credit', 10, 10.89);
    insertRate.run('credit', 12, 12.49);
  }

  // Pre-populate categories
  const catCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    insertCat.run('Telas e Displays', 'product');
    insertCat.run('Baterias', 'product');
    insertCat.run('Conectores e Cabos Flat', 'product');
    insertCat.run('Acessórios e Capinhas', 'product');
    insertCat.run('Películas e Proteção', 'product');
    insertCat.run('Carregadores e Cabos', 'product');
    insertCat.run('Manutenção de Celulares', 'service');
    insertCat.run('Manutenção de Notebooks', 'service');
    insertCat.run('Aluguel e Contas de Consumo', 'expense');
    insertCat.run('Fornecedores de Peças', 'expense');
  }

  // Pre-populate brands
  const brandCount = db.prepare('SELECT count(*) as count FROM brands').get() as { count: number };
  if (brandCount.count === 0) {
    const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)');
    ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG', 'Asus', 'Dell', 'Lenovo', 'HP'].forEach(b => insertBrand.run(b));
  }

  // Pre-populate sample services catalog
  const servCount = db.prepare('SELECT count(*) as count FROM services_catalog').get() as { count: number };
  if (servCount.count === 0) {
    const insertServ = db.prepare(`
      INSERT INTO services_catalog (name, category_id, default_price, estimated_time_minutes, default_commission_percent)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertServ.run('Troca de Tela / Display Frontal', 7, 120.00, 60, 20.0);
    insertServ.run('Troca de Bateria', 7, 80.00, 45, 15.0);
    insertServ.run('Troca de Conector de Carga (Sub-placa / Conector)', 7, 90.00, 60, 20.0);
    insertServ.run('Desoxidação e Limpeza Química', 7, 150.00, 120, 25.0);
    insertServ.run('Reparo Avançado de Placa / Micro-solda', 7, 280.00, 240, 30.0);
    insertServ.run('Formatação e Instalação de Sistema Operacional', 8, 120.00, 90, 20.0);
  }

  // Pre-populate sample products & parts
  const prodCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
  if (prodCount.count === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (barcode, sku, name, category_id, brand_id, cost_price, sale_price, stock_quantity, min_stock, is_part)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProd.run('789100000001', 'TEL-IPH13-OLED', 'Tela iPhone 13 OLED Premium', 1, 1, 280.00, 550.00, 8, 2, 1);
    insertProd.run('789100000002', 'TEL-SAM-A32', 'Tela Samsung Galaxy A32 Original China', 1, 2, 110.00, 240.00, 5, 2, 1);
    insertProd.run('789100000003', 'BAT-IPH11', 'Bateria iPhone 11 Alta Capacidade', 2, 1, 75.00, 180.00, 12, 3, 1);
    insertProd.run('789100000004', 'CON-MOT-G8', 'Conector de Carga Moto G8 Play Tipo-C', 3, 3, 15.00, 60.00, 15, 5, 1);

    insertProd.run('789200000001', 'CAB-USBC-LIGHT', 'Cabo Turbo Tipo-C para Lightning 20W 1m', 6, 1, 12.00, 45.00, 25, 5, 0);
    insertProd.run('789200000002', 'CAR-TURBO-25W', 'Carregador Rápido 25W USB-C Bivolt', 6, 2, 22.00, 75.00, 18, 4, 0);
    insertProd.run('789200000003', 'PEL-3D-UNIV', 'Película Vidro 3D Temperada Premium', 5, 1, 3.50, 25.00, 50, 10, 0);
  }
}

export const MOBILE_CHECKLIST_ITEMS = [
  { key: 'liga', label: 'Aparelho liga normalmente' },
  { key: 'reinicia', label: 'Reinicia sozinho ou desliga inesperadamente' },
  { key: 'tela_quebrada', label: 'Tela ou vidro quebrado/trincado' },
  { key: 'tela_mancha', label: 'Mancha ou linhas no display (LCD/OLED)' },
  { key: 'touch_falhas', label: 'Touch screen com falhas ou toque fantasma' },
  { key: 'bateria_saude', label: 'Bateria descarregando rápido' },
  { key: 'bateria_inchada', label: 'Bateria inchada (requer substituição imediata)' },
  { key: 'porta_carga', label: 'Porta de carga / Conector danificado ou com folga' },
  { key: 'botao_power', label: 'Botão Power / Liga-Desliga com defeito' },
  { key: 'botoes_volume', label: 'Botões de Volume (+/-) com defeito' },
  { key: 'carcaca_amassada', label: 'Carcaça amassada, empenada ou trincada' },
  { key: 'oxidacao', label: 'Contato com líquido / Indícios de oxidação' },
  { key: 'camera_traseira', label: 'Câmera traseira falhando ou tremendo' },
  { key: 'camera_frontal', label: 'Câmera frontal falhando' },
  { key: 'lente_camera', label: 'Lente de vidro da câmera trincada' },
  { key: 'alto_falante', label: 'Alto-falante viva-voz (som chiando ou mudo)' },
  { key: 'auricular', label: 'Alto-falante auricular (áudio de chamada baixo)' },
  { key: 'microfone', label: 'Microfone com ruído ou mudo' },
  { key: 'biometria', label: 'Leitor biométrico / Digital com defeito' },
  { key: 'face_id', label: 'Reconhecimento Facial (Face ID) inoperante' },
  { key: 'wifi', label: 'Wi-Fi não conecta ou sinal fraco' },
  { key: 'bluetooth', label: 'Bluetooth não pareia' },
  { key: 'rede_movel', label: 'Sinal de operadora / Rede celular sem serviço' },
  { key: 'sensor_proximidade', label: 'Sensor de proximidade não apaga tela em ligação' },
  { key: 'nfc', label: 'NFC / Pagamento por aproximação não funciona' },
  { key: 'sistema_lento', label: 'Sistema operacional lento ou travando' },
  { key: 'bloqueio_conta', label: 'Bloqueio de conta ou ativação (iCloud, FRP, conta Google)' }
];
