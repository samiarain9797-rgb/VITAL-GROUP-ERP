import React, { useState } from 'react';
import { FileText, Download, Printer, Settings2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const InvoiceGeneratorDemo = () => {
  // Invoice state
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    salesTaxPercent: 18,
    withholdingTaxAmount: 0,
    fuelDeductionAmount: 0,
    detentionDeductionAmount: 0,
    termsConditions: 'Payment due within 15 days.\nPlease include invoice number on your check.',
  });

  const [company, setCompany] = useState({
    name: 'Atlas Trading Co.',
    address: '456 Business Blvd, Commerce City',
  });

  // Mock shipments
  const [items, setItems] = useState([
    { id: 1, trackingId: 'TRK-9821', description: '40ft Container Transport (Karachi to Lahore)', cost: 150000 },
    { id: 2, trackingId: 'TRK-9822', description: 'Port Handling & Local Transit', cost: 45000 },
  ]);

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.cost, 0);
  const amountAfterDeductions = subtotal - invoiceDetails.withholdingTaxAmount - invoiceDetails.fuelDeductionAmount - invoiceDetails.detentionDeductionAmount;
  const salesTaxAmount = amountAfterDeductions * (invoiceDetails.salesTaxPercent / 100);
  const grandTotal = amountAfterDeductions + salesTaxAmount;

  const handleGenerateHTML = () => {
    let tableRowsHtml = '';
    items.forEach(item => {
      tableRowsHtml += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.trackingId}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">PKR ${item.cost.toLocaleString()}</td>
        </tr>
      `;
    });

    return `
      <html>
        <head>
          <title>${invoiceDetails.invoiceNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 36px; }
            .details-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .box { background: #f8fafc; padding: 15px; border-radius: 8px; width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #1e3a8a; color: white; }
            .totals { width: 50%; float: right; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .totals-row.bold { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>INVOICE</h1>
              <p>Invoice #: <strong>${invoiceDetails.invoiceNumber}</strong><br/>Date: ${invoiceDetails.invoiceDate}</p>
            </div>
            <div style="text-align: right;">
              <h2>Vital Logistics</h2>
              <p>123 Shipping Lane, Port City</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="box">
              <h3 style="margin-top:0; color: #ea580c; text-transform: uppercase; font-size: 12px;">Bill To:</h3>
              <strong>${company.name}</strong><br/>${company.address}
            </div>
            <div class="box">
              <strong>Due Date:</strong> ${invoiceDetails.dueDate}<br/>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Tracking ID</th><th>Description</th><th style="text-align: right;">Amount (PKR)</th></tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span></div>
            ${invoiceDetails.salesTaxPercent > 0 ? `<div class="totals-row"><span>Sales Tax (${invoiceDetails.salesTaxPercent}%)</span><span>PKR ${salesTaxAmount.toLocaleString()}</span></div>` : ''}
            ${invoiceDetails.withholdingTaxAmount > 0 ? `<div class="totals-row" style="color: red;"><span>Withholding Tax</span><span>- PKR ${invoiceDetails.withholdingTaxAmount.toLocaleString()}</span></div>` : ''}
            <div class="totals-row bold"><span>Grand Total</span><span>PKR ${grandTotal.toLocaleString()}</span></div>
          </div>
          
          <div style="clear: both; padding-top: 60px;">
            <h4>Terms & Conditions</h4>
            <p style="white-space: pre-wrap; font-size: 12px; color: #666;">${invoiceDetails.termsConditions}</p>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDF = () => {
    const html = handleGenerateHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.write('<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>');
      printWindow.document.close();
    } else {
      alert("Popup blocked. Please allow popups to print/save PDF.");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-20">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 border-b pb-4">Invoice Generator Playground</h2>
        <p className="text-zinc-500 text-sm mt-2">Simulate generating beautiful HTML/PDF invoices from raw shipment data.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column: Form Setup */}
        <div className="w-full xl:w-2/5 bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
            <Settings2 className="text-orange-600" size={20} />
            <h3 className="font-bold text-zinc-800">Invoice Parameters</h3>
          </div>

          {/* Standard Fields */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Invoice Number</label>
                <input type="text" value={invoiceDetails.invoiceNumber} onChange={e => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
             </div>
             <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Sales Tax (%)</label>
                <input type="number" value={invoiceDetails.salesTaxPercent} onChange={e => setInvoiceDetails({...invoiceDetails, salesTaxPercent: Number(e.target.value)})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Withholding Tax Ded. (PKR)</label>
                <input type="number" value={invoiceDetails.withholdingTaxAmount} onChange={e => setInvoiceDetails({...invoiceDetails, withholdingTaxAmount: Number(e.target.value)})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none text-red-600" />
             </div>
             <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Fuel Deduction (PKR)</label>
                <input type="number" value={invoiceDetails.fuelDeductionAmount} onChange={e => setInvoiceDetails({...invoiceDetails, fuelDeductionAmount: Number(e.target.value)})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none text-red-600" />
             </div>
          </div>

          {/* Items List */}
          <div>
            <div className="flex justify-between items-center mb-2 mt-4">
              <label className="block text-[10px] uppercase text-zinc-500 font-bold">Line Items</label>
              <button 
                onClick={() => setItems([...items, { id: Date.now(), trackingId: 'NEW-XXX', description: 'Additional Cost', cost: 10000 }])}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>
            
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                  <input value={item.trackingId} onChange={e => { const newItems = [...items]; newItems[index].trackingId = e.target.value; setItems(newItems); }} className="w-1/4 bg-white border border-zinc-200 rounded px-2 py-1 text-xs" />
                  <input value={item.description} onChange={e => { const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems); }} className="w-1/2 bg-white border border-zinc-200 rounded px-2 py-1 text-xs" />
                  <input type="number" value={item.cost} onChange={e => { const newItems = [...items]; newItems[index].cost = Number(e.target.value); setItems(newItems); }} className="w-1/4 bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-mono" />
                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={generatePDF} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Printer size={18} /> Print & Save PDF
          </button>
        </div>

        {/* Right Column: Code & Render Preview */}
        <div className="w-full xl:w-3/5 space-y-6">
          
          <div className="bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-zinc-800">
            <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-zinc-500 text-xs font-mono">invoice_generator.js</span>
            </div>
            <div className="p-4 overflow-x-auto text-sm text-zinc-300 font-mono" style={{ maxHeight: '300px' }}>
              <pre>
{`const handleGenerateInvoice = async (shipments, details) => {
  // 1. Calculate Totals
  const subtotal = shipments.reduce((sum, s) => sum + s.cost, 0);
  const deductions = details.withholding + details.fuel + details.detention;
  const taxableAmount = subtotal - deductions;
  const salesTax = taxableAmount * (details.taxPercent / 100);
  const grandTotal = taxableAmount + salesTax;

  // 2. Generate HTML String
  const htmlContent = \`
    <html>
      <body>
        <h1>INVOICE \${details.invoiceNumber}</h1>
        <!-- Injects tables and styling dynamically -->
      </body>
    </html>
  \`;

  // 3. Print/PDF via Browser Native
  const printWindow = window.open("", "_blank");
  printWindow.document.write(htmlContent);
  printWindow.print();
};`}
              </pre>
            </div>
          </div>

          <div className="bg-white border text-zinc-900 border-zinc-200 rounded-xl shadow-sm p-6 relative">
             <div className="absolute top-4 right-4 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
               <CheckCircle2 size={12}/> Live HTML Preview
             </div>
             
             {/* Live Web Preview of the generated HTML */}
             <div className="mt-4 pt-10 border-t" dangerouslySetInnerHTML={{ __html: handleGenerateHTML() }} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneratorDemo;
