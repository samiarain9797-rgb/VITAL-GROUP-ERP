import React, { useState } from 'react';
import { 
  MessageSquareWarning, 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Send 
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

const CATEGORIES = [
  "Shipment Delay",
  "Damaged Goods",
  "Transporter/Driver Issue",
  "Customs/Clearing Issue",
  "Billing/Invoice Error",
  "System/App Bug",
  "Other"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

const ComplaintsView = ({ complaints, shipments, vessels, profile, users }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // New Complaint State
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDescription, setNewDescription] = useState("");
  const [newRelatedId, setNewRelatedId] = useState("");

  // Comment State
  const [newComment, setNewComment] = useState("");

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    if (!newSubject || !newDescription) return;

    const complaintId = `CMP-${Date.now()}`;
    const complaintData = {
      id: complaintId,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: "Open",
      description: newDescription,
      relatedId: newRelatedId || null,
      createdBy: profile.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      comments: []
    };

    try {
      await setDoc(doc(db, "complaints", complaintId), complaintData);
      setIsCreating(false);
      setNewSubject("");
      setNewDescription("");
      setNewRelatedId("");
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert("Failed to submit complaint.");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedComplaint) return;

    const comment = {
      id: `cmt-${Date.now()}`,
      text: newComment,
      createdBy: profile.uid,
      senderName: profile.displayName || profile.email,
      createdAt: Timestamp.now()
    };

    try {
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        comments: [...(selectedComplaint.comments || []), comment],
        updatedAt: serverTimestamp()
      });
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedComplaint || profile.role !== 'admin') return;

    try {
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Resolved': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-zinc-100 text-zinc-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'text-zinc-500';
      case 'Medium': return 'text-blue-500';
      case 'High': return 'text-orange-500';
      case 'Critical': return 'text-red-600 font-bold';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Complaints & Support</h2>
          <p className="text-zinc-500 text-sm">Report issues and track resolutions</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          New Complaint
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search complaints by ID or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 appearance-none"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">ID</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Subject</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Category</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Priority</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map(complaint => (
                  <tr 
                    key={complaint.id} 
                    onClick={() => setSelectedComplaint(complaint)}
                    className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-zinc-900">{complaint.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{complaint.subject}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{complaint.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(complaint.status))}>
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getPriorityColor(complaint.priority)}>{complaint.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {complaint.createdAt?.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Complaint Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <MessageSquareWarning size={18} className="text-orange-600" />
                File New Complaint
              </h3>
              <button onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateComplaint} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Related Shipment/Vessel (Optional)</label>
                <input
                  type="text"
                  value={newRelatedId}
                  onChange={e => setNewRelatedId(e.target.value)}
                  placeholder="e.g., TRK-12345 or VSL-987"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Detailed Description</label>
                <textarea
                  required
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={4}
                  placeholder="Please provide as much detail as possible..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col h-[85vh]">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-zinc-900 text-lg">{selectedComplaint.subject}</h3>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider", getStatusColor(selectedComplaint.status))}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono">Ticket {selectedComplaint.id} • Opened {selectedComplaint.createdAt?.toDate().toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-zinc-400 hover:text-zinc-600 p-2">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Left Column: Details */}
              <div className="w-full md:w-1/3 border-r border-zinc-100 p-6 bg-zinc-50/50 space-y-6">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Details</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-zinc-500 block text-xs">Category</span>
                      <span className="font-medium text-zinc-900">{selectedComplaint.category}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-xs">Priority</span>
                      <span className={cn("font-medium", getPriorityColor(selectedComplaint.priority))}>{selectedComplaint.priority}</span>
                    </div>
                    {selectedComplaint.relatedId && (
                      <div>
                        <span className="text-zinc-500 block text-xs">Related Item</span>
                        <span className="font-mono text-zinc-900 bg-zinc-200 px-1.5 py-0.5 rounded text-xs">{selectedComplaint.relatedId}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-500 block text-xs">Reported By</span>
                      <span className="font-medium text-zinc-900">
                        {users.find(u => u.uid === selectedComplaint.createdBy)?.displayName || selectedComplaint.createdBy}
                      </span>
                    </div>
                  </div>
                </div>

                {profile.role === 'admin' && (
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Admin Actions</h4>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Right Column: Description & Chat */}
              <div className="w-full md:w-2/3 flex flex-col">
                <div className="p-6 border-b border-zinc-100">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Original Description</h4>
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-zinc-50 space-y-4">
                  {(!selectedComplaint.comments || selectedComplaint.comments.length === 0) ? (
                    <div className="text-center text-zinc-400 py-8 text-sm italic">
                      No comments yet.
                    </div>
                  ) : (
                    selectedComplaint.comments.map(comment => {
                      const isMe = comment.createdBy === profile.uid;
                      const isAdmin = users.find(u => u.uid === comment.createdBy)?.role === 'admin';
                      return (
                        <div key={comment.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-700">
                              {isMe ? "You" : comment.senderName}
                              {isAdmin && !isMe && <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase">Admin</span>}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {comment.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <div className={cn(
                            "px-4 py-2 rounded-2xl text-sm",
                            isMe ? "bg-orange-600 text-white rounded-tr-sm" : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm"
                          )}>
                            {comment.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 bg-white border-t border-zinc-100">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-zinc-100 border-transparent focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2 text-sm transition-all outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsView;
