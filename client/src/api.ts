const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('assistencia_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('assistencia_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('assistencia_token');
  localStorage.removeItem('assistencia_user');
}

export function getSavedUser() {
  const user = localStorage.getItem('assistencia_user');
  return user ? JSON.parse(user) : null;
}

export function setSavedUser(user: any) {
  localStorage.setItem('assistencia_user', JSON.stringify(user));
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  const data = await response.json();
  if (!response.ok) {
    if (data.code === 'SUBSCRIPTION_OVERDUE') {
      window.dispatchEvent(new CustomEvent('subscription_overdue_blocked', { detail: data }));
    }
    throw new Error(data.error || 'Ocorreu um erro na requisição');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request('/auth/me'),

  // Store Subscription & Renewal
  getPublicPlans: () => request('/subscription/public-plans'),
  createPublicCheckout: (data: any) => request('/subscription/public-checkout', { method: 'POST', body: JSON.stringify(data) }),
  checkPublicPayment: (paymentId: number | string) => request(`/subscription/public-check-payment/${paymentId}`),
  confirmPublicPayment: (paymentId: number | string) => request(`/subscription/public-confirm-payment/${paymentId}`, { method: 'POST' }),
  getSubscriptionCurrent: () => request('/subscription/current'),
  getCurrentSubscription: () => request('/subscription/current'),
  getSubscriptionPlans: () => request('/subscription/plans'),
  createSubscriptionCheckout: (data: any) => request('/subscription/checkout', { method: 'POST', body: JSON.stringify(data) }),
  checkSubscriptionPayment: (paymentId: number | string) => request(`/subscription/check-payment/${paymentId}`),
  confirmSubscriptionPayment: (paymentId: number | string) => request(`/subscription/confirm-payment/${paymentId}`, { method: 'POST' }),
  getSubscriptionInvoices: () => request('/subscription/invoices'),

  // Super Admin / SaaS Platform Management
  getSaaSStats: () => request('/saas/stats'),
  getSaaSTenants: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/saas/tenants?${query}`);
  },
  createSaaSTenant: (data: any) => request('/saas/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateSaaSTenant: (id: number | string, data: any) => request(`/saas/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSaaSPlans: () => request('/saas/plans'),
  createSaaSPlan: (data: any) => request('/saas/plans', { method: 'POST', body: JSON.stringify(data) }),
  updateSaaSPlan: (id: number | string, data: any) => request(`/saas/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSaaSPayments: () => request('/saas/payments'),
  approveSaaSPayment: (id: number | string) => request(`/saas/payments/${id}/approve`, { method: 'POST' }),
  getSaaSGateways: () => request('/saas/gateways'),
  updateSaaSGateways: (data: any) => request('/saas/gateways', { method: 'PUT', body: JSON.stringify(data) }),

  // Fiscal / Notas Fiscais (Plano Ouro Exclusive)
  getFiscalStatus: () => request('/fiscal/status'),
  getFiscalSettings: () => request('/fiscal/settings'),
  updateFiscalSettings: (data: any) => request('/fiscal/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getFiscalInvoices: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/fiscal/invoices?${query}`);
  },
  emitFiscalInvoice: (data: any) => request('/fiscal/emit', { method: 'POST', body: JSON.stringify(data) }),
  cancelFiscalInvoice: (id: number | string, reason: string) => request(`/fiscal/invoices/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getFiscalDANFE: (id: number | string) => request(`/fiscal/invoices/${id}/danfe`),
  getFiscalXMLUrl: (id: number | string) => `/api/fiscal/invoices/${id}/xml`,

  // Dashboard
  getSummaryStats: () => request('/dashboard/summary-stats'),
  getUpcomingDeadlines: () => request('/dashboard/upcoming-deadlines'),
  getCharts: (period = 'monthly') => request(`/dashboard/charts?period=${period}`),

  // OS
  getOSHubCounts: () => request('/os/hub-counts'),
  getNextOSCode: () => request('/os/next-code'),
  getOSList: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/os?${query}`);
  },
  createOS: (data: any) => request('/os/create', { method: 'POST', body: JSON.stringify(data) }),
  getOSDetails: (id: number | string) => request(`/os/${id}`),
  updateOSStatus: (id: number | string, data: any) => request(`/os/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  addOSItem: (id: number | string, data: any) => request(`/os/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),
  deleteOSItem: (osId: number | string, itemId: number | string) => request(`/os/${osId}/items/${itemId}`, { method: 'DELETE' }),
  updateOSChecklist: (osId: number | string, items: any[]) => request(`/os/${osId}/checklist`, { method: 'PUT', body: JSON.stringify({ items }) }),
  updateOSPhotos: (id: number | string, photos: string[]) => request(`/os/${id}/photos`, { method: 'POST', body: JSON.stringify({ photos }) }),
  payOS: (osId: number | string, data: any) => request(`/os/${osId}/payment`, { method: 'POST', body: JSON.stringify(data) }),

  // Cash / PDV
  getCashStatus: () => request('/cash/status'),
  openCash: (data: any) => request('/cash/open', { method: 'POST', body: JSON.stringify(data) }),
  closeCash: (data: any) => request('/cash/close', { method: 'POST', body: JSON.stringify(data) }),
  addCashTransaction: (data: any) => request('/cash/transaction', { method: 'POST', body: JSON.stringify(data) }),
  getCashHistory: () => request('/cash/history'),

  // Sales
  createSale: (data: any) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  getSales: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales?${query}`);
  },
  getSaleDetails: (id: number | string) => request(`/sales/${id}`),

  // Products & Services
  getProducts: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products?${query}`);
  },
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number | string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCategories: (type?: string) => request(`/products/categories${type ? `?type=${type}` : ''}`),
  createCategory: (data: any) => request('/products/categories', { method: 'POST', body: JSON.stringify(data) }),
  getBrands: () => request('/products/brands'),
  createBrand: (data: any) => request('/products/brands', { method: 'POST', body: JSON.stringify(data) }),
  getServices: () => request('/products/services'),
  createService: (data: any) => request('/products/services', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/customers?${query}`);
  },
  createCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  getCustomerDetails: (id: number | string) => request(`/customers/${id}`),
  addCustomerDevice: (customerId: number | string, data: any) => request(`/customers/${customerId}/devices`, { method: 'POST', body: JSON.stringify(data) }),

  // Financial
  getFinancialSummary: () => request('/financial/summary'),
  getExpenses: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/financial/expenses?${query}`);
  },
  createExpense: (data: any) => request('/financial/expenses', { method: 'POST', body: JSON.stringify(data) }),
  payExpense: (id: number | string, paymentMethod?: string) => request(`/financial/expenses/${id}/pay`, { method: 'PATCH', body: JSON.stringify({ payment_method: paymentMethod }) }),
  getCardRates: () => request('/financial/rates'),
  saveCardRates: (rates: any[]) => request('/financial/rates', { method: 'POST', body: JSON.stringify({ rates }) }),
  getCommissions: () => request('/financial/commissions'),

  // Pre-owned trades
  getUsedDevices: (status?: string) => request(`/used-devices${status ? `?status=${status}` : ''}`),
  purchaseUsedDevice: (data: any) => request('/used-devices/purchase', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getCompany: () => request('/settings/company'),
  updateCompany: (data: any) => request('/settings/company', { method: 'PUT', body: JSON.stringify(data) }),
  getUsers: () => request('/settings/users'),
  createUser: (data: any) => request('/settings/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number | string, data: any) => request(`/settings/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getProfiles: () => request('/settings/profiles'),
  createProfile: (data: any) => request('/settings/profiles', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/settings/audit?${query}`);
  },
};
