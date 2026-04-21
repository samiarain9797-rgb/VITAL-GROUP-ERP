import React, { useState, useEffect } from 'react';
import { Search, DollarSign, CheckCircle2, AlertCircle, Upload, Eye, FileText, Download } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { cn } from '../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const InvoicesView = ({ profile }) => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, invoice: null });
  const [paymentData, setPaymentData] = useState({ amount: '', date: '', method: 'Bank Transfer', reference: '', document: null });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filteredInvoices = invoices.filter(i => 
    i.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.customerName && i.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || !paymentData.date) return;

    try {
      setIsUploading(true);
      let documentUrl = null;

      if (paymentData.document) {
        const fileRef = ref(storage, `payments/${paymentModal.invoice.id}_${Date.now()}_${paymentData.document.name}`);
        await uploadBytes(fileRef, paymentData.document);
        documentUrl = await getDownloadURL(fileRef);
      }

      const newPayment = {
        amount: parseFloat(paymentData.amount),
        date: paymentData.date,
        method: paymentData.method,
        reference: paymentData.reference,
        documentUrl,
        recordedBy: profile?.uid,
        status: "Pending Approval", // Needs admin approval to finalize
        createdAt: new Date().toISOString()
      };

      const inv = paymentModal.invoice;
      const updatedPayments = [...(inv.payments || []), newPayment];
      
      const totalPaidReq = updatedPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0);
      const totalRequested = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      
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
      setPaymentData({ amount: '', date: '', method: 'Bank Transfer', reference: '', document: null });
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprovePayment = async (invoice, paymentIndex) => {
    if (profile?.role !== 'admin') {
      alert("Only admins can approve payments.");
      return;
    }

    try {
      const updatedPayments = [...invoice.payments];
      updatedPayments[paymentIndex].status = "Approved";

      const totalApprovedPaid = updatedPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0);
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
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-center">Status</th>
              <th className="px-4 py-3 font-mono uppercase tracking-widest text-zinc-500 text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredInvoices.map(inv => {
              const approvedPaid = (inv.payments||[]).filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0);
              return (
                <React.Fragment key={inv.id}>
                  <tr className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-4 py-4 font-bold text-blue-700">{inv.id}</td>
                    <td className="px-4 py-4 font-medium text-zinc-900">{inv.customerName}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-zinc-900">PKR {inv.totalAmount?.toLocaleString()}</td>
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
                    <td className="px-4 py-4 text-right space-x-2">
                       {inv.paymentStatus !== 'Paid' && (
                        <button 
                          onClick={() => setPaymentModal({ isOpen: true, invoice: inv })}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Payments List */}
                  {inv.payments && inv.payments.length > 0 && (
                    <tr className="bg-zinc-50 border-b-2 border-zinc-200">
                      <td colSpan="5" className="px-4 py-3">
                        <div className="pl-4 border-l-4 border-blue-200">
                          <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Payment History</h4>
                          <div className="space-y-2 text-xs">
                            {inv.payments.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                                <div className="flex gap-4 items-center">
                                  <span className="font-mono text-zinc-500">{p.date}</span>
                                  <strong className="text-zinc-900">PKR {p.amount.toLocaleString()}</strong>
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
                                  {p.status === 'Pending Approval' && profile?.role === 'admin' && (
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
              <tr><td colSpan="5" className="px-4 py-8 text-center text-zinc-500">No invoices found. Generate an invoice from the Shipments view first.</td></tr>
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
                 <input type="number" required max={paymentModal.invoice.totalAmount} value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Date</label>
                   <input type="date" required value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-700 mb-1">Method</label>
                   <select value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                     <option>Bank Transfer</option>
                     <option>Cheque</option>
                     <option>Cash</option>
                   </select>
                </div>
              </div>
              <div>
                 <label className="block text-xs font-bold text-zinc-700 mb-1">Reference / Cheque Number</label>
                 <input type="text" value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2" />
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
    </div>
  );
};
export default InvoicesView;
