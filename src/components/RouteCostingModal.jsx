import React, { useState, useEffect } from 'react';
import { X, Calculator, DollarSign, TrendingUp, TrendingDown, Save, MapPin, Truck } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

const RouteCostingModal = ({ costingToEdit, onClose, profile }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [costing, setCosting] = useState({
    transporterName: '',
    destination: '',
    freightRevenue: 0,
    fuelCost: 0,
    tollTaxes: 0,
    khuraki: 0,
    kanta: 0,
    palledari: 0,
    routeExpenses: 0,
    maintenance: 0,
    fixedCosts: 0,
  });

  useEffect(() => {
    if (costingToEdit) {
      setCosting({
        transporterName: costingToEdit.transporterName || '',
        destination: costingToEdit.destination || '',
        freightRevenue: costingToEdit.freightRevenue || 0,
        fuelCost: costingToEdit.fuelCost || 0,
        tollTaxes: costingToEdit.tollTaxes || 0,
        khuraki: costingToEdit.khuraki || 0,
        kanta: costingToEdit.kanta || 0,
        palledari: costingToEdit.palledari || 0,
        routeExpenses: costingToEdit.routeExpenses || 0,
        maintenance: costingToEdit.maintenance || 0,
        fixedCosts: costingToEdit.fixedCosts || 0,
      });
    }
  }, [costingToEdit]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setCosting(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    }));
  };

  const totalCost = 
    costing.fuelCost + 
    costing.tollTaxes + 
    costing.khuraki + 
    costing.kanta + 
    costing.palledari + 
    costing.routeExpenses + 
    costing.maintenance + 
    costing.fixedCosts;

  const netProfit = costing.freightRevenue - totalCost;
  const profitMargin = costing.freightRevenue > 0 ? ((netProfit / costing.freightRevenue) * 100).toFixed(1) : 0;

  const handleSave = async () => {
    if (!costing.transporterName || !costing.destination) {
      alert("Please enter Transporter Name and Destination.");
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...costing,
        totalCost,
        netProfit,
        updatedAt: serverTimestamp()
      };

      if (costingToEdit?.id) {
        await updateDoc(doc(db, "route_costings", costingToEdit.id), dataToSave);
      } else {
        dataToSave.createdAt = serverTimestamp();
        dataToSave.createdBy = profile?.uid;
        await addDoc(collection(db, "route_costings"), dataToSave);
      }
      onClose();
    } catch (error) {
      console.error("Error saving costing:", error);
      alert("Failed to save costing data.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Calculator className="text-orange-600" size={24} />
              {costingToEdit ? "Edit Route Costing" : "New Route Costing"}
            </h3>
            <p className="text-zinc-500 text-sm mt-1">
              Evaluate transporter freight rates and profitability
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Route & Transporter Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
                <Truck size={14} className="text-zinc-400" /> Transporter Name
              </label>
              <input
                type="text"
                name="transporterName"
                value={costing.transporterName}
                onChange={handleChange}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Al-Madina Transport"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-zinc-400" /> Destination / Route
              </label>
              <input
                type="text"
                name="destination"
                value={costing.destination}
                onChange={handleChange}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Karachi to Lahore"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-blue-600 mb-1">Quoted Freight</p>
              <p className="text-2xl font-bold text-blue-900">{formatPKR(costing.freightRevenue)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-red-600 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-red-900">{formatPKR(totalCost)}</p>
            </div>
            <div className={cn("border rounded-xl p-4", netProfit >= 0 ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100")}>
              <p className={cn("text-xs font-mono uppercase tracking-widest mb-1", netProfit >= 0 ? "text-green-600" : "text-orange-600")}>Net Profit</p>
              <div className="flex items-end gap-2">
                <p className={cn("text-2xl font-bold", netProfit >= 0 ? "text-green-900" : "text-orange-900")}>{formatPKR(netProfit)}</p>
                <span className={cn("text-sm font-bold mb-1 flex items-center", netProfit >= 0 ? "text-green-600" : "text-orange-600")}>
                  {netProfit >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-200 pb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-blue-500" /> Revenue
              </h4>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Quoted Freight (PKR)</label>
                <input
                  type="number"
                  name="freightRevenue"
                  value={costing.freightRevenue || ''}
                  onChange={handleChange}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="text-[10px] text-zinc-500 mt-1">The freight rate given by the transporter.</p>
              </div>
            </div>

            {/* Variable Costs Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-200 pb-2 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-500" /> Variable / Trip Costs
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Fuel (Diesel)</label>
                  <input
                    type="number"
                    name="fuelCost"
                    value={costing.fuelCost || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Toll Taxes (M-Tag/NHA)</label>
                  <input
                    type="number"
                    name="tollTaxes"
                    value={costing.tollTaxes || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Khuraki (Driver Allowance)</label>
                  <input
                    type="number"
                    name="khuraki"
                    value={costing.khuraki || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Kanta (Weighbridge)</label>
                  <input
                    type="number"
                    name="kanta"
                    value={costing.kanta || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Palledari (Loading/Unloading)</label>
                  <input
                    type="number"
                    name="palledari"
                    value={costing.palledari || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Route Expenses / Challans</label>
                  <input
                    type="number"
                    name="routeExpenses"
                    value={costing.routeExpenses || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Costs Allocation */}
            <div className="space-y-4 md:col-span-2 mt-4">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-200 pb-2 flex items-center gap-2">
                <Calculator size={16} className="text-purple-500" /> Allocated Fixed Costs (Per Trip)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Maintenance & Tyre Wear</label>
                  <input
                    type="number"
                    name="maintenance"
                    value={costing.maintenance || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Estimated wear & tear for this specific trip length.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Other Fixed Costs (Salary, Insurance, Tracker)</label>
                  <input
                    type="number"
                    name="fixedCosts"
                    value={costing.fixedCosts || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Monthly fixed costs divided by average trips per month.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : <><Save size={16} /> Save Costing</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteCostingModal;
