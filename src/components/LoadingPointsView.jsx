import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, Edit2, Trash2, X, Save, FileText } from "lucide-react";

export default function LoadingPointsView({ loadingPoints, companies, profile }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({ name: "", companyId: "", companyName: "", address: "", description: "", documentUrl: "" });
  const [isSaving, setIsSaving] = useState(false);

  const canManage = profile?.role === "admin" || profile?.role === "clearing_agent";

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const company = companies.find(c => c.id === formData.companyId);
      const dataToSave = {
        ...formData,
        companyName: company ? company.name : "",
      };

      if (editData) {
        await updateDoc(doc(db, "loadingPoints", editData.id), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "loadingPoints"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditData(null);
      setFormData({ name: "", companyId: "", companyName: "", address: "", description: "", documentUrl: "" });
    } catch (error) {
      console.error("Error saving loading point:", error);
      alert("Failed to save loading point");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this loading point?")) {
      try {
        await deleteDoc(doc(db, "loadingPoints", id));
      } catch (error) {
        console.error("Error deleting loading point:", error);
        alert("Failed to delete loading point");
      }
    }
  };

  const openEdit = (point) => {
    setEditData(point);
    setFormData({
      name: point.name || "",
      companyId: point.companyId || "",
      companyName: point.companyName || "",
      address: point.address || "",
      description: point.description || "",
      documentUrl: point.documentUrl || "",
    });
    setIsModalOpen(true);
  };

  const loadingPointCompanies = companies.filter(c => c.shipmentType === "Loading Point Based");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Loading Points</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditData(null);
              setFormData({ name: "", companyId: "", companyName: "", address: "", description: "", documentUrl: "" });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Loading Point
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Address</th>
              <th className="p-4 font-medium">Document</th>
              {canManage && <th className="p-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loadingPoints.map((point) => (
              <tr key={point.id} className="hover:bg-zinc-50/50">
                <td className="p-4 font-medium text-zinc-900">{point.name}</td>
                <td className="p-4 text-zinc-600">{point.companyName}</td>
                <td className="p-4 text-zinc-600 truncate max-w-[200px]">{point.address}</td>
                <td className="p-4">
                  {point.documentUrl ? (
                    <a href={point.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-600 hover:underline">
                      <FileText className="w-4 h-4" /> View
                    </a>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                {canManage && (
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEdit(point)} className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(point.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {loadingPoints.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-zinc-500">
                  No loading points found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">
                {editData ? "Edit Loading Point" : "Add Loading Point"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Loading Point Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Company</label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="">Select Company</option>
                  {loadingPointCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Document URL (PDF/Image)</label>
                <input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
