import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintOSProps {
  format: 'a4' | 'thermal80' | 'thermal58';
  os: any;
  items: any[];
  checklist: any[];
  company: any;
  onClose: () => void;
}

export const PrintOS: React.FC<PrintOSProps> = ({
  format,
  os,
  items,
  checklist,
  company,
  onClose
}) => {
  useEffect(() => {
    // Automatically trigger window.print
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const totalServices = items
    .filter(i => i.item_type === 'service')
    .reduce((sum, i) => sum + i.total_price, 0);

  const totalParts = items
    .filter(i => i.item_type === 'part')
    .reduce((sum, i) => sum + i.total_price, 0);

  const netTotal = Math.max(0, (os.total_amount - os.advance_payment - (os.discount || 0)));

  return (
    <div className="fixed inset-0 bg-white text-black z-50 overflow-y-auto p-4 md:p-8 font-sans">
      {/* Floating Control Bar (hidden on paper print) */}
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-slate-900 text-white p-2 rounded-xl shadow-2xl print:hidden z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir</span>
        </button>
        <button
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* A4 FORMAT (2 VIAS) */}
      {format === 'a4' && (
        <div className="max-w-4xl mx-auto space-y-8 text-xs leading-tight">
          {[1, 2].map((via) => (
            <div key={via} className="border border-black p-6 space-y-4 rounded-sm print:break-after-page">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-black pb-3">
                <div className="flex items-center gap-3">
                  {company?.logo && (
                    <img
                      src={company.logo}
                      alt="Logo da Empresa"
                      className="max-h-14 max-w-28 object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-lg font-black tracking-wide uppercase">
                      {company?.trade_name || 'Assistencia shop'}
                    </h1>
                    <p className="text-[11px] font-semibold">{company?.name || 'Assistencia shop Comércio e Serviços LTDA'}</p>
                    <p className="text-[10px] text-gray-700">
                      CNPJ: {company?.cnpj || '12.345.678/0001-90'} • Tel: {company?.phone || '(11) 99999-8888'}
                    </p>
                    <p className="text-[10px] text-gray-700">
                      {company?.address || 'Rua Principal, 1000 - Centro'} - {company?.city || 'São Paulo'}/{company?.state || 'SP'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black font-mono border border-black px-3 py-1 inline-block">
                    O.S. #{os.code}
                  </div>
                  <div className="text-[10px] font-bold uppercase mt-1 text-gray-600">
                    {via === 1 ? '1ª VIA — ESTABELECIMENTO' : '2ª VIA — CLIENTE'}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    Entrada: {new Date(os.entry_date).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Client & Device Box */}
              <div className="grid grid-cols-2 gap-4 border border-black p-3 bg-gray-50/50">
                <div>
                  <span className="font-bold uppercase text-[10px] block border-b border-gray-300 pb-0.5 mb-1">
                    Dados do Cliente
                  </span>
                  <p><span className="font-semibold">Nome:</span> {os.customer_name}</p>
                  <p><span className="font-semibold">Telefone/WhatsApp:</span> {os.customer_phone || os.customer_whatsapp || '-'}</p>
                  <p><span className="font-semibold">CPF/CNPJ:</span> {os.customer_cpf || 'Não informado'}</p>
                  <p><span className="font-semibold">Endereço:</span> {os.customer_address ? `${os.customer_address}, ${os.customer_city}/${os.customer_state}` : '-'}</p>
                </div>
                <div>
                  <span className="font-bold uppercase text-[10px] block border-b border-gray-300 pb-0.5 mb-1">
                    Dados do Equipamento
                  </span>
                  <p><span className="font-semibold">Aparelho:</span> {os.device_brand} {os.device_model}</p>
                  <p><span className="font-semibold">IMEI / Serial:</span> {os.imei_serial || 'Não informado'}</p>
                  <p><span className="font-semibold">Cor:</span> {os.device_color || '-'}</p>
                  <p><span className="font-semibold">Senha / Padrão:</span> {os.unlock_password || 'Sem senha'}</p>
                </div>
              </div>

              {/* Reported Defects & Observations */}
              <div className="border border-black p-3 space-y-1.5">
                <div>
                  <span className="font-bold uppercase text-[10px]">Defeito Relatado: </span>
                  <span>{os.reported_defects || 'Nenhum defeito especificado.'}</span>
                </div>
                {os.entry_notes && (
                  <div>
                    <span className="font-bold uppercase text-[10px]">Observações de Entrada: </span>
                    <span>{os.entry_notes}</span>
                  </div>
                )}
                {os.technical_report && (
                  <div>
                    <span className="font-bold uppercase text-[10px]">Laudo Técnico: </span>
                    <span>{os.technical_report}</span>
                  </div>
                )}

                {/* Entry Photos on Printout */}
                {(() => {
                  const photos: string[] = Array.isArray(os.entry_photos)
                    ? os.entry_photos
                    : (typeof os.entry_photos === 'string' ? JSON.parse(os.entry_photos || '[]') : []);

                  if (photos.length === 0) return null;

                  return (
                    <div className="pt-2 border-t border-gray-300">
                      <span className="font-bold uppercase text-[9px] block text-gray-700 mb-1">
                        Registro Fotográfico de Entrada do Aparelho ({photos.length} foto{photos.length > 1 ? 's' : ''}):
                      </span>
                      <div className="flex gap-2 overflow-hidden flex-wrap">
                        {photos.slice(0, 4).map((ph, idx) => (
                          <div key={idx} className="border border-black p-0.5 bg-white">
                            <img
                              src={ph}
                              alt={`Registro ${idx + 1}`}
                              className="h-16 w-16 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Items Table */}
              <div className="border border-black">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black font-bold uppercase text-[10px]">
                      <th className="py-1 px-2">Item</th>
                      <th className="py-1 px-2">Tipo</th>
                      <th className="py-1 px-2">Garantia</th>
                      <th className="py-1 px-2 text-right">Qtd</th>
                      <th className="py-1 px-2 text-right">Unitário</th>
                      <th className="py-1 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 px-2">{item.description}</td>
                        <td className="py-1 px-2 capitalize">{item.item_type === 'service' ? 'Serviço' : 'Peça'}</td>
                        <td className="py-1 px-2">{item.warranty_period} {item.warranty_unit}</td>
                        <td className="py-1 px-2 text-right font-mono">{item.quantity}</td>
                        <td className="py-1 px-2 text-right font-mono">R$ {item.unit_price.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right font-mono font-semibold">R$ {item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-2 text-center text-gray-500 italic">
                          Aguardando orçamento / peças e serviços.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-between items-center border border-black p-2 bg-gray-50 text-[11px]">
                <div className="space-x-4">
                  <span>Serviços: <strong>R$ {totalServices.toFixed(2)}</strong></span>
                  <span>Peças: <strong>R$ {totalParts.toFixed(2)}</strong></span>
                  {os.advance_payment > 0 && (
                    <span>Adiantamento: <strong className="text-emerald-700">R$ {os.advance_payment.toFixed(2)}</strong></span>
                  )}
                  {os.discount > 0 && (
                    <span>Desconto: <strong>R$ {os.discount.toFixed(2)}</strong></span>
                  )}
                </div>
                <div className="text-sm font-black font-mono">
                  TOTAL: R$ {netTotal.toFixed(2)}
                </div>
              </div>

              {/* Legal Warranty Terms */}
              <div className="border border-black p-2 text-[9px] text-justify leading-tight text-gray-700">
                <span className="font-bold uppercase">Termos de Garantia e Condições: </span>
                {company?.warranty_terms || `Garantia legal de 90 dias conforme artigo 26 do CDC sobre peças e serviços descritos nesta O.S. A garantia é anulada em caso de queda, oxidação por umidade, choque mecânico ou intervenção de terceiros não autorizados. Aparelhos não retirados em até 90 dias após notificação serão considerados abandonados.`}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="text-center border-t border-black pt-1">
                  <p className="font-bold text-[10px]">{company?.trade_name || 'Assistencia shop'}</p>
                  <p className="text-[9px] text-gray-600">Assinatura do Técnico / Responsável</p>
                </div>
                <div className="text-center border-t border-black pt-1">
                  <p className="font-bold text-[10px]">{os.customer_name}</p>
                  <p className="text-[9px] text-gray-600">Assinatura do Cliente / Recebedor</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* THERMAL 80MM / 58MM FORMAT */}
      {(format === 'thermal80' || format === 'thermal58') && (
        <div className={`mx-auto font-mono text-[11px] leading-tight ${format === 'thermal80' ? 'max-w-[80mm]' : 'max-w-[58mm]'}`}>
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            {company?.logo && (
              <img
                src={company.logo}
                alt="Logo"
                className="max-h-12 max-w-32 object-contain mx-auto mb-1 filter grayscale"
              />
            )}
            <h1 className="text-sm font-bold uppercase">{company?.trade_name || 'Assistencia shop'}</h1>
            <p className="text-[10px]">{company?.phone || '(11) 99999-8888'}</p>
            <p className="text-[9px]">CNPJ: {company?.cnpj || '12.345.678/0001-90'}</p>
            <div className="text-base font-black my-1 border border-black py-0.5">
              O.S. #{os.code}
            </div>
            <p className="text-[9px]">{new Date(os.entry_date).toLocaleString('pt-BR')}</p>
          </div>

          {/* Customer */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
            <p className="font-bold text-[10px] uppercase">CLIENTE: {os.customer_name}</p>
            <p>TEL: {os.customer_phone || '-'}</p>
            <p>CPF: {os.customer_cpf || '-'}</p>
          </div>

          {/* Device */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
            <p className="font-bold text-[10px] uppercase">APARELHO: {os.device_brand} {os.device_model}</p>
            {os.imei_serial && <p className="text-[10px]">IMEI: {os.imei_serial}</p>}
            {os.unlock_password && <p className="text-[10px]">SENHA: {os.unlock_password}</p>}
            <p className="text-[10px] mt-1 font-bold">DEFEITO: {os.reported_defects}</p>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="border-b border-dashed border-black pb-2 mb-2">
              <p className="font-bold text-[10px] mb-1">PEÇAS / SERVIÇOS:</p>
              {items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-[10px]">
                  <span>{i.quantity}x {i.description.slice(0, 18)}</span>
                  <span>R$ {i.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5 text-right font-bold">
            {os.advance_payment > 0 && (
              <p className="text-[10px]">Sinal Pago: R$ {os.advance_payment.toFixed(2)}</p>
            )}
            <p className="text-sm">TOTAL: R$ {netTotal.toFixed(2)}</p>
          </div>

          {/* Warranty & Signature */}
          <div className="text-[8px] text-justify leading-tight mb-4">
            GARANTIA: 90 dias CDC sobre serviços e peças. A garantia não cobre queda ou contato com líquido.
          </div>

          <div className="text-center pt-4 border-t border-black text-[9px]">
            Assinatura do Cliente
          </div>
        </div>
      )}
    </div>
  );
};
