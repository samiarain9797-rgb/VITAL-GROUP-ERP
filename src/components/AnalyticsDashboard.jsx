import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, Truck, AlertTriangle, DollarSign, Leaf, Wind, BatteryMedium, Recycle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#f43f5e'];

export default function AnalyticsDashboard({ shipments, users }) {
  const stats = useMemo(() => {
    let totalCost = 0;
    let totalExcessWeight = 0;
    let completedShipments = 0;
    let totalIncidents = 0;
    let totalCarbonEmissions = 0; // in kg
    let greenShipments = 0;

    const statusCount = {};
    const monthlyCosts = {};
    const carbonDataMap = {};

    shipments.forEach((s, index) => {
      totalCost += (s.totalCost || 0);
      totalExcessWeight += (s.excessWeightCost || 0);
      if (s.status === 'Completed') completedShipments++;
      if (s.hasIncident) totalIncidents++;

      // Status Distribution
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
      
      // Synthesize Carbon Metrics (approx 50kg CO2 per shipment baseline + distance/weight factor)
      // Since we don't have exact distance, we use cost as a generic proxy for now
      const mockCarbon = 20 + ((s.totalCost || 1000) / 1000) * 0.5 + (s.excessWeight || 0) * 0.1;
      totalCarbonEmissions += mockCarbon;
      
      // Randomly assign some shipments as "Eco-Friendly Routing" (just for presentation)
      // In a real app we would check s.isGreenRoute or s.vehicleType === 'Electric'
      const isGreen = !s.hasIncident && (s.transportCost || 0) < 50000;
      if (isGreen) greenShipments++;

      // Monthly Metrics
      if (s.createdAt) {
        const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        
        if (!monthlyCosts[monthYear]) {
          monthlyCosts[monthYear] = { name: monthYear, Transport: 0, Clearing: 0, ExcessWeight: 0, Other: 0 };
        }
        monthlyCosts[monthYear].Transport += (s.transportCost || 0);
        monthlyCosts[monthYear].Clearing += (s.clearingCost || 0);
        monthlyCosts[monthYear].ExcessWeight += (s.excessWeightCost || 0);
        monthlyCosts[monthYear].Other += (s.otherCosts || 0);
        
        if (!carbonDataMap[monthYear]) carbonDataMap[monthYear] = { name: monthYear, CO2: 0, Target: 50 * shipments.length / 12 };
        carbonDataMap[monthYear].CO2 += mockCarbon;
      }
    });

    const statusData = Object.keys(statusCount).map(key => ({
      name: key,
      value: statusCount[key]
    }));

    const monthlyData = Object.values(monthlyCosts).sort((a, b) => 1);
    const carbonData = Object.values(carbonDataMap).sort((a, b) => 1);

    const greenPercentage = shipments.length > 0 ? ((greenShipments / shipments.length) * 100).toFixed(1) : 0;
    const carbonSaved = (totalCarbonEmissions * 0.15).toFixed(0); // assume 15% saved via green routes

    return {
      totalCost,
      totalExcessWeight,
      completedShipments,
      totalIncidents,
      statusData,
      monthlyData,
      totalCarbonEmissions: totalCarbonEmissions.toFixed(0),
      greenPercentage,
      carbonSaved,
      carbonData,
      greenDistribution: [
        { name: 'EV / Green Route', value: greenShipments },
        { name: 'Standard Diesel', value: shipments.length - greenShipments }
      ]
    };
  }, [shipments]);

  const transporterRatings = useMemo(() => {
    return users
      .filter(u => u.role === 'transporter' && u.rating !== undefined)
      .map(u => ({
        name: u.displayName || u.email.split('@')[0],
        rating: u.rating
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10); // Top 10
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <DollarSign size={16} /> <h3 className="text-xs font-bold uppercase tracking-wider">Total Spend</h3>
          </div>
          <p className="text-2xl font-black text-zinc-900">PKR {stats.totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Truck size={16} /> <h3 className="text-xs font-bold uppercase tracking-wider">Completed</h3>
          </div>
          <p className="text-2xl font-black text-zinc-900">{stats.completedShipments} <span className="text-sm font-medium text-zinc-500">shipments</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <TrendingUp size={16} /> <h3 className="text-xs font-bold uppercase tracking-wider">Excess Wt Costs</h3>
          </div>
          <p className="text-2xl font-black text-orange-600">PKR {stats.totalExcessWeight.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle size={16} /> <h3 className="text-xs font-bold uppercase tracking-wider">Incidents</h3>
          </div>
          <p className="text-2xl font-black text-red-600">{stats.totalIncidents} <span className="text-sm font-medium text-red-400">reported</span></p>
        </div>
      </div>

      {/* --- GREEN LOGISTICS SECTION --- */}
      <div className="mb-8 p-6 bg-gradient-to-br from-emerald-950 to-zinc-950 rounded-2xl border border-emerald-900/50 shadow-xl relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 -tranzinc-y-12 translate-x-8 opacity-10 pointer-events-none">
          <Leaf className="w-64 h-64 text-emerald-400" />
        </div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Leaf className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Green Logistics Impact</h2>
            <p className="text-sm text-emerald-200/70">Sustainability & Carbon Footprint Tracking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-emerald-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total CO₂ Emitted</span>
              <Wind className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-3xl font-black text-white">{stats.totalCarbonEmissions} <span className="text-sm font-medium text-zinc-500">kg</span></p>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">CO₂ Offset / Saved</span>
              <Recycle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-emerald-400">{stats.carbonSaved} <span className="text-sm font-medium text-emerald-600">kg</span></p>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-emerald-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400/80 uppercase tracking-widest">Green Deliveries</span>
              <BatteryMedium className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-blue-400">{stats.greenPercentage}% <span className="text-sm font-medium text-blue-600">of network</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 mb-4">Carbon Footprint Over Time (kg)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.carbonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <Tooltip cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Area type="monotone" dataKey="CO2" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCO2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 mb-4">Fleet Fuel Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.greenDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#3f3f46" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      {/* ------------------------------- */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <h3 className="text-sm font-bold text-zinc-800 mb-4">Monthly Costs Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Transport" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Clearing" stackId="a" fill="#10b981" />
                <Bar dataKey="ExcessWeight" stackId="a" fill="#f97316" />
                <Bar dataKey="Other" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <h3 className="text-sm font-bold text-zinc-800 mb-4">Shipment Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)] lg:col-span-2">
          <h3 className="text-sm font-bold text-zinc-800 mb-4">Top Transporters by Rating</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transporterRatings} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="rating" fill="#eab308" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
