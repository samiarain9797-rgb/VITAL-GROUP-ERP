import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Fuel, MapPin, Truck, FileSpreadsheet, X, Wand2, Edit2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import SearchableSelect from './SearchableSelect';

const FreightRatesView = ({ profile, users = [], PAKISTAN_LOCATIONS = {} }) => {
  const [activeTab, setActiveTab] = useState('rates'); // 'rates' or 'fuel'
  
  // Fuel State
  const [fuelPrices, setFuelPrices] = useState([]);
  const [newFuelPrice, setNewFuelPrice] = useState({ price: '', effectiveDate: '' });
  
  // Rates State
  const [transporterRates, setTransporterRates] = useState([]);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: null });
  const [errorMsg, setErrorMsg] = useState("");
  const [newRate, setNewRate] = useState({
    transporterName: '',
    origin: '',
    destination: '',
    slabs: [{ minFuel: '', maxFuel: '', baseRate: '', freightRate: '' }]
  });

  // Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genConfig, setGenConfig] = useState({
    rangeStart: 1,
    rangeEnd: 500,
    gap: 5,
    baseFreight: 50000,
    freightIncrease: 1000,
    formulaMode: 'custom', // 'simple' or 'custom'
    customFormula: '((upperLimit / lowerLimit - 1) * baseRate * 0.5) + baseRate'
  });

  const locationOptions = Object.entries(PAKISTAN_LOCATIONS).flatMap(([city, towns]) => [
    city,
    ...towns.map(town => `${town}, ${city}`)
  ]).sort();

  useEffect(() => {
    const unsubFuel = onSnapshot(query(collection(db, 'fuel_prices'), orderBy('effectiveDate', 'desc')), (snapshot) => {
      setFuelPrices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRates = onSnapshot(collection(db, 'transporter_rates'), (snapshot) => {
      setTransporterRates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubFuel();
      unsubRates();
    };
  }, []);

  const handleAddFuelPrice = async () => {
    if (!newFuelPrice.price || !newFuelPrice.effectiveDate) {
      setErrorMsg("Please fill all fields");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }
    try {
      await addDoc(collection(db, 'fuel_prices'), {
        price: parseFloat(newFuelPrice.price),
        effectiveDate: newFuelPrice.effectiveDate,
        createdAt: serverTimestamp(),
        createdBy: profile?.uid
      });
      setNewFuelPrice({ price: '', effectiveDate: '' });
    } catch (error) {
      console.error("Error adding fuel price:", error);
      setErrorMsg("Failed to add fuel price");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleDeleteFuelPrice = (id) => {
    setDeleteModal({ isOpen: true, id, type: 'fuel' });
  };

  const executeDelete = async () => {
    try {
      if (deleteModal.type === 'fuel') {
        await deleteDoc(doc(db, 'fuel_prices', deleteModal.id));
      } else if (deleteModal.type === 'rate') {
        await deleteDoc(doc(db, 'transporter_rates', deleteModal.id));
      }
      setDeleteModal({ isOpen: false, id: null, type: null });
    } catch (error) {
      console.error("Error deleting record:", error);
      setErrorMsg("Failed to delete record");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleAddSlab = () => {
    setNewRate(prev => ({
      ...prev,
      slabs: [...prev.slabs, { minFuel: '', maxFuel: '', baseRate: '', freightRate: '' }]
    }));
  };

  const handleRemoveSlab = (index) => {
    setNewRate(prev => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== index)
    }));
  };

  const handleSlabChange = (index, field, value) => {
    const updatedSlabs = [...newRate.slabs];
    updatedSlabs[index][field] = value;

    // Auto-cascade logic (Goal Seek for backward & forward recalculation)
    if (field === 'baseRate' || field === 'freightRate') {
      const targetValue = parseFloat(value);
      
      if (!isNaN(targetValue) && value !== '') {
        // GOAL SEEK: Find the initialBaseRate (Slab 0 baseRate) that results in this targetValue at this index/field
        let low = 0;
        let high = 10000000; // 10 million PKR max
        let bestInitial = Number(genConfig.baseFreight);
        
        if (index === 0 && field === 'baseRate') {
          bestInitial = targetValue;
        } else if (index === 0 && field === 'freightRate') {
          bestInitial = targetValue;
        } else {
          // Binary search to find the perfect starting rate
          for (let iter = 0; iter < 40; iter++) {
            let mid = (low + high) / 2;
            let currentFreight = mid;
            let simulatedValue = 0;
            
            for (let j = 0; j <= index; j++) {
              let currentBase = (j === 0) ? mid : currentFreight;
              
              if (j > 0) {
                let calcFreight = 0;
                if (genConfig.formulaMode === 'custom') {
                  try {
                    const calc = new Function('lowerLimit', 'upperLimit', 'baseRate', 'initialBaseRate', `return ${genConfig.customFormula}`);
                    calcFreight = calc(Number(updatedSlabs[j].minFuel), Number(updatedSlabs[j].maxFuel), currentBase, mid);
                  } catch (e) {
                    calcFreight = currentBase;
                  }
                } else {
                  calcFreight = currentBase + Number(genConfig.freightIncrease);
                }
                currentFreight = calcFreight;
              }
              
              if (j === index) {
                simulatedValue = (field === 'baseRate') ? currentBase : currentFreight;
              }
            }
            
            if (simulatedValue < targetValue) {
              low = mid;
            } else {
              high = mid;
            }
            bestInitial = mid;
          }
        }

        // Now that we have the bestInitial, cascade FORWARD from index 0 to the end!
        let currentFreight = bestInitial;
        for (let i = 0; i < updatedSlabs.length; i++) {
          let currentBase = (i === 0) ? bestInitial : currentFreight;
          updatedSlabs[i].baseRate = Math.round(currentBase);
          
          if (i === 0) {
            updatedSlabs[i].freightRate = Math.round(currentBase);
            currentFreight = currentBase;
          } else {
            let calcFreight = 0;
            if (genConfig.formulaMode === 'custom') {
              try {
                const calc = new Function('lowerLimit', 'upperLimit', 'baseRate', 'initialBaseRate', `return ${genConfig.customFormula}`);
                calcFreight = calc(Number(updatedSlabs[i].minFuel), Number(updatedSlabs[i].maxFuel), currentBase, bestInitial);
              } catch (e) {
                calcFreight = currentBase;
              }
            } else {
              calcFreight = currentBase + Number(genConfig.freightIncrease);
            }
            updatedSlabs[i].freightRate = Math.round(calcFreight);
            currentFreight = calcFreight;
          }
        }
      }
    }

    setNewRate(prev => ({ ...prev, slabs: updatedSlabs }));
  };

  const generateSlabs = () => {
    const slabs = [];
    let currentMin = Number(genConfig.rangeStart);
    const end = Number(genConfig.rangeEnd);
    const gap = Number(genConfig.gap);
    let currentFreight = Number(genConfig.baseFreight);
    const freightIncrease = Number(genConfig.freightIncrease);
    let previousRate = Number(genConfig.baseFreight);

    if (gap <= 0) return alert("Gap must be greater than 0");
    if (currentMin >= end) return alert("Range End must be greater than Range Start");

    let isFirstSlab = true;

    while (currentMin <= end) {
      let currentMax = currentMin + gap - 1;
      let calculatedFreight = 0;

      if (genConfig.formulaMode === 'custom') {
        if (isFirstSlab) {
          calculatedFreight = Number(genConfig.baseFreight);
        } else {
          try {
            // Evaluate using the variables requested by the user
            // We pass previousRate as 'baseRate' so it compounds exactly as requested
            const calc = new Function('lowerLimit', 'upperLimit', 'baseRate', 'initialBaseRate', `return ${genConfig.customFormula}`);
            calculatedFreight = calc(currentMin, currentMax, previousRate, Number(genConfig.baseFreight));
          } catch (e) {
            alert("Invalid formula! Please check your math syntax.");
            return;
          }
        }
      } else {
        calculatedFreight = currentFreight;
        currentFreight += freightIncrease;
      }
      
      slabs.push({
        minFuel: currentMin,
        maxFuel: currentMax,
        baseRate: Math.round(previousRate),
        freightRate: Math.round(calculatedFreight)
      });

      previousRate = calculatedFreight;
      currentMin += gap;
      isFirstSlab = false;
    }
    
    setNewRate(prev => ({ ...prev, slabs }));
    setShowGenerator(false);
  };

  const handleSaveRateSheet = async () => {
    if (!newRate.transporterName || !newRate.origin || !newRate.destination) {
      return alert("Please fill Transporter, Origin, and Destination");
    }
    
    // Validate slabs
    const validSlabs = newRate.slabs.filter(s => s.minFuel !== '' && s.maxFuel !== '' && s.freightRate !== '');
    if (validSlabs.length === 0) {
      return alert("Please add at least one valid rate slab");
    }

    try {
      const rateData = {
        transporterName: newRate.transporterName,
        origin: newRate.origin,
        destination: newRate.destination,
        slabs: validSlabs.map(s => ({
          minFuel: parseFloat(s.minFuel),
          maxFuel: parseFloat(s.maxFuel),
          baseRate: parseFloat(s.baseRate || s.freightRate), // Fallback to freightRate if empty
          freightRate: parseFloat(s.freightRate)
        })),
        updatedAt: serverTimestamp(),
      };

      if (editingRateId) {
        await updateDoc(doc(db, 'transporter_rates', editingRateId), rateData);
      } else {
        rateData.createdAt = serverTimestamp();
        rateData.createdBy = profile?.uid;
        await addDoc(collection(db, 'transporter_rates'), rateData);
      }
      
      setIsAddingRate(false);
      setEditingRateId(null);
      setNewRate({
        transporterName: '',
        origin: '',
        destination: '',
        slabs: [{ minFuel: '', maxFuel: '', baseRate: '', freightRate: '' }]
      });
    } catch (error) {
      console.error("Error saving rate sheet:", error);
      alert("Failed to save rate sheet");
    }
  };

  const handleEditRateSheet = (rate) => {
    setNewRate({
      transporterName: rate.transporterName,
      origin: rate.origin,
      destination: rate.destination,
      slabs: rate.slabs.map(s => ({
        minFuel: s.minFuel,
        maxFuel: s.maxFuel,
        baseRate: s.baseRate,
        freightRate: s.freightRate
      }))
    });
    setEditingRateId(rate.id);
    setIsAddingRate(true);
  };

  const handleCancelEdit = () => {
    setIsAddingRate(false);
    setEditingRateId(null);
    setNewRate({
      transporterName: '',
      origin: '',
      destination: '',
      slabs: [{ minFuel: '', maxFuel: '', baseRate: '', freightRate: '' }]
    });
  };

  const handleDeleteRateSheet = (id) => {
    setDeleteModal({ isOpen: true, id, type: 'rate' });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Freight Rate Engine</h2>
          <p className="text-zinc-500 text-sm">Manage automated rate sheets based on PSO fuel slabs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('rates')}
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'rates' ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          <FileSpreadsheet size={16} /> Transporter Rate Sheets
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'fuel' ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Fuel size={16} /> PSO Fuel Price Log
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Confirm Delete</h3>
            <p className="text-zinc-600 mb-6 text-sm">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, id: null, type: null })} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm h-fit">
            <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Add New PSO Rate
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={newFuelPrice.effectiveDate}
                  onChange={(e) => setNewFuelPrice({ ...newFuelPrice, effectiveDate: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Diesel Price (PKR/Ltr)</label>
                <input
                  type="number"
                  value={newFuelPrice.price}
                  onChange={(e) => setNewFuelPrice({ ...newFuelPrice, price: e.target.value })}
                  placeholder="e.g., 257.50"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleAddFuelPrice}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Save Fuel Price
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Effective Date</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500">PSO Diesel Rate</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {fuelPrices.map((fp) => (
                  <tr key={fp.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-sm text-zinc-900">{new Date(fp.effectiveDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-blue-700 font-bold">PKR {fp.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteFuelPrice(fp.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {fuelPrices.length === 0 && (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-zinc-500 text-sm">No fuel prices logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="space-y-6">
          {!isAddingRate ? (
            <button
              onClick={() => {
                setEditingRateId(null);
                setNewRate({
                  transporterName: '',
                  origin: '',
                  destination: '',
                  slabs: [{ minFuel: '', maxFuel: '', baseRate: '', freightRate: '' }]
                });
                setIsAddingRate(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} /> Create New Rate Sheet
            </button>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-zinc-900 text-lg">{editingRateId ? 'Edit Rate Sheet' : 'Rate Sheet Builder'}</h3>
                <button onClick={handleCancelEdit} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5"><Truck size={14}/> Transporter</label>
                  <select 
                    value={newRate.transporterName} 
                    onChange={e => setNewRate({...newRate, transporterName: e.target.value})} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Transporter</option>
                    {users.filter(u => u.role === 'transporter').map(u => (
                      <option key={u.uid} value={u.displayName}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5"><MapPin size={14}/> Loading Point (Origin)</label>
                  <SearchableSelect 
                    options={locationOptions}
                    value={newRate.origin} 
                    onChange={val => setNewRate({...newRate, origin: val})} 
                    placeholder="Select Origin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5"><MapPin size={14}/> Unloading Point (Destination)</label>
                  <SearchableSelect 
                    options={locationOptions}
                    value={newRate.destination} 
                    onChange={val => setNewRate({...newRate, destination: val})} 
                    placeholder="Select Destination"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-2"><Fuel size={14} className="text-orange-500"/> Fuel Slabs & Formulas</h4>
                  <button 
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg"
                  >
                    <Wand2 size={14}/> Auto-Generate Slabs
                  </button>
                </div>

                {showGenerator && (
                  <div className="bg-white border border-purple-200 rounded-lg p-4 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Slab Generator Settings</h5>
                      <div className="flex bg-zinc-100 rounded-lg p-0.5">
                        <button 
                          onClick={() => setGenConfig({...genConfig, formulaMode: 'simple'})}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-colors", genConfig.formulaMode === 'simple' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
                        >
                          Simple
                        </button>
                        <button 
                          onClick={() => setGenConfig({...genConfig, formulaMode: 'custom'})}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-colors", genConfig.formulaMode === 'custom' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
                        >
                          Custom Formula
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">PSO Start</label>
                        <input type="number" value={genConfig.rangeStart} onChange={e => setGenConfig({...genConfig, rangeStart: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">PSO End</label>
                        <input type="number" value={genConfig.rangeEnd} onChange={e => setGenConfig({...genConfig, rangeEnd: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">PSO Gap</label>
                        <input type="number" value={genConfig.gap} onChange={e => setGenConfig({...genConfig, gap: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]" />
                      </div>
                    </div>

                    {genConfig.formulaMode === 'simple' ? (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-500 mb-1">Base Freight (at Start)</label>
                          <input type="number" value={genConfig.baseFreight} onChange={e => setGenConfig({...genConfig, baseFreight: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-500 mb-1">+ Freight Increase per Gap</label>
                          <input type="number" value={genConfig.freightIncrease} onChange={e => setGenConfig({...genConfig, freightIncrease: e.target.value})} className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]" />
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">Custom Math Formula</label>
                        <input 
                          type="text" 
                          value={genConfig.customFormula} 
                          onChange={e => setGenConfig({...genConfig, customFormula: e.target.value})} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none" 
                        />
                        <p className="text-[10px] text-zinc-500 mt-2">
                          Available variables: <code className="bg-zinc-100 px-1 rounded text-purple-600">lowerLimit</code>, <code className="bg-zinc-100 px-1 rounded text-purple-600">upperLimit</code>, <code className="bg-zinc-100 px-1 rounded text-purple-600">baseRate</code> (uses previous slab's rate), <code className="bg-zinc-100 px-1 rounded text-purple-600">initialBaseRate</code> (the very first rate)
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button onClick={generateSlabs} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center gap-1 shadow-sm">
                        <Wand2 size={14}/> Generate Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {newRate.slabs.map((slab, index) => (
                    <div key={index} className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Min PSO Price</label>
                        <input type="number" value={slab.minFuel} onChange={e => handleSlabChange(index, 'minFuel', e.target.value)} placeholder="250" className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(59,130,246)]" />
                      </div>
                      <div className="pb-2 text-zinc-400 font-bold">to</div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Max PSO Price</label>
                        <input type="number" value={slab.maxFuel} onChange={e => handleSlabChange(index, 'maxFuel', e.target.value)} placeholder="255" className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(59,130,246)]" />
                      </div>
                      <div className="pb-2 text-zinc-400 font-bold">=</div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Base Rate</label>
                        <input type="number" value={slab.baseRate} onChange={e => handleSlabChange(index, 'baseRate', e.target.value)} placeholder="50000" className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(59,130,246)]" />
                      </div>
                      <div className="pb-2 text-zinc-400 font-bold">→</div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Freight Rate</label>
                        <input type="number" value={slab.freightRate} onChange={e => handleSlabChange(index, 'freightRate', e.target.value)} placeholder="150000" className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(59,130,246)]" />
                      </div>
                      <button onClick={() => handleRemoveSlab(index)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg mb-0.5"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={handleAddSlab} className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus size={14}/> Add Another Slab</button>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                <button onClick={handleSaveRateSheet} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16}/> {editingRateId ? 'Update Rate Sheet' : 'Save Rate Sheet'}</button>
              </div>
            </div>
          )}

          {/* Existing Rate Sheets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {transporterRates.map(rate => (
              <div key={rate.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900 flex items-center gap-1.5"><Truck size={16} className="text-blue-600"/> {rate.transporterName}</h3>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {rate.origin} → {rate.destination}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditRateSheet(rate)} className="text-zinc-400 hover:text-blue-600"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeleteRateSheet(rate.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="p-4 flex-1 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-400 font-mono uppercase tracking-wider border-b border-zinc-100">
                        <th className="pb-2">PSO Range</th>
                        <th className="pb-2 text-right">Base Rate</th>
                        <th className="pb-2 text-right">Freight Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {rate.slabs.map((slab, i) => (
                        <tr key={i}>
                          <td className="py-2 text-zinc-600">{slab.minFuel} - {slab.maxFuel} PKR</td>
                          <td className="py-2 text-right text-zinc-500">{slab.baseRate ? slab.baseRate.toLocaleString() : '-'} PKR</td>
                          <td className="py-2 text-right font-bold text-zinc-900">{slab.freightRate.toLocaleString()} PKR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {transporterRates.length === 0 && !isAddingRate && (
            <div className="text-center py-12 bg-white border border-zinc-200 rounded-xl border-dashed">
              <FileSpreadsheet size={48} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 font-medium">No rate sheets created yet.</p>
              <p className="text-zinc-400 text-sm mt-1">Build your first rate sheet to automate freight calculations.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FreightRatesView;
