import React, { useState, useEffect } from 'react';
import { Search, DollarSign, TrendingUp, TrendingDown, Calculator, Plus, Trash2, Edit2 } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import RouteCostingModal from './RouteCostingModal';
import { cn } from '../lib/utils';

const CostingView = ({ profile }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [costings, setCostings] = useState([]);
  const [selectedCosting, setSelectedCosting] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'route_costings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCostings(data);
    });
    return () => unsub();
  }, []);

  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const filteredCostings = costings.filter(c => 
    c.transporterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.destination?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  // Calculate totals
  const totals = filteredCostings.reduce((acc, c) => {
    acc.revenue += (c.freightRevenue || 0);
    acc.cost += (c.totalCost || 0);
    acc.profit += (c.netProfit || 0);
    return acc;
  }, { revenue: 0, cost: 0, profit: 0 });

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this costing?")) {
      try {
        await deleteDoc(doc(db, "route_costings", id));
      } catch (error) {
        console.error("Error deleting costing:", error);
        alert("Failed to delete costing.");
      }
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Transporter Route Costing</h2>
          <p className="text-zinc-500 text-sm">Evaluate transporter freight rates and profitability per route</p>
        </div>
        <button
          onClick={() => {
            setSelectedCosting(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
        >
          <Plus size={16} /> Add Route Cost
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-widest text-blue-600 mb-2">Total Quoted Freight</p>
          <p className="text-3xl font-bold text-blue-900">{formatPKR(totals.revenue)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-widest text-red-600 mb-2">Total Estimated Cost</p>
          <p className="text-3xl font-bold text-red-900">{formatPKR(totals.cost)}</p>
        </div>
        <div className={cn("border rounded-xl p-6 shadow-sm", totals.profit >= 0 ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100")}>
          <p className={cn("text-xs font-mono uppercase tracking-widest mb-2", totals.profit >= 0 ? "text-green-600" : "text-orange-600")}>Total Net Profit</p>
          <p className={cn("text-3xl font-bold", totals.profit >= 0 ? "text-green-900" : "text-orange-900")}>{formatPKR(totals.profit)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search by Transporter Name or Destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Transporter</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Destination / Route</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Quoted Freight</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Est. Cost</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Profit Margin</th>
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCostings.map(c => {
                const profit = c.netProfit || 0;
                const margin = c.freightRevenue > 0 ? ((profit / c.freightRevenue) * 100).toFixed(1) : 0;
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm text-zinc-900">{c.transporterName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{c.destination || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-blue-700 font-medium">{formatPKR(c.freightRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-red-700 font-medium">{formatPKR(c.totalCost)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("font-bold", profit >= 0 ? "text-green-600" : "text-orange-600")}>
                          {formatPKR(profit)}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", profit >= 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                          {margin}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCosting(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Costing"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Costing"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCostings.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">No route costings found. Click "Add Route Cost" to evaluate a transporter's rate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <RouteCostingModal
          costingToEdit={selectedCosting}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCosting(null);
          }}
          profile={profile}
        />
      )}
    </div>
  );
};

export default CostingView;
