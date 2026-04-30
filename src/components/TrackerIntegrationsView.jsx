import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Plus, Save, Trash2, Crosshair, HelpCircle, Activity } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const TrackerIntegrationsView = () => {
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const docRef = doc(db, 'settings', 'trackerIntegrations');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIntegrations(docSnap.data().list || []);
        }
      } catch (err) {
        console.error("Error fetching tracker integrations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  const handleSave = async (updatedList) => {
    try {
      await setDoc(doc(db, 'settings', 'trackerIntegrations'), { list: updatedList });
      setIntegrations(updatedList);
    } catch (err) {
      console.error("Error saving integrations:", err);
      alert("Failed to save tracker integrations.");
    }
  };

  const addIntegration = () => {
    const newIntegration = {
      id: "trk_" + Date.now(),
      name: "",
      providerName: "",
      apiUrl: "",
      method: "GET",
      apiKey: "",
      apiKeyHeaderName: "Authorization",
      vehicleParamName: "vehicle_no",
      latField: "latitude",
      lngField: "longitude",
      textField: "location",
      isJSON: true
    };
    setIntegrations([...integrations, newIntegration]);
  };

  const updateIntegration = (index, field, value) => {
    const newList = [...integrations];
    newList[index][field] = value;
    setIntegrations(newList);
  };

  const removeIntegration = (index) => {
    const newList = integrations.filter((_, i) => i !== index);
    handleSave(newList);
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading configurations...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Crosshair className="text-orange-600" /> Transporter Tracker Integrations
        </h2>
        <p className="text-zinc-500 text-sm mt-1 mb-8">
          Configure API endpoints from different tracking companies to automatically fetch live vehicle locations based on Vehicle Number.
        </p>
      </div>

      <div className="space-y-6">
        {integrations.map((int, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={int.id} 
            className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 shadow-sm relative"
          >
            <button 
              onClick={() => removeIntegration(i)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-red-600 transition-colors bg-white p-1 rounded-md shadow-sm"
            >
              <Trash2 size={16} />
            </button>
            <h3 className="font-bold text-zinc-800 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Integration Setup
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-500 mb-1">Tracker Company Name</label>
                <input
                  type="text"
                  value={int.name}
                  onChange={(e) => updateIntegration(i, 'name', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g., Trakker PK"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-500 mb-1 flex items-center gap-1">Assign to Transporter <HelpCircle size={12}/></label>
                <input
                  type="text"
                  value={int.providerName}
                  onChange={(e) => updateIntegration(i, 'providerName', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g., National Logistics Cell"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">API Endpoint URL</label>
                <input
                  type="text"
                  value={int.apiUrl}
                  onChange={(e) => updateIntegration(i, 'apiUrl', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all font-mono"
                  placeholder="https://api.trackercompany.com/v1/location"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">HTTP Method</label>
                <select 
                  value={int.method}
                  onChange={(e) => updateIntegration(i, 'method', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">API Key Header Name</label>
                <input
                  type="text"
                  value={int.apiKeyHeaderName}
                  onChange={(e) => updateIntegration(i, 'apiKeyHeaderName', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm font-mono focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all"
                  placeholder="Authorization"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-500 mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={int.apiKey}
                  onChange={(e) => updateIntegration(i, 'apiKey', e.target.value)}
                  className="w-full bg-white border-2 border-zinc-300 shadow-[0_4px_0_0_#e4e4e7] rounded-lg px-3 py-2 text-sm font-mono focus:shadow-[0_0px_0_0_#e4e4e7] focus:translate-y-1 focus:border-blue-500 outline-none transition-all"
                  placeholder="Bearer xyz123..."
                />
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-3">Response Mapping</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">Vehicle Param/Field</label>
                  <input
                    type="text"
                    value={int.vehicleParamName}
                    onChange={(e) => updateIntegration(i, 'vehicleParamName', e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-300 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none transition-all"
                    placeholder="plate_no"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">Latitude Key</label>
                  <input
                    type="text"
                    value={int.latField}
                    onChange={(e) => updateIntegration(i, 'latField', e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-300 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none transition-all"
                    placeholder="data.lat"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">Longitude Key</label>
                  <input
                    type="text"
                    value={int.lngField}
                    onChange={(e) => updateIntegration(i, 'lngField', e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-300 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none transition-all"
                    placeholder="data.lng"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">Address Key</label>
                  <input
                    type="text"
                    value={int.textField}
                    onChange={(e) => updateIntegration(i, 'textField', e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-300 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none transition-all"
                    placeholder="data.address"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => handleSave(integrations)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-[0_2px_0_rgb(29,78,216)] hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgb(29,78,216)] active:translate-y-0 active:shadow-[0_0_0_rgb(29,78,216)]"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </motion.div>
        ))}

        <button 
          onClick={addIntegration}
          className="w-full py-8 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500 font-medium hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex flex-col items-center justify-center gap-2 bg-white"
        >
          <Plus size={24} />
          Register New Tracker Integraton
        </button>
      </div>
    </div>
  );
};

export default TrackerIntegrationsView;
