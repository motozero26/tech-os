-- ==============================================================================
-- TechOS - PostgreSQL Schema para Supabase
-- Sistema de Gestão para Assistência Técnica & Varejo
-- ==============================================================================

-- 1. TABELA DE PLANOS SAAS
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2) NOT NULL,
  max_users INT DEFAULT 5,
  max_devices INT DEFAULT 1000,
  features JSONB,
  is_popular INT DEFAULT 0,
  active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE EMPRESAS (TENANTS)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(30) UNIQUE,
  name VARCHAR(150) NOT NULL,
  trade_name VARCHAR(150),
  cnpj VARCHAR(20),
  phone VARCHAR(25),
  email VARCHAR(100),
  address VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(10),
  zip_code VARCHAR(20),
  logo TEXT,
  primary_color VARCHAR(20) DEFAULT '#2563eb',
  secondary_color VARCHAR(20) DEFAULT '#1e293b',
  theme_mode VARCHAR(20) DEFAULT 'dark',
  warranty_terms TEXT,
  receipt_notes TEXT,
  plan_id INT REFERENCES plans(id),
  plan_name VARCHAR(50) DEFAULT 'Prata',
  subscription_status VARCHAR(20) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HISTÓRICO DE PAGAMENTOS DE ASSINATURA SAAS
CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id INT NOT NULL REFERENCES plans(id),
  plan_name VARCHAR(50) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_gateway VARCHAR(50) DEFAULT 'PIX Direto',
  gateway_payment_id TEXT,
  pix_qrcode TEXT,
  pix_copia_cola TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONFIGURAÇÕES GERAIS DA PLATAFORMA SAAS
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  active_gateway VARCHAR(50) DEFAULT 'manual_pix',
  mercadopago_token TEXT,
  mercadopago_public_key TEXT,
  infinitepay_api_key TEXT,
  infinitepay_handle TEXT,
  infinitepay_environment VARCHAR(20) DEFAULT 'production',
  asaas_api_key TEXT,
  asaas_environment VARCHAR(20) DEFAULT 'sandbox',
  pix_key VARCHAR(100),
  pix_key_type VARCHAR(20) DEFAULT 'CNPJ',
  pix_receiver_name VARCHAR(150),
  webhook_secret TEXT,
  trial_days_default INT DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONFIGURAÇÕES FISCAIS (NF-e, NFC-e, NFS-e)
