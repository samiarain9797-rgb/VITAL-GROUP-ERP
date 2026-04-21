import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";

export default function CompaniesView({ companies, profile }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({ name: "", shipmentType: "Port Based" });
  const [isSaving, setIsSaving] = useState(false);

  const canManage = profile?.role === "admin" || profile?.role === "clearing_agent";

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editData) {
        await updateDoc(doc(db, "companies", editData.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "companies"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditData(null);
      setFormData({ name: "", shipmentType: "Port Based" });
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        await deleteDoc(doc(db, "companies", id));
      } catch (error) {
        console.error("Error deleting company:", error);
        alert("Failed to delete company");
      }
    }
  };

  const openEdit = (company) => {
    setEditData(company);
    setFormData({ name: company.name, shipmentType: company.shipmentType || "Port Based" });
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Companies</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditData(null);
              setFormData({ name: "", shipmentType: "Port Based" });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Shipment Type</th>
              {canManage && <th className="p-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-zinc-50/50">
                <td className="p-4 font-medium text-zinc-900">{company.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.shipmentType === 'Port Based' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {company.shipmentType || "Port Based"}
                  </span>
                </td>
                {canManage && (
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEdit(company)} className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(company.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="p-8 text-center text-zinc-500">
                  No companies found.
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
                {editData ? "Edit Company" : "Add Company"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Shipment Type</label>
                <select
                  value={formData.shipmentType}
                  onChange={(e) => setFormData({ ...formData, shipmentType: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                >
                  <option value="Port Based">Port Based</option>
                  <option value="Loading Point Based">Loading Point Based</option>
                </select>
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
