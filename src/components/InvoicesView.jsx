import React, { useState, useEffect } from 'react';
import { Search, DollarSign, CheckCircle2, AlertCircle, Upload, Eye, FileText, Download, Trash2, X } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { cn } from '../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AnimatePresence, motion } from 'motion/react';

const InvoicesView = ({ profile }) => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, invoice: null });
  const [paymentData, setPaymentData] = useState({ amount: '', taxDeduction: '', detentionDeduction: '', fuelDeduction: '', otherDeduction: '', date: '', method: 'Bank Transfer', reference: '', ledger: '', document: null });
  const [isUploading, setIsUploading] = useState(false);

  const [viewInvoiceModal, setViewInvoiceModal] = useState({ isOpen: false, html: null, invoiceId: null });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'invoices'), 
      (snapshot) => {
        setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Invoices Fetch Error:", error);
      }
    );
    return () => unsub();
  }, []);

  const getSortTime = (ts) => {
    if (!ts) return Date.now() + 100000; // Force to top if completely missing (e.g. pending)
    if (typeof ts.toMillis === 'function') return ts.toMillis() || Date.now() + 100000;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts.toDate) return ts.toDate().getTime();
    return Date.now() + 100000;
  };

  const filteredInvoices = invoices.filter(i => 
    i.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.customerName && i.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => getSortTime(b.createdAt) - getSortTime(a.createdAt));

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentData.date) {
      alert("Please enter the date.");
      return;
    }
    
    const amountPaid = parseFloat(paymentData.amount) || 0;
    const tax = parseFloat(paymentData.taxDeduction) || 0;
    const detention = parseFloat(paymentData.detentionDeduction) || 0;
    const fuel = parseFloat(paymentData.fuelDeduction) || 0;
    const other = parseFloat(paymentData.otherDeduction) || 0;
    const totalCredit = amountPaid + tax + detention + fuel + other;

    if (totalCredit <= 0) {
      alert("Total credit (amount + deductions) must be greater than zero.");
      return;
    }
    
    const maxAmount = paymentModal.invoice.totalAmount - (paymentModal.invoice.payments || []).filter(p => p.status === 'Approved').reduce((s, p) => s + (p.totalCredit || p.amount || 0), 0);
    if (totalCredit > maxAmount) {
      alert("Total credit exceeds the remaining balance of the invoice.");
      return;
    }

    try {
      setIsUploading(true);
      let documentUrl = null;

      if (paymentData.document) {
        const fileRef = ref(storage, `payments/${paymentModal.invoice.id}_${Date.now()}_${paymentData.document.name}`);
        await uploadBytes(fileRef, paymentData.document);
        documentUrl = await getDownloadURL(fileRef);
      }

      const newPayment = {
        amount: amountPaid,
        taxDeduction: tax,
        detentionDeduction: detention,
        fuelDeduction: fuel,
        otherDeduction: other,
        totalCredit: totalCredit,
        date: paymentData.date,
        method: paymentData.method,
        reference: paymentData.reference,
        ledger: paymentData.ledger,
        documentUrl,
        recordedBy: profile?.uid,
        status: "Pending Approval", // Needs admin approval to finalize
        createdAt: new Date().toISOString()
      };

      const inv = paymentModal.invoice;
      const updatedPayments = [...(inv.payments || []), newPayment];
      
      const totalPaidReq = updatedPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + (p.totalCredit || p.amount || 0), 0);
      const totalRequested = updatedPayments.reduce((sum, p) => sum + (p.totalCredit || p.amount || 0), 0);
      
      let newInvoiceStatus = inv.paymentStatus;
      if (totalRequested >= inv.totalAmount) {
        newInvoiceStatus = "Payment Submitted (Pending Approval)";
      }

      await updateDoc(doc(db, "invoices", inv.id), {
        payments: updatedPayments,
        paymentStatus: newInvoiceStatus,
        updatedAt: serverTimestamp()
      });

      setPaymentModal({ isOpen: false, invoice: null });
      setPaymentData({ amount: '', taxDeduction: '', detentionDeduction: '', fuelDeduction: '', otherDeduction: '', date: '', method: 'Bank Transfer', reference: '', ledger: '', document: null });
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprovePayment = async (invoice, paymentIndex) => {
    if (profile?.role !== 'admin' && profile?.role !== 'accountant') {
      alert("Only admins and accountants can approve payments.");
      return;
    }

    try {
      const updatedPayments = [...invoice.payments];
      updatedPayments[paymentIndex].status = "Approved";

      const totalApprovedPaid = updatedPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + (p.totalCredit || p.amount || 0), 0);
      let newInvoiceStatus = "Pending";
      if (totalApprovedPaid >= invoice.totalAmount) {
        newInvoiceStatus = "Paid";
      } else if (totalApprovedPaid > 0) {
        newInvoiceStatus = "Partial Payment";
      }

      await updateDoc(doc(db, "invoices", invoice.id), {
        payments: updatedPayments,
        paymentStatus: newInvoiceStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error approving payment:", error);
      alert("Failed to approve payment.");
    }
  };

  const handleViewInvoice = (invoice) => {
    if (invoice.invoiceHtml) {
      setViewInvoiceModal({ isOpen: true, html: invoice.invoiceHtml, invoiceId: invoice.id });
    } else {
      // Fallback HTML generation for older invoices that don't have the saved HTML
      const fallbackHtml = `
        <html>
          <head>
            <title>Invoice - ${invoice.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; background: #fafaf9; }
              .invoice-wrapper { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 8px solid #ea580c; border-bottom: 8px solid #1e3a8a; box-sizing: border-box; }
              .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
              .invoice-details { text-align: right; }
              .invoice-details h2 { margin: 0; font-size: 32px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.1em; }
              .meta-grid { display: grid; grid-template-columns: auto auto; gap: 8px 24px; margin-top: 16px; text-align: right; justify-content: end; }
              .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #c2410c; font-weight: 700; }
              .meta-value { font-size: 12px; font-weight: 700; color: #18181b; }
              .addresses { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 40px; }
              .bill-to { flex: 1; padding: 20px; border-radius: 12px; background: #fff7ed; border: 1px solid #ffedd5; border-left: 4px solid #ea580c; }
              .bill-to h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; font-weight: 700; color: #c2410c; }
              .bill-to p.title { margin: 2px 0; font-size: 16px; font-weight: 800; color: #ea580c; }
              
              table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; table-layout: fixed; }
              th { text-align: left; padding: 12px 16px; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; font-weight: 700; background: #1e3a8a; }
              td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; font-weight: 500; line-height: 1.2; word-wrap: break-word; }
              tr:nth-child(even) td { background-color: #f8fafc; }
              
              .totals { margin-top: 40px; width: 320px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-left: auto; }
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #475569; }
              .total-row.grand-total { border-bottom: none; font-size: 18px; font-weight: 800; padding: 16px; margin-top: 8px; background: linear-gradient(135deg, #1e3a8a, #312e81); color: white; border-radius: 8px; }
              .cost { font-family: monospace; font-weight: 700; text-align: right; }
              .grand-total .cost { color: white; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; padding-top: 20px; clear: both; font-weight: 600; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <div class="invoice-wrapper">
              <div class="header">
                 <div class="invoice-details" style="width:100%;">
                    <h2>INVOICE (BASIC)</h2>
                    <div class="meta-grid">
                      <div class="meta-label">Invoice Number</div>
                      <div class="meta-value">${invoice.id}</div>
                      <div class="meta-label">Date</div>
                      <div class="meta-value">${invoice.invoiceDate || 'N/A'}</div>
                      <div class="meta-label">Status</div>
                      <div class="meta-value">${invoice.paymentStatus || 'Pending'}</div>
                    </div>
                  </div>
              </div>

              <div class="addresses">
                 <div class="bill-to">
                    <h3>Bill To</h3>
                    <p class="title">${invoice.customerName || 'Recorded Customer'}</p>
                 </div>
              </div>

              <table>
                 <thead>
                    <tr>
                       <th>Description</th>
                       <th style="text-align: right;">Amount</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td>Logistics & Transport Services<br/><span style="font-size: 10px; color: #64748b;">(Generated from historic invoice record)</span></td>
                       <td class="cost">PKR ${(invoice.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                 </tbody>
              </table>

              <div class="totals">
                 <div class="total-row grand-total">
                    <span>Total Amount</span>
                    <span class="cost">PKR ${(invoice.totalAmount || 0).toLocaleString()}</span>
                 </div>
              </div>

              <div class="footer">
                <p>This is a structurally inferred historic invoice. Contact admin for detailed original copy.</p>
              </div>
            </div>
            <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
          </body>
        </html>
      `;
      setViewInvoiceModal({ isOpen: true, html: fallbackHtml, invoiceId: invoice.id });
    }
  };

  const handleDownloadInvoiceHtml = (html, invoiceId) => {
      const blob = new Blob([html], { type: "text/html" });
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = `Invoice_${invoiceId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.id}? The associated shipments will be marked as uninvoiced.`)) return;
    
    try {
      // 1. Mark shipments as uninvoiced
      if (invoice.shipmentIds && invoice.shipmentIds.length > 0) {
        await Promise.all(invoice.shipmentIds.map(shipmentId => 
          updateDoc(doc(db, "shipments", shipmentId), {
            invoiced: false,
            invoiceId: null,
            invoiceDate: null,
            invoiceDueDate: null,
            invoiceSalesTaxPercent: null,
            invoiceWithholdingTaxAmount: null,
            updatedAt: serverTimestamp()
          }).catch(e => console.warn(`Could not update shipment ${shipmentId}`, e))
        ));
      }
      
      // 2. Delete the invoice
      await deleteDoc(doc(db, "invoices", invoice.id));
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice.");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Invoices & Payments</h2>
          <p className="text-zinc-500 text-sm">Track invoice statuses and record payments</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search Invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse bg-white text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs">Invoice #</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs">Customer</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-right">Total Amount</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-center">Ledger</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-center">Status</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredInvoices.map(inv => {
              const approvedPaid = (inv.payments||[]).filter(p => p.status === 'Approved').reduce((sum, p) => sum + (p.totalCredit || p.amount || 0), 0);
              return (
                <React.Fragment key={inv.id}>
                  <tr className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-4 py-4 font-bold text-blue-700">{inv.id}</td>
                    <td className="px-4 py-4 font-medium text-zinc-900">{inv.customerName}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-zinc-900">PKR {inv.totalAmount?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center text-zinc-600">{inv.ledger || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        inv.paymentStatus === 'Paid' ? "bg-green-100 text-green-700" :
                        inv.paymentStatus === 'Partial Payment' ? "bg-yellow-100 text-yellow-700" :
                        inv.paymentStatus === 'Payment Submitted (Pending Approval)' ? "bg-orange-100 text-orange-700" :
                        "bg-zinc-100 text-zinc-700"
                      )}>
                        {inv.paymentStatus || 'Pending'}
                      </span>
                    </td>
                      <td className="px-4 py-4 text-right flex items-center justify-end space-x-2">
                       {inv.paymentStatus !== 'Paid' && (
                        <button 
                          onClick={() => setPaymentModal({ isOpen: true, invoice: inv })}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleViewInvoice(inv)}
                        className="px-2 py-1.5 bg-zinc-50 text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors inline-flex items-center align-middle"
                        title="View PDF Invoice"
                      >
                        <Eye size={16} />
                      </button>

                      {(profile?.role === 'admin' || profile?.role === 'accountant') && (
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center align-middle"
                          title="Delete Invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Payments List */}
                  {inv.payments && inv.payments.length > 0 && (
                    <tr className="bg-zinc-50 border-b-2 border-zinc-200">
                      <td colSpan="6" className="px-4 py-3">
                        <div className="pl-4 border-l-4 border-blue-200">
                          <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Payment History</h4>
                          <div className="space-y-2 text-xs">
                            {inv.payments.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                                <div className="flex gap-4 items-center">
                                  <span className="font-mono text-zinc-500">{p.date}</span>
                                  <strong className="text-zinc-900">Credit PKR {(p.totalCredit || p.amount || 0).toLocaleString()}</strong>
                                  <span className="text-[10px] text-zinc-500 font-mono">(Paid: {p.amount?.toLocaleString()} | Ded: {((p.taxDeduction||0) + (p.detentionDeduction||0) + (p.fuelDeduction||0) + (p.otherDeduction||0)).toLocaleString()})</span>
                                  <span className="text-zinc-500 font-mono">{p.ledger ? `[${p.ledger}]` : ''}</span>
                                  <span className="text-zinc-500">via {p.method} ({p.reference || 'No Ref'})</span>
                                  {p.documentUrl && (
                                    <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                      <FileText size={12}/> View Doc
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold",
                                    p.status === 'Approved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                  )}>
                                    {p.status}
                                  </span>
                                  {p.status === 'Pending Approval' && (profile?.role === 'admin' || profile?.role === 'accountant') && (
                                    <button onClick={() => handleApprovePayment(inv, idx)} className="text-[10px] font-bold bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                                      Verify & Approve
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredInvoices.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-zinc-500">No invoices found. Generate an invoice from the Shipments view first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Record Payment for {paymentModal.invoice.id}</h3>
            <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
              <div>
                 <label className="block text-xs font-bold text-zinc-700 mb-1">Amount Paid (PKR)</label>
                 <input type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Tax Deduction</label>
                   <input type="number" value={paymentData.taxDeduction} onChange={e => setPaymentData({...paymentData, taxDeduction: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Detention Deduction</label>
                   <input type="number" value={paymentData.detentionDeduction} onChange={e => setPaymentData({...paymentData, detentionDeduction: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Fuel Deduction</label>
                   <input type="number" value={paymentData.fuelDeduction} onChange={e => setPaymentData({...paymentData, fuelDeduction: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Other Deduction</label>
                   <input type="number" value={paymentData.otherDeduction} onChange={e => setPaymentData({...paymentData, otherDeduction: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Date</label>
                   <input type="date" required value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Method</label>
                   <select value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]">
                     <option>Bank Transfer</option>
                     <option>Cheque</option>
                     <option>Cash</option>
                   </select>
                </div>
              </div>
              <div>
                 <label className="block text-xs font-bold text-zinc-700 mb-1">Reference / Cheque Number</label>
                 <input type="text" value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-zinc-700 mb-1">Ledger / Account</label>
                 <input type="text" placeholder="e.g. Current Account" value={paymentData.ledger} onChange={e => setPaymentData({...paymentData, ledger: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-zinc-700 mb-1">Upload Receipt / Cheque Scan (Optional)</label>
                 <input type="file" accept="image/*,.pdf" onChange={e => setPaymentData({...paymentData, document: e.target.files[0]})} className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setPaymentModal({ isOpen: false, invoice: null })} className="px-4 py-2 font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                  {isUploading ? 'Uploading...' : 'Submit Payment via Admin'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 text-center uppercase tracking-widest mt-2 flex items-center justify-center gap-1"><AlertCircle size={12}/> Payments require Admin Verification</p>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      <AnimatePresence>
        {viewInvoiceModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-100 p-2 rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center px-4 py-3 bg-white rounded-t-lg shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900">View Invoice: {viewInvoiceModal.invoiceId}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadInvoiceHtml(viewInvoiceModal.html, viewInvoiceModal.invoiceId)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Download size={14} /> Download HTML
                  </button>
                  <button 
                    onClick={() => setViewInvoiceModal({ isOpen: false, html: null, invoiceId: null })}
                    className="p-1 hover:bg-zinc-100 text-zinc-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white overflow-hidden mt-1 rounded-b-lg">
                <iframe 
                  srcDoc={viewInvoiceModal.html} 
                  title="Invoice View" 
                  className="w-full h-full border-0"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
export default InvoicesView;
