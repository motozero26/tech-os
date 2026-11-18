export interface User {
  id: number;
  name: string;
  email: string;
  role: 'master' | 'admin' | 'technician' | 'attendant' | 'superadmin';
  commission_rate?: number;
  active?: number;
}

export interface Company {
  id: number;
  company_code?: string;
  name: string;
  trade_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  logo?: string;
  primary_color?: string;
  secondary_color?: string;
  theme_mode?: 'dark' | 'light';
  warranty_terms?: string;
  receipt_notes?: string;
  plan_id?: number;
  plan_name?: string;
  subscription_status?: 'trial' | 'active' | 'overdue' | 'suspended' | 'canceled';
  trial_ends_at?: string;
  access_expires_at?: string;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_devices: number;
  features: string[];
  is_popular?: number;
  active?: number;
  subscribers_count?: number;
}

export interface SubscriptionInfo {
  company_code: string;
  trade_name: string;
  plan_name: string;
  subscription_status: 'trial' | 'active' | 'overdue' | 'suspended' | 'canceled';
  access_expires_at: string;
  trial_ends_at: string;
  days_left: number;
  is_expired: boolean;
  is_trial: boolean;
  plan: Plan;
}

export interface SubscriptionPayment {
  id: number;
  company_id: number;
  company_name?: string;
  trade_name?: string;
  plan_id: number;
  plan_name: string;
  billing_cycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  amount: number;
  payment_method: string;
  payment_gateway: string;
  pix_copia_cola?: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  paid_at?: string;
  created_at: string;
}

export interface PlatformSettings {
  active_gateway: 'manual_pix' | 'mercadopago' | 'asaas';
  mercadopago_token?: string;
  mercadopago_public_key?: string;
  asaas_api_key?: string;
  asaas_environment: 'sandbox' | 'production';
  pix_key: string;
  pix_key_type: string;
  pix_receiver_name: string;
  trial_days_default: number;
}

export interface FiscalStatus {
  has_fiscal_access: boolean;
  current_plan: string;
  requires_upgrade: boolean;
  certificate_installed: boolean;
  certificate_expiration?: string;
  certificate_subject?: string;
  is_mei: boolean;
  nfse_mei_configured: boolean;
  nfe_environment: 'homologacao' | 'producao';
  total_invoices_issued: number;
}

export interface FiscalSettings {
  id?: number;
  company_id?: number;
  tax_regime: 'mei' | 'simples_nacional' | 'regime_normal';
  nfe_environment: 'homologacao' | 'producao';
  has_certificate?: boolean;
  certificate_a1_filename?: string;
  certificate_a1_base64?: string;
  certificate_password?: string;
  certificate_expiration?: string;
  certificate_subject?: string;
  nfe_series: number;
  nfe_next_number: number;
  nfce_series: number;
  nfce_next_number: number;
  csc_id?: string;
  csc_token?: string;
  is_mei: boolean | number;
  nfse_mei_user?: string;
  nfse_mei_password?: string;
  nfse_mei_token?: string;
  nfse_series: string;
  nfse_next_number: number;
  default_service_code?: string;
  default_cnae?: string;
  service_description_pattern?: string;
  aliquota_iss?: number;
}

export interface FiscalInvoice {
  id: number;
  company_id: number;
  invoice_type: 'nfe_product' | 'nfce_product' | 'nfse_service_mei';
  reference_type?: 'sale' | 'os' | 'manual';
  reference_id?: number;
  number: number;
  series: string;
  access_key: string;
  protocol?: string;
  status: 'draft' | 'pending' | 'authorized' | 'rejected' | 'canceled';
  nature_of_operation: string;
  customer_name?: string;
  customer_cpf_cnpj?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_zip_code?: string;
  customer_address?: string;
  customer_number?: string;
  customer_neighborhood?: string;
  customer_city?: string;
  customer_state?: string;
  service_code?: string;
  cnae_code?: string;
  service_description?: string;
  competence_date?: string;
  service_city?: string;
  service_state?: string;
  iss_retention?: number;
  iss_rate?: number;
  discount_amount?: number;
  total_products: number;
  total_services: number;
  total_amount: number;
  customer_ie?: string;
  cfop?: string;
  payment_method?: string;
  freight_mode?: string;
  freight_amount?: number;
  additional_info?: string;
  items_json?: string;
  items?: Array<{
    code?: string;
    description: string;
    ncm: string;
    cfop?: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  xml_content?: string;
  rejection_reason?: string;
  cancel_reason?: string;
  canceled_at?: string;
  issued_at: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  whatsapp?: string;
  cpf_cnpj?: string;
  email?: string;
  zip_code?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  devices_count?: number;
  orders_count?: number;
}

export interface CustomerDevice {
  id: number;
  customer_id: number;
  device_type: string;
  brand: string;
  model: string;
  imei_serial?: string;
  color?: string;
  unlock_password?: string;
  notes?: string;
}

export interface ServiceOrder {
  id: number;
  code: number;
  customer_id: number;
  device_id?: number;
  status: string;
  entry_date: string;
  deadline_date?: string;
  exit_date?: string;
  reported_defects?: string;
  entry_notes?: string;
  entry_photos?: string[] | string;
  technical_report?: string;
  internal_notes?: string;
  advance_payment: number;
  advance_payment_method?: string;
  warranty_period: number;
  warranty_unit: string;
  total_services: number;
  total_parts: number;
  discount: number;
  total_amount: number;
  technician_id?: number;
  attendant_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  customer_whatsapp?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  device_type?: string;
  device_brand?: string;
  device_model?: string;
  imei_serial?: string;
  device_color?: string;
  unlock_password?: string;
  technician_name?: string;
  attendant_name?: string;
}

export interface ServiceOrderItem {
  id: number;
  os_id: number;
  item_type: 'service' | 'part';
  product_id?: number;
  service_id?: number;
  description: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  warranty_period: number;
  warranty_unit: string;
  technician_id?: number;
  technician_name?: string;
}

export interface ServiceOrderChecklist {
  id: number;
  os_id: number;
  item_key: string;
  item_label: string;
  status: 'sim' | 'nao' | 'nao_se_aplica';
  notes?: string;
}

export interface ServiceOrderHistory {
  id: number;
  os_id: number;
  user_id?: number;
  user_name?: string;
  from_status?: string;
  to_status: string;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: number;
  barcode?: string;
  sku?: string;
  name: string;
  category_id?: number;
  brand_id?: number;
  supplier_id?: number;
  category_name?: string;
  brand_name?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  is_part: number;
  active: number;
  ncm?: string;
  unit?: string;
}

export interface ServiceCatalogItem {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  default_price: number;
  estimated_time_minutes: number;
  default_commission_percent: number;
}

export interface CashSession {
  id: number;
  user_id: number;
  user_name: string;
  opening_balance: number;
  closing_balance?: number;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashTransaction {
  id: number;
  session_id: number;
  user_id: number;
  type: string;
  amount: number;
  payment_method: string;
  description?: string;
  created_at: string;
}
