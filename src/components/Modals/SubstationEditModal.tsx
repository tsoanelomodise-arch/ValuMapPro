import React, { useState, useMemo } from 'react';
import { X, Zap } from 'lucide-react';
import { Substation } from '../../types';

interface SubstationEditModalProps {
  substation: Substation;
  onClose: () => void;
  onSave: (sub: Substation) => void;
}

export default function SubstationEditModal({ 
  substation, 
  onClose, 
  onSave 
}: SubstationEditModalProps) {
  const [formData, setFormData] = useState<Substation>(substation);

  // Derived state: calculate amps directly during render for "speed" and simplicity
  const calculatedAmps = useMemo(() => {
    if (formData.mvaCapacity && formData.voltageKV) {
      return (formData.mvaCapacity * 1000) / (Math.sqrt(3) * formData.voltageKV);
    }
    return undefined;
  }, [formData.mvaCapacity, formData.voltageKV]);

  const handleSave = () => {
    onSave({
      ...formData,
      availableAmps: calculatedAmps
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all" />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Infrastructure</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight italic uppercase">Edit Substation</h3>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Substation Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
                  placeholder="Enter name..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Owner / Operator</label>
                <input
                  value={formData.owner || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
                  placeholder="e.g. Eskom, City of Cape Town..."
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none"
                >
                  <option value="Active">Active</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Capacity (MVA)</label>
                  <input
                    type="number"
                    value={formData.mvaCapacity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, mvaCapacity: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Voltage (kV)</label>
                  <input
                    type="number"
                    value={formData.voltageKV || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, voltageKV: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
                  />
                </div>
              </div>

              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center group transition-all hover:bg-indigo-100/50">
                 <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Calculated Output</p>
                    <p className="text-2xl font-black text-indigo-900 tracking-tighter">
                      {calculatedAmps ? `${calculatedAmps.toFixed(1)}A` : '---'}
                    </p>
                 </div>
                 <div className="bg-white p-2.5 rounded-xl shadow-sm border border-indigo-100 group-hover:rotate-12 transition-transform">
                    <Zap className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                 </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-4"
            >
              Update Substation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
