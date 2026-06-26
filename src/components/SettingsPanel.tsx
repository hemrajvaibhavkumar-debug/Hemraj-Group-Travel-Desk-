import React, { useState, useEffect } from "react";
import { RbacUser, RbacSettings, Vendor } from "../types";
import { 
  ShieldCheck, UserCheck, X, Plus, Trash2, Mail, Users, CheckCircle2, 
  AlertTriangle, Save, Edit2, ShieldAlert, Key, CheckCircle, RefreshCw, Layers,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsPanelProps {
  onRefreshAllData: () => Promise<void>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function SettingsPanel({ onRefreshAllData, onError, onSuccess }: SettingsPanelProps) {
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [settings, setSettings] = useState<RbacSettings>({
    senderEmail: "travel-desk@hemraj-group.com",
    ccRecipients: "compliance-cc@hemraj-group.com",
    activeSimulatedEmail: "subham4343@gmail.com"
  });

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

  // User form states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<'TRAVEL_DESK' | 'TRAVEL_APPROVER' | 'VP_COMMERCIAL'>('TRAVEL_DESK');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Vendor Table states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [updatingVendors, setUpdatingVendors] = useState(false);
  const [vFormOpen, setVFormOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  
  const [vNameInput, setVNameInput] = useState("");
  const [vEmailsString, setVEmailsString] = useState("");
  const [vPhonesString, setVPhonesString] = useState("");
  const [vCategories, setVCategories] = useState<("FLIGHT" | "TRAIN" | "HOTEL" | "CAB" | "OTHER")[]>([]);
  const [vInlineError, setVInlineError] = useState("");

  // Inline error/success states for settings box
  const [inlineError, setInlineError] = useState("");
  const [inlineSuccess, setInlineSuccess] = useState("");

  const fetchRbacData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rbac");
      if (!res.ok) {
        throw new Error("Failed to fetch RBAC data from backend.");
      }
      const data = await res.json();
      setUsers(data.rbacUsers);
      setSettings(data.rbacSettings);
    } catch (err: any) {
      console.error(err);
      onError(err.message || "Could not synchronize Settings with Server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorsData = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  useEffect(() => {
    fetchRbacData();
    fetchVendorsData();
  }, []);

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingVendors(true);
    setVInlineError("");

    if (!vNameInput.trim()) {
      setVInlineError("Vendor Name is required.");
      setUpdatingVendors(false);
      return;
    }
    const emailList = vEmailsString.split(',').map(e => e.trim()).filter(e => e !== '');
    if (emailList.length === 0) {
      setVInlineError("Provide at least one Vendor Email.");
      setUpdatingVendors(false);
      return;
    }

    try {
      const url = editingVendorId ? `/api/vendors/${editingVendorId}` : "/api/vendors";
      const method = editingVendorId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: vNameInput, 
          emails: emailList, 
          phones: vPhonesString.split(',').map(p => p.trim()).filter(p => p !== ''), 
          categories: vCategories
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed saving vendor Properties.");
      }

      onSuccess(editingVendorId ? "Vendor attributes updated successfully with associated agents." : "New corporate travel vendor registered.");
      
      // Reset Vendor Form states
      setVNameInput("");
      setVEmailsString("");
      setVPhonesString("");
      setVCategories([]);
      setEditingVendorId(null);
      setVFormOpen(false);

      // Refresh list
      await fetchVendorsData();
      await onRefreshAllData();
    } catch (err: any) {
      setVInlineError(err.message || "Error submitting Vendor parameters.");
      onError(err.message || "Error processing Vendor creation.");
    } finally {
      setUpdatingVendors(false);
    }
  };

  const handleVendorEditClick = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setVNameInput(vendor.name);
    setVEmailsString((vendor.emails || []).join(", "));
    setVPhonesString((vendor.phones || []).join(", "));
    setVCategories(vendor.categories || []);
    setVFormOpen(true);
    setVInlineError("");
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from active Corporate Vendors?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove vendor from registry database.");
      }

      onSuccess(`Vendor '${name}' removed successfully.`);
      await fetchVendorsData();
      await onRefreshAllData();
    } catch (err: any) {
      onError(err.message || "Error deleting vendor record.");
    }
  };

  const openNewVendorForm = () => {
    setEditingVendorId(null);
    setVNameInput("");
    setVEmailsString("");
    setVPhonesString("");
    setVCategories([]);
    setVFormOpen(true);
    setVInlineError("");
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setInlineError("");
    setInlineSuccess("");

    // Simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.senderEmail)) {
      setInlineError("Predefined sender email has an invalid layout.");
      setSavingSettings(false);
      return;
    }

    try {
      const res = await fetch("/api/rbac/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update configuration on server.");
      }
      setInlineSuccess("General outbox settings updated successfully!");
      onSuccess("System simulation parameters updated.");
      await onRefreshAllData();
    } catch (err: any) {
      setInlineError(err.message || "Error updating settings.");
      onError(err.message || "Error updating settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleActiveSimulatedEmailChange = async (email: string) => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/rbac/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, activeSimulatedEmail: email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to switch simulated operator.");
      }
      setSettings(prev => ({ ...prev, activeSimulatedEmail: email }));
      
      const activeUser = users.find(u => u.email === email);
      onSuccess(`Active simulation switched to: ${activeUser?.name || email} (${activeUser?.role || "Operator"})`);
      await onRefreshAllData();
    } catch (err: any) {
      onError(err.message || "Error switching dynamic simulation persona.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setInlineError("");

    if (!nameInput.trim()) {
      setInlineError("User Name is required.");
      setSubmittingUser(false);
      return;
    }
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setInlineError("Provide a valid Email Address.");
      setSubmittingUser(false);
      return;
    }

    try {
      const url = editingUserId ? `/api/rbac/users/${editingUserId}` : "/api/rbac/users";
      const method = editingUserId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput, email: emailInput, role: roleInput })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed saving sandbox user configurations.");
      }

      onSuccess(editingUserId ? "Sandbox user record updated." : "New sandbox user registered.");
      
      // Reset Form states
      setNameInput("");
      setEmailInput("");
      setRoleInput("TRAVEL_DESK");
      setEditingUserId(null);
      setIsFormOpen(false);

      // Refresh list
      await fetchRbacData();
      await onRefreshAllData();
    } catch (err: any) {
      setInlineError(err.message || "Error submitting user.");
      onError(err.message || "Error processing user.");
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleEditClick = (user: RbacUser) => {
    setEditingUserId(user.id);
    setNameInput(user.name);
    setEmailInput(user.email);
    setRoleInput(user.role);
    setIsFormOpen(true);
    setInlineError("");
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (users.length <= 1) {
      onError("Constraint Cleared: Cannot delete the last remaining operator in the registry.");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove '${name}' from Sandbox simulated accounts?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rbac/users/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error during deletion.");
      }

      onSuccess(`User '${name}' removed successfully.`);
      await fetchRbacData();
      await onRefreshAllData();
    } catch (err: any) {
      onError(err.message || "Error removing user from ledger.");
    }
  };

  const openNewUserForm = () => {
    setEditingUserId(null);
    setNameInput("");
    setEmailInput("");
    setRoleInput("TRAVEL_DESK");
    setIsFormOpen(true);
    setInlineError("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "TRAVEL_DESK":
        return "bg-slate-100 text-slate-800 border-slate-250";
      case "TRAVEL_APPROVER":
        return "bg-amber-100 text-amber-800 border-amber-250";
      case "VP_COMMERCIAL":
        return "bg-rose-105 text-rose-800 border-rose-250";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "TRAVEL_DESK": return "Travel Desk Operator";
      case "TRAVEL_APPROVER": return "Travel Approver (L1)";
      case "VP_COMMERCIAL": return "VP Commercial (L2)";
      default: return role;
    }
  };

  const activeUser = users.find(u => u.email === settings.activeSimulatedEmail);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-wider">Synchronizing sandbox security permissions...</p>
      </div>
    );
  }

  return (
    <div id="settings-management-panel" className="space-y-10 max-w-7xl mx-auto">
      
      {/* SECTION 1: SYSTEM ACTIVE PERSISTENT SIMULATION */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">Simulation Identity Hub</span>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-orange-500" />
              <span>VP COO Simulation & Sandbox Identity Switching</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
              Select which user account in the database to simulate. Your dynamic role access dictates L1 & L2 sign-offs, quote bidding capabilities, and booking receipts.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-slate-55 p-3 rounded-2xl border border-slate-220">
            <span className="text-[10px] font-black uppercase text-slate-500">Simulating:</span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 leading-none">
                {activeUser?.name || settings.activeSimulatedEmail}
              </span>
              <span className={`inline-block w-fit px-1.5 py-0.5 mt-1 rounded text-[8px] font-black uppercase tracking-wider border ${getRoleBadgeColor(activeUser?.role || "TRAVEL_DESK")}`}>
                🏢 {getRoleLabel(activeUser?.role || "TRAVEL_DESK")}
              </span>
            </div>
          </div>
        </div>

        {/* IDENTITY QUICK SELECT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {users.map(u => {
            const isActive = u.email === settings.activeSimulatedEmail;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleActiveSimulatedEmailChange(u.email)}
                className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden ${
                  isActive 
                    ? "border-slate-950 bg-slate-950 text-white shadow-md scale-102"
                    : "border-slate-200 bg-white hover:border-slate-400 hover:scale-[1.01] text-slate-800"
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-slate-950 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                    ✓
                  </div>
                )}
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isActive ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : getRoleBadgeColor(u.role)
                  }`}>
                    {getRoleLabel(u.role)}
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-tight mt-3 leading-snug truncate">
                    {u.name}
                  </h4>
                  <p className={`text-[9px] font-mono mt-1 ${isActive ? "text-slate-400" : "text-slate-500"} truncate`}>
                    {u.email}
                  </p>
                </div>

                <div className={`text-[9px] font-black uppercase tracking-widest mt-2 border-t pt-2 w-full ${isActive ? "border-white/10 text-orange-400" : "border-slate-100 text-slate-400"}`}>
                  {u.role === 'TRAVEL_DESK' ? "✈ Dispatch & Quotes" : u.role === 'TRAVEL_APPROVER' ? "✓ Travel Signoff L1" : "👑 Final VP Signoff L2"}
                </div>
              </button>
            );
          })}
        </div>

        {/* CAPABILITIES COMPARISON MATRIX */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500" />
            <span>Simulated Capabilities & Role Permission Matrix</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-2 px-3 pl-0">Capability Descriptor</th>
                  <th className="py-2 px-3">Travel Desk Operator (L0)</th>
                  <th className="py-2 px-3">Travel Approver (L1)</th>
                  <th className="py-2 px-3">VP Commercial (L2)</th>
                </tr>
              </thead>
              <tbody className="font-bold text-slate-700 divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 pl-0 uppercase text-slate-900 font-extrabold">Open Job Cards / Edit Quotes</td>
                  <td className="py-2.5 px-3 text-emerald-600">✓ Full Access</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 pl-0 uppercase text-slate-900 font-extrabold">Authorize L1 Compliance Sign-off</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Locked</td>
                  <td className="py-2.5 px-3 text-emerald-600">✓ Full Access</td>
                  <td className="py-2.5 px-3 text-emerald-600">✓ Full Access</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 pl-0 uppercase text-slate-900 font-extrabold">Authorize L2 Final VP sign-off</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Locked</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Locked</td>
                  <td className="py-2.5 px-3 text-rose-600">✓ VP Authorized Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 pl-0 uppercase text-slate-900 font-extrabold">Scan Receipts & Save Fulfillment</td>
                  <td className="py-2.5 px-3 text-emerald-600">✓ Full Access</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 pl-0 uppercase text-slate-900 font-extrabold">Outbound Mail Transmit dispatch</td>
                  <td className="py-2.5 px-3 text-emerald-600">✓ Full Access</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                  <td className="py-2.5 px-3 text-slate-400">🚫 Read Only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: RBAC USER CRUD MANAGER */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">RBAC Identity Ledger</span>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <Users className="w-5 h-5 text-orange-500" />
              <span>Sandbox Authorized User Registry</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Manage database records mapping employee email credentials to simulation roles.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewUserForm}
            className="self-start sm:self-center px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Register New User</span>
          </button>
        </div>

        {/* INLINE USER FORM */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleUserSubmit} className="bg-slate-50 border-2 border-dashed border-slate-200 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-205">
                  <h4 className="text-[10px] font-black uppercase text-slate-900">
                    {editingUserId ? "Edit User Properties" : "Register Simulation Sandbox User"}
                  </h4>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full human Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Satyajit Ray"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. satyajit@hemraj.com"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned Work Role *</label>
                    <select
                      value={roleInput}
                      onChange={e => setRoleInput(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold"
                    >
                      <option value="TRAVEL_DESK">Travel Desk Operator (L0)</option>
                      <option value="TRAVEL_APPROVER">Travel Approver (L1)</option>
                      <option value="VP_COMMERCIAL">VP Commercial (L2)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[9px] font-mono text-rose-600 font-bold uppercase">
                    {inlineError && `⚠️ Error: ${inlineError}`}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {submittingUser ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{editingUserId ? "Upgrade User" : "Add User"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REGISTRY DATA TABLE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4">System Role Assigned</th>
                  <th className="py-3 px-4">Live Sandbox Status</th>
                  <th className="py-3 px-4 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {users.map(u => {
                  const isCurrentlySimulated = u.email === settings.activeSimulatedEmail;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-all ${isCurrentlySimulated ? "bg-orange-50/20" : ""}`}>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${getRoleBadgeColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isCurrentlySimulated ? (
                          <span className="inline-flex items-center gap-1.5 text-[8.5px] font-black text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-ping"></span>
                            Active Simulated User
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Standby Sandbox Profile
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                            title="Edit user properties"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={users.length <= 1}
                            className="p-1.5 bg-white border border-slate-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg shadow-2xs disabled:opacity-40 cursor-pointer"
                            title="Remove sandbox user"
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
        </div>
      </div>

      {/* SECTION 3: SYSTEM GENERAL MAIL DISPATCH CONFIGS */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">Outbox Transmission</span>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <Mail className="w-5 h-5 text-orange-500" />
            <span>Predefined Outbound CC Configurations</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Edit the default primary sending outbox email address and carbon-copy email lists used when sending flight/hotel bids to reservation vendors.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold text-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Predefined Primary Sender Email address *</label>
              <input
                type="email"
                required
                value={settings.senderEmail}
                onChange={e => setSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                className="w-full bg-white border border-slate-250 rounded-xl p-3 font-mono text-xs font-bold shadow-2xs"
                placeholder="travel-desk@hemraj-group.com"
              />
            </div>

            <div>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Default Outbound CC Recipients (Comma-separated lists) *</label>
              <input
                type="text"
                required
                value={settings.ccRecipients}
                onChange={e => setSettings(prev => ({ ...prev, ccRecipients: e.target.value }))}
                className="w-full bg-white border border-slate-250 rounded-xl p-3 font-mono text-xs font-bold shadow-2xs"
                placeholder="compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="text-[9px] uppercase font-bold">
              {inlineError && <span className="text-rose-600">⚠️ {inlineError}</span>}
              {inlineSuccess && <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" /> {inlineSuccess}</span>}
            </div>
            
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {savingSettings ? (
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
              ) : (
                <Save className="w-4 h-4 text-orange-400" />
              )}
              <span>Save Mail config</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: ADD & MANAGE VENDORS */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block font-sans">Vendor Database Ledger</span>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <Building2 className="w-5 h-5 text-orange-500" />
              <span>Add & Manage Travel Vendors</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Create and manage corporate aviation, railway, and logistics booking vendors.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewVendorForm}
            className="self-start sm:self-center px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Register New Vendor</span>
          </button>
        </div>

        {/* INLINE VENDOR FORM */}
        <AnimatePresence>
          {vFormOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleVendorSubmit} className="bg-slate-50 border-2 border-dashed border-slate-200 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-205">
                  <h4 className="text-[10px] font-black uppercase text-slate-900">
                    {editingVendorId ? "Edit Vendor Properties" : "Register Corporate Booking Vendor"}
                  </h4>
                  <button type="button" onClick={() => setVFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vendor / Agency Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cleartrip Business Desk"
                      value={vNameInput}
                      onChange={e => setVNameInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Corporate Emails (comma-separated) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. corp@cleartrip.com, bookings@cleartrip.com"
                      value={vEmailsString}
                      onChange={e => setVEmailsString(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Lines (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 22 4893849, +91 9988776655"
                      value={vPhonesString}
                      onChange={e => setVPhonesString(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categories (select all that apply) *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["FLIGHT", "TRAIN", "HOTEL", "CAB", "OTHER"] as const).map(cat => (
                        <label key={cat} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vCategories.includes(cat)}
                            onChange={() => setVCategories(prev => 
                              prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                            )}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-[10px] font-bold text-slate-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[9px] font-mono text-rose-600 font-bold uppercase">
                    {vInlineError && `⚠️ Error: ${vInlineError}`}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVFormOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingVendors}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {updatingVendors ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{editingVendorId ? "Upgrade Vendor" : "Add Vendor"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VENDORS DATABASE TABLE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4">Vendor ID</th>
                  <th className="py-3 px-4">Name / Agency</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Category Specialty</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 uppercase text-[10px] font-extrabold tracking-wider bg-slate-50/20">
                      No Reservation Vendors configured in database.
                    </td>
                  </tr>
                ) : (
                  vendors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3 px-4 font-mono text-[9px] text-slate-400 uppercase">
                        {v.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{v.name}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-550">
                        {(v.emails || []).join(", ")}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {(v.phones || []).length > 0 ? (v.phones || []).join(", ") : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {(v.categories || []).map(c => (
                          <span key={c} className={`inline-block mr-1 mb-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            c === 'FLIGHT' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            c === 'HOTEL' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            c === 'TRAIN' ? "bg-purple-50 text-purple-700 border border-purple-200" :
                            c === 'CAB' ? "bg-teal-50 text-teal-700 border border-teal-200" :
                            "bg-slate-50 text-slate-700 border border-slate-200"
                          }`}>
                            {c}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVendorEditClick(v)}
                            className="p-1 px-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer text-[8px] uppercase font-black"
                            title="Edit vendor properties"
                          >
                            Edit
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteVendor(v.id, v.name)}
                            className="p-1 px-2.5 bg-white border border-slate-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg shadow-2xs cursor-pointer text-[8px] uppercase font-black"
                            title="Delete vendor"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
