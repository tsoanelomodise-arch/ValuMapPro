import React, { useState, useMemo } from 'react';
import { Property, Substation } from '../../types';
import { formatCurrency, cn, calculateDistance } from '../../lib/utils';
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
  X,
  ExternalLink,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface EvaluationDashboardProps {
  property: Property;
  substations?: Substation[];
  onDeleteProperty?: (id: string) => void;
  onUpdateProperty?: (property: Property) => void;
  onRefineProperty?: (property: Property) => void;
  initialEditMode?: boolean;
}

export default function EvaluationDashboard({ 
  property, 
  substations = [], 
  onDeleteProperty, 
  onUpdateProperty, 
  onRefineProperty, 
  initialEditMode = false 
}: EvaluationDashboardProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedProperty, setEditedProperty] = useState<Property>(property);
  const [coordsString, setCoordsString] = useState(property.coordinates ? `${property.coordinates[0]}, ${property.coordinates[1]}` : '');
  
  // Sync state when property changes to a new one
  React.useEffect(() => {
    setEditedProperty(property);
    setIsEditing(initialEditMode);
    if (property.coordinates) {
      setCoordsString(`${property.coordinates[0]}, ${property.coordinates[1]}`);
    }
  }, [property, initialEditMode]);

  const closestSubstation = useMemo(() => {
    if (!substations.length) return null;
    let minD = Infinity;
    let closest = substations[0];
    substations.forEach(s => {
      const d = calculateDistance(property.coordinates[0], property.coordinates[1], s.coordinates[0], s.coordinates[1]);
      if (d < minD) {
        minD = d;
        closest = s;
      }
    });
    return { substation: closest, distance: minD };
  }, [property, substations]);

  const { specs, financials, address } = isEditing ? editedProperty : property;

  const handleFieldUpdate = (path: string, value: any) => {
    setEditedProperty(prev => {
      // Direct name update
      if (path === 'name') return { ...prev, [path]: value };
      if (path === 'type') return { ...prev, [path]: value };
      if (path === 'description') return { ...prev, [path]: value };
      if (path === 'agent') return { ...prev, [path]: value };
      if (path === 'listingNumber') return { ...prev, [path]: value };
      if (path === 'googleMapsUrl') return { ...prev, [path]: value };
      if (path === 'p24Url') return { ...prev, [path]: value };
      if (path === 'agentPhone') return { ...prev, [path]: value };
      
      const parts = path.split('.');
      if (parts.length === 2) {
        const category = parts[0] as keyof Property;
        const field = parts[1];
        return {
          ...prev,
          [category]: {
            ...(prev[category] as any),
            [field]: value
          }
        } as Property;
      }
      return prev;
    });
  };

  const handleSave = () => {
    if (onUpdateProperty) {
      onUpdateProperty(editedProperty);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setCoordsString(property.coordinates ? `${property.coordinates[0]}, ${property.coordinates[1]}` : '');
    setIsEditing(false);
  };

  const { name, type, listingNumber, p24Url, agent, agentPhone, description } = isEditing ? editedProperty : property;

  return (
    <div className="bg-white h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        {/* Header Information */}
        <div className="p-8 border-b border-slate-100">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">{type}</span>
                 {isEditing ? (
                    <input 
                      value={p24Url || ''}
                      onChange={(e) => handleFieldUpdate('p24Url', e.target.value)}
                      className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none w-48"
                      placeholder="Property24 Link"
                    />
                 ) : onRefineProperty && (
                    <button 
                      onClick={() => onRefineProperty(property)}
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                      Audit Record
                    </button>
                 )}
              </div>
              <div className="flex gap-2">
                 {isEditing ? (
                    <>
                      <button onClick={handleSave} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">Save Changes</button>
                      <button onClick={handleCancel} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                    </>
                 ) : (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                       <Edit3 className="w-3.5 h-3.5" /> Edit Record
                    </button>
                 )}
              </div>
           </div>
           
           {isEditing ? (
              <div className="flex flex-col gap-2 w-full">
                 <input 
                   value={name}
                   onChange={(e) => handleFieldUpdate('name', e.target.value)}
                   className="text-3xl font-bold text-slate-900 w-full border-b border-slate-200 outline-none pb-2"
                   placeholder="Property Name"
                 />
                 <div className="flex gap-2">
                    <input 
                      value={address.street}
                      onChange={(e) => handleFieldUpdate('address.street', e.target.value)}
                      className="text-slate-500 font-medium border-b border-slate-200 outline-none w-full"
                      placeholder="Street Address"
                    />
                    <input 
                      value={address.suburb}
                      onChange={(e) => handleFieldUpdate('address.suburb', e.target.value)}
                      className="text-slate-500 font-medium border-b border-slate-200 outline-none w-full"
                      placeholder="Suburb"
                    />
                 </div>
              </div>
           ) : (
              <>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{name}</h1>
                <p className="mt-2 text-slate-500 font-medium">{address.street}, {address.suburb}</p>
              </>
           )}
        </div>

        {/* Evaluation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
           {[
             { label: 'Valuation', val: formatCurrency(financials.purchasePrice), path: 'financials.purchasePrice', type: 'currency' },
             { label: 'Market Value', val: formatCurrency(financials.marketValue), path: 'financials.marketValue', type: 'currency' },
             { label: 'Surface Area', val: `${specs.standSize} m²`, path: 'specs.standSize', type: 'number', suffix: 'm²' },
             { label: 'Interest', val: `${financials.interestRate}%`, path: 'financials.interestRate', type: 'number', suffix: '%' },
             { label: 'Term', val: `${financials.termYears} Y`, path: 'financials.termYears', type: 'number', suffix: 'Y' },
             { label: 'Bond Amount', val: formatCurrency(financials.bondAmount), path: 'financials.bondAmount', type: 'currency' },
             { label: 'Deposit', val: formatCurrency(financials.deposit), path: 'financials.deposit', type: 'currency' },
             { label: 'Ref Number', val: listingNumber || 'N/A', path: 'listingNumber', type: 'text', isP24: true },
             { label: 'Title Type', val: specs.titleType, path: 'specs.titleType', type: 'text' },
           ].map((item: any, i) => (
              <div key={i} className="bg-white p-6">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                 {isEditing ? (
                    <div className="relative">
                       <input 
                          type={item.type === 'number' || item.type === 'currency' ? 'number' : 'text'}
                          value={item.path!.includes('.') ? (editedProperty as any)[item.path!.split('.')[0]][item.path!.split('.')[1]] : (editedProperty as any)[item.path!]}
                          onChange={(e) => handleFieldUpdate(item.path!, item.type === 'number' || item.type === 'currency' ? Number(e.target.value) : e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:border-indigo-600"
                       />
                    </div>
                 ) : (
                    item.isP24 && listingNumber ? (
                      <a 
                        href={p24Url || `https://www.property24.com/for-sale/${listingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        {item.val}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <p className="text-lg font-bold text-slate-900">{item.val}</p>
                    )
                 )}
              </div>
           ))}
        </div>

        {/* Infrastructure Summary */}
        {closestSubstation && (
           <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Infrastructure Proximity</p>
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">{closestSubstation.substation.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{closestSubstation.substation.status} • {closestSubstation.substation.capacity}</p>
                 </div>
                 <div className="flex gap-12">
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Distance</p>
                       <p className="text-xl font-bold text-indigo-600">{(closestSubstation.distance / 1000).toFixed(2)}km</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Grid Load</p>
                       <p className="text-xl font-bold text-slate-900">{closestSubstation.substation.availableAmps ? `${closestSubstation.substation.availableAmps}A` : 'N/A'}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* Evaluation Text */}
        <div className="p-8 border-b border-slate-100">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Evaluation</p>
           {isEditing ? (
              <textarea 
                 value={description || ''}
                 onChange={(e) => handleFieldUpdate('description', e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-600 outline-none focus:border-indigo-600 min-h-[100px] resize-none"
                 placeholder="Enter evaluation..."
              />
           ) : (
              <p className="text-sm text-slate-600 leading-relaxed">{description || 'No additional evaluation data available.'}</p>
           )}
        </div>

        {/* Agent & Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Listing Agent</p>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-300" />
                 </div>
                 <div>
                    {isEditing ? (
                       <div className="flex flex-col gap-2">
                         <input 
                            value={agent || ''}
                            onChange={(e) => handleFieldUpdate('agent', e.target.value)}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold outline-none"
                            placeholder="Agent Name"
                         />
                         <input 
                            value={agentPhone || ''}
                            onChange={(e) => handleFieldUpdate('agentPhone', e.target.value)}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] outline-none"
                            placeholder="Phone Number"
                         />
                       </div>
                    ) : (
                       <>
                         <p className="font-bold text-slate-900">{agent || 'Generic Agent'}</p>
                         {agentPhone && <p className="text-[10px] text-slate-400 font-medium">{agentPhone}</p>}
                       </>
                    )}
                    <p className="text-[10px] text-slate-500 font-medium">Real Estate Professional</p>
                 </div>
              </div>
           </div>

           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Location Context</p>
              <div className="space-y-4">
                 <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-400 font-medium">Municipality</span>
                    {isEditing ? (
                       <input 
                         value={address.city}
                         onChange={(e) => handleFieldUpdate('address.city', e.target.value)}
                         className="text-slate-900 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none text-right"
                       />
                    ) : (
                       <span className="text-slate-900 font-bold">{address.city}</span>
                    )}
                 </div>
                 <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-400 font-medium">Country</span>
                    {isEditing ? (
                       <input 
                         value={address.country}
                         onChange={(e) => handleFieldUpdate('address.country', e.target.value)}
                         className="text-slate-900 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none text-right"
                       />
                    ) : (
                       <span className="text-slate-900 font-bold">{address.country}</span>
                    )}
                 </div>
                 <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-400 font-medium">Coordinates</span>
                    {isEditing ? (
                       <input 
                         value={coordsString}
                         onChange={(e) => {
                           const val = e.target.value;
                           setCoordsString(val);
                           const parts = val.split(/[, ]+/).filter(Boolean);
                           if (parts.length === 2) {
                             const lat = parseFloat(parts[0]);
                             const lng = parseFloat(parts[1]);
                             if (!isNaN(lat) && !isNaN(lng)) {
                               setEditedProperty(prev => ({ ...prev, coordinates: [lat, lng] }));
                             }
                           }
                         }}
                         className="w-48 text-slate-900 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none text-right tabular-nums shadow-inner"
                         placeholder="-26.1234, 28.1234"
                       />
                    ) : (
                       <span className="text-slate-900 font-bold tabular-nums">
                          {property.coordinates[0].toFixed(4)}, {property.coordinates[1].toFixed(4)}
                       </span>
                    )}
                 </div>
                 <div className="flex justify-between text-xs items-center pt-2 border-t border-slate-50">
                    <span className="text-slate-400 font-medium whitespace-nowrap mr-4">Maps Link</span>
                    {isEditing ? (
                       <input 
                         value={editedProperty.googleMapsUrl || ''}
                         onChange={(e) => handleFieldUpdate('googleMapsUrl', e.target.value)}
                         placeholder="https://google.com/maps/..."
                         className="text-[10px] text-indigo-600 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none w-full text-right overflow-hidden text-ellipsis shadow-inner"
                       />
                    ) : (
                       <div className="flex gap-2">
                          {property.googleMapsUrl && (
                             <a href={property.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-bold">
                                Map <ExternalLink className="w-3 h-3" />
                             </a>
                          )}
                          <a 
                            href={`https://csggis.drdlr.gov.za/`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-600 hover:underline flex items-center gap-1 font-bold pl-2 border-l border-slate-200"
                          >
                             CSG GIS <ExternalLink className="w-3 h-3" />
                          </a>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {onDeleteProperty && (
          <div className="p-8 border-t border-slate-50 text-center">
             <button 
               onClick={() => onDeleteProperty(property.id)}
               className="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-all uppercase tracking-widest flex items-center gap-2 mx-auto"
             >
               <Trash2 className="w-3.5 h-3.5" /> Delete Record
             </button>
          </div>
        )}
      </div>
    </div>
  );
}


