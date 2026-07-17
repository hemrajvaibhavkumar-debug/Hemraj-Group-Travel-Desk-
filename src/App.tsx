import { useState, useEffect, lazy, Suspense } from "react";
import { TravelIndent, Employee, JobCard, RbacUser, RbacSettings, Vendor } from "./types";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import PublicIndentForm from "./components/PublicIndentForm";
import { usePersistedState } from "./hooks/usePersistedState";
import IndentConsole from "./components/IndentConsole";
import IndentForm from "./components/IndentForm";
import DashboardReports from "./components/DashboardReports";
import NotificationCenter from "./components/NotificationCenter";

// Lazy-loaded heavy components for code-splitting
const JobCardManager = lazy(() => import("./components/JobCardManager"));
const PassportValidityDashboard = lazy(() => import("./components/PassportValidityDashboard"));
const SettingsPanel = lazy(() => import("./components/SettingsPanel"));
const EmployeesDashboard = lazy(() => import("./components/EmployeesDashboard"));
const FlightSearchHub = lazy(() => import("./components/FlightSearchHub"));
import { 
  Building2, Briefcase, Database, Users, HelpCircle, 
  MapPin, ShieldAlert, CheckCircle2, RefreshCw,
  ChevronRight, Compass, ArrowUpRight, Menu, X, Settings, List, Kanban,
  ChevronLeft, LayoutDashboard, PlusCircle, FileCheck2, ShieldCheck, Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [indents, setIndents] = useState<TravelIndent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [schemaSql, setSchemaSql] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [forexRates, setForexRates] = useState<Record<string, number>>({
    USD: 1.0825,
    INR: 90.35,
    AUD: 1.6312,
    NGN: 1625.5,
    VND: 27550.0,
    EUR: 1.0
  });
  const [errorText, setErrorText] = useState<string>("");
  const [successText, setSuccessText] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const { user, isAuthenticated, loading: authLoading, logout, hasPermission } = useAuth();

  // RBAC & Settings database states
  const [rbacUsers, setRbacUsers] = useState<RbacUser[]>([]);
  const [rbacSettings, setRbacSettings] = useState<RbacSettings | null>(null);

  // Computed states derived from custom DB configurations
  const activeRole = user ? user.role : "TRAVEL_DESK";
  const senderEmail = rbacSettings?.senderEmail || "travel-desk@hemraj-group.com";
  const ccRecipients = rbacSettings?.ccRecipients || "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com";

  // Views / Navigation Tabs synchronized with window.location.hash
  const parseHash = () => {
    const hash = window.location.hash || "#/dashboard";
    if (!hash.startsWith("#/")) {
      return { view: "dashboard" as const, id: null };
    }
    const pathPart = hash.slice(2);
    const parts = pathPart.split("/");
    const view = parts[0];
    const id = parts[1] || null;

    const validViews = ["dashboard", "indents", "create", "jobcards", "passports", "settings", "employees", "flight-search", "raise-indent"] as const;
    if (validViews.includes(view as any)) {
      return { view: view as typeof validViews[number], id };
    }
    return { view: "dashboard" as const, id: null };
  };

  const [route, setRoute] = useState(() => parseHash());
  const currentView = route.view;
  const currentId = route.id;

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const setCurrentView = (view: any) => {
    window.location.hash = `#/${view}`;
  };

  const handleSelectCard = (id: string | null) => {
    if (id) {
      window.location.hash = `#/jobcards/${id}`;
    } else {
      window.location.hash = `#/jobcards`;
    }
  };
  const [activeTab, setActiveTab] = usePersistedState<'ALL' | 'QUOTATION' | 'APPROVAL' | 'BOOKING' | 'FINANCE' | 'RECONCILIATION' | 'CLOSED' | 'VOIDED'>('job-card-active-tab', 'ALL');
  const [kanbanView, setKanbanView] = usePersistedState<boolean>('job-card-list-default-view', false);

  // Fetch all initial data from REST database
  const fetchData = async () => {
    setLoading(true);
    setErrorText("");
    try {
      const [indentsRes, empsRes, schemaRes, jcRes, rbacRes, vendorsRes] = await Promise.all([
        fetch("/api/indents"),
        fetch("/api/employees"),
        fetch("/api/schema"),
        fetch("/api/job-cards"),
        fetch("/api/rbac"),
        fetch("/api/vendors")
      ]);

      if (!indentsRes.ok || !empsRes.ok) {
        throw new Error("Failure connecting to Corporate Travel database services.");
      }

      const indentsData = await indentsRes.json();
      const empsData = await empsRes.json();
      
      setIndents(indentsData);
      setEmployees(empsData);

      if (vendorsRes.ok) {
        setVendors(await vendorsRes.json());
      }

      if (jcRes.ok) {
        const jcData = await jcRes.json();
        setJobCards(jcData);
      } else {
        setJobCards([]);
      }

      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        setSchemaSql(schemaData.schema);
      }

      if (rbacRes.ok) {
        const rbacData = await rbacRes.json();
        setRbacUsers(rbacData.rbacUsers);
        setRbacSettings(rbacData.rbacSettings);
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to synchronise data with backend server.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchForexRates = async () => {
    try {
      const res = await fetch("/api/forex/rates");
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          setForexRates(data.rates);
        }
      }
    } catch (e) {
      console.error("Failed to load live forex rates:", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchForexRates();
    }
  }, [isAuthenticated]);

  // Post new Indent (and optional New Traveler Profile employee)
  const handleCreateIndent = async (indent: Partial<TravelIndent>, employee?: Employee) => {
    setErrorText("");
    setSuccessText("");
    try {
      // 1. If registering a new traveler profile or completing an existing one
      if (employee) {
        const isExisting = employees.some(e => e.employee_code === employee.employee_code);
        const method = isExisting ? "PUT" : "POST";
        const url = isExisting ? `/api/employees/${employee.employee_code}` : "/api/employees";

        const empRes = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...employee,
            profile_completed: true
          })
        });

        const empData = await empRes.json();
        if (!empRes.ok) {
          throw new Error(empData.error || "Failed registering new employee profile under Check Constraints.");
        }
        
        if (isExisting) {
          setEmployees(prev => prev.map(e => e.employee_code === employee.employee_code ? { ...e, ...employee, profile_completed: true } : e));
        } else {
          setEmployees(prev => [{ ...employee, profile_completed: true }, ...prev]);
        }
      }

      // 2. Submit the Travel Indent
      const indentRes = await fetch("/api/indents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(indent)
      });

      const indentData = await indentRes.json();
      if (!indentRes.ok) {
        throw new Error(indentData.error || "Failed submitting travel indent. Please verify priority/category constraints.");
      }

      setSuccessText(`Successfully registered travel indent ${indentData.indent.id} in Hemraj records!`);
      
      // Update local state list
      setIndents(prev => [indentData.indent, ...prev]);
      setCurrentView("dashboard");
      
      // Auto dismiss success toast
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Unknown error creating travel indent.");
      throw err; // throw back to let form stop spinner
    }
  };

  // Edit / update existing Indent particulars
  const handleEditIndent = async (indent: TravelIndent) => {
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/indents/${indent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(indent)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not save edits on travel indent.");
      }

      setSuccessText(`Successfully upgraded travel indent details for ${indent.id}.`);
      setIndents(prev => prev.map(i => i.id === indent.id ? data.indent : i));
      
      // Auto dismiss
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed saving indent updates.");
      throw err;
    }
  };

  // Delete indent record
  const handleDeleteIndent = async (id: string) => {
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/indents/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not remove travel indent from logs.");
      }

      setSuccessText(`Deleted Travel Indent ${id} successfully.`);
      setIndents(prev => prev.filter(i => i.id !== id));
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to remove entry.");
    }
  };

  // Approve Indent and spin up a new tracking Job Card
  const handleApproveAndCreateJobCard = async (indent: TravelIndent) => {
    if (activeRole === 'TRAVEL_DESK') {
      setErrorText("Access Denied: Only authorized TRAVEL_APPROVER or VP_COMMERCIAL can approve this travel indent.");
      setTimeout(() => setErrorText(""), 3000);
      return;
    }
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indentId: indent.id,
          travelerName: employees.find(e => e.employee_code === indent.employee_code)?.name || "Hemraj Staff Member",
          destination: `${indent.source_location} → ${indent.destination}`,
          department: employees.find(e => e.employee_code === indent.employee_code)?.department || "OPS"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize tracking parameters on job card.");
      }

      await fetchData();
      setSuccessText(`Indent ${indent.id} Approved & redirected to Job Card tracker!`);
      setCurrentView("jobcards");
      
      // Auto dismiss
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed directing approved indent to Job Card.");
      setTimeout(() => setErrorText(""), 3000);
    }
  };

  // Update employee profile passport details and fetch fresh dataset
  // Update employee profile passport details and fetch fresh dataset
  const handleUpdateEmployee = async (employee: Employee) => {
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/employees/${employee.employee_code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not save passport updates onto disk database.");
      }
      setEmployees(prev => prev.map(e => e.employee_code === employee.employee_code ? data.employee : e));
      setSuccessText(`Successfully upgraded compliance metrics for ${employee.name}!`);
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to upgrade employee compliance passport details.");
      throw err;
    }
  };

  const handleAddEmployee = async (employee: Employee) => {
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add employee.");
      
      setEmployees(prev => [data.employee, ...prev]);
      setSuccessText(`Employee ${employee.name} added successfully!`);
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to add employee.");
      throw err;
    }
  };

  const handleDeleteEmployee = async (employeeCode: string) => {
    if (!confirm(`Are you sure you want to permanently remove employee profile ${employeeCode}? This action cannot be reversed.`)) {
      return;
    }
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/employees/${employeeCode}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove employee profile from disk.");
      }
      setEmployees(prev => prev.filter(e => e.employee_code !== employeeCode));
      setSuccessText(`Employee ${employeeCode} deleted successfully.`);
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to remove employee entry.");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete vendor.");
      
      setVendors(prev => prev.filter(v => v.id !== id));
      setSuccessText(`Vendor Partner ${id} removed successfully.`);
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to remove vendor.");
    }
  };

  const handleUpdateVendor = async (vendor: Vendor) => {
    // This could open a modal or just do simple update
    // For now we'll just demonstrate the API call logic
    setErrorText("");
    setSuccessText("");
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vendor.");
      
      setVendors(prev => prev.map(v => v.id === vendor.id ? data.vendor : v));
      setSuccessText(`Vendor Details for ${vendor.name} syncronized!`);
      setTimeout(() => setSuccessText(""), 3000);
    } catch (err: any) {
      setErrorText(err.message || "Failed to update vendor.");
    }
  };

  const checkPagePermission = (view: string): boolean => {
    switch (view) {
      case "indents":
      case "jobcards":
      case "passports":
        return hasPermission("VIEW_INDENTS");
      case "create":
        return hasPermission("CREATE_INDENT");
      case "employees":
        return hasPermission("MANAGE_EMPLOYEES");
      case "settings":
        return hasPermission("MANAGE_SETTINGS") || hasPermission("MANAGE_VENDORS");
      case "flight-search":
        return hasPermission("CREATE_INDENT") || hasPermission("VIEW_INDENTS");
      case "dashboard":
      default:
        return true;
    }
  };

  const renderAccessDenied = () => (
    <div className="py-24 text-center max-w-md mx-auto space-y-6">
      <div className="w-16 h-16 bg-rose-105 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm mx-auto">
        <ShieldAlert className="w-8 h-8 animate-pulse" />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 leading-relaxed">
          Your current user role (<strong>{activeRole.replace('_', ' ')}</strong>) does not have the required permissions to access this control module. Please contact a system administrator to adjust your credentials in Settings.
        </p>
      </div>
      <button
        onClick={() => setCurrentView("dashboard")}
        className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
      >
        Return to Dashboard
      </button>
    </div>
  );

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-3" />
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest font-sans">Validating secure session...</p>
      </div>
    );
  }

  if (currentView === "raise-indent") {
    return <PublicIndentForm />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      
      {/* SUCCESS & ERROR MESSAGE BANNERS */}
      <AnimatePresence>
        {errorText && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-orange-600 text-white font-black py-3 px-6 text-xs text-center flex items-center justify-center gap-2 shadow-lg sticky top-0 z-50 uppercase tracking-wider"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{errorText}</span>
            <button onClick={() => setErrorText("")} className="ml-4 underline hover:text-orange-100 font-extrabold">Dismiss</button>
          </motion.div>
        )}

        {successText && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 text-white font-black py-3 px-6 text-xs text-center flex items-center justify-center gap-2 shadow-lg sticky top-0 z-50 uppercase tracking-wider border-b-2 border-orange-500"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-orange-500" />
            <span>{successText}</span>
            <button onClick={() => setSuccessText("")} className="ml-4 underline hover:text-slate-300 font-extrabold">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Header Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Hemraj <span className="text-slate-400">Group</span>
          </h1>
          <span className="text-[8px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-black uppercase">Travel Desk</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside 
          id="sidebar-panel" 
          className={`${
            isMobileMenuOpen ? "flex" : "hidden"
          } lg:flex absolute lg:relative top-16 lg:top-0 bottom-0 left-0 w-full bg-white border-r border-slate-200 flex-col justify-between shrink-0 z-45 lg:z-auto shadow-xl lg:shadow-none transition-all duration-300 ease-in-out ${
            isSidebarCollapsed 
              ? "lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-r-0 overflow-hidden" 
              : "lg:w-64 lg:opacity-100"
          }`}
        >
          <div className="min-w-64 flex flex-col justify-between h-full overflow-y-auto">
            <div>
              <div className="p-8 relative">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-[0.2em] text-orange-600 uppercase">The Workspace</div>
                  
                  {/* Desktop Collapse Handle */}
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    id="btn-sidebar-collapse"
                    title="Collapse Sidebar"
                    className="hidden lg:flex items-center justify-center p-1 px-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                
                <h1 className="text-4xl font-black leading-none uppercase tracking-tighter text-slate-900 mt-2">
                  Hemraj<br/><span className="text-orange-600">Group</span>
                </h1>
                <p className="mt-2 text-[13px] font-black text-slate-950 tracking-tight uppercase">Travel Desk</p>
              </div>              <div className="px-6 pb-2 text-[9px] font-black text-slate-900 uppercase tracking-widest mt-6">Operations</div>
              {(hasPermission("CREATE_INDENT") || hasPermission("VIEW_INDENTS")) && (
                <button
                  onClick={() => { setCurrentView("flight-search"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-flight-search"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "flight-search"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "flight-search" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Flight Search</span>
                </button>
              )}

              <button
                onClick={() => { setCurrentView("dashboard"); setIsMobileMenuOpen(false); }}
                id="btn-nav-dashboard"
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                  currentView === "dashboard"
                    ? "bg-slate-900 text-white shadow-lg font-black"
                    : "text-slate-900 hover:bg-slate-50 font-black"
                }`}
              >
                {currentView === "dashboard" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                <span>Dashboard</span>
              </button>

              {hasPermission("CREATE_INDENT") && (
                <button
                  onClick={() => { setCurrentView("create"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-create"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "create"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "create" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>New Request</span>
                </button>
              )}

              {hasPermission("VIEW_INDENTS") && (
                <button
                  onClick={() => { setCurrentView("indents"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-indents"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "indents"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "indents" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Indent Console</span>
                </button>
              )}


              {hasPermission("VIEW_INDENTS") && (
                <button
                  onClick={() => { setCurrentView("jobcards"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-jobcards"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "jobcards"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "jobcards" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Job Card</span>
                </button>
              )}

              {hasPermission("VIEW_INDENTS") && (
                <div className="px-6 pb-2 text-[9px] font-black text-slate-900 uppercase tracking-widest mt-6">Compliance</div>
              )}
              {hasPermission("VIEW_INDENTS") && (
                <button
                  onClick={() => { setCurrentView("passports"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-passports"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "passports"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "passports" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Passport Check</span>
                </button>
              )}

              {hasPermission("MANAGE_EMPLOYEES") && (
                <button
                  onClick={() => { setCurrentView("employees"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-employees"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "employees"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "employees" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Employees</span>
                </button>
              )}

              {(hasPermission("MANAGE_SETTINGS") || hasPermission("MANAGE_VENDORS")) && (
                <div className="px-6 pb-2 text-[9px] font-black text-slate-900 uppercase tracking-widest mt-6">Administration</div>
              )}
              {(hasPermission("MANAGE_SETTINGS") || hasPermission("MANAGE_VENDORS")) && (
                <button
                  onClick={() => { setCurrentView("settings"); setIsMobileMenuOpen(false); }}
                  id="btn-nav-settings"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left uppercase tracking-wider text-xs ${
                    currentView === "settings"
                      ? "bg-slate-900 text-white shadow-lg font-black"
                      : "text-slate-900 hover:bg-slate-50 font-black"
                  }`}
                >
                  {currentView === "settings" && <div className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 shrink-0"></div>}
                  <span>Settings</span>
                </button>
              )}
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300">
              <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1.5 font-bold">Monthly Quota</div>
              <div className="h-1.5 w-full bg-slate-300 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-600 transition-all duration-500 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((indents.length / 60) * 100))}%` }}
                ></div>
              </div>
              <div className="mt-2.5 flex justify-between items-end">
                <span className="text-2xl font-black tracking-tighter text-slate-950">{indents.length}/60</span>
                <span className="text-[10px] font-black text-orange-600 tracking-wider">INDENTS</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-[10px] space-y-1 uppercase tracking-wider font-bold shadow-sm relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[35%] rounded-full bg-orange-600/20 blur-xl pointer-events-none" />
              <span className="text-orange-500 font-black block select-none">Logged In User</span>
              <span className="text-white block truncate font-black">{user?.name}</span>
              <span className="text-slate-400 block text-[9.5px] font-black lowercase italic">{user?.email}</span>
              <span className="text-slate-300 block text-[9px] font-black tracking-widest uppercase mt-1">Role: {activeRole.replace('_', ' ')}</span>
              <button 
                onClick={logout} 
                className="mt-3 w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-[9px] text-rose-450 hover:text-rose-350 font-black uppercase py-2 rounded-xl transition cursor-pointer"
              >
                Sign Out / Logout
              </button>
            </div>
          </div>
          </div>
        </aside>

        {/* MAIN DISPLAY VIEWPORT */}
        <main id="main-content-area" className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          
          {/* Header Bar */}
          <header className="h-auto bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between p-4 md:py-3.5 md:px-10 shrink-0 gap-4">
            <div className="flex items-start md:items-center gap-4">
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  id="btn-sidebar-expand"
                  title="Expand Sidebar"
                  className="hidden lg:flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 transition cursor-pointer shrink-0 shadow-xs"
                >
                  <Menu className="w-5 h-5 text-orange-600" />
                </button>
              )}
              <div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900">
                  {currentView === "dashboard" ? "Main Dashboard" : currentView === "indents" ? "Indent Console" : currentView === "create" ? "New Request" : currentView === "employees" ? "Employees" : currentView === "jobcards" ? "Job Card" : currentView === "passports" ? "Employee Passport Check" : currentView === "flight-search" ? "Flight Search Hub" : "Settings"} 
                  <span className="text-slate-900 ml-2">#TR-2024</span>
                </h2>
                <div className="flex items-center gap-1.5 text-slate-950 text-[10px] font-black tracking-wider uppercase mt-0.5">
                  <span>Travel Desk</span>
                  <ChevronRight className="w-3 h-3 text-slate-900" />
                  <span className="text-orange-655 font-extrabold">
                    {currentView === "dashboard" ? "Dashboard Overview" : currentView === "indents" ? "Indent Logs & Administration" : currentView === "create" ? "Travel Request Form" : currentView === "employees" ? "Employee Directory" : currentView === "jobcards" ? "Job Card" : currentView === "passports" ? "HR Passport Compliance" : currentView === "flight-search" ? "Aviationstack & Webhook Search" : "Configuration"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
              {/* FILTER TABS & LAYOUT SELECTOR */}
              {currentView === 'jobcards' && (
                <div className="hidden md:flex items-center gap-2">
                  <div className="bg-white border border-slate-200 p-0.5 rounded-full flex gap-0.5 shadow-sm">
                    {(['ALL', 'QUOTATION', 'APPROVAL', 'BOOKING', 'FINANCE', 'RECONCILIATION', 'CLOSED', 'VOIDED'] as const).map(tab => {
                      const count = tab === 'ALL' 
                        ? jobCards.length 
                        : tab === 'VOIDED'
                          ? jobCards.filter(jc => jc.voided).length
                          : jobCards.filter(jc => jc.stage === tab && !jc.voided).length;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-1 ${
                            activeTab === tab 
                              ? "bg-slate-900 text-white" 
                              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
                          <span className={`px-1 py-0 text-[7px] rounded-full font-black ${
                            activeTab === tab 
                              ? (tab === 'VOIDED' ? "bg-orange-600 text-white" : "bg-orange-500 text-white") 
                              : (tab === 'VOIDED' ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500")
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-lg flex items-center shadow-sm">
                    <button type="button" onClick={() => setKanbanView(false)} className={`p-1 rounded ${!kanbanView ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"}`}>
                      <List className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => { setKanbanView(true); setActiveTab('ALL'); }} className={`p-1 rounded ${kanbanView ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"}`}>
                      <Kanban className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              
              <NotificationCenter activeRole={activeRole} userEmail={user?.email} />

              <button
                onClick={fetchData}
                disabled={loading}
                title="Sync database tables"
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl hover:shadow-xs transition disabled:opacity-50 text-slate-600"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
              </button>
              
              <div className="bg-white px-4 py-2 border border-slate-300 rounded-xl text-[10px] font-mono text-slate-950 font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${loading ? "bg-orange-500 animate-ping" : "bg-emerald-600"}`} />
                System Status: <strong className={loading ? "text-orange-600 font-black uppercase" : "text-emerald-700 font-black uppercase"}>
                  {loading ? "Syncing..." : "Online"}
                </strong>
              </div>
            </div>
          </header>

          {/* Dynamic state content switch */}
          <div className={`flex-1 overflow-y-auto p-4 ${currentView === 'jobcards' ? 'md:pt-2' : 'md:pt-6'} md:px-10 md:pb-10 relative`}>
            {loading && !initialLoading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse z-50" />
            )}

            {initialLoading ? (
              <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-950 font-black text-xs uppercase tracking-wider">Authenticating credentials & Loading records database...</p>
              </div>
            ) : (
              <div>
                {!checkPagePermission(currentView) ? (
                  renderAccessDenied()
                ) : currentView === "dashboard" ? (
                  <DashboardReports
                    indents={indents}
                    jobCards={jobCards}
                    employees={employees}
                    vendors={vendors}
                    onSelectView={setCurrentView}
                  />
                ) : currentView === "indents" ? (
                  <IndentConsole
                    indents={indents}
                    employees={employees}
                    jobCards={jobCards}
                    vendors={vendors}
                    schemaSql={schemaSql}
                    onDeleteIndent={handleDeleteIndent}
                    onEditIndent={handleEditIndent}
                    onDeleteEmployee={handleDeleteEmployee}
                    onEditEmployee={handleUpdateEmployee}
                    onDeleteVendor={handleDeleteVendor}
                    onUpdateVendor={handleUpdateVendor}
                    onCreateNewClick={() => setCurrentView("create")}
                    onApproveAndCreateJobCard={handleApproveAndCreateJobCard}
                    onSubmitIndent={handleCreateIndent}
                    onAddEmployee={handleAddEmployee}
                    onUpdateEmployee={handleUpdateEmployee}
                  />
                ) : (
                  <Suspense fallback={
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                      <div className="w-12 h-12 border-4 border-slate-900 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                        Loading Workspace Panel...
                      </span>
                    </div>
                  }>
                    {currentView === "employees" ? (
                      <EmployeesDashboard
                        employees={employees}
                        onDeleteEmployee={handleDeleteEmployee}
                        onEditEmployee={handleUpdateEmployee}
                        onAddEmployee={handleAddEmployee}
                      />
                    ) : currentView === "create" ? (
                      <IndentForm
                        employees={employees}
                        draftId={currentId}
                        onSubmit={handleCreateIndent}
                        onCancel={() => {
                          window.location.hash = "#/indents";
                        }}
                        onAddEmployee={handleAddEmployee}
                        onUpdateEmployee={handleUpdateEmployee}
                      />
                    ) : currentView === "jobcards" ? (
                      <JobCardManager
                        indents={indents}
                        employees={employees}
                        jobCards={jobCards}
                        onRefresh={fetchData}
                        onSelectView={setCurrentView}
                        activeRole={activeRole}
                        activeUserName={user?.name || "Corporate Admin"}
                        senderEmail={senderEmail}
                        ccRecipients={ccRecipients}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        kanbanView={kanbanView}
                        setKanbanView={setKanbanView}
                        selectedCardId={currentId}
                        onSelectCard={handleSelectCard}
                        forexRates={forexRates}
                      />
                    ) : currentView === "passports" ? (
                      <PassportValidityDashboard
                        employees={employees}
                        onUpdateEmployee={handleUpdateEmployee}
                        onRefresh={fetchData}
                      />
                    ) : currentView === "flight-search" ? (
                      <FlightSearchHub forexRates={forexRates} />
                    ) : (
                      <SettingsPanel
                        onRefreshAllData={fetchData}
                        onError={setErrorText}
                        onSuccess={setSuccessText}
                      />
                    )}
                  </Suspense>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
