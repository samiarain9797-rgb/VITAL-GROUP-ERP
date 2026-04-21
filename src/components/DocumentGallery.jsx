import React, { useMemo, useState } from 'react';
import { Search, FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

export default function DocumentGallery({ shipments }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const documents = useMemo(() => {
    const docs = [];

    shipments.forEach(s => {
      const addDoc = (url, name, type) => {
        if (url) {
          docs.push({
            id: `${s.id}-${name}-${url.substring(0, 10)}`,
            shipmentId: s.trackingId || s.id,
            url,
            name,
            type,
            date: s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || Date.now())
          });
        }
      };

      // Extract various documents
      addDoc(s.driverIdCardUrl, 'Driver ID', 'Identity');
      addDoc(s.receivingDocUrl, 'Receiving Document', 'Proof of Delivery');
      addDoc(s.returnLoadDocument, s.returnLoadDocumentName || 'Return Load Doc', 'Return Load');
      addDoc(s.emptyContainerEirUrl, 'EIR Document', 'EIR');
      addDoc(s.localDispatchDocUrl, 'Local Dispatch Doc', 'Dispatch');

      if (s.transporterDocs && Array.isArray(s.transporterDocs)) {
        s.transporterDocs.forEach((d, i) => addDoc(d.url, d.name || `Transporter Doc ${i+1}`, 'Transporter'));
      }
      if (s.incidentDocs && Array.isArray(s.incidentDocs)) {
        s.incidentDocs.forEach((d, i) => addDoc(d.url, d.name || `Incident Evidence ${i+1}`, 'Incident'));
      }
      if (s.insuranceDocs && Array.isArray(s.insuranceDocs)) {
        s.insuranceDocs.forEach((d, i) => addDoc(d.url, d.name || `Insurance Doc ${i+1}`, 'Insurance'));
      }
    });

    return docs.sort((a, b) => b.date - a.date);
  }, [shipments]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const documentTypes = ['All', ...new Set(documents.map(d => d.type))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search by Shipment ID or Document Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredDocs.map(doc => {
          const isImage = doc.url.startsWith('data:image') || doc.url.match(/\\.(jpeg|jpg|gif|png)$/i);
          
          return (
            <div key={doc.id} className="bg-white rounded-xl border-2 border-zinc-200 overflow-hidden shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] transition-all group">
              <div className="h-32 bg-zinc-100 flex items-center justify-center relative overflow-hidden">
                {isImage ? (
                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <FileText size={48} className="text-zinc-300" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full text-zinc-900 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <ExternalLink size={16} />
                  </a>
                  <a href={doc.url} download={doc.name} className="p-2 bg-white rounded-full text-zinc-900 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <Download size={16} />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-mono text-blue-600 mb-1">{doc.shipmentId}</div>
                <h4 className="text-xs font-bold text-zinc-900 truncate" title={doc.name}>{doc.name}</h4>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">{doc.type}</span>
                  <span className="text-[9px] text-zinc-400">{doc.date.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">
            <FileText size={48} className="mx-auto mb-4 text-zinc-300" />
            <p>No documents found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