CREATE TABLE IF NOT EXISTS fiscal_settings (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  tax_regime VARCHAR(30) DEFAULT 'mei',
  nfe_environment VARCHAR(20) DEFAULT 'homologacao',
  certificate_a1_filename TEXT,
  certificate_a1_base64 TEXT,
  certificate_password TEXT,
  certificate_expiration TIMESTAMPTZ,
  certificate_subject TEXT,
  certificate_valid INT DEFAULT 0,
  nfe_series INT DEFAULT 1,
  nfe_next_number INT DEFAULT 1,
  nfce_series INT DEFAULT 1,
  nfce_next_number INT DEFAULT 1,
  csc_id TEXT,
  csc_token TEXT,
  is_mei INT DEFAULT 1,
  nfse_mei_user TEXT,
  nfse_mei_password TEXT,
  nfse_mei_token TEXT,
  nfse_series VARCHAR(10) DEFAULT 'E',
  nfse_next_number INT DEFAULT 1,
  default_service_code VARCHAR(30) DEFAULT '14.01',
  default_cnae VARCHAR(30) DEFAULT '9511-8/00',
  service_description_pattern TEXT DEFAULT 'Serviço técnico prestado referente à Ordem de Serviço #{os_code}',
  aliquota_iss NUMERIC(5,2) DEFAULT 0.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NOTAS FISCAIS EMITIDAS
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_type VARCHAR(30) NOT NULL,
  reference_type VARCHAR(30),
  reference_id INT,
  number INT NOT NULL,
  series VARCHAR(20) NOT NULL,
  access_key VARCHAR(100),
  protocol VARCHAR(100),
  status VARCHAR(30) DEFAULT 'authorized',
  nature_of_operation VARCHAR(150) DEFAULT 'Venda / Prestação de Serviços',
  customer_name VARCHAR(150),
  customer_cpf_cnpj VARCHAR(30),
  customer_email VARCHAR(100),
  customer_phone VARCHAR(30),
  customer_zip_code VARCHAR(20),
  customer_address VARCHAR(200),
  customer_number VARCHAR(30),
  customer_neighborhood VARCHAR(100),
  customer_city VARCHAR(100),
  customer_state VARCHAR(10),
  customer_ie VARCHAR(30),
  total_products NUMERIC(10,2) DEFAULT 0,
  total_services NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  xml_content TEXT,
  rejection_reason TEXT,
  cancel_reason TEXT,
  canceled_at TIMESTAMPTZ,
  service_code VARCHAR(30),
  cnae_code VARCHAR(30),
  service_description TEXT,
  competence_date DATE,
  service_city VARCHAR(100),
  service_state VARCHAR(10),
  iss_retention INT DEFAULT 0,
  iss_rate NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  items_json JSONB,
  cfop VARCHAR(10) DEFAULT '5102',
  payment_method VARCHAR(10) DEFAULT '01',
  freight_mode VARCHAR(10) DEFAULT '9',
  freight_amount NUMERIC(10,2) DEFAULT 0,
  additional_info TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'technician',
  commission_rate NUMERIC(5,2) DEFAULT 0,
  active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PERFIS E PERMISSÕES
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_permissions (
  id SERIAL PRIMARY KEY,
  profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  is_admin INT DEFAULT 0,
  can_view INT DEFAULT 1,
  can_create INT DEFAULT 1,
  can_edit INT DEFAULT 1,
  can_delete INT DEFAULT 0
);

-- 9. CLIENTES E APARELHOS
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  whatsapp VARCHAR(30),
  cpf_cnpj VARCHAR(30),
  email VARCHAR(120),
  zip_code VARCHAR(20),
  address VARCHAR(200),
  number VARCHAR(30),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_devices (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_type VARCHAR(50) DEFAULT 'Celular',
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  imei_serial VARCHAR(100),
  color VARCHAR(50),
  unlock_password VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ESTOQUE: CATEGORIAS, MARCAS, FORNECEDORES E PRODUTOS
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'product',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120),
  cnpj VARCHAR(30),
  contact_person VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  barcode VARCHAR(100),
  sku VARCHAR(100),
  name VARCHAR(150) NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  min_stock INT DEFAULT 2,
  is_part INT DEFAULT 0,
  unit VARCHAR(10) DEFAULT 'UN',
  ncm VARCHAR(20) DEFAULT '8517.13.00',
  active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CATÁLOGO DE SERVIÇOS
CREATE TABLE IF NOT EXISTS services_catalog (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time_minutes INT DEFAULT 60,
  default_commission_percent NUMERIC(5,2) DEFAULT 10,
  active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ORDENS DE SERVIÇO (O.S.)
CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  code INT NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id),
  device_id INT REFERENCES customer_devices(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Aguardando avaliação',
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  deadline_date TIMESTAMPTZ,
  exit_date TIMESTAMPTZ,
  reported_defects TEXT,
  entry_notes TEXT,
  entry_photos TEXT,
  technical_report TEXT,
  internal_notes TEXT,
  advance_payment NUMERIC(10,2) DEFAULT 0,
  advance_payment_method VARCHAR(50),
  warranty_period INT DEFAULT 90,
  warranty_unit VARCHAR(20) DEFAULT 'Dias',
  total_services NUMERIC(10,2) DEFAULT 0,
  total_parts NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  technician_id INT REFERENCES users(id),
  attendant_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_order_items (
  id SERIAL PRIMARY KEY,
  os_id INT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  service_id INT REFERENCES services_catalog(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  warranty_period INT DEFAULT 90,
  warranty_unit VARCHAR(20) DEFAULT 'Dias',
  technician_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_order_checklists (
  id SERIAL PRIMARY KEY,
  os_id INT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_key VARCHAR(50) NOT NULL,
  item_label VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'nao',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS service_order_history (
  id SERIAL PRIMARY KEY,
  os_id INT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  user_name VARCHAR(100),
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CAIXA & PDV
CREATE TABLE IF NOT EXISTS cash_sessions (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  user_name VARCHAR(100) NOT NULL,
  opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(10,2),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  code INT NOT NULL,
  session_id INT REFERENCES cash_sessions(id),
  user_id INT NOT NULL REFERENCES users(id),
  customer_id INT REFERENCES customers(id),
  total_products NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL,
  installments INT DEFAULT 1,
  status VARCHAR(30) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0
);

-- 14. COMPRA E VENDA DE APARELHOS USADOS / SEMINOVOS
CREATE TABLE IF NOT EXISTS used_device_trades (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  session_id INT REFERENCES cash_sessions(id),
  user_id INT NOT NULL REFERENCES users(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  imei_serial VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  condition_grade VARCHAR(20),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'stock',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. DESPESAS E TAXAS DE CARTÃO
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_rates (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  card_type VARCHAR(50) NOT NULL,
  installments INT NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  company_id INT DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  user_id INT,
  user_name VARCHAR(100),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  entity_id INT,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CARGA INICIAL (SEEDS)
-- ==============================================================================

-- Planos Prata (49.90) e Ouro (79.90)
INSERT INTO plans (id, name, description, price_monthly, price_yearly, max_users, max_devices, features, is_popular, active)
VALUES 
(1, 'Prata', 'Gestão completa para assistência técnica e PDV. Não inclui emissão fiscal.', 49.90, 49.90, 5, 2000, 
 '["Ordens de Serviço e Checklist Técnico", "Frente de Caixa (PDV) e Balcão", "Controle de Estoque e Peças de Reposição", "Financeiro Completo, DRE e Taxas de Cartão", "Compra e Venda de Smartphones Seminovos", "Até 5 Usuários e Acessos Simultâneos", "Sem Emissão de Notas Fiscais"]'::jsonb, 0, 1),
(2, 'Ouro', 'Plano Completo com Emissão Exclusiva de Notas Fiscais (NF-e com Certificado A1 + NFS-e MEI).', 79.90, 79.90, 999, 99999, 
 '["Tudo incluso no Plano Prata", "Emissão Exclusiva de Notas Fiscais (NF-e com Certificado A1 + NFS-e MEI)", "Emissão de NF-e de Produtos com Puxada do Estoque", "Emissão de NFS-e de Serviços MEI (Padrão Nacional)", "Controle de Numeração, Séries e Lotes Fiscais", "Geração e Impressão de DANFE / DANFSE em PDF", "Download de XML e Cancelamento de Notas na SEFAZ", "Utilizadores e Aparelhos Ilimitados", "Suporte Técnico VIP Prioritário"]'::jsonb, 1, 1)
ON CONFLICT (id) DO UPDATE SET 
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- Empresa Padrão (Tenant 1)
INSERT INTO companies (id, company_code, name, trade_name, cnpj, phone, email, address, city, state, zip_code, plan_id, plan_name, subscription_status, trial_ends_at, access_expires_at)
VALUES (1, 'ctnh9fbj', 'Minha Loja e Assistência LTDA', 'Minha Loja', '12.345.678/0001-90', '(11) 99999-8888', 'contato@minhaloja.com.br', 'Rua Principal, 1000 - Centro', 'São Paulo', 'SP', '01001-000', 2, 'Ouro', 'active', NOW() + INTERVAL '365 days', NOW() + INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

-- Configurações SaaS
INSERT INTO platform_settings (id, active_gateway, asaas_environment, pix_key, pix_key_type, pix_receiver_name, trial_days_default)
VALUES (1, 'manual_pix', 'sandbox', '12.345.678/0001-90', 'CNPJ', 'TechOS SaaS', 7)
ON CONFLICT (id) DO NOTHING;

-- Usuários Padrão (Senha padrão: 123456 com hash bcrypt)
INSERT INTO users (id, company_id, name, email, password_hash, role, active)
VALUES 
(1, 1, 'Administrador Master', 'admin@techos.com', '$2a$10$wO3mY2e/1rK9pX6zQ6/MSuH9p7O4sC.UjPz0f6mX.l7.4S2uO4m2W', 'master', 1),
(2, 1, 'Super Admin SaaS', 'admin@techos.saas', '$2a$10$wO3mY2e/1rK9pX6zQ6/MSuH9p7O4sC.UjPz0f6mX.l7.4S2uO4m2W', 'superadmin', 1)
ON CONFLICT (id) DO NOTHING;

-- Reset de Sequences
SELECT setval('plans_id_seq', (SELECT MAX(id) FROM plans));
SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
