import React, { useState, useMemo } from "react";
import { TravelIndent, Employee, PriorityLevel, TravelCategory, JobCard, Vendor } from "../types";
import EmployeeProfileModal from "./EmployeeProfileModal";
import { 
  Briefcase, Compass, Users, FileText, Database, Search, Filter, 
  Trash2, Edit, AlertCircle, Calendar, MapPin, BadgeHelp, Check, 
  MessageSquare, Loader2, ArrowUpRight, TrendingUp, HelpCircle, ArrowRight, FileCheck2,
  Building2, Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePersistedState } from "../hooks/usePersistedState";

interface IndentConsoleProps {
  indents: TravelIndent[];
  employees: Employee[];
  jobCards: JobCard[];
  vendors: Vendor[];
  schemaSql: string;
  onDeleteIndent: (id: string) => Promise<void>;
  onEditIndent: (indent: TravelIndent) => Promise<void>;
  onDeleteEmployee: (code: string) => Promise<void>;
  onEditEmployee: (employee: Employee) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
  onUpdateVendor: (vendor: Vendor) => Promise<void>;
  onCreateNewClick: () => void;
  onApproveAndCreateJobCard?: (indent: TravelIndent) => Promise<void>;
}

export default function IndentConsole({ 
  indents, 
  employees, 
  jobCards,
  vendors,
  schemaSql,
  onDeleteIndent, 
  onEditIndent,
  onDeleteEmployee,
  onEditEmployee,
  onDeleteVendor,
  onUpdateVendor,
  onCreateNewClick,
  onApproveAndCreateJobCard
}: IndentConsoleProps) {
  // Filters & Search state
  const [searchQuery, setSearchQuery] = usePersistedState("indent-console-search-query", "");
  const [selectedCategory, setSelectedCategory] = usePersistedState("indent-console-category", "ALL");
  const [selectedPriority, setSelectedPriority] = usePersistedState("indent-console-priority", "ALL");
  const [activeTab, setActiveTab] = usePersistedState<"indents" | "employees" | "vendors" | "schema" | "simulation" | "approvals">("indent-console-tab", "indents");
  
  // Edit Indent state
  const [editingIndent, setEditingIndent] = useState<TravelIndent | null>(null);
  const [editForm, setEditForm] = useState<Partial<TravelIndent>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);

  // Voiding and Restore states
  const [voidingIndent, setVoidingIndent] = useState<TravelIndent | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingIndent) return;
    setSubmittingVoid(true);
    try {
      await onEditIndent({
        ...voidingIndent,
        voided: true,
        void_reason: voidReasonInput.trim() || "Cancelled by corporate administrator"
      });
      setVoidingIndent(null);
      setVoidReasonInput("");
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmittingVoid(false);
    }
  };

  const handleRestoreIndent = async (indent: TravelIndent) => {
    try {
      await onEditIndent({
        ...indent,
        voided: false,
        void_reason: undefined
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // SQL Query simulation state
  const [queryInput, setQueryInput] = useState("SELECT * FROM travel_indents ORDER BY created_at DESC;");
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState("");

  // Statistics calculation
  const stats = useMemo(() => {
    const totalIndents = indents.length;
    const activeCount = indents.length;
    const voidedCount = indents.filter(i => i.voided).length;
    const internationalCount = indents.filter(i => i.travel_type.startsWith("INTERNATIONAL")).length;
    const criticalCount = indents.filter(i => i.priority === "CRITICAL").length;
    const employeesCount = employees.length;
    const vendorsCount = vendors.length;
    const totalApprovedAmount = jobCards
      .filter(jc => jc.approvalStatus === 'APPROVED' && jc.financeCleared && typeof jc.finalBookingAmount === 'number')
      .reduce((sum, jc) => sum + jc.finalBookingAmount!, 0);

    return { totalIndents, activeCount, voidedCount, internationalCount, criticalCount, employeesCount, vendorsCount, totalApprovedAmount };
  }, [indents, employees, vendors, jobCards]);

  // Combine indents and employee info for search and indexing
  const detailedIndents = useMemo(() => {
    return indents.map(ind => {
      const emp = employees.find(e => e.employee_code === ind.employee_code);
      return {
        ...ind,
        employeeName: emp ? emp.name : "Unknown Employee",
        employeeDept: emp ? emp.department : "Unknown Dept",
        employeeDesignation: emp ? emp.designation : "N/A"
      };
    });
  }, [indents, employees]);

  // Filter list
  const filteredIndents = useMemo(() => {
    return detailedIndents.filter(item => {
      const matchSearch = 
        item.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === "ALL" || item.travel_type === selectedCategory;
      const matchPriority = selectedPriority === "ALL" || item.priority === selectedPriority;

      return matchSearch && matchCategory && matchPriority;
    });
  }, [detailedIndents, searchQuery, selectedCategory, selectedPriority]);

  const handleEditClick = (indent: TravelIndent) => {
    setEditingIndent(indent);
    setEditForm({
      id: indent.id,
      travel_type: indent.travel_type,
      priority: indent.priority,
      travel_date: indent.travel_date,
      nearest_boarding_point: indent.nearest_boarding_point,
      source_location: indent.source_location,
      destination: indent.destination,
      purpose: indent.purpose
    });
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndent) return;
    setIsSavingEdit(true);
    setEditError("");
    try {
      await onEditIndent({
        ...editingIndent,
        ...editForm
      } as TravelIndent);
      setEditingIndent(null);
    } catch (err: any) {
      setEditError(err.message || "Could not complete update edit.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Run a mock SQL simulator using actual frontend state database records
  const runSimulatedSQL = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError("");
    setQueryResult([]);
    
    const query = queryInput.trim().toUpperCase();
    
    // Simplistic mock SELECT evaluation to demonstrate constraint rules and state
    if (!query.startsWith("SELECT")) {
      setQueryError("Syntax Error: Only read-only SELECT statements are supported in this desk sandbox simulator.");
      return;
    }

    try {
      if (query.includes("FROM TRAVEL_INDENTS")) {
        let results = [...indents];
        if (query.includes("ORDER BY CREATED_AT DESC")) {
          results.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        if (query.includes("WHERE PRIORITY = 'CRITICAL'")) {
          results = results.filter(i => i.priority === "CRITICAL");
        }
        setQueryResult(results);
      } else if (query.includes("FROM EMPLOYEES")) {
        setQueryResult(employees);
      } else {
        setQueryError("Table Not Found: SQLite sandbox supports SELECT directly from 'travel_indents' or 'employees' schemas.");
      }
    } catch (err: any) {
      setQueryError(err.message || "Unknown error executing statement.");
    }
  };

  return (
    <div id="indent-console-panel" className="space-y-8">
      
      {/* Dynamic Statistics Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Indents */}
        <div id="stat-card-total" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-950 block uppercase tracking-widest leading-none mb-1">Active Indents</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-sans tracking-tighter text-slate-900">{stats.activeCount}</span>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2 py-0.5" title="Requests flagged VOID (Cancel Return Ticket)">
                {stats.voidedCount} VOID (Cancel Return)
              </span>
            </div>
          </div>
        </div>

        {/* International Flights */}
        <div id="stat-card-intl" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-950 block uppercase tracking-widest leading-none mb-1">International</span>
            <span className="text-3xl font-black font-sans tracking-tighter text-slate-900">{stats.internationalCount}</span>
          </div>
        </div>

        {/* Critical Priority */}
        <div id="stat-card-critical" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-950 block uppercase tracking-widest leading-none mb-1">Critical Priority</span>
            <span className="text-3xl font-black font-sans tracking-tighter text-slate-900">{stats.criticalCount}</span>
          </div>
        </div>

        {/* Total Approved Amount */}
        <div id="stat-card-approved-amount" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-950 block uppercase tracking-widest leading-none mb-1">Total Approved Amount</span>
            <span className="text-3xl font-black font-sans tracking-tighter text-slate-900">₹{stats.totalApprovedAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* Main Console Navigation Tabs */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3.5">
          <button
            onClick={() => setActiveTab("indents")}
            id="tab-view-indents"
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 rounded-t-xl flex items-center gap-2 ${
              activeTab === "indents" 
                ? "border-slate-900 text-slate-900 bg-white shadow-xs" 
                : "border-transparent text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Active Indents Console
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            id="tab-view-employees"
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 rounded-t-xl flex items-center gap-2 ${
              activeTab === "employees" 
                ? "border-slate-900 text-slate-900 bg-white shadow-xs" 
                : "border-transparent text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Traveler Profiles Master
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            id="tab-view-vendors"
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 rounded-t-xl flex items-center gap-2 ${
              activeTab === "vendors" 
                ? "border-slate-900 text-slate-900 bg-white shadow-xs" 
                : "border-transparent text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Vendor Partners
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            id="tab-view-schema"
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 rounded-t-xl flex items-center gap-2 ${
              activeTab === "schema" 
                ? "border-slate-900 text-slate-900 bg-white shadow-xs" 
                : "border-transparent text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            01_schema.sql Inspector
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            id="tab-view-simulator"
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 rounded-t-xl flex items-center gap-2 ${
              activeTab === "simulation" 
                ? "border-slate-900 text-slate-900 bg-white shadow-xs" 
                : "border-transparent text-slate-900 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            SQL Statement Sandbox
          </button>
        </div>

        <div className="p-8">
          {/* Active Indents tab */}
          {activeTab === "indents" && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row gap-4 items-center justify-between pb-2">
                <div className="relative w-full xl:max-w-md">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-900" />
                  <input
                    type="text"
                    id="input-search-query"
                    placeholder="Search traveler ID, destination, name or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto justify-end">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <Filter className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Category:</span>
                    <select
                      id="filter-category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="ALL">ALL CATEGORIES</option>
                      <option value="DOMESTIC">DOMESTIC</option>
                      <option value="INTERNATIONAL">INTERNATIONAL</option>
                      <option value="INTERNATIONAL_RETURN">INTERNATIONAL RETURN</option>
                      <option value="SL">SL (SICK LEAVE)</option>
                      <option value="LOCAL">LOCAL RUN</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <Filter className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Priority:</span>
                    <select
                      id="filter-priority"
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="ALL">ALL PRIORITIES</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <button
                    onClick={onCreateNewClick}
                    id="btn-raise-indent"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-full shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    + Raise Travel Indent
                  </button>
                </div>
              </div>

              {/* Indents Table/Grid display */}
              {filteredIndents.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <BadgeHelp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-extrabold text-xs uppercase tracking-wider">No active travel indents found matching parameters.</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); setSelectedPriority("ALL"); }} className="text-orange-600 hover:underline font-black text-xs uppercase mt-3 block mx-auto tracking-widest">Reset Desk Filters</button>
                </div>
              ) : (
                <div id="indents-list" className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-950">
                        <th className="px-6 py-4">Indent ID</th>
                        <th className="px-6 py-4">Traveler</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Travel Date</th>
                        <th className="px-6 py-4">Route (From → To)</th>
                        <th className="px-6 py-4">Raiser</th>
                        <th className="px-6 py-4">Approver</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-bold">
                      {filteredIndents.map((indent) => {
                        const isVoided = !!indent.voided;
                        return (
                          <tr key={indent.id} className={`transition ${isVoided ? "bg-orange-50/20 hover:bg-orange-50/35" : "hover:bg-slate-50/70"}`}>
                            <td className="px-6 py-4.5">
                              <span className="font-mono text-xs font-black block text-slate-900">{indent.id}</span>
                              {isVoided && (
                                <span className="inline-block text-[8px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase mt-1">
                                  ⚠️ VOID: Cancel Return
                                </span>
                              )}
                              <div className="text-[9px] text-slate-950 flex items-center gap-1 font-mono font-bold uppercase mt-0.5">
                                <span>GST: {indent.gst_applicable ? "Yes" : "No"}</span>
                                {indent.plant && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-orange-600 font-extrabold bg-orange-50 px-1 border border-orange-100 rounded">{indent.plant}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td 
                              className="px-6 py-4.5 cursor-pointer hover:bg-slate-100/70 transition-colors group"
                              onClick={() => {
                                const emp = employees.find(e => e.employee_code === indent.employee_code);
                                if (emp) setProfileEmployee(emp);
                              }}
                              title="Click to view full employee profile and travel history"
                            >
                              <span className="font-black block text-sm group-hover:text-orange-600 transition-colors flex items-center gap-1 text-slate-900">
                                <span>{indent.employeeName}</span>
                                <span className="text-[10px] text-slate-300 group-hover:text-orange-500 font-mono">ℹ️</span>
                              </span>
                              <span className="text-[10px] text-slate-950 block font-black uppercase tracking-wider">{indent.employeeDesignation} ({indent.employee_code})</span>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`inline-block px-2.5 py-1 rounded font-black text-[9px] uppercase tracking-wider ${
                                indent.travel_type === "DOMESTIC" ? "bg-slate-100 text-slate-900 border border-slate-200" :
                                indent.travel_type.startsWith("INTERNATIONAL") ? "bg-slate-900 text-white" :
                                "bg-orange-100 text-orange-900 border border-orange-200"
                              }`}>
                                {indent.travel_type.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`inline-block px-2.5 py-1 rounded font-black text-[9px] uppercase tracking-wider ${
                                indent.priority === "LOW" ? "bg-slate-100 text-slate-600" :
                                indent.priority === "MEDIUM" ? "bg-slate-200 text-slate-800" :
                                indent.priority === "HIGH" ? "bg-orange-100 text-orange-950 border border-orange-200" :
                                "bg-orange-600 text-white"
                              }`}>
                                {indent.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className="block font-black text-slate-900">{indent.travel_date}</span>
                              <span className="text-[9px] text-slate-950 block font-black uppercase tracking-wider">Visa: {indent.visa_type}</span>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-1.5 font-black text-slate-900">
                                <span className="text-slate-950">{indent.source_location}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-slate-950">{indent.destination}</span>
                              </div>
                              <span className="text-[10px] block text-slate-950 font-black max-w-xs truncate uppercase mt-0.5">{indent.purpose}</span>
                              {isVoided && indent.void_reason && (
                                <span className="text-[9.5px] block text-orange-600 font-semibold uppercase mt-1 max-w-xs truncate" title={indent.void_reason}>
                                  Cancel Specifics: "{indent.void_reason}"
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className="block font-black text-slate-800 text-xs">{indent.indent_raiser || "N/A"}</span>
                              <span className="text-[9px] font-mono text-slate-400 font-black uppercase font-bold">Raised By</span>
                            </td>
                            <td className="px-6 py-4.5">
                              {(() => {
                                const emp = employees.find(e => e.employee_code === indent.employee_code);
                                return (
                                  <>
                                    <span className="block font-black text-slate-800 text-xs">{emp?.default_travel_approver || "N/A"}</span>
                                    <span className="text-[9px] font-mono text-slate-400 font-black uppercase font-bold">Cost Center: {emp?.cost_centre || "HEMRAJ-HQ"}</span>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {onApproveAndCreateJobCard && (
                                  <button
                                    onClick={() => onApproveAndCreateJobCard(indent)}
                                    title="Approve & Send to Job Card Tracking Desk"
                                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-950 text-white hover:bg-orange-600 duration-150 rounded-xl transition flex items-center gap-1 font-black uppercase text-[8px] tracking-wider"
                                  >
                                    <Check className="w-3.5 h-3.5 text-orange-500" />
                                    <span>APPROVE & SEND TO JC</span>
                                  </button>
                                )}

                                {isVoided ? (
                                  <button
                                    onClick={() => handleRestoreIndent(indent)}
                                    id={`restore-indent-${indent.id}`}
                                    title="Remove VOID instruction flag"
                                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 duration-150 rounded-xl transition flex items-center font-black uppercase text-[8px] tracking-wider whitespace-nowrap"
                                  >
                                    <span>Remove VOID</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setVoidingIndent(indent)}
                                    id={`void-indent-${indent.id}`}
                                    title="Mark as VOID (Cancel return ticket after booking)"
                                    className="px-2.5 py-1.5 bg-orange-50 border border-orange-350 text-orange-850 hover:bg-orange-100 duration-150 rounded-xl transition flex items-center font-black uppercase text-[8px] tracking-wider whitespace-nowrap"
                                  >
                                    <span>Mark VOID</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleEditClick(indent)}
                                  title="Edit Indent Form"
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete Travel Indent ${indent.id}?`)) {
                                      onDeleteIndent(indent.id);
                                    }
                                  }}
                                  title="Delete Indent"
                                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Master Traveler Profiles tab */}
          {activeTab === "employees" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Hemraj Group Master Employees Directory</h4>
                <button
                  onClick={onCreateNewClick}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition"
                >
                  + Add Employee Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {employees.map(emp => (
                  <div key={emp.employee_code} className="bg-white border-2 border-slate-200 p-6 rounded-3xl shadow-sm relative flex gap-5 hover:border-orange-500/40 transition">
                    {emp.photograph_url ? (
                      <img
                        src={emp.photograph_url}
                        alt="Employee photo"
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0 uppercase tracking-tighter border-2 border-orange-500">
                        {emp.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-xs space-y-1 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base block">{emp.name}</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  // For now, satisfy with modal view, but could add edit mode
                                  setProfileEmployee(emp);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-900 transition"
                                title="Edit Profile"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => onDeleteEmployee(emp.employee_code)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Delete Profile"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">CODE: {emp.employee_code}</span>
                        </div>
                        <span className="bg-slate-900 text-white font-black px-2.5 py-1 rounded text-[9px] uppercase tracking-wider">
                          {emp.department}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-150 text-[11px] font-bold">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest">Designation</span>
                          <span className="text-slate-900 font-extrabold truncate block max-w-[150px]">{emp.designation}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest">Approver</span>
                          <span className="text-slate-900 font-extrabold block">{emp.default_travel_approver}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest">Contact WhatsApp</span>
                          <span className="text-slate-900 font-extrabold font-mono block">{emp.phone}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest">Cost Center</span>
                          <span className="text-slate-900 font-extrabold block">{emp.cost_centre} ({emp.default_billing_currency})</span>
                        </div>
                      </div>

                      {/* Display conditional passport details to show high density data verification */}
                      {emp.passport_number && (
                        <div className="mt-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono grid grid-cols-2 gap-1 text-slate-500 font-bold uppercase tracking-wide">
                          <div>PP NO: <strong className="text-slate-900 font-black">{emp.passport_number}</strong></div>
                          <div>VISA REGION: <strong className="text-slate-900 font-black">{emp.visa_country || "India"}</strong></div>
                          <div>POLIO STATE: <strong className="text-orange-600 font-black">{emp.polio_certificate_expiry || "Valid"}</strong></div>
                          <div>YFV STATE: <strong className="text-orange-600 font-black">{emp.yfv_certificate_expiry || "Valid"}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Partners Master tab */}
          {activeTab === "vendors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Approved Travel Agency & Vendor Partners</h4>
                <div className="flex gap-2">
                   <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-black uppercase tracking-widest">Global Master Data</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="bg-white border-2 border-slate-200 p-6 rounded-3xl shadow-sm relative flex flex-col gap-4 hover:border-indigo-500/40 transition group">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove vendor ${vendor.name}?`)) {
                              onDeleteVendor(vendor.id);
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Blacklist/Remove Vendor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                       <h3 className="text-base font-extrabold text-slate-950 truncate tracking-tight">{vendor.name}</h3>
                       <p className="text-[10px] text-slate-400 font-mono font-black uppercase">{vendor.id}</p>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-100 text-[11px] font-bold">
                       <div className="flex items-center gap-2 text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="truncate">{(vendor.emails || []).join(", ")}</span>
                       </div>
                       <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] uppercase font-black">{(vendor.categories || []).join(", ")} Service</span>
                       </div>
                    </div>

                    <div className="mt-auto pt-4 flex gap-2">
                       <button 
                         onClick={() => onUpdateVendor(vendor)}
                         className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition shadow-xs"
                       >
                         Manage Agents
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* raw schema viewer tab */}
          {activeTab === "schema" && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-3xl p-6 text-white font-mono text-xs overflow-x-auto relative border-2 border-slate-950">
                <div className="absolute right-4 top-4 bg-orange-600 text-white text-[9px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
                  PostgreSQL / SQLite Compliance
                </div>
                <h4 className="text-sm font-black text-slate-300 mb-4 block border-b border-white/10 pb-3 uppercase tracking-wider">📂 /src/db/01_schema.sql</h4>
                <pre className="leading-relaxed select-all text-orange-200 font-bold">{schemaSql || "-- Fetching SQL schema content..."}</pre>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider italic">This is the authoritative relational schema structure generated on boot to manage strict database normalization, constraints, and data integrity.</p>
            </div>
          )}

          {/* SQL Sandbox Simulation Tab */}
          {activeTab === "simulation" && (
            <div className="space-y-6">
              <div className="p-5 bg-orange-50 border border-orange-200 rounded-2xl text-orange-950 text-xs flex gap-3 font-bold">
                <TrendingUp className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Relational DB Constraints Live Sandbox:</strong> Hemraj personal travel desk maps all client form submissions into direct transactional inserts. You can simulation-query raw table structures live to examine records.
                </div>
              </div>

              <form onSubmit={runSimulatedSQL} className="space-y-3">
                <div>
                  <label htmlFor="input-sql-statement" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Execute SELECT SQL query in sandbox *
                  </label>
                  <div className="flex gap-3">
                    <input
                      id="input-sql-statement"
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      className="flex-1 bg-slate-900 border-2 border-slate-950 text-orange-300 font-mono text-xs rounded-xl px-4 py-3.5 focus:outline-none focus:border-orange-500 font-bold"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition"
                    >
                      Run Query
                    </button>
                  </div>
                </div>
              </form>

              {/* Simulation Result */}
              {queryError && (
                <div className="bg-orange-50 border border-orange-200 text-orange-950 p-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wide">
                  {queryError}
                </div>
              )}

              {queryResult && (
                <div className="bg-slate-900 p-5 rounded-3xl text-orange-100 font-mono text-xs overflow-x-auto border-2 border-slate-950">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-3 border-b border-white/10 pb-1.5 tracking-widest select-none">
                    Result Output ({queryResult.length} rows returned)
                  </span>
                  <pre className="font-bold">{JSON.stringify(queryResult, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL FOR TRAVEL INDENT */}
      <AnimatePresence>
        {editingIndent && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full p-8 border-2 border-slate-900 shadow-2xl relative"
            >
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-500" />
                Modify Travel Indent <span className="text-slate-400">({editingIndent.id})</span>
              </h3>

              {editError && (
                <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl text-orange-950 text-xs font-black uppercase tracking-wider">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-5 text-xs font-bold text-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Travel Category</label>
                    <select
                      value={editForm.travel_type}
                      onChange={(e) => setEditForm({ ...editForm, travel_type: e.target.value as TravelCategory })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold"
                    >
                      <option value="DOMESTIC">DOMESTIC</option>
                      <option value="INTERNATIONAL">INTERNATIONAL</option>
                      <option value="INTERNATIONAL_RETURN">INTERNATIONAL RETURN</option>
                      <option value="SL">SL (SICK LEAVE)</option>
                      <option value="LOCAL">LOCAL RUN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Priority Level</label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as PriorityLevel })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Expected Travel Date</label>
                    <input
                      type="date"
                      value={editForm.travel_date}
                      onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-black font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Boarding Point</label>
                    <input
                      type="text"
                      value={editForm.nearest_boarding_point}
                      onChange={(e) => setEditForm({ ...editForm, nearest_boarding_point: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Origin Location</label>
                    <input
                      type="text"
                      value={editForm.source_location}
                      onChange={(e) => setEditForm({ ...editForm, source_location: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Destination Location</label>
                    <input
                      type="text"
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Purpose of Travel</label>
                  <textarea
                    rows={3}
                    value={editForm.purpose}
                    onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingIndent(null)}
                    className="px-6 py-3 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        Saving Indent...
                      </>
                    ) : (
                      <>Save Entry Updates</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {voidingIndent && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 border-2 border-slate-900 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Mark Indent as VOID
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4 leading-relaxed">
                You are setting a <strong className="text-orange-600">VOID</strong> instruction flag for Indent ID: <span className="text-slate-900 font-mono font-black">{voidingIndent.id}</span>.
                In our workflow, this signifies that we have to <strong className="text-orange-600">cancel the returning ticket</strong> after booking is finished.
              </p>

              <form onSubmit={handleConfirmVoid} className="space-y-5 text-xs font-bold text-slate-800">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Void / Cancellation Instructions *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Cancel the return flight segment after active checkout booking is confirmed"
                    value={voidReasonInput}
                    onChange={(e) => setVoidReasonInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 font-bold text-xs"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setVoidingIndent(null); setVoidReasonInput(""); }}
                    className="px-4 py-2.5 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submittingVoid}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
                  >
                    {submittingVoid ? "Applying..." : "Apply VOID Flag"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {profileEmployee && (
        <EmployeeProfileModal 
          employee={profileEmployee} 
          onClose={() => setProfileEmployee(null)} 
        />
      )}
    </div>
  );
}
