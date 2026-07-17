import React, { useState, useMemo } from 'react';
import { JobCard, JobCardQuote } from '../types';
import { BadgeCheck, Search, Filter, AlertTriangle, FileText, CheckCircle2, ChevronRight, Calculator, RefreshCcw, Banknote, ShieldAlert } from 'lucide-react';

interface FinanceDashboardProps {
  jobCards: JobCard[];
  onUpdateJobCard: (cardId: string, updates: Partial<JobCard>) => Promise<void>;
}

export default function FinanceDashboard({ jobCards, onUpdateJobCard }: FinanceDashboardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pending invoices queue filter
  const pendingInvoices = useMemo(() => {
    return jobCards.filter(card => 
      card.stage === 'RECONCILIATION' && 
      card.paymentStatus !== 'PAID'
    ).sort((a, b) => {
      // Sort by priority (CRITICAL > HIGH > MEDIUM > LOW)
      const ticketPrioDiff = (a.id > b.id ? -1 : 1); // fallback mock logic for dates
      return ticketPrioDiff;
    });
  }, [jobCards]);

  const selectedCard = jobCards.find(c => c.id === selectedCardId);
  const quotes = selectedCard?.quotes || [];
  const winningQuote = quotes.find(q => q.id === selectedCard?.winningQuoteId || q.isWinning);

  // Summary Metrics
  const totalAmountPending = pendingInvoices.reduce((acc, card) => acc + (card.invoiceVendorAmount || card.finalBookingAmount || 0), 0);
  const highVarianceCount = pendingInvoices.filter(card => {
    const cardWinQuote = card.quotes 
      ? (card.quotes.find(q => q.id === card.winningQuoteId) || card.quotes.find(q => q.isWinning))
      : null;
    const qAmount = cardWinQuote ? cardWinQuote.amount : 0;
    const iAmount = card.invoiceVendorAmount || 0;
    return qAmount > 0 && iAmount > qAmount * 1.05; // 5% variance
  }).length;
  const gstMissingCount = pendingInvoices.filter(card => !card.airlineGstNumber || !card.airlineGstAmount).length;

  return (
    <div className="space-y-6">
      {/* Finance Summary Headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm text-white">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Total Pending</h3>
            <Banknote className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black">₹ {totalAmountPending.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border-2 border-rose-100 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">High Variance (&gt;5%)</h3>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{highVarianceCount}</p>
        </div>
        <div className="bg-white border-2 border-orange-100 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-500">GST Missing</h3>
            <ShieldAlert className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{gstMissingCount}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Queue */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Pending Invoices Queue
            </h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-xs font-bold rounded-xl outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {pendingInvoices.filter(c => c.travelerName.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase())).map(card => {
                const qAmount = card.quotes?.find(q => q.id === card.winningQuoteId)?.amount || 0;
                const iAmount = card.invoiceVendorAmount || card.finalBookingAmount || 0;
                const variancePct = qAmount > 0 ? ((iAmount - qAmount) / qAmount) * 100 : 0;
                const isHighVariance = variancePct > 5;
                
                return (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCardId === card.id ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.id}</span>
                      {isHighVariance && <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-md">VARIANCE</span>}
                    </div>
                    <div className="font-bold text-sm text-slate-900">{card.travelerName}</div>
                    <div className="flex justify-between items-center mt-2 text-xs font-medium">
                      <span className="text-slate-500 pr-2">Total: ₹ {iAmount.toLocaleString('en-IN')}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })}
              {pendingInvoices.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase">No pending invoices</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Verification Tool */}
        <div className="w-full lg:w-2/3">
          {selectedCard ? (
            <VerificationTool card={selectedCard} quotes={quotes} winningQuote={winningQuote} onUpdateJobCard={onUpdateJobCard} />
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center h-full min-h-[400px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-extrabold text-sm uppercase tracking-wider">Select an invoice to verify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationTool({ card, quotes, winningQuote, onUpdateJobCard }: { card: JobCard, quotes: JobCardQuote[], winningQuote?: JobCardQuote, onUpdateJobCard: (cardId: string, updates: Partial<JobCard>) => Promise<void> }) {
  const qAmount = winningQuote?.amount || 0;
  const bAmount = card.finalBookingAmount || 0;
  const iAmount = card.invoiceVendorAmount || 0;
  
  const variancePct = qAmount > 0 ? ((iAmount - qAmount) / qAmount) * 100 : 0;
  const isHighVariance = variancePct > 5;

  const [varianceReason, setVarianceReason] = useState(card.financeVarianceReason || '');
  const [physicalCopy, setPhysicalCopy] = useState(card.physicalInvoiceHandedOver || false);
  const [gstChecked, setGstChecked] = useState(card.gstDetailsCorrect || false);

  const [paymentMode, setPaymentMode] = useState<JobCard['paymentMode']>(card.paymentMode || 'Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(card.paymentDate || new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState(card.paymentTransactionRef || '');
  const [paymentCurrency, setPaymentCurrency] = useState(card.paymentCurrency || 'INR');
  const [paymentINR, setPaymentINR] = useState(card.paymentAmountINR || iAmount);

  const handleMarkAsReady = async () => {
    if (isHighVariance && !varianceReason.trim()) {
      alert("Please provide a reason for the high variance.");
      return;
    }
    if (!physicalCopy) {
      alert("Please confirm receipt of physical invoice copy.");
      return;
    }
    
    await onUpdateJobCard(card.id, {
      financeCleared: true,
      financeVarianceReason: varianceReason,
      gstDetailsCorrect: gstChecked,
      physicalInvoiceHandedOver: physicalCopy,
      paymentStatus: 'READY'
    });
  };

  const handleMarkAsPaid = async () => {
    if (!paymentDate || !paymentRef || !paymentMode) {
      alert("Payment date, mode and reference are required.");
      return;
    }
    await onUpdateJobCard(card.id, {
      paymentStatus: 'PAID',
      paymentDate,
      paymentTransactionRef: paymentRef,
      paymentMode,
      paymentCurrency,
      paymentAmountINR: paymentINR,
      paymentRecordedAt: new Date().toISOString(),
      stage: 'CLOSED'
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-left">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{card.travelerName} - Invoice Match</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">{card.id}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${card.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : card.paymentStatus === 'READY' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
          {card.paymentStatus || 'PENDING VALIDATION'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        {/* Left column: Audit fields */}
        <div className={card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
          
          {/* 3-Way Match */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">1. Approved Quote</div>
              <div className="text-lg font-black text-slate-900">₹ {qAmount.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-500 mt-1 truncate font-bold">{winningQuote?.vendorName || 'Not Set'}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">2. Actual Booking</div>
              <div className="text-lg font-black text-slate-900">₹ {bAmount.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-500 mt-1 truncate font-bold">{card.bookingVendor || 'Not Set'}</div>
            </div>
            <div className={`p-4 rounded-xl border-2 ${isHighVariance ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isHighVariance ? 'text-rose-600' : 'text-emerald-600'}`}>3. Vendor Invoice</div>
              <div className={`text-lg font-black ${isHighVariance ? 'text-rose-600' : 'text-emerald-700'}`}>₹ {iAmount.toLocaleString('en-IN')}</div>
              <div className="text-xs font-bold mt-1 flex justify-between">
                <span className={isHighVariance ? 'text-rose-500' : 'text-emerald-600'}>{card.airlineGstVendorName || card.bookingVendor}</span>
                <span className={isHighVariance ? 'text-rose-600 font-black' : 'text-emerald-600 font-bold'}>{variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {isHighVariance && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
              <label className="block text-xs font-black text-rose-800 uppercase tracking-widest mb-2">High Variance Reason (&gt; 5%) *</label>
              <textarea
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                disabled={card.financeCleared}
                className="w-full bg-white border border-rose-200 rounded-lg p-3 text-sm focus:border-rose-400 outline-none"
                rows={2}
                placeholder="Please justify this extra cost before proceeding..."
              />
            </div>
          )}

          {/* Compliance Checklist */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Compliance & GST Validation
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={gstChecked} onChange={(e) => setGstChecked(e.target.checked)} disabled={card.financeCleared} className="w-5 h-5 accent-orange-500 rounded cursor-pointer" />
                <div>
                  <span className="block text-sm font-bold text-slate-800">GST Registration & Tax Check</span>
                  <span className="block text-xs text-slate-500 mt-0.5 font-semibold">Vendor GST Matches records. Taxable Amount, CGST, SGST, IGST totals are calculated correctly.</span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={physicalCopy} onChange={(e) => setPhysicalCopy(e.target.checked)} disabled={card.financeCleared} className="w-5 h-5 accent-orange-500 rounded cursor-pointer" />
                <div>
                  <span className="block text-sm font-bold text-slate-800">Received Physical Copy</span>
                  <span className="block text-xs text-slate-500 mt-0.5 font-semibold">Physical invoice has been received and verified by finance team members.</span>
                </div>
              </label>
            </div>
          </div>

          {(!card.financeCleared || card.paymentStatus !== 'PAID') && (
            <div className="flex justify-end gap-3 border-b border-slate-100 pb-4">
              {!card.financeCleared && (
                <button
                  onClick={handleMarkAsReady}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Cleared / Ready for Payment
                </button>
              )}
            </div>
          )}

          {/* Payment Processing Section */}
          {(card.paymentStatus === 'READY' || card.paymentStatus === 'PAID') && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Banknote className="w-4 h-4" />
                Payment Processing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Payment Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as any)} disabled={card.paymentStatus === 'PAID'} className="w-full text-xs font-bold p-2.5 rounded-lg border border-emerald-200 outline-none bg-white cursor-pointer">
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Date</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} disabled={card.paymentStatus === 'PAID'} className="w-full text-xs font-bold p-2.5 rounded-lg border border-emerald-200 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Transaction Ref</label>
                  <input type="text" placeholder="e.g. UTR12345" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} disabled={card.paymentStatus === 'PAID'} className="w-full text-xs font-bold p-2.5 rounded-lg border border-emerald-200 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Equivalent INR Amt</label>
                  <input type="number" value={paymentINR} onChange={(e) => setPaymentINR(Number(e.target.value))} disabled={card.paymentStatus === 'PAID'} className="w-full text-xs font-bold p-2.5 rounded-lg border border-emerald-200 outline-none bg-white" />
                </div>
              </div>
              
              {card.paymentStatus !== 'PAID' && (
                <button onClick={handleMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Paid
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Document Viewer */}
        {(card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl) && (
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-4 flex flex-col h-[650px] border border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Invoice / Receipt Document</span>
            <div className="flex-grow rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center relative">
              {(card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl)?.startsWith("data:application/pdf") || (card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl)?.endsWith(".pdf") ? (
                <iframe src={card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl} className="w-full h-full border-none" title="Invoice Doc Preview" />
              ) : (
                <img src={card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl} className="max-w-full max-h-full object-contain" alt="Invoice Preview" />
              )}
            </div>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="truncate pr-4">Attached: {card.ticketVendorInvoiceName || card.airlineGstInvoiceName || "invoice.pdf"}</span>
              <a href={card.ticketVendorInvoiceUrl || card.airlineGstInvoiceUrl} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline shrink-0">Open Fullscreen</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
