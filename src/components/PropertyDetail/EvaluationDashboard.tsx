import React, { useState } from 'react';
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
  LayoutGrid,
  Trash2,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EvaluationDashboardProps {
  property: Property;
  onDeleteProperty?: (id: string) => void;
  onUpdateProperty?: (property: Property) => void;
}

export default function EvaluationDashboard({ property, onDeleteProperty, onUpdateProperty }: EvaluationDashboardProps) {
  const [activeTab, setActiveTab] = useState('Summary');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Property>(property);

  // Sync state when property changes to a new one
  React.useEffect(() => {
    setEditedProperty(property);
    setIsEditing(false);
  }, [property]);

  const { specs, financials, address } = isEditing ? editedProperty : property;

  const handleSpecChange = (field: keyof typeof property.specs, value: any) => {
    setEditedProperty(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (onUpdateProperty) {
      onUpdateProperty(editedProperty);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setIsEditing(false);
  };

  const pricePerM2 = financials.purchasePrice / specs.floorSize;
  const rentVsValue = (financials.income * 12 / financials.purchasePrice * 100);
  const monthlyBond = (financials.bondAmount * (financials.interestRate / 100 / 12)) / (1 - Math.pow(1 + (financials.interestRate / 100 / 12), -financials.termYears * 12));
  const cashFlowValue = financials.income - financials.expenses;

  return (
    <div className="bg-white p-6 h-full overflow-y-auto custom-scrollbar">
      {/* Header Tabs Navigation */}
      <div className="flex items-center gap-8 border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
        {['Summary', 'Financial Matrix', 'Time Projection', 'Property Specs'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Summary' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12"
          >
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

            {/* Right Column: Address and Actions */}
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

              {onDeleteProperty && (
                <div className="pt-4 w-full">
                  <button 
                    onClick={() => onDeleteProperty(property.id)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-all group italic text-xs tracking-widest"
                  >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    DELETE EVALUATION RESOURCE
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'Property Specs' && (
          <motion.div 
            key="specs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-12"
          >
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-black text-slate-900 italic uppercase">Property Specification Matrix</h3>
                  <p className="text-xs text-slate-400 font-medium">Fine-tune the physical attributes for accurate financial modeling</p>
               </div>
               <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 italic"
                      >
                        <Check className="w-4 h-4" /> SAVE SPECIFICATIONS
                      </button>
                      <button 
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all italic"
                      >
                        <X className="w-4 h-4" /> DISCARD
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg italic"
                    >
                      <Edit3 className="w-4 h-4" /> EDIT SPECS
                    </button>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 { label: 'Bedrooms', field: 'bedrooms', icon: User },
                 { label: 'Bathrooms', field: 'bathrooms', icon: Info },
                 { label: 'Garages', field: 'garages', icon: LayoutGrid },
                 { label: 'Carports', field: 'carports', icon: LayoutGrid },
                 { label: 'Floor Size', field: 'floorSize', suffix: 'm²', icon: Info },
                 { label: 'Stand Size', field: 'standSize', suffix: 'm²', icon: Info },
                 { label: 'Floor Level', field: 'floor', icon: Home, type: 'text' },
                 { label: 'Title Type', field: 'titleType', icon: Home, type: 'text' }
               ].map(spec => (
                 <div key={spec.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-all group hover:border-blue-200">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:text-blue-600 transition-colors">
                        <spec.icon className="w-4 h-4" />
                      </div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{spec.label}</label>
                   </div>
                   {isEditing ? (
                     <div className="relative">
                       <input 
                         type={spec.type === 'text' ? 'text' : 'number'}
                         value={(specs as any)[spec.field] || ''}
                         onChange={(e) => handleSpecChange(spec.field as any, spec.type === 'text' ? e.target.value : Number(e.target.value))}
                         className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-blue-500 transition-all italic"
                       />
                       {spec.suffix && (
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none italic">
                           {spec.suffix}
                         </span>
                       )}
                     </div>
                   ) : (
                     <div className="flex items-baseline gap-1">
                        <p className="text-xl font-black text-slate-900 italic tracking-tight">
                          {(specs as any)[spec.field] || (spec.field === 'standSize' ? 'N/A' : '0')}
                        </p>
                        {spec.suffix && <span className="text-xs font-bold text-slate-400 uppercase ml-1">{spec.suffix}</span>}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {(activeTab === 'Financial Matrix' || activeTab === 'Time Projection') && (
          <motion.div 
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
               <Info className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-black text-slate-900 italic uppercase">Advanced Modeling: {activeTab}</h4>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-2">
              This module is currently processing based on baseline ROI metrics. 
              Full interactive charting is available in the Pro Evaluation layer.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
