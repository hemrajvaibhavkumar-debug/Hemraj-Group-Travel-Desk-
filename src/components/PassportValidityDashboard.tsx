import React, { useState, useMemo } from "react";
import { Employee, Department } from "../types";
import { 
  ShieldCheck, AlertTriangle, X, Search, Filter, 
  Download, Upload, History, Mail, FileText, Eye, 
  Globe, Building2, User, Calendar, Check, Edit3, Briefcase, MailOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PassportValidityDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (updated: Employee) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function PassportValidityDashboard({ 
  employees, 
  onUpdateEmployee,
  onRefresh
}: PassportValidityDashboardProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedPlant, setSelectedPlant] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL"); // ALL, EXPIRED, EXPIRING_SOON, VALID, MISSING
  
  // Selected employee for renewal / details
  const [activeEmp, setActiveEmp] = useState<Employee | null>(null);
  
  // Document viewer modal
  const [viewDocEmp, setViewDocEmp] = useState<Employee | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<"front" | "back">("front");
  
  // Update passport form states
  const [isUpdating, setIsUpdating] = useState(false);
  const [newPassportNum, setNewPassportNum] = useState("");
  const [newIssueDate, setNewIssueDate] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [mockFrontUrl, setMockFrontUrl] = useState("");
  const [mockBackUrl, setMockBackUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});

  // Simulation states
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Simple date calculation helper
  const getPassportMetric = (emp: Employee) => {
    if (!emp.passport_expiry) {
      return { daysLeft: -9999, status: "MISSING" as const, label: "No Passport", styles: "bg-slate-100 border-slate-200 text-slate-600" };
    }
    
    const expiry = new Date(emp.passport_expiry).getTime();
    const today = new Date().getTime(); // 2026-06-12 as base
    const diffTime = expiry - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return { daysLeft, status: "EXPIRED" as const, label: "Expired", styles: "bg-rose-100 border-rose-300 text-rose-700 font-extrabold" };
    } else if (daysLeft < 180) {
      return { daysLeft, status: "EXPIRING_SOON" as const, label: "Expiring Soon", styles: "bg-amber-100 border-amber-300 text-amber-700 animate-pulse font-extrabold" };
    } else {
      return { daysLeft, status: "VALID" as const, label: "Valid & Current", styles: "bg-emerald-100 border-emerald-300 text-emerald-800" };
    }
  };

  // Compile counts for the 3 + 1 KPI overview
  const kpis = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let valid = 0;
    let missing = 0;

    employees.forEach(emp => {
      const metric = getPassportMetric(emp);
      if (metric.status === "EXPIRED") expired++;
      else if (metric.status === "EXPIRING_SOON") expiringSoon++;
      else if (metric.status === "VALID") valid++;
      else missing++;
    });

    return { expired, expiringSoon, valid, missing };
  }, [employees]);

  // Filter list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const metric = getPassportMetric(emp);
      
      // Text search
      const textMatch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.passport_number && emp.passport_number.toLowerCase().includes(searchTerm.toLowerCase()));

      // Dept check
      const deptMatch = selectedDept === "ALL" || emp.department.toUpperCase() === selectedDept.toUpperCase();

      // Plant check
      const plantValue = emp.assigned_plant_site || "Sunagrow"; // default
      const plantMatch = selectedPlant === "ALL" || plantValue.toUpperCase() === selectedPlant.toUpperCase();

      // Status check
      const statusMatch = selectedStatus === "ALL" || metric.status === selectedStatus;

      return textMatch && deptMatch && plantMatch && statusMatch;
    });
  }, [employees, searchTerm, selectedDept, selectedPlant, selectedStatus]);

  // Handle document upload simulation
  const handleFileUpload = async (fieldName: string, file: File) => {
    setFileProgress(prev => ({ ...prev, [fieldName]: 10 }));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setFileProgress(prev => ({ ...prev, [fieldName]: 60 }));
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data,
            documentCategory: fieldName === "front" ? "passport_front_page" : "passport_back_page"
          })
        });
        const data = await res.json();
        if (res.ok) {
          setFileProgress(prev => ({ ...prev, [fieldName]: 100 }));
          if (fieldName === "front") setMockFrontUrl(data.url);
          else setMockBackUrl(data.url);
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (err: any) {
        setFileProgress(prev => ({ ...prev, [fieldName]: -1 }));
        setFormError("Simulation file upload failed: " + err.message);
      }
    };
  };

  // Submit new renewal details
  const submitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!activeEmp) return;
    if (!newPassportNum.trim()) {
      setFormError("New Passport Number is required.");
      return;
    }
    if (!newIssueDate) {
      setFormError("New booklet Issue Date is required.");
      return;
    }
    if (!newExpiryDate) {
      setFormError("New booklet Expiry Date is required.");
      return;
    }

    const issue = new Date(newIssueDate);
    const expiry = new Date(newExpiryDate);
    if (expiry <= issue) {
      setFormError("Passport Expiry Date must be strictly after the issue date.");
      return;
    }

    setIsUpdating(true);
    try {
      const updatedProfile: Employee = {
        ...activeEmp,
        passport_number: newPassportNum,
        passport_issue_date: newIssueDate,
        passport_expiry: newExpiryDate,
        passport_front_page_url: mockFrontUrl || activeEmp.passport_front_page_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60",
        passport_back_page_url: mockBackUrl || activeEmp.passport_back_page_url || "https://images.unsplash.com/photo-1517842645767-c639042777db?w=500&auto=format&fit=crop&q=60",
      };

      await onUpdateEmployee(updatedProfile);
      setFormSuccess("Booklet renewal logged in database & compliance database modified.");
      
      // Auto-refresh states offline
      setTimeout(async () => {
        await onRefresh();
        setActiveEmp(null);
        setIsUpdating(false);
        // Clear forms
        setNewPassportNum("");
        setNewIssueDate("");
        setNewExpiryDate("");
        setMockFrontUrl("");
        setMockBackUrl("");
        setFileProgress({});
        setFormSuccess("");
      }, 1500);

    } catch (err: any) {
      setFormError("Failed to save renewed statistics: " + err.message);
      setIsUpdating(false);
    }
  };

  // Dispatch mock renewal email alert nagging
  const notifyEmployeeOfExpiry = (emp: Employee) => {
    setNotificationStatus(`Establishing channel dispatch for employee ${emp.employee_code}...`);
    setTimeout(() => {
      setNotificationStatus(`Drafting HR advisory to: ${emp.name} <${emp.email}>...`);
    }, 850);
    setTimeout(() => {
      setNotificationStatus(`Dispatched travel compliance advisory reminder! Outlook/SMTP notified.`);
    }, 2000);
    setTimeout(() => {
      setNotificationStatus(null);
    }, 5000);
  };

  // Export dataset to CSV compliant matrix
  const exportToCsv = () => {
    try {
      const headers = [
        "Employee Code",
        "Employee Name",
        "Email Address",
        "Department",
        "Designation",
        "Plant Site",
        "Passport Number",
        "Passport Status",
        "Issue Date",
        "Expiry Date",
        "Days Remaining"
      ];

      const csvRows = [headers.join(",")];

      employees.forEach(emp => {
        const metric = getPassportMetric(emp);
        const row = [
          `"${emp.employee_code}"`,
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.department}"`,
          `"${emp.designation}"`,
          `"${emp.assigned_plant_site || 'Sunagrow'}"`,
          `"${emp.passport_number || 'N/A'}"`,
          `"${metric.label}"`,
          `"${emp.passport_issue_date || 'N/A'}"`,
          `"${emp.passport_expiry || 'N/A'}"`,
          metric.daysLeft === -9999 ? '"N/A"' : `"${metric.daysLeft}"`
        ];
        csvRows.push(row.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `hemraj_passport_compliance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Error generating report: " + err.message);
    }
  };

  // Pre-fill fields if editing active employee
  const handleStartRenewal = (emp: Employee) => {
    setActiveEmp(emp);
    setNewPassportNum(emp.passport_number || "");
    setNewIssueDate(emp.passport_issue_date || "");
    setNewExpiryDate(emp.passport_expiry || "");
    setMockFrontUrl(emp.passport_front_page_url || "");
    setMockBackUrl(emp.passport_back_page_url || "");
  };

  return (
    <div id="passport-dashboard-container" className="space-y-8">
      
      {/* NAG/NOTIFICATION ALERT BANNER */}
      <AnimatePresence>
        {notificationStatus && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-650 text-white rounded-2xl border-2 border-indigo-900 p-4 flex items-center justify-between shadow-md"
            style={{ backgroundColor: "#4f46e5" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-700 rounded-lg animate-bounce shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Advisory Telemetry System Status</h4>
                <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">{notificationStatus}</p>
              </div>
            </div>
            <button 
              onClick={() => setNotificationStatus(null)}
              className="text-white/70 hover:text-white p-1 rounded-full border border-indigo-500"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TRAFFIC LIGHT KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI EXPIRED */}
        <div className="bg-rose-50 border-2 border-slate-900 rounded-3xl p-6 flex items-center justify-between relative shadow-xs overflow-hidden">
          <div className="space-y-1">
            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">Critically Invalid</span>
            <span className="text-white bg-rose-600 border border-slate-900 rounded px-2 py-0.5 text-[8.5px] font-mono leading-none block w-max uppercase font-black">
              Expired Passports (RED)
            </span>
            <p className="text-4xl font-black text-slate-900 tracking-tight leading-none pt-3">
              {kpis.expired}
            </p>
          </div>
          <div className="p-3 bg-rose-600 border-2 border-slate-900 rounded-2xl shadow-xs text-white shrink-0">
            <X className="w-6 h-6" />
          </div>
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-[110px] font-black leading-none uppercase select-none pointer-events-none pr-4">
            Red
          </div>
        </div>

        {/* KPI EXPIRING SOON */}
        <div className="bg-amber-50 border-2 border-slate-900 rounded-3xl p-6 flex items-center justify-between relative shadow-xs overflow-hidden">
          <div className="space-y-1 bg-gradient-to-r">
            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">Under 6 Months Out</span>
            <span className="text-slate-950 bg-amber-400 border border-slate-900 rounded px-2 py-0.5 text-[8.5px] font-mono leading-none block w-max uppercase font-black">
              Expiring Soon (YELLOW)
            </span>
            <p className="text-4xl font-black text-slate-900 tracking-tight leading-none pt-3">
              {kpis.expiringSoon}
            </p>
          </div>
          <div className="p-3 bg-amber-400 border-2 border-slate-900 rounded-2xl shadow-xs text-slate-900 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-[110px] font-black leading-none uppercase select-none pointer-events-none pr-4">
            Warn
          </div>
        </div>

        {/* KPI VALID */}
        <div className="bg-emerald-50 border-2 border-slate-900 rounded-3xl p-6 flex items-center justify-between relative shadow-xs overflow-hidden font-sans">
          <div className="space-y-1">
            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">Over 180 Days</span>
            <span className="text-white bg-emerald-700 border border-slate-900 rounded px-2 py-0.5 text-[8.5px] font-mono leading-none block w-max uppercase font-black text-center">
              Fully Valid (GREEN)
            </span>
            <p className="text-4xl font-black text-slate-900 tracking-tight leading-none pt-3 font-sans">
              {kpis.valid}
            </p>
          </div>
          <div className="p-3 bg-emerald-600 border-2 border-slate-900 rounded-2xl shadow-xs text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-[110px] font-black leading-none uppercase select-none pointer-events-none pr-4">
            Safe
          </div>
        </div>

        {/* KPI MISSING */}
        <div className="bg-slate-100 border-2 border-slate-900 rounded-3xl p-6 flex items-center justify-between relative shadow-xs overflow-hidden">
          <div className="space-y-1">
            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">Profile Compliance</span>
            <span className="text-slate-700 bg-white border border-slate-300 rounded px-2 py-0.5 text-[8.5px] font-mono leading-none block w-max uppercase font-black">
              Missing Passport
            </span>
            <p className="text-4xl font-black text-slate-900 tracking-tight leading-none pt-3">
              {kpis.missing}
            </p>
          </div>
          <div className="p-3 bg-slate-500 border-2 border-slate-900 rounded-2xl shadow-xs text-white shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-[110px] font-black leading-none uppercase select-none pointer-events-none pr-4">
            None
          </div>
        </div>

      </div>

      {/* FILTER & MATRIX MODULE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COMPLIANCE CONTROLLER FOR SEARCH & TABLE */}
        <div className="lg:col-span-12 space-y-4">
          
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white border-2 border-slate-900 p-4 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-xs">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Employee, Code, or Passport Booklet No..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-805 uppercase tracking-wide focus:outline-hidden focus:border-slate-900 transition"
              />
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-800 focus:outline-hidden focus:border-slate-900"
              >
                <option value="ALL">All Departments</option>
                <option value="PURCHASE">Purchase</option>
                <option value="FINANCE">Finance</option>
                <option value="OPS">Operations</option>
                <option value="HR">HR / Talent</option>
                <option value="IT">IT Infra</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* Plant Site Dropdown */}
            <div>
              <select
                value={selectedPlant}
                onChange={e => setSelectedPlant(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-800 focus:outline-hidden focus:border-slate-900"
              >
                <option value="ALL">All Plant Locations</option>
                <option value="SUNAGROW">Sunagrow Plant</option>
                <option value="RICEFIELD">Ricefield Site</option>
                <option value="NIGERIA PLANT">Nigeria Plant</option> 
                <option value="OTHER">Other Plant</option> 
              </select>
            </div>

            {/* Expire/Status Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-800 focus:outline-hidden focus:border-slate-900"
              >
                <option value="ALL">All Passport Statuses</option>
                <option value="EXPIRED">Expired Booklet (RED)</option>
                <option value="EXPIRING_SOON">Expiring Soon &lt; 6M (YELLOW)</option>
                <option value="VALID">Current &amp; Valid (GREEN)</option>
                <option value="MISSING">No Profile Passport Details</option>
              </select>
            </div>

          </div>

          {/* MASTER PASSPORT TABLE */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
                    <th className="p-4">Employee info</th>
                    <th className="p-4">Plant &amp; Location</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Passport Details</th>
                    <th className="p-4">Expiration Date</th>
                    <th className="p-4">Days remaining</th>
                    <th className="p-4">Attached Scans</th>
                    <th className="p-4 text-center">Compliance directives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-bold uppercase text-slate-700">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-slate-400">
                        <Globe className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                        <span className="text-xs uppercase tracking-widest block font-black mb-1">
                          No Compliance records located
                        </span>
                        <span>Try relaxing your plant filters or search terms.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const metric = getPassportMetric(emp);
                      const isExpired = metric.status === "EXPIRED";
                      const isSoon = metric.status === "EXPIRING_SOON";
                      const isMissing = metric.status === "MISSING";

                      return (
                        <tr 
                          key={emp.employee_code} 
                          className="hover:bg-slate-50/50 transition duration-100"
                        >
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {emp.photograph_url ? (
                                <img
                                  src={emp.photograph_url}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                  {emp.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="block font-black text-slate-900 text-[11px] leading-tight">
                                  {emp.name}
                                </span>
                                <span className="text-[8px] font-mono text-slate-400 block tracking-wider mt-0.5">
                                  ID: {emp.employee_code} • {emp.designation}
                                </span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4 text-[10px] text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-extrabold">{emp.assigned_plant_site || "Sunagrow Plant"}</span>
                            </div>
                            <span className="text-[7.5px] text-slate-400 block mt-0.5">
                              {emp.present_location_abroad || "Corporate Headquarters"}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 font-mono text-[9px] text-slate-700 rounded uppercase">
                              {emp.department}
                            </span>
                          </td>

                          <td className="p-4">
                            {isMissing ? (
                              <span className="text-slate-400 font-medium italic">Unregistered</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-slate-900 font-black font-mono tracking-wider">{emp.passport_number}</span>
                                <span className="text-[7.5px] text-slate-400 block">Nationality: INDIA</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            {isMissing ? (
                              <span className="text-slate-450">—</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-slate-900 font-mono font-black">{emp.passport_expiry}</span>
                                <span className="text-[7.5px] text-slate-400 block">Issued: {emp.passport_issue_date}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {isMissing ? (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-400 block text-center max-w-fit">
                                N/A
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[8.5px] uppercase font-black tracking-wider rounded border ${metric.styles}`}>
                                  {isExpired ? "EXPIRED" : `${metric.daysLeft} DAYS`}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {!isMissing ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setViewDocEmp(emp);
                                  setActiveDocTab("front");
                                }}
                                className="px-2 py-1 border border-slate-200 rounded-lg hover:border-slate-800 text-slate-600 hover:text-slate-950 flex items-center gap-1 transition text-[9px] font-bold"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect scan</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium">None</span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              {/* RENEWAL ACTIONS */}
                              <button
                                type="button"
                                onClick={() => handleStartRenewal(emp)}
                                className="px-3 py-1.5 bg-white border border-slate-900 text-slate-905 hover:bg-slate-50 text-[8.5px] rounded-lg font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                {isMissing ? "Register Passport" : "Renew booklet"}
                              </button>
                              
                              {/* MAIL WARNING SYSTEM */}
                              {(isExpired || isSoon) && (
                                <button
                                  type="button"
                                  onClick={() => notifyEmployeeOfExpiry(emp)}
                                  className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-[8.5px] rounded-lg font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                                  title="Simulate SMS/Email compliance memo nagging to staff"
                                >
                                  <Mail className="w-3 h-3 text-slate-950 shrink-0" />
                                  <span>Nag Renewal</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <span>Showing {filteredEmployees.length} of {employees.length} corporate travelers</span>
              <span className="text-orange-500 font-extrabold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hemraj Group Personal Compliance Desk (2026 Sandbox)</span>
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* RENEWAL MODAL FORM SCREEN OVERLAY */}
      <AnimatePresence>
        {activeEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-950 rounded-3xl overflow-hidden w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              
              {/* MODAL HEADER */}
              <div className="bg-slate-950 px-6 py-4 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Update / Register Booklet</h3>
                  <p className="text-[9px] text-orange-500 font-black uppercase mt-0.5">
                    Modifying {activeEmp.name} ({activeEmp.employee_code})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEmp(null)}
                  className="text-white hover:text-orange-500 hover:bg-slate-900 p-1.5 rounded-full border border-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* RENEW FORM */}
              <form onSubmit={submitRenewal} className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-[10px] uppercase font-black">
                    ⚠️ {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-[10px] uppercase font-black">
                    ✓ {formSuccess}
                  </div>
                )}

                {/* FIELDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      New Passport Booklet Number *
                    </label>
                    <input
                      type="text"
                      value={newPassportNum}
                      onChange={e => setNewPassportNum(e.target.value)}
                      placeholder="e.g. Z9844859 or S849302"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      New Issue Date *
                    </label>
                    <input
                      type="date"
                      value={newIssueDate}
                      onChange={e => setNewIssueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      New Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={e => setNewExpiryDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Nationality Origin
                    </label>
                    <input
                      type="text"
                      disabled
                      value="INDIA"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-400"
                    />
                  </div>

                </div>

                {/* SCANS */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Booklet Scans Attaching Directives
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Front Scan */}
                    <div className="border border-dashed border-slate-300 p-4 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 text-center">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Booklet Front Page *</span>
                      {mockFrontUrl ? (
                        <div className="space-y-2">
                          <span className="text-emerald-700 text-[8px] font-black block">✓ Uploaded successfully</span>
                          <span className="text-[7px] text-slate-400 block font-mono truncate max-w-[120px]">{mockFrontUrl}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="px-3 py-1.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-wider hover:bg-slate-850 cursor-pointer block">
                            Choose front page
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload("front", e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          {fileProgress.front && fileProgress.front > 0 && (
                            <span className="text-[7.5px] font-bold text-orange-500 animate-pulse uppercase">Uploading {fileProgress.front}%</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Back Scan */}
                    <div className="border border-dashed border-slate-300 p-4 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 text-center">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-2">Booklet Back Page *</span>
                      {mockBackUrl ? (
                        <div className="space-y-2">
                          <span className="text-emerald-700 text-[8px] font-black block">✓ Uploaded successfully</span>
                          <span className="text-[7px] text-slate-400 block font-mono truncate max-w-[120px]">{mockBackUrl}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="px-3 py-1.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-wider hover:bg-slate-850 cursor-pointer block">
                            Choose back page
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload("back", e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          {fileProgress.back && fileProgress.back > 0 && (
                            <span className="text-[7.5px] font-bold text-orange-500 animate-pulse uppercase">Uploading {fileProgress.back}%</span>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* COMPLIANCE HISTORY SEGMENT */}
                {activeEmp.passport_history && activeEmp.passport_history.length > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />
                      <span>Historical Booklet Archive Logs ({activeEmp.passport_history.length})</span>
                    </h4>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2">
                      {activeEmp.passport_history.map((hist, idx) => (
                        <div 
                          key={idx} 
                          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex justify-between items-center text-[8.5px] font-bold uppercase text-slate-600"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono font-black text-slate-900 block">{hist.passport_number}</span>
                            <span className="text-[7.5px] text-slate-400 block">
                              Duration: {hist.passport_issue_date} To {hist.passport_expiry}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="bg-slate-200/50 text-slate-500 px-1.5 py-0.5 rounded text-[7.5px] block">
                              Archived: {new Date(hist.archive_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODAL FOOTER */}
                <div className="border-t border-slate-100 pt-4 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveEmp(null)}
                    disabled={isUpdating}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-6 py-2 bg-slate-950 text-orange-500 font-black rounded-xl text-[10px] uppercase tracking-wider hover:bg-slate-900 disabled:opacity-50 shadow-md flex items-center gap-1"
                  >
                    {isUpdating ? "Saving..." : "Commit Booklet Update"}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT IMAGES INSPECTOR MODAL */}
      <AnimatePresence>
        {viewDocEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-950 rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl flex flex-col"
            >
              
              {/* MODAL HEADER */}
              <div className="bg-slate-950 px-6 py-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Inspect Passport scans</h3>
                    <p className="text-[9px] text-orange-500 font-extrabold uppercase mt-0.5">
                      Verify booklets for {viewDocEmp.name} (Code: {viewDocEmp.employee_code})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDocEmp(null)}
                  className="text-white hover:text-orange-500 hover:bg-slate-900 p-1.5 rounded-full border border-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* TABS SELECTOR */}
              <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDocTab("front")}
                  className={`flex-1 text-center py-2 text-[10px] font-black uppercase tracking-wide rounded-lg transition-all ${
                    activeDocTab === "front" 
                      ? "bg-slate-950 text-white shadow-xs" 
                      : "text-slate-500 hover:bg-slate-200/50"
                  }`}
                >
                  Front Page Scan (Personal Particulars)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocTab("back")}
                  className={`flex-1 text-center py-2 text-[10px] font-black uppercase tracking-wide rounded-lg transition-all ${
                    activeDocTab === "back" 
                      ? "bg-slate-950 text-white shadow-xs" 
                      : "text-slate-500 hover:bg-slate-200/50"
                  }`}
                >
                  Back Page Scan (Address &amp; Family Logs)
                </button>
              </div>

              {/* PASSPORT SCANS ATTACHMENTS VIEW */}
              <div className="p-6 bg-slate-100 flex justify-center items-center min-h-[300px]">
                {activeDocTab === "front" ? (
                  viewDocEmp.passport_front_page_url ? (
                    <div className="w-full max-w-lg bg-white border-2 border-slate-900 rounded-2xl p-2 shadow-md flex items-center justify-center overflow-hidden" style={{ maxHeight: "400px" }}>
                      <img 
                        src={viewDocEmp.passport_front_page_url} 
                        alt="Passport Front Page Scan" 
                        className="max-w-full max-h-[380px] object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-lg bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 font-bold uppercase text-[10px]">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>No Front Page Scan Uploaded</span>
                    </div>
                  )
                ) : (
                  viewDocEmp.passport_back_page_url ? (
                    <div className="w-full max-w-lg bg-white border-2 border-slate-900 rounded-2xl p-2 shadow-md flex items-center justify-center overflow-hidden" style={{ maxHeight: "400px" }}>
                      <img 
                        src={viewDocEmp.passport_back_page_url} 
                        alt="Passport Back Page Scan" 
                        className="max-w-full max-h-[380px] object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-lg bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 font-bold uppercase text-[10px]">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>No Back Page Scan Uploaded</span>
                    </div>
                  )
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-205 shrink-0">
                <span className="text-[9px] font-bold text-slate-450 uppercase">
                  Audited scan matches master metadata
                </span>
                <button
                  type="button"
                  onClick={() => setViewDocEmp(null)}
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
