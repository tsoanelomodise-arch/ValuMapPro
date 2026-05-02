import React, { useState } from 'react';
import { X, Check, FileDown, Loader2 } from 'lucide-react';
import { Property } from '../../types';
import { cn } from '../../lib/utils';

interface ExportSelectionOverlayProps {
  properties: Property[];
  onClose: () => void;
  onExport: (selectedProperties: Property[]) => void;
  onExportImage: (selectedProperties: Property[]) => void;
  isExporting: boolean;
}

export default function ExportSelectionOverlay({
  properties,
  onClose,
  onExport,
  onExportImage,
  isExporting
}: ExportSelectionOverlayProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(properties.map(p => p.id));

  const toggleProperty = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === properties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(properties.map(p => p.id));
    }
  };

  const handleExport = () => {
    const selected = properties.filter(p => selectedIds.includes(p.id));
    onExport(selected);
  };

  const handleExportImage = () => {
    const selected = properties.filter(p => selectedIds.includes(p.id));
    onExportImage(selected);
  };

  return (
    <div 
      className="absolute top-4 left-4 z-[1001] bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-5 duration-300"
      data-html2canvas-ignore="true"
    >
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">Map Report</h2>
          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Select properties and export format</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
          disabled={isExporting}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={toggleAll}
            className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
          >
            {selectedIds.length === properties.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-[10px] font-bold text-slate-400">
            {selectedIds.length} of {properties.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {properties.map(property => (
            <button
              key={property.id}
              onClick={() => toggleProperty(property.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                selectedIds.includes(property.id) 
                  ? "bg-slate-900 border-slate-900 shadow-lg shadow-slate-200" 
                  : "bg-white border-slate-100 hover:border-slate-300"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                selectedIds.includes(property.id)
                  ? "bg-blue-500 border-blue-400"
                  : "bg-slate-50 border-slate-200 group-hover:border-slate-300"
              )}>
                {selectedIds.includes(property.id) && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[11px] font-bold truncate leading-tight uppercase tracking-tight",
                  selectedIds.includes(property.id) ? "text-white" : "text-slate-900"
                )}>
                  {property.name}
                </p>
                <p className={cn(
                  "text-[9px] truncate mt-0.5",
                  selectedIds.includes(property.id) ? "text-slate-400" : "text-slate-500"
                )}>
                  {property.address.street}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
        <button
          onClick={handleExport}
          disabled={selectedIds.length === 0 || isExporting}
          className={cn(
            "w-full py-4 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all",
            selectedIds.length === 0 || isExporting
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Download PDF Report
            </>
          )}
        </button>

        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className={cn(
            "w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
            isExporting
              ? "text-slate-400 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <FileDown className="w-3.5 h-3.5" />
          Download View as Image
        </button>
      </div>
    </div>
  );
}
