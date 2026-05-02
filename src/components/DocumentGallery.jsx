import React, { useMemo, useState, useEffect } from 'react';
import { Search, FileText, Image as ImageIcon, Download, ExternalLink, Plus, Trash2, Upload } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { AnimatePresence, motion } from 'motion/react';

export default function DocumentGallery({ shipments, profile }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Custom manual documents from "documents" collection
  const [manualDocs, setManualDocs] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [newDocData, setNewDocData] = useState({ name: '', type: 'Manual Upload', file: null, shipmentId: '' });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setManualDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching documents:", error);
    });
    return () => unsub();
  }, []);

  const combinedDocuments = useMemo(() => {
    const docs = [];

    // Extract various documents from shipments
    shipments.forEach(s => {
      const addDoc = (url, name, type) => {
        if (url) {
          docs.push({
            id: `${s.id}-${name}-${url.substring(0, 10)}`,
            shipmentId: s.trackingId || s.id,
            url,
            name,
            type,
            date: s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || Date.now()),
            isManual: false
          });
        }
      };

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

    // Add manual docs
    manualDocs.forEach(md => {
      docs.push({
        id: md.id,
        shipmentId: md.shipmentId || 'General',
        url: md.url,
        name: md.name,
        type: md.type,
        date: md.createdAt?.toDate ? md.createdAt.toDate() : new Date(),
        isManual: true,
        path: md.path // to optionally delete
      });
    });

    return docs.sort((a, b) => b.date - a.date);
  }, [shipments, manualDocs]);

  const filteredDocs = combinedDocuments.filter(doc => {
    const matchesSearch = doc.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const documentTypes = ['All', ...new Set(combinedDocuments.map(d => d.type))];

  const handleManualUpload = async (e) => {
    e.preventDefault();
    if (!newDocData.file || !newDocData.name) return;

    try {
      setIsUploading(true);
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${newDocData.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const storagePath = `general_documents/${uniqueName}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, newDocData.file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const docId = `DOC-${Date.now()}`;
      await setDoc(doc(db, 'documents', docId), {
        id: docId,
        name: newDocData.name,
        url: downloadURL,
        type: newDocData.type || 'Manual Upload',
        shipmentId: newDocData.shipmentId || '',
        path: storagePath,
        createdAt: serverTimestamp(),
        uploadedBy: profile?.uid || 'unknown'
      });

      setNewDocData({ name: '', type: 'Manual Upload', file: null, shipmentId: '' });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please ensure Storage is set up.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteManualDoc = async (docId, path) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      if (path) {
        await deleteObject(ref(storage, path)).catch(e => console.error("Could not delete from storage", e));
      }
      await deleteDoc(doc(db, 'documents', docId));
    } catch (error) {
      console.error("Error deleting doc", error);
      alert("Error deleting document record.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
        <div className="flex gap-4 items-center w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-md">
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
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredDocs.map(doc => {
          const isImage = doc.url.startsWith('data:image') || doc.url.match(/\.(jpeg|jpg|gif|png)$/i) || doc.url.includes('%2F');
          
          return (
            <div key={doc.id} className="bg-white rounded-xl border-2 border-zinc-200 overflow-hidden shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] transition-all group flex flex-col">
              <div className="h-32 bg-zinc-100 flex items-center justify-center relative overflow-hidden shrink-0">
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
              <div className="p-3 flex-1 flex flex-col">
                <div className="text-[10px] font-mono text-blue-600 mb-1">{doc.shipmentId}</div>
                <h4 className="text-xs font-bold text-zinc-900 line-clamp-2" title={doc.name}>{doc.name}</h4>
                <div className="mt-auto pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">{doc.type}</span>
                    <span className="text-[9px] text-zinc-400">{doc.date.toLocaleDateString()}</span>
                  </div>
                  {doc.isManual && (profile?.role === 'admin' || profile?.uid === doc.uploadedBy) && (
                    <button 
                      onClick={() => handleDeleteManualDoc(doc.id, doc.path)}
                      className="mt-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center gap-1 w-full justify-center bg-red-50 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete Record
                    </button>
                  )}
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

      <AnimatePresence>
        {isAddModalOpen && (
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
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Upload size={18} /> Upload General Document</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <span className="sr-only">Close</span>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="p-4">
                <form onSubmit={handleManualUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Document Name *</label>
                    <input type="text" required value={newDocData.name} onChange={e => setNewDocData({...newDocData, name: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Master Service Agreement" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Related Shipment ID (Optional)</label>
                    <input type="text" value={newDocData.shipmentId} onChange={e => setNewDocData({...newDocData, shipmentId: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" placeholder="e.g. SHP-12345" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-zinc-700 mb-1">Document Type / Category</label>
                     <input type="text" value={newDocData.type} onChange={e => setNewDocData({...newDocData, type: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">File *</label>
                    <input type="file" required onChange={e => setNewDocData({...newDocData, file: e.target.files[0]})} className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                    <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">
                      {isUploading ? 'Uploading...' : 'Save Document'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
