import React from 'react';
import { Property } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { 
  Home, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  ArrowRight,
  User,
  Info,
  Calendar,
  LayoutGrid
} from 'lucide-react';
import { motion } from 'motion/react';

interface EvaluationDashboardProps {
  property: Property;
}

export default function EvaluationDashboard({ property }: EvaluationDashboardProps) {
  const { specs, financials, address } = property;
  const pricePerM2 = financials.purchasePrice / specs.floorSize;
  const rentVsValue = (financials.income * 12 / financials.purchasePrice * 100);
  const monthlyBond = (financials.bondAmount * (financials.interestRate / 100 / 12)) / (1 - Math.pow(1 + (financials.interestRate / 100 / 12), -financials.termYears * 12));
  const cashFlowValue = financials.income - financials.expenses;

  return (
    <div className="bg-white p-6 h-full overflow-y-auto custom-scrollbar">
      {/* Header Tabs Navigation */}
      <div className="flex items-center gap-8 border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
        {['Summary', 'Financial Matrix', 'Time Projection', 'Property Specs'].map((tab, idx) => (
          <button 
            key={tab} 
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${idx === 0 ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
            {idx === 0 && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Left Column: Summary Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative z-10">
              <Home className="w-7 h-7 text-blue-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                {specs.bedrooms} BED • {specs.bathrooms} BATH
              </p>
              <h2 className="text-2xl font-bold text-slate-800 leading-none">{specs.titleType} {property.type}</h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">Measurement: {specs.floorSize} m² {specs.floor ? `| Level: ${specs.floor}` : ''}</p>
            </div>
            <div className="ml-auto flex flex-col items-end relative z-10">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">GRADE A+</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Active Listing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-2">
            {/* Purchase & Market */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 bg-blue-600 h-4 rounded-full" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entry Valuation</h4>
                </div>
                <div>
                   <p className="text-2xl font-black text-slate-900">{formatCurrency(financials.purchasePrice)}</p>
                   <div className="flex flex-wrap gap-4 mt-2">
                      <span className="text-xs font-semibold text-slate-500">Value: {formatCurrency(financials.marketValue)}</span>
                      <span className="text-xs font-bold text-green-600">+{financials.expectedGrowth}% YOY</span>
                   </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-1 bg-slate-400 h-4 rounded-full" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leverage Specs</h4>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Bond Principal</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(financials.bondAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Yield (APR)</p>
                    <p className="text-sm font-bold text-slate-800">{financials.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Monthly DSR</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(Math.round(monthlyBond))}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Capital Commit</p>
                    <p className="text-sm font-bold text-slate-800 group relative">
                      {formatCurrency(financials.deposit)}
                      <Info className="w-3 h-3 inline ml-1 text-slate-300 cursor-help" />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price/m2 & Cashflow */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 bg-blue-600 h-4 rounded-full" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efficiency Matrix</h4>
                </div>
                <div>
                   <p className="text-2xl font-black text-slate-900">{formatCurrency(Math.round(pricePerM2))}/m²</p>
                   <p className="text-xs font-bold text-slate-500 mt-2 italic flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Rent Yield Ratio: {rentVsValue.toFixed(1)} %
                   </p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-1 bg-green-500 h-4 rounded-full" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cashflow Terminal</h4>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="col-span-2 p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Net Monthly Velocity</p>
                      <p className="text-lg font-black text-slate-900 italic">{formatCurrency(cashFlowValue)}</p>
                    </div>
                    <div className={cn("p-2 rounded-lg", cashFlowValue > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Gross OpEx</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(financials.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Gross Rev</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(financials.income)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
               <TrendingUp className="w-20 h-20 text-slate-900" />
            </div>
            <ol className="space-y-3 text-sm text-slate-600 relative z-10">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>View property's projected cash flow, growth, and returns projections:</span>
              </li>
              <li className="ml-6 flex gap-4 text-blue-600 font-medium">
                <button className="flex items-center gap-1 hover:underline">
                  <Calendar className="w-3 h-3" /> View yearly snapshots
                </button>
                <button className="flex items-center gap-1 hover:underline">
                  <ArrowRight className="w-3 h-3" /> View timeline
                </button>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Compare this buy with <span className="text-blue-600 font-medium cursor-pointer hover:underline">your current portfolio</span>.</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Address and Small View */}
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:blur-3xl transition-all" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Physical Address</p>
                <h3 className="text-xl font-bold leading-tight">{property.name}</h3>
                <p className="text-sm text-slate-300 mt-2">{address.street}, {address.suburb}</p>
                <p className="text-sm text-slate-300">{address.city}, {address.country}</p>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </div>
            <button className="mt-8 flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors group">
              MANAGE ADDRESS <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-900">PROPERTY SPECS</span>
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase">Expand</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
               {[
                 { label: 'Bedrooms', value: specs.bedrooms },
                 { label: 'Bathrooms', value: specs.bathrooms },
                 { label: 'Garages', value: specs.garages },
                 { label: 'Carports', value: specs.carports },
                 { label: 'Floor Size', value: `${specs.floorSize} m²` },
                 { label: 'Stand Size', value: `${specs.standSize || 'N/A'} m²` }
               ].map(spec => (
                 <div key={spec.label}>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{spec.label}</p>
                   <p className="text-sm font-bold text-slate-700 italic">{spec.value}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
