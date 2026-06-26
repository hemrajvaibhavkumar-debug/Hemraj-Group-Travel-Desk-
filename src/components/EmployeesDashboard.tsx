import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  User, Edit3, Trash2, Plus, X, Search, SlidersHorizontal, 
  ChevronDown, ChevronUp, Globe, Shield, FileText, CheckCircle2, 
  AlertTriangle, Plane, MapPin, Upload, ShieldAlert, DollarSign, 
  ArrowUpDown, Calendar, Briefcase, CreditCard, Activity, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeesDashboardProps {
  employees: Employee[];
  onDeleteEmployee: (employeeCode: string) => Promise<void>;
  onEditEmployee: (employee: Employee) => Promise<void>;
  onAddEmployee: (employee: Employee) => Promise<void>;
}

export default function EmployeesDashboard({ 
  employees, 
  onDeleteEmployee, 
  onEditEmployee, 
  onAddEmployee 
}: EmployeesDashboardProps) {
  // UI states
  const [expandedEmpCode, setExpandedEmpCode] = useState<string | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [addingEmp, setAddingEmp] = useState<Partial<Employee> | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'corporate' | 'domestic' | 'international'>('corporate');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [passportFilter, setPassportFilter] = useState('ALL');
  const [vaccineFilter, setVaccineFilter] = useState('ALL');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [transportFilter, setTransportFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'department' | 'passport_expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Compute stats helper
  const stats = useMemo(() => {
    const total = employees.length;
    let internationalReady = 0;
    let passportWarning = 0;
    let vaccinePending = 0;

    employees.forEach(emp => {
      const hasPassport = !!emp.passport_number?.trim();
      let passportValid = false;
      if (hasPassport && emp.passport_expiry) {
        const expiry = new Date(emp.passport_expiry).getTime();
        const diffDays = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
        if (diffDays > 180) passportValid = true;
        if (diffDays >= 0 && diffDays <= 180) passportWarning++;
      } else if (!hasPassport) {
        // missing/no passport isn't counted in warning unless international travel attempted,
        // but we count it in total missing
      }

      const polioOk = emp.polio_vaccine_status?.toLowerCase() === 'vaccinated';
      const yfvOk = emp.yfv_status?.toLowerCase() === 'vaccinated';
      
      if (hasPassport && passportValid && polioOk && yfvOk) {
        internationalReady++;
      }

      if (!polioOk || !yfvOk) {
        vaccinePending++;
      }
    });

    return { total, internationalReady, passportWarning, vaccinePending };
  }, [employees]);

  // Upload handler simulating backend API upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Employee) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(prev => ({ ...prev, [fieldName as string]: 10 }));
    
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 90);
        setUploadProgress(prev => ({ ...prev, [fieldName as string]: percent }));
      }
    };

    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: reader.result
          })
        });
        const data = await res.json();
        if (res.ok) {
          setUploadProgress(prev => ({ ...prev, [fieldName as string]: 100 }));
          
          if (editingEmp) {
            setEditingEmp(prev => prev ? { ...prev, [fieldName]: data.url } : null);
          } else if (addingEmp) {
            setAddingEmp(prev => prev ? { ...prev, [fieldName]: data.url } : null);
          }
          
          // Clear progress after short delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const copy = { ...prev };
              delete copy[fieldName as string];
              return copy;
            });
          }, 2000);
        } else {
          alert(`Upload failed: ${data.error || "Unknown server error"}`);
          setUploadProgress(prev => {
            const copy = { ...prev };
            delete copy[fieldName as string];
            return copy;
          });
        }
      } catch (err) {
        console.error(err);
        alert("Simulated upload error occurred.");
        setUploadProgress(prev => {
          const copy = { ...prev };
          delete copy[fieldName as string];
          return copy;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop file simulate upload
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>, fieldName: keyof Employee) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    // Trigger simulated upload
    const mockEvent = {
      target: { files: e.dataTransfer.files }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(mockEvent, fieldName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Form submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        if (!editingEmp.name.trim() || !editingEmp.email.trim() || !editingEmp.phone.trim()) {
          alert("Please fill in all mandatory Corporate details.");
          return;
        }
        await onEditEmployee(editingEmp);
        setEditingEmp(null);
      } else if (addingEmp) {
        if (!addingEmp.employee_code?.trim() || !addingEmp.name?.trim() || !addingEmp.email?.trim() || !addingEmp.phone?.trim()) {
          alert("Employee Code, Name, Email and Phone are mandatory fields.");
          return;
        }
        // Enforce required fields default values if missing
        const completedEmp: Employee = {
          employee_code: addingEmp.employee_code.trim(),
          name: addingEmp.name.trim(),
          email: addingEmp.email.trim(),
          phone: addingEmp.phone.trim(),
          designation: addingEmp.designation?.trim() || "Associate",
          department: addingEmp.department || "OPS",
          default_travel_approver: addingEmp.default_travel_approver || "Rohit ji",
          approver_designation: addingEmp.approver_designation?.trim() || "COO",
          cost_centre: addingEmp.cost_centre?.trim() || "HEM-GEN",
          default_billing_currency: addingEmp.default_billing_currency || "INR",
          ...addingEmp
        } as Employee;

        await onAddEmployee(completedEmp);
        setAddingEmp(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit employee data.");
    }
  };

  // Filtering & Sorting logic
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        // Search Term (Fuzzy match name, code, email, phone, passport)
        const matchSearch = 
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.passport_number && emp.passport_number.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!matchSearch) return false;

        // Department filter
        if (deptFilter !== 'ALL' && emp.department.toUpperCase() !== deptFilter.toUpperCase()) {
          return false;
        }

        // Passport Validity Filter
        if (passportFilter !== 'ALL') {
          const hasPassport = !!emp.passport_number?.trim();
          if (passportFilter === 'MISSING') return !hasPassport;
          if (!hasPassport) return false;
          
          if (emp.passport_expiry) {
            const expiry = new Date(emp.passport_expiry).getTime();
            const diffDays = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
            if (passportFilter === 'EXPIRED') return diffDays < 0;
            if (passportFilter === 'WARNING_6M') return diffDays >= 0 && diffDays <= 180;
            if (passportFilter === 'WARNING_1Y') return diffDays >= 0 && diffDays <= 365;
            if (passportFilter === 'VALID') return diffDays > 365;
          }
        }

        // Vaccine Status Filter
        if (vaccineFilter !== 'ALL') {
          const polioOk = emp.polio_vaccine_status?.toLowerCase() === 'vaccinated';
          const yfvOk = emp.yfv_status?.toLowerCase() === 'vaccinated';
          if (vaccineFilter === 'FULLY') return polioOk && yfvOk;
          if (vaccineFilter === 'POLIO') return polioOk;
          if (vaccineFilter === 'YFV') return yfvOk;
          if (vaccineFilter === 'PENDING') return !polioOk || !yfvOk;
        }

        // Transport Mode preference filter
        if (transportFilter !== 'ALL' && emp.default_mode_of_transport?.toUpperCase() !== transportFilter.toUpperCase()) {
          return false;
        }

        // Billing Currency filter
        if (currencyFilter !== 'ALL' && emp.default_billing_currency?.toUpperCase() !== currencyFilter.toUpperCase()) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let fieldA: any = '';
        let fieldB: any = '';

        if (sortBy === 'name') {
          fieldA = a.name.toLowerCase();
          fieldB = b.name.toLowerCase();
        } else if (sortBy === 'code') {
          fieldA = a.employee_code.toLowerCase();
          fieldB = b.employee_code.toLowerCase();
        } else if (sortBy === 'department') {
          fieldA = a.department.toLowerCase();
          fieldB = b.department.toLowerCase();
        } else if (sortBy === 'passport_expiry') {
          fieldA = a.passport_expiry ? new Date(a.passport_expiry).getTime() : Infinity;
          fieldB = b.passport_expiry ? new Date(b.passport_expiry).getTime() : Infinity;
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [employees, searchTerm, deptFilter, passportFilter, vaccineFilter, transportFilter, currencyFilter, sortBy, sortOrder]);

  // Handle Sort Change toggle
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Calculate passport compliance helper
  const getPassportStatus = (emp: Employee) => {
    if (!emp.passport_number?.trim()) {
      return { label: 'NO PASSPORT', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (!emp.passport_expiry) {
      return { label: 'VALIDITY UNKNOWN', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    const expiry = new Date(emp.passport_expiry).getTime();
    const diffDays = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) {
      return { label: 'PASSPORT EXPIRED', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (diffDays <= 180) {
      return { label: `EXPIRING SOON (${Math.round(diffDays)}d)`, color: 'bg-red-50 text-red-800 border-red-200 font-black' };
    }
    if (diffDays <= 365) {
      return { label: `VALID (${Math.round(diffDays)}d)`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'VALID', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  return (
    <div className="space-y-6">
      
      {/* 1. METRICS HEADER BOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Directory</span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">{stats.total}</span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">Employees registered</span>
          </div>
          <div className="bg-slate-100 text-slate-600 p-3 rounded-xl">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">International Ready</span>
            <span className="text-3xl font-black text-teal-600 mt-1 block">{stats.internationalReady}</span>
            <span className="text-[9px] text-teal-700 font-bold block mt-1">Passport & Vaccines cleared</span>
          </div>
          <div className="bg-teal-50 text-teal-600 p-3 rounded-xl border border-teal-100">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Passport Warnings</span>
            <span className={`text-3xl font-black mt-1 block ${stats.passportWarning > 0 ? "text-orange-600" : "text-slate-900"}`}>{stats.passportWarning}</span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">Expiring in &lt; 180 days</span>
          </div>
          <div className={`p-3 rounded-xl border ${stats.passportWarning > 0 ? "bg-orange-50 text-orange-600 border-orange-100 animate-pulse" : "bg-slate-100 text-slate-500"}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vaccine Pending</span>
            <span className={`text-3xl font-black mt-1 block ${stats.vaccinePending > 0 ? "text-amber-600" : "text-slate-900"}`}>{stats.vaccinePending}</span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">Polio / YFV undocumented</span>
          </div>
          <div className={`p-3 rounded-xl border ${stats.vaccinePending > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-100 text-slate-500"}`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. ADVANCED FILTERS Drawer */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search Name, Code, Email, Phone, Passport..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/25 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                showFilters 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters {showFilters ? '▲' : '▼'}</span>
            </button>

            <button 
              onClick={() => setAddingEmp({})} 
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-sm tracking-wider active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        </div>

        {/* Collapsible filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100 text-[10px] uppercase font-black tracking-wide text-slate-500">
                
                <div>
                  <label className="block mb-1.5 font-sans">Department</label>
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="PURCHASE">Purchase</option>
                    <option value="FINANCE">Finance</option>
                    <option value="OPS">Operations</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-sans">Passport Status</label>
                  <select
                    value={passportFilter}
                    onChange={e => setPassportFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Passport States</option>
                    <option value="VALID">Valid (&gt; 1 year)</option>
                    <option value="WARNING_1Y">Valid (&lt; 1 year)</option>
                    <option value="WARNING_6M">Critical (&lt; 6 months)</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="MISSING">Missing Passport</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-sans">Vaccine Compliance</label>
                  <select
                    value={vaccineFilter}
                    onChange={e => setVaccineFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Clearances</option>
                    <option value="FULLY">Both Vaccinated</option>
                    <option value="POLIO">Polio Vaccinated</option>
                    <option value="YFV">Yellow Fever Vaccinated</option>
                    <option value="PENDING">Vaccine Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-sans">Default Transport</label>
                  <select
                    value={transportFilter}
                    onChange={e => setTransportFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Preferences</option>
                    <option value="FLIGHT">Flight</option>
                    <option value="SL">SL Train</option>
                    <option value="3AC">3AC Train</option>
                    <option value="2AC">2AC Train</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-sans">Billing Currency</label>
                  <select
                    value={currencyFilter}
                    onChange={e => setCurrencyFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Currencies</option>
                    <option value="INR">INR (Rupee)</option>
                    <option value="USD">USD (Dollar)</option>
                    <option value="NGN">NGN (Naira)</option>
                  </select>
                </div>

              </div>
              
              <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                <div>Showing {filteredEmployees.length} of {employees.length} matching traveler profiles</div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDeptFilter('ALL');
                    setPassportFilter('ALL');
                    setVaccineFilter('ALL');
                    setCurrencyFilter('ALL');
                    setTransportFilter('ALL');
                  }}
                  className="text-orange-600 hover:text-orange-700 uppercase"
                >
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. COMPREHENSIVE ACCORDION TABLE */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl overflow-hidden shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[8px] font-black tracking-widest border-b border-slate-800 select-none">
              <th className="p-4 w-8"></th>
              <th className="p-4 cursor-pointer hover:bg-slate-850 transition" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5">
                  <span>Name & Designation</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-850 transition" onClick={() => handleSort('code')}>
                <div className="flex items-center gap-1.5">
                  <span>Employee Code</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-850 transition" onClick={() => handleSort('department')}>
                <div className="flex items-center gap-1.5">
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-4">Contact Details</th>
              <th className="p-4 cursor-pointer hover:bg-slate-850 transition" onClick={() => handleSort('passport_expiry')}>
                <div className="flex items-center gap-1.5">
                  <span>Travel Clearance</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-bold uppercase text-slate-700">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                  No matching employees found in registry database.
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => {
                const isExpanded = expandedEmpCode === emp.employee_code;
                const passStatus = getPassportStatus(emp);
                const isVaccinated = emp.polio_vaccine_status?.toLowerCase() === 'vaccinated' && 
                                     emp.yfv_status?.toLowerCase() === 'vaccinated';

                return (
                  <React.Fragment key={emp.employee_code}>
                    {/* Row Summary */}
                    <tr 
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50/50" : ""}`}
                      onClick={() => setExpandedEmpCode(isExpanded ? null : emp.employee_code)}
                    >
                      <td className="p-4 text-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp.photograph_url ? (
                            <img 
                              src={emp.photograph_url} 
                              alt={emp.name} 
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-slate-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-black text-xs">
                              {emp.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-slate-900 block normal-case font-black text-xs leading-tight">{emp.name}</span>
                            <span className="text-[8px] text-slate-400 block tracking-wider mt-0.5">{emp.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-black">{emp.employee_code}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[8px] font-black">
                          {emp.department}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="block font-mono text-[9px] text-slate-600 lowercase tracking-tight">{emp.email}</span>
                        <span className="block font-mono text-[9px] text-slate-400 mt-0.5">{emp.phone}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-1.5 py-0.5 rounded border text-[7px] font-black tracking-widest ${passStatus.color}`}>
                            {passStatus.label}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[7px] font-black tracking-widest ${
                            isVaccinated 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            VACCINES: {isVaccinated ? 'CLEARED' : 'PENDING'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => { setEditingEmp(emp); setActiveFormTab('corporate'); }} 
                            title="Edit profile information"
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 hover:text-slate-900 duration-150 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onDeleteEmployee(emp.employee_code)} 
                            title="Permanently remove employee"
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:text-rose-900 duration-150 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Dossier Expansion */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-6 bg-slate-50/50 border-t border-b border-slate-200">
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                          >
                            
                            {/* Panel 1: Dossier Header & Corporate Info */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <Briefcase className="w-4 h-4 text-orange-600" />
                                <h4 className="font-black text-slate-900 text-xs">Corporate & Budget Identity</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-[9px]">
                                <div>
                                  <span className="text-slate-400 block uppercase">Aadhar / PAN</span>
                                  <span className="text-slate-800 font-bold block mt-0.5">{emp.aadhar_pan_number || "NOT RECORDED"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Cost Centre</span>
                                  <span className="text-slate-800 font-black block mt-0.5">{emp.cost_centre || "GENERAL"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Billing Currency</span>
                                  <span className="text-slate-800 font-black block mt-0.5">{emp.default_billing_currency || "INR"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Travel Approver</span>
                                  <span className="text-slate-900 font-black block mt-0.5">{emp.default_travel_approver}</span>
                                  <span className="text-slate-400 block text-[8px] mt-0.5 leading-none">{emp.approver_designation}</span>
                                </div>
                              </div>
                              
                              {emp.photograph_url && (
                                <div className="pt-2">
                                  <span className="text-slate-400 block text-[9px] uppercase mb-1.5">Photograph Uploaded</span>
                                  <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                                    <img 
                                      src={emp.photograph_url} 
                                      alt="Traveler Profile"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    <a 
                                      href={emp.photograph_url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-150"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Panel 2: Domestic Profile Preferences */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <Plane className="w-4 h-4 text-orange-600" />
                                <h4 className="font-black text-slate-900 text-xs">Domestic Particulars</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-[9px]">
                                <div>
                                  <span className="text-slate-400 block uppercase">Base / Native City</span>
                                  <span className="text-slate-800 block mt-0.5">{emp.native_city || "NOT REGISTERED"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Nearest Airport</span>
                                  <span className="text-slate-800 block font-mono mt-0.5">{emp.nearest_airport || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Railway Station</span>
                                  <span className="text-slate-800 block mt-0.5">{emp.nearest_railway_station || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Default Transport Mode</span>
                                  <span className="text-teal-700 font-extrabold block mt-0.5">{emp.default_mode_of_transport || "FLIGHT"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Extra Baggage Granted</span>
                                  <span className="text-slate-800 block mt-0.5">{emp.extra_baggage_required ? "YES (15KG EXTRA)" : "NO"}</span>
                                </div>
                              </div>

                              {emp.supporting_documents_url && (
                                <div className="pt-2">
                                  <span className="text-slate-400 block text-[9px] uppercase mb-1.5">Supporting Documents</span>
                                  <a 
                                    href={emp.supporting_documents_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition duration-100"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-[9px] text-slate-600 truncate normal-case">Attachment ID Proof.pdf</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Panel 3: Passport & Vaccines Clearance */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                <Globe className="w-4 h-4 text-orange-600" />
                                <h4 className="font-black text-slate-900 text-xs">International Documents</h4>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[9px]">
                                <div>
                                  <span className="text-slate-400 block uppercase">Passport Number</span>
                                  <span className="text-slate-800 font-mono font-black block mt-0.5">{emp.passport_number || "NO RECORD"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Passport Expiry</span>
                                  <span className="text-slate-800 font-mono block mt-0.5">{emp.passport_expiry || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Visa Credentials</span>
                                  <span className="text-slate-800 font-mono block mt-0.5">{emp.visa_number || "N/A"}</span>
                                  {emp.visa_country && <span className="text-slate-500 text-[8px] block">{emp.visa_country} ({emp.visa_expiry_date || ""})</span>}
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">OPV Polio Clearance</span>
                                  <span className={`font-black block mt-0.5 ${emp.polio_vaccine_status?.toLowerCase() === 'vaccinated' ? "text-emerald-600" : "text-amber-500"}`}>
                                    {emp.polio_vaccine_status || "PENDING"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Yellow Fever (YFV)</span>
                                  <span className={`font-black block mt-0.5 ${emp.yfv_status?.toLowerCase() === 'vaccinated' ? "text-emerald-600" : "text-amber-500"}`}>
                                    {emp.yfv_status || "PENDING"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase">Overseas plant/site</span>
                                  <span className="text-slate-800 block mt-0.5">{emp.assigned_plant_site || "N/A"}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2">
                                {emp.passport_front_page_url && (
                                  <a 
                                    href={emp.passport_front_page_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition text-[8px] text-slate-600 truncate normal-case"
                                  >
                                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>Passport Front.png</span>
                                  </a>
                                )}
                                {emp.passport_back_page_url && (
                                  <a 
                                    href={emp.passport_back_page_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition text-[8px] text-slate-600 truncate normal-case"
                                  >
                                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>Passport Back.png</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Timeline Passport History */}
                            {emp.passport_history && emp.passport_history.length > 0 && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs md:col-span-3 space-y-3">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                                  <Calendar className="w-4 h-4 text-orange-600" />
                                  <h4 className="font-black text-slate-900 text-xs">Archived Passport Compliance History</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {emp.passport_history.map((hist, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] relative space-y-1">
                                      <div className="font-mono font-black text-slate-800">Passport Number: {hist.passport_number}</div>
                                      <div className="text-slate-400">Validity: {hist.passport_issue_date || 'N/A'} → {hist.passport_expiry || 'N/A'}</div>
                                      <div className="text-slate-500 italic">Archived: {new Date(hist.archive_date).toLocaleDateString()}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TABS FORM MODAL (Add / Edit Employee) */}
      {(editingEmp || addingEmp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          
          <div className="bg-white border-2 border-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-6 text-white flex justify-between items-center border-b border-slate-900 shrink-0">
              <div>
                <h3 className="font-black text-lg uppercase tracking-tighter">
                  {editingEmp ? `Edit Traveler Profile` : 'Register New Traveler'}
                </h3>
                <p className="text-[9px] text-orange-500 font-black uppercase tracking-wider mt-0.5">
                  {editingEmp ? `Modifying record: ${editingEmp.employee_code}` : 'Initialize corporate database schema defaults'}
                </p>
              </div>
              <button 
                onClick={() => { setEditingEmp(null); setAddingEmp(null); }}
                className="text-white hover:text-orange-500 hover:bg-slate-900 p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Tabs Nav */}
            <div className="bg-slate-100 p-1 flex border-b border-slate-200 shrink-0 text-[10px] font-black uppercase tracking-wider select-none">
              <button
                type="button"
                onClick={() => setActiveFormTab('corporate')}
                className={`flex-1 text-center py-2.5 rounded-lg transition-all ${
                  activeFormTab === 'corporate' 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Corporate Info *
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('domestic')}
                className={`flex-1 text-center py-2.5 rounded-lg transition-all ${
                  activeFormTab === 'domestic' 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Domestic Prefs
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('international')}
                className={`flex-1 text-center py-2.5 rounded-lg transition-all ${
                  activeFormTab === 'international' 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Compliance & Int'l
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-800 font-bold uppercase tracking-wide">
              
              {/* TAB 1: CORPORATE INFO */}
              {activeFormTab === 'corporate' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Employee ID Code *</label>
                      <input 
                        type="text" 
                        required
                        disabled={!!editingEmp}
                        className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold disabled:text-slate-500 focus:outline-hidden"
                        value={editingEmp?.employee_code || addingEmp?.employee_code || ''}
                        onChange={e => {
                          if (addingEmp) setAddingEmp({ ...addingEmp, employee_code: e.target.value });
                        }}
                        placeholder="e.g. EMP-2234"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.name || addingEmp?.name || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, name: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, name: e.target.value });
                        }}
                        placeholder="e.g. Satish Sharma"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden normal-case"
                        value={editingEmp?.email || addingEmp?.email || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, email: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, email: e.target.value });
                        }}
                        placeholder="e.g. name@hemrajgroup.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">WhatsApp / Phone *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.phone || addingEmp?.phone || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, phone: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, phone: e.target.value });
                        }}
                        placeholder="e.g. +91 99999 88888"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Aadhar / PAN *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.aadhar_pan_number || addingEmp?.aadhar_pan_number || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, aadhar_pan_number: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, aadhar_pan_number: e.target.value });
                        }}
                        placeholder="Aadhar / PAN Card"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Corporate Designation *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.designation || addingEmp?.designation || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, designation: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, designation: e.target.value });
                        }}
                        placeholder="e.g. GM Procurement"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Department *</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.department || addingEmp?.department || 'OPS'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, department: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, department: e.target.value });
                        }}
                      >
                        <option value="Purchase">Purchase</option>
                        <option value="Finance">Finance</option>
                        <option value="Ops">Operations</option>
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="Admin">Admin</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Default Travel Approver *</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.default_travel_approver || addingEmp?.default_travel_approver || 'Rohit ji'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, default_travel_approver: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, default_travel_approver: e.target.value });
                        }}
                      >
                        <option value="Rohit ji">Rohit ji</option>
                        <option value="Department Head">Department Head</option>
                        <option value="Board Director">Board Director</option>
                        <option value="Management Office">Management Office</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Approver Designation Title *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.approver_designation || addingEmp?.approver_designation || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, approver_designation: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, approver_designation: e.target.value });
                        }}
                        placeholder="e.g. COO / VP Overseas"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Cost Centre *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.cost_centre || addingEmp?.cost_centre || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, cost_centre: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, cost_centre: e.target.value });
                        }}
                        placeholder="e.g. HEM-PUR-MUM"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Billing Currency *</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.default_billing_currency || addingEmp?.default_billing_currency || 'INR'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, default_billing_currency: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, default_billing_currency: e.target.value });
                        }}
                      >
                        <option value="INR">INR (Rupee)</option>
                        <option value="USD">USD (Dollar)</option>
                        <option value="NGN">NGN (Naira)</option>
                      </select>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: DOMESTIC PREFERENCES */}
              {activeFormTab === 'domestic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Base / Native City</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.native_city || addingEmp?.native_city || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, native_city: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, native_city: e.target.value });
                        }}
                        placeholder="e.g. Mumbai, Maharashtra"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Nearest Airport</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.nearest_airport || addingEmp?.nearest_airport || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, nearest_airport: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, nearest_airport: e.target.value });
                        }}
                        placeholder="e.g. BOM, Airport Rd"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Nearest Railway Station</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.nearest_railway_station || addingEmp?.nearest_railway_station || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, nearest_railway_station: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, nearest_railway_station: e.target.value });
                        }}
                        placeholder="e.g. Nagpur Junction"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Default transport mode</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.default_mode_of_transport || addingEmp?.default_mode_of_transport || 'Flight'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, default_mode_of_transport: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, default_mode_of_transport: e.target.value });
                        }}
                      >
                        <option value="Flight">Flight</option>
                        <option value="SL">SL Train</option>
                        <option value="3AC">3AC Train</option>
                        <option value="2AC">2AC Train</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 accent-orange-600"
                          checked={editingEmp?.extra_baggage_required || addingEmp?.extra_baggage_required || false}
                          onChange={e => {
                            if (editingEmp) setEditingEmp({ ...editingEmp, extra_baggage_required: e.target.checked });
                            else if (addingEmp) setAddingEmp({ ...addingEmp, extra_baggage_required: e.target.checked });
                          }}
                        />
                        <span className="text-[10px] text-slate-700 uppercase font-black tracking-wider">Enable extra baggage allowance permissions by default</span>
                      </label>
                    </div>

                    {/* Photograph Drag/Drop Upload */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="block text-[9px] text-slate-400 mb-1.5">Traveler Photograph</span>
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={e => handleFileDrop(e, 'photograph_url')}
                          className="border-2 border-dashed border-slate-200 hover:border-slate-800 rounded-2xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50"
                        >
                          <input 
                            type="file" 
                            id="photo-upload-inp" 
                            accept="image/*"
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'photograph_url')}
                          />
                          <label htmlFor="photo-upload-inp" className="cursor-pointer block">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[9px] font-black block text-slate-700">Choose Photograph file or Drag & Drop</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">PNG / JPG</span>
                          </label>
                          
                          {uploadProgress.photograph_url !== undefined && (
                            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col justify-center px-4">
                              <span className="text-[9px] block mb-1">Uploading... {uploadProgress.photograph_url}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="bg-orange-600 h-1 rounded-full transition-all" style={{ width: `${uploadProgress.photograph_url}%` }}></div>
                              </div>
                            </div>
                          )}

                          {(editingEmp?.photograph_url || addingEmp?.photograph_url) && (
                            <div className="mt-2 text-teal-600 text-[9px] font-black flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> File Linked Successfully
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Supporting Docs Drag/Drop Upload */}
                      <div>
                        <span className="block text-[9px] text-slate-400 mb-1.5">Supporting Document ID Proofs</span>
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={e => handleFileDrop(e, 'supporting_documents_url')}
                          className="border-2 border-dashed border-slate-200 hover:border-slate-800 rounded-2xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50"
                        >
                          <input 
                            type="file" 
                            id="support-upload-inp" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'supporting_documents_url')}
                          />
                          <label htmlFor="support-upload-inp" className="cursor-pointer block">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[9px] font-black block text-slate-700">Choose Support Document or Drag & Drop</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">PDF / PNG</span>
                          </label>
                          
                          {uploadProgress.supporting_documents_url !== undefined && (
                            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col justify-center px-4">
                              <span className="text-[9px] block mb-1">Uploading... {uploadProgress.supporting_documents_url}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="bg-orange-600 h-1 rounded-full transition-all" style={{ width: `${uploadProgress.supporting_documents_url}%` }}></div>
                              </div>
                            </div>
                          )}

                          {(editingEmp?.supporting_documents_url || addingEmp?.supporting_documents_url) && (
                            <div className="mt-2 text-teal-600 text-[9px] font-black flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> File Linked Successfully
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: COMPLIANCE & INTERNATIONAL */}
              {activeFormTab === 'international' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Passport Number</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.passport_number || addingEmp?.passport_number || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, passport_number: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, passport_number: e.target.value });
                        }}
                        placeholder="e.g. A2294029"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Passport Issue Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.passport_issue_date || addingEmp?.passport_issue_date || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, passport_issue_date: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, passport_issue_date: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Passport Expiry Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.passport_expiry || addingEmp?.passport_expiry || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, passport_expiry: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, passport_expiry: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Present Location Abroad</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.present_location_abroad || addingEmp?.present_location_abroad || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, present_location_abroad: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, present_location_abroad: e.target.value });
                        }}
                        placeholder="e.g. Lagos, Nigeria"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Assigned plant / site</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.assigned_plant_site || addingEmp?.assigned_plant_site || 'Other'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, assigned_plant_site: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, assigned_plant_site: e.target.value });
                        }}
                      >
                        <option value="Sunagrow">Sunagrow</option>
                        <option value="Ricefield">Ricefield</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Nearest Indian Boarding Airport</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.nearest_airport_india || addingEmp?.nearest_airport_india || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, nearest_airport_india: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, nearest_airport_india: e.target.value });
                        }}
                        placeholder="e.g. BOM Mumbai, Nagpur"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Visa Number</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.visa_number || addingEmp?.visa_number || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, visa_number: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, visa_number: e.target.value });
                        }}
                        placeholder="e.g. VN-338291"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Visa Expiry Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.visa_expiry_date || addingEmp?.visa_expiry_date || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, visa_expiry_date: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, visa_expiry_date: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Visa Country</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-hidden"
                        value={editingEmp?.visa_country || addingEmp?.visa_country || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, visa_country: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, visa_country: e.target.value });
                        }}
                        placeholder="e.g. Nigeria / India"
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-3 sm:col-span-2"></div>

                    {/* Vaccines status */}
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Polio Vaccine status (OPV)</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.polio_vaccine_status || addingEmp?.polio_vaccine_status || 'Pending'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, polio_vaccine_status: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, polio_vaccine_status: e.target.value });
                        }}
                      >
                        <option value="Vaccinated">Vaccinated</option>
                        <option value="Not Vaccinated">Not Vaccinated</option>
                        <option value="Pending">Pending</option>
                      </select>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[9px] font-bold mt-1"
                        value={editingEmp?.polio_certificate_expiry || addingEmp?.polio_certificate_expiry || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, polio_certificate_expiry: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, polio_certificate_expiry: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Yellow Fever Vaccine (YFV)</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-hidden text-slate-800"
                        value={editingEmp?.yfv_status || addingEmp?.yfv_status || 'Pending'}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, yfv_status: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, yfv_status: e.target.value });
                        }}
                      >
                        <option value="Vaccinated">Vaccinated</option>
                        <option value="Not Vaccinated">Not Vaccinated</option>
                        <option value="Pending">Pending</option>
                      </select>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[9px] font-bold mt-1"
                        value={editingEmp?.yfv_certificate_expiry || addingEmp?.yfv_certificate_expiry || ''}
                        onChange={e => {
                          if (editingEmp) setEditingEmp({ ...editingEmp, yfv_certificate_expiry: e.target.value });
                          else if (addingEmp) setAddingEmp({ ...addingEmp, yfv_certificate_expiry: e.target.value });
                        }}
                      />
                    </div>

                    {/* Scans Documents uploads grid */}
                    <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                      <span className="block text-[9px] text-slate-400 mb-2">Simulated International Document Scans</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        
                        {/* Passport Front Scan */}
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={e => handleFileDrop(e, 'passport_front_page_url')}
                          className="border border-dashed border-slate-200 hover:border-slate-800 rounded-xl p-2.5 text-center cursor-pointer relative bg-slate-50"
                        >
                          <input 
                            type="file" 
                            id="passfront-upload-inp" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'passport_front_page_url')}
                          />
                          <label htmlFor="passfront-upload-inp" className="cursor-pointer block">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="text-[8px] font-black block text-slate-700 leading-tight">Passport Front Page</span>
                          </label>
                          
                          {uploadProgress.passport_front_page_url !== undefined && (
                            <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col justify-center px-2">
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="bg-orange-600 h-1 rounded-full" style={{ width: `${uploadProgress.passport_front_page_url}%` }}></div>
                              </div>
                            </div>
                          )}
                          {(editingEmp?.passport_front_page_url || addingEmp?.passport_front_page_url) && (
                            <div className="text-teal-600 text-[8px] font-black mt-1">✓ Linked</div>
                          )}
                        </div>

                        {/* Passport Back Scan */}
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={e => handleFileDrop(e, 'passport_back_page_url')}
                          className="border border-dashed border-slate-200 hover:border-slate-800 rounded-xl p-2.5 text-center cursor-pointer relative bg-slate-50"
                        >
                          <input 
                            type="file" 
                            id="passback-upload-inp" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'passport_back_page_url')}
                          />
                          <label htmlFor="passback-upload-inp" className="cursor-pointer block">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="text-[8px] font-black block text-slate-700 leading-tight">Passport Back Page</span>
                          </label>
                          
                          {uploadProgress.passport_back_page_url !== undefined && (
                            <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col justify-center px-2">
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="bg-orange-600 h-1 rounded-full" style={{ width: `${uploadProgress.passport_back_page_url}%` }}></div>
                              </div>
                            </div>
                          )}
                          {(editingEmp?.passport_back_page_url || addingEmp?.passport_back_page_url) && (
                            <div className="text-teal-600 text-[8px] font-black mt-1">✓ Linked</div>
                          )}
                        </div>

                        {/* Offer Letter / Visa Scan */}
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={e => handleFileDrop(e, 'offer_letter_url')}
                          className="border border-dashed border-slate-200 hover:border-slate-800 rounded-xl p-2.5 text-center cursor-pointer relative bg-slate-50"
                        >
                          <input 
                            type="file" 
                            id="offer-upload-inp" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'offer_letter_url')}
                          />
                          <label htmlFor="offer-upload-inp" className="cursor-pointer block">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="text-[8px] font-black block text-slate-700 leading-tight">Offer Letter / Visa copy</span>
                          </label>
                          
                          {uploadProgress.offer_letter_url !== undefined && (
                            <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col justify-center px-2">
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="bg-orange-600 h-1 rounded-full" style={{ width: `${uploadProgress.offer_letter_url}%` }}></div>
                              </div>
                            </div>
                          )}
                          {(editingEmp?.offer_letter_url || addingEmp?.offer_letter_url) && (
                            <div className="text-teal-600 text-[8px] font-black mt-1">✓ Linked</div>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Modal Footer / Save bar */}
              <div className="pt-6 border-t-2 border-slate-200 flex justify-between items-center bg-white shrink-0 mt-6 select-none">
                <button
                  type="button"
                  onClick={() => { setEditingEmp(null); setAddingEmp(null); }}
                  className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  {activeFormTab !== 'corporate' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeFormTab === 'domestic') setActiveFormTab('corporate');
                        else if (activeFormTab === 'international') setActiveFormTab('domestic');
                      }}
                      className="px-6 py-3 text-xs font-black text-slate-600 uppercase tracking-widest hover:text-slate-900 duration-150 cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {activeFormTab !== 'international' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeFormTab === 'corporate') setActiveFormTab('domestic');
                        else if (activeFormTab === 'domestic') setActiveFormTab('international');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl shadow-xs duration-150 cursor-pointer"
                    >
                      Next Step
                    </button>
                  )}
                  {activeFormTab === 'international' && (
                    <button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl shadow-xs flex items-center gap-2 duration-150 cursor-pointer"
                    >
                      Save Profile Updates
                    </button>
                  )}
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
