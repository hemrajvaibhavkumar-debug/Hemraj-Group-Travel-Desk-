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
  
  // Edit Indent state
  const [editingIndent, setEditingIndent] = useState<TravelIndent | null>(null);
  const [publicRequests, setPublicRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchPublicRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/public-requests");
      const data = await res.json();
      if (res.ok) {
        setPublicRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error loading public requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  React.useEffect(() => {
    fetchPublicRequests();
  }, []);

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Are you sure you want to reject and archive this request?")) return;
    try {
      const res = await fetch(`/api/public-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" })
      });
      if (res.ok) {
        setPublicRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };
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

  return (
    <div id="indent-console-panel" className="space-y-6">

      {/* UPSIDE SECTION: PUBLIC REQUESTS INTAKE DATATABLE */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block font-sans">Traveler Self-Service Intake</span>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <FileCheck2 className="w-5 h-5 text-orange-500" />
              <span>Public Travel Requests (Intake Queue)</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Verify and complete traveler-submitted drafts to formalize indents and initiate procurement workflows.
            </p>
          </div>
          {publicRequests.length > 0 && (
            <span className="self-start sm:self-center px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-250 text-[9px] font-black uppercase tracking-wider rounded-md animate-pulse">
              ⚠️ {publicRequests.length} Pending
            </span>
          )}
        </div>

        {loadingRequests ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-wider">Syncing public requests...</span>
          </div>
        ) : publicRequests.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-8 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full p-1 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">All public requests processed</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-semibold uppercase">Travel desk queue is currently empty</span>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Traveler</th>
                  <th className="px-5 py-3">Origin / Destination</th>
                  <th className="px-5 py-3">Travel Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Raiser / Approver</th>
                  <th className="px-5 py-3 text-center">Action Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {publicRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-5 py-3.5 font-mono text-[9px] text-slate-400">
                      {req.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-black text-slate-900 uppercase">{req.traveler_name}</div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{req.designation} • {req.department}</div>
                      <div className="text-[8.5px] text-slate-500 font-mono mt-0.5">{req.traveler_email} • {req.traveler_phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-black text-slate-850 uppercase">{req.origin} → {req.destination}</div>
                      {req.domestic_connection_required && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-850 text-[7px] font-black rounded uppercase tracking-wider">
                          ✈ Domestic Connection Needed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-900 font-mono text-xs">
                      {req.travel_date}
                      {req.is_return && (
                        <div className="text-[7.5px] font-black text-orange-600 uppercase tracking-widest mt-0.5">⇄ Return Incl.</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        req.travel_type === "FLIGHT" ? "bg-blue-50 text-blue-800 border-blue-200" :
                        req.travel_type === "TRAIN" ? "bg-amber-50 text-amber-800 border-amber-200" :
                        req.travel_type === "CAB" ? "bg-purple-50 text-purple-800 border-purple-200" :
                        "bg-slate-50 text-slate-800 border-slate-200"
                      }`}>
                        {req.travel_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[10px] text-slate-900 font-extrabold uppercase">By: {req.indent_raiser || "Self"}</div>
                      <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Appr: {req.travel_approver}</div>
                      <div className="text-[7.5px] text-slate-500 font-mono uppercase tracking-widest">{req.approver_title}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = `#/create/${req.id}`;
                          }}
                          className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>Complete Request</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Indents View */}
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
                id="select-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ALL CATEGORIES</option>
                <option value="DOMESTIC">DOMESTIC</option>
                <option value="INTERNATIONAL">INTERNATIONAL</option>
                <option value="INTERNATIONAL_RETURN">INTERNATIONAL RETURN</option>
                <option value="TRAIN">TRAIN</option>
                <option value="BUS">BUS</option>
                <option value="CAB">CAB</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Filter className="w-3.5 h-3.5 text-slate-900" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Priority:</span>
              <select
                id="select-priority-filter"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ALL PRIORITIES</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Empty state panel */}
        {filteredIndents.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
            <Compass className="w-10 h-10 mx-auto text-slate-300 mb-3.5 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider block">No matching travel indents found in registry</span>
            <span className="text-[10px] text-slate-400 block mt-1">Refine filters or query parameter inputs</span>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                  <th className="px-6 py-4">Indent ID</th>
                  <th className="px-6 py-4">Traveler Details</th>
                  <th className="px-6 py-4">Sector Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Expected Date</th>
                  <th className="px-6 py-4">Workflow Status</th>
                  <th className="px-6 py-4 text-center">Action Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 uppercase font-semibold">
                {filteredIndents.map((indent) => {
                  const hasJobCard = jobCards.some(jc => jc.indentId === indent.id);
                  const isVoided = indent.voided;
                  
                  let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                  let statusLabel = "PENDING REVIEW";
                  
                  if (isVoided) {
                    badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
                    statusLabel = "VOIDED";
                  } else if (hasJobCard) {
                    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    statusLabel = "JOB CARD ACTIVE";
                  }

                  return (
                    <tr 
                      key={indent.id} 
                      className={`hover:bg-slate-50 transition-colors duration-100 ${
                        isVoided ? "opacity-60 bg-rose-50/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-black text-slate-900 tracking-tight">
                        {indent.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 block normal-case leading-tight">{indent.employeeName}</span>
                          <span className="text-[9px] text-slate-400 block font-bold">CODE: {indent.employee_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 block leading-tight">{indent.source_location} → {indent.destination}</span>
                          <span className="text-[9px] text-slate-400 block normal-case font-bold">{indent.purpose}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded text-[8px] font-black tracking-wider">
                          {indent.travel_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
                          indent.priority === "CRITICAL" ? "bg-rose-600 text-white" :
                          indent.priority === "HIGH" ? "bg-orange-500 text-white" :
                          indent.priority === "MEDIUM" ? "bg-blue-600 text-white" : "bg-slate-400 text-white"
                        }`}>
                          {indent.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-slate-900">
                        {indent.travel_date}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black border uppercase tracking-widest ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!hasJobCard && !isVoided && onApproveAndCreateJobCard && (
                            <button
                              onClick={() => onApproveAndCreateJobCard(indent)}
                              title="Approve & Initiate Tracking Job Card"
                              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition duration-150 shadow-sm hover:scale-[1.05]"
                            >
                              Approve L1
                            </button>
                          )}
                          {!isVoided ? (
                            <button
                              onClick={() => setVoidingIndent(indent)}
                              title="Mark Request as Void"
                              className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition duration-150 hover:scale-[1.05]"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreIndent(indent)}
                              title="Restore Void Request"
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition duration-150 hover:scale-[1.05]"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingIndent(indent);
                              setEditForm(indent);
                              setEditError("");
                            }}
                            title="Edit Details"
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition duration-150 hover:scale-[1.05]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Confirm permanent deletion of indent reference: ${indent.id}?`)) {
                                onDeleteIndent(indent.id);
                              }
                            }}
                            title="Delete Indent"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition duration-150 hover:scale-[1.05]"
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
                      <option value="TRAIN">TRAIN</option>
                      <option value="BUS">BUS</option>
                      <option value="CAB">CAB</option>
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
