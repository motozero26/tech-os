import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Calendar,
  DollarSign
} from 'lucide-react';
import { api } from '../../api.ts';
import { SubscriptionInfo, Plan, SubscriptionPayment } from '../../types.ts';

export const Assinatura: React.FC = () => {
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout selection
  const [selectedPlanId, setSelectedPlanId] = useState<number>(2);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'semiannual' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de crédito'>('PIX');

  // Checkout Modal State
  const [checkoutData, setCheckoutData] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Auto-polling for real-time payment confirmation via Mercado Pago / InfinitePay
  useEffect(() => {
    if (!checkoutData?.payment_id) return;

    const interval = setInterval(async () => {
      try {
        const check = await api.checkSubscriptionPayment(checkoutData.payment_id);
        if (check.status === 'paid' || check.activated) {
          clearInterval(interval);
          setCheckoutData(null);
          alert('🎉 Pagamento validado com sucesso! Seu acesso completo foi restaurado.');
          window.dispatchEvent(new CustomEvent('company_updated'));
          loadSubscriptionData();
        }
      } catch (e) {
        // silent check
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [checkoutData]);

  async function loadSubscriptionData() {
    setLoading(true);
    try {
      const [current, plansList, invs] = await Promise.all([
        api.getSubscriptionCurrent(),
        api.getSubscriptionPlans(),
        api.getSubscriptionInvoices()
      ]);
      setSubInfo(current);
      setPlans(plansList);
      setInvoices(invs);
      if (current?.plan?.id) {
        setSelectedPlanId(current.plan.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await api.createSubscriptionCheckout({
        plan_id: selectedPlanId,
        billing_cycle: billingCycle,
        payment_method: paymentMethod
      });
      setCheckoutData(res);
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar pagamento');
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleConfirmPaymentSimulation() {
    if (!checkoutData) return;
    setConfirming(true);
    try {
      const check = await api.checkSubscriptionPayment(checkoutData.payment_id);
      if (check.status === 'paid' || check.activated) {
        alert('🎉 Pagamento confirmado pelo gateway! Acesso completo restaurado.');
      } else {
        await api.confirmSubscriptionPayment(checkoutData.payment_id);
        alert('Pagamento confirmado e acesso renovado com sucesso!');
      }
      setCheckoutData(null);
      window.dispatchEvent(new CustomEvent('company_updated'));
      loadSubscriptionData();
    } catch (e: any) {
      alert(e.message || 'Erro ao confirmar pagamento');
    } finally {
      setConfirming(false);
    }
  }

  function copyPixCode() {
    if (!checkoutData?.pix_copia_cola) return;
    navigator.clipboard.writeText(checkoutData.pix_copia_cola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  }

  if (loading || !subInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando informações da assinatura...</span>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  function calculatePrice() {
    if (!selectedPlan) return 0;
    if (billingCycle === 'quarterly') return (selectedPlan.price_monthly * 3) * 0.95;
    if (billingCycle === 'semiannual') return (selectedPlan.price_monthly * 6) * 0.90;
    if (billingCycle === 'annual') return selectedPlan.price_yearly || ((selectedPlan.price_monthly * 12) * 0.80);
    return selectedPlan.price_monthly;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Minha Assinatura & Planos</h2>
        <p className="text-xs text-slate-400">
          Gerencie o plano da sua loja, consulte a validade do acesso e renove sua licença.
        </p>
      </div>

      {/* Current Subscription Status Card */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl ${
        subInfo.is_expired
          ? 'bg-red-950/40 border-red-800/80'
          : subInfo.is_trial
          ? 'bg-amber-950/40 border-amber-800/80'
          : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
            subInfo.is_expired ? 'bg-red-600' : subInfo.is_trial ? 'bg-amber-600' : 'bg-blue-600'
          }`}>
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-white">Plano {subInfo.plan_name}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                subInfo.is_expired
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : subInfo.is_trial
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {subInfo.is_expired ? 'Expirado' : subInfo.is_trial ? 'Período de Teste' : 'Assinatura Ativa'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Código da Loja: <span className="font-mono text-slate-300 font-semibold">{subInfo.company_code}</span> • Matriz: {subInfo.trade_name}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Válido até: <strong>{new Date(subInfo.access_expires_at).toLocaleDateString('pt-BR')}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Restam: <strong className="text-white font-mono">{subInfo.days_left} dias</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <a
            href="#renovar"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            <span>Renovar ou Alterar Plano</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Plan Selector Section */}
      <div id="renovar" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Planos Mensais Disponíveis</h3>
            <p className="text-xs text-slate-400">Escolha o plano ideal para a sua loja. A diferença entre os planos é a emissão de notas fiscais.</p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-300 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Planos 100% Mensais (Sem Fidelidade)</span>
          </div>
        </div>

        {/* Plans Cards - Only 2 Plans: Prata e Ouro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.filter(p => p.name === 'Prata' || p.name === 'Ouro').map((p) => {
            const isSelected = selectedPlanId === p.id;
            const isOuro = p.name === 'Ouro';
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? (isOuro ? 'bg-gradient-to-b from-amber-950/20 to-slate-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/50' : 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/50')
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {isOuro ? (
                  <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    Completo com Nota Fiscal
                  </span>
                ) : (
                  <span className="absolute -top-3 right-6 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-slate-700">
                    Básico sem Nota
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xl font-black ${isOuro ? 'text-amber-400' : 'text-white'}`}>{p.name}</h4>
                      {isOuro && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          NF-e + NFS-e MEI
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className={`w-5 h-5 ${isOuro ? 'text-amber-400' : 'text-blue-400'}`} />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{p.description}</p>

                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-black font-mono text-white">
                      R$ {p.price_monthly.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">/mês</span>
                  </div>

                  <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                    {p.features?.map((feat: string, i: number) => {
                      const isFiscalFeat = feat.includes('Nota Fiscal');
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {isFiscalFeat && !isOuro ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                          ) : (
                            <Check className={`w-3.5 h-3.5 shrink-0 ${isFiscalFeat ? 'text-amber-400 font-bold' : 'text-emerald-400'}`} />
                          )}
                          <span className={isFiscalFeat ? (isOuro ? 'font-bold text-amber-300' : 'text-slate-500 line-through') : 'text-slate-300'}>
                            {feat}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? (isOuro ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30' : 'bg-blue-600 text-white shadow-md shadow-blue-600/30')
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Plano Selecionado' : 'Escolher este Plano'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Box */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
          Resumo do Pagamento & Renovação
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Plano:</span>
              <span className="text-white font-semibold">{selectedPlan?.name}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Ciclo de Cobrança:</span>
              <span className="text-white capitalize">{billingCycle === 'monthly' ? 'Mensal' : billingCycle === 'quarterly' ? 'Trimestral (90 dias)' : billingCycle === 'semiannual' ? 'Semestral (180 dias)' : 'Anual (365 dias)'}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Forma de Pagamento:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    paymentMethod === 'PIX' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  PIX Instantâneo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cartão de crédito')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    paymentMethod === 'Cartão de crédito' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Cartão de Crédito
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center gap-3">
            <div>
              <span className="text-xs text-slate-400">Valor Total a Pagar:</span>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                R$ {calculatePrice().toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Liberação imediata com renovação automática</p>
            </div>

            <button
              onClick={handleStartCheckout}
              disabled={checkoutLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{checkoutLoading ? 'Gerando Fatura...' : 'Pagar e Renovar Acesso'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Histórico de Pagamentos de Assinatura</h3>
          <span className="text-xs text-slate-400">{invoices.length} fatura(s)</span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Nenhum pagamento registrado nesta conta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Fatura</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Ciclo</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">#{inv.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{inv.plan_name}</td>
                    <td className="py-3 px-4 text-slate-400 capitalize">{inv.billing_cycle}</td>
                    <td className="py-3 px-4 text-slate-300">{inv.payment_method}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {inv.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {inv.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: PIX QR Code & Payment Confirmation */}
      {checkoutData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Pague via PIX Instantâneo</h3>
              <p className="text-xs text-slate-400 mt-1">
                Fatura <span className="font-mono text-white font-bold">#{checkoutData.payment_id}</span> • Plano {checkoutData.plan_name}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {checkoutData.payment_gateway === 'mercadopago' ? 'Mercado Pago (Validação Automática)' : (checkoutData.payment_gateway === 'infinitepay' ? 'InfinitePay (Validação Automática)' : 'PIX Direto')}
                </span>
              </div>
            </div>

            {/* QR Code display */}
            <div className="bg-white p-4 rounded-2xl max-w-[200px] mx-auto shadow-lg flex flex-col items-center justify-center">
              <QrCode className="w-36 h-36 text-black" />
              <span className="text-[10px] text-gray-500 font-mono mt-1">Escaneie no app do banco</span>
            </div>

            <div className="text-xl font-black font-mono text-emerald-400">
              R$ {checkoutData.amount.toFixed(2)}
            </div>

            {/* Pix Copia e Cola */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-semibold text-slate-400">Pix Copia e Cola</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={checkoutData.pix_copia_cola}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyPixCode}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  {copiedPix ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmPaymentSimulation}
                disabled={confirming}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirming ? 'Validando...' : 'Confirmar Pagamento Realizado'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckoutData(null)}
                className="w-full py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
