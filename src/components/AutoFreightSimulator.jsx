import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Package, MapPin, Truck, Fuel, DollarSign, Calculator, 
  ArrowRight, CheckCircle2, Info, ArrowDown, ChevronRight,
  TrendingDown, TrendingUp
} from 'lucide-react';

const AutoFreightSimulator = () => {
  // --- Form State ---
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [actualWeight, setActualWeight] = useState(5); // kg
  const [originZone, setOriginZone] = useState('Zone 1 (Local)');
  const [destZone, setDestZone] = useState('Zone 3 (Regional)');
  const [serviceTier, setServiceTier] = useState('Standard (5-7 Days)');
  const [fuelPrice, setFuelPrice] = useState(250); // PKR per liter

  // --- Constants / Mock DB ---
  const VOLUMETRIC_DIVISOR = 5000; // standard cm3/kg divisor
  
  const ZONE_MULTIPLIERS = {
    'Zone 1 (Local)': 1.0,
    'Zone 2 (Adjacent)': 1.5,
    'Zone 3 (Regional)': 2.2,
    'Zone 4 (National)': 3.5,
    'Zone 5 (Remote)': 5.0,
  };

  const SERVICE_MULTIPLIERS = {
    'Standard (5-7 Days)': 1.0,
    'Expedited (2-3 Days)': 1.4,
    'Overnight (Next Day)': 2.2,
  };

  const BASE_RATE = 1500; // PKR base handling fee

  // --- Calculations ---
  // Step 1: Dimensional Weight
  const volumeCm3 = length * width * height;
  const dimensionalWeight = volumeCm3 / VOLUMETRIC_DIVISOR;
  const billableWeight = Math.max(actualWeight, dimensionalWeight);

  // Step 2: Distance/Zone cost
  const originMulti = ZONE_MULTIPLIERS[originZone];
  const destMulti = ZONE_MULTIPLIERS[destZone];
  const distanceMulti = Math.abs((Object.keys(ZONE_MULTIPLIERS).indexOf(destZone)) - (Object.keys(ZONE_MULTIPLIERS).indexOf(originZone))) + 1;
  const distanceCost = billableWeight * 100 * distanceMulti;

  // Step 3: Base Freight (Base Handling + Distance Cost)
  const baseFreightCost = BASE_RATE + distanceCost;

  // Step 4: Service Level Add-on
  const serviceMultiplier = SERVICE_MULTIPLIERS[serviceTier];
  const serviceSurcharge = (baseFreightCost * serviceMultiplier) - baseFreightCost;

  // Step 5: Fuel Surcharge (Changes dynamically with fuel price)
  // Let's say if Fuel > 200, an extra 1% surcharge applies per 10 PKR over 200.
  const fuelThreshold = 200;
  let fuelSurchargePercent = 0;
  if (fuelPrice > fuelThreshold) {
    fuelSurchargePercent = Math.floor((fuelPrice - fuelThreshold) / 10) * 1; // 1% per 10 PKR
  }
  const preFuelTotal = baseFreightCost + serviceSurcharge;
  const fuelSurchargeAmount = preFuelTotal * (fuelSurchargePercent / 100);

  // Step 6: Final Total
  const totalFreightCost = preFuelTotal + fuelSurchargeAmount;

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-20">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 border-b pb-4">Auto Freight Calculation Simulator</h2>
        <p className="text-zinc-500 text-sm mt-2">See exactly step-by-step how the system calculates the final freight rate.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column: Input Form */}
        <div className="w-full xl:w-1/3 bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
            <Calculator className="text-blue-600" size={20} />
            <h3 className="font-bold text-zinc-800">Shipment Parameters</h3>
          </div>

          {/* Dimensions & Weight */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">1. Package Details</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Length (cm)</label>
                <input type="number" min="1" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Width (cm)</label>
                <input type="number" min="1" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Height (cm)</label>
                <input type="number" min="1" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">Actual Weight (KG)</label>
              <input type="number" min="0.1" step="0.1" value={actualWeight} onChange={e => setActualWeight(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Routing */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">2. Routing</h4>
            
            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">Origin Zone</label>
              <select value={originZone} onChange={e => setOriginZone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                {Object.keys(ZONE_MULTIPLIERS).map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">Destination Zone</label>
              <select value={destZone} onChange={e => setDestZone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                {Object.keys(ZONE_MULTIPLIERS).map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>

          {/* Service & Fuel */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">3. Variables</h4>
            
            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">Service Level</label>
              <select value={serviceTier} onChange={e => setServiceTier(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                {Object.keys(SERVICE_MULTIPLIERS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">Current PSO Diesel Rate (PKR/Ltr)</label>
              <input type="number" min="150" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-orange-600 font-bold" />
            </div>
          </div>
          
        </div>

        {/* Right Column: Step-by-Step Breakdown */}
        <div className="w-full xl:w-2/3 space-y-4">
          <div className="bg-zinc-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Calculator size={120} />
            </div>
            <h3 className="text-xl font-bold mb-1">Auto-Calculation Engine Engine</h3>
            <p className="text-zinc-400 text-sm mb-6">Real-time simulation of the cost computation process.</p>
            
            <div className="space-y-4">
              
              {/* Step 1 */}
              <motion.div layout className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm">S1</div>
                    <div>
                      <h4 className="font-bold">Determine Billable Weight</h4>
                      <p className="text-xs text-zinc-400">Comparing actual vs volumetric weight (L*W*H / {VOLUMETRIC_DIVISOR})</p>
                    </div>
                  </div>
                  <Package className="text-zinc-600" size={24} />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-zinc-900/50 rounded-lg p-3">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Actual Wt</span>
                    <span className="font-mono">{actualWeight.toFixed(2)} kg</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Volume</span>
                    <span className="font-mono">{volumeCm3.toLocaleString()} cm³</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Volumetric Wt</span>
                    <span className="font-mono">{dimensionalWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="bg-blue-600/20 text-blue-300 rounded px-2 py-1 border border-blue-500/30">
                    <span className="block text-[10px] uppercase opacity-70">Billable Wt (Max)</span>
                    <span className="font-bold font-mono">{billableWeight.toFixed(2)} kg</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div layout className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/20 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm">S2</div>
                    <div>
                      <h4 className="font-bold">Base Distance Freight</h4>
                      <p className="text-xs text-zinc-400">Base handling (PKR {BASE_RATE}) + Distance Surcharge based on origin/destination pairs</p>
                    </div>
                  </div>
                  <MapPin className="text-zinc-600" size={24} />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm bg-zinc-900/50 rounded-lg p-3 items-center">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Route</span>
                    <span className="text-xs truncate block">{originZone.split(' ')[0]} → {destZone.split(' ')[0]}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Distance Multiplier</span>
                    <span className="font-mono">x{distanceMulti}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Billable * Multiplier</span>
                    <span className="font-mono">{(billableWeight * distanceMulti * 100).toLocaleString()} PKR</span>
                  </div>
                  <div className="bg-indigo-600/20 text-indigo-300 rounded px-2 py-1 border border-indigo-500/30 text-right">
                    <span className="block text-[10px] uppercase opacity-70">+ Base Fee</span>
                    <span className="font-bold font-mono">PKR {baseFreightCost.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div layout className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 text-emerald-400 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm">S3</div>
                    <div>
                      <h4 className="font-bold">Service Level Modifier</h4>
                      <p className="text-xs text-zinc-400">Time-definite constraints & delivery urgency</p>
                    </div>
                  </div>
                  <Truck className="text-zinc-600" size={24} />
                </div>
                
                <div className="flex justify-between items-center bg-zinc-900/50 rounded-lg p-3">
                  <div>
                    <span className="block text-zinc-300 text-sm">{serviceTier}</span>
                    <span className="text-emerald-400 font-mono text-xs">Multiplier: x{serviceMultiplier.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-zinc-500">Service Add-on Surcharge</span>
                    <span className="font-bold font-mono text-emerald-400">
                      + PKR {Math.round(serviceSurcharge).toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Step 4 */}
              <motion.div layout className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 text-orange-400 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm">S4</div>
                    <div>
                      <h4 className="font-bold">PSO Fuel Variable Index (FVI)</h4>
                      <p className="text-xs text-zinc-400">Dynamic surcharge applied when diesel exceeds PKR {fuelThreshold}/Ltr</p>
                    </div>
                  </div>
                  <Fuel className="text-zinc-600" size={24} />
                </div>

                <div className="flex justify-between items-center bg-zinc-900/50 rounded-lg p-3">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Current Rate</span>
                      <span className="font-mono text-orange-400">{fuelPrice} PKR</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Applied Surcharge %</span>
                      <span className="font-mono text-orange-400">{fuelSurchargePercent}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-zinc-500">Fuel Surcharge Amount</span>
                    <span className="font-bold font-mono text-orange-400">
                      + PKR {Math.round(fuelSurchargeAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Final Step */}
              <div className="mt-6 border-t border-zinc-700 pt-6">
                <div className="flex justify-between items-end bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-xl border border-blue-500/30">
                  <div>
                    <span className="text-blue-300 text-xs font-bold uppercase tracking-wider block mb-1">System Computed Total Cost</span>
                    <span className="text-zinc-300 text-sm">Excluding taxes & custom duties</span>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-bold font-mono text-white tracking-tight">
                      <span className="text-blue-400 text-2xl mr-2 font-sans">PKR</span>
                      {Math.round(totalFreightCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoFreightSimulator;
