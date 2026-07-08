import React, { useState } from "react";
import { TravelCategory } from "../types";
import { Building2, CheckCircle2, ShieldAlert, Sparkles, Send, Calendar, MapPin, Phone, Mail, User, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PublicIndentForm() {
  const [type, setType] = useState<TravelCategory>("DOMESTIC");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Purchase");
  const [designation, setDesignation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [connectionRequired, setConnectionRequired] = useState(false);
  const [indentRaiser, setIndentRaiser] = useState("");
  const [travelApprover, setTravelApprover] = useState("");
  const [approverTitle, setApproverTitle] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setLoading(true);

    try {
      const res = await fetch("/api/public-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          email,
          phone,
          department,
          designation,
          from,
          to,
          date,
          is_return: isReturn,
          domestic_connection_required: connectionRequired,
          indent_raiser: indentRaiser || name,
          travel_approver: travelApprover,
          approver_title: approverTitle
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request.");
      }

      setSuccessId(data.request.id);
    } catch (err: any) {
      setErrorText(err.message || "Error submitting request.");
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6"
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto border border-emerald-400/20">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Request Submitted!</h1>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider leading-relaxed">
              Your travel request has been logged successfully and routed for internal compliance and approval.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 font-mono text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase block tracking-widest mb-1">
              Travel Indent Reference ID
            </span>
            <span className="text-sm font-black text-emerald-400 uppercase tracking-widest block">
              {successId}
            </span>
          </div>

          <button
            onClick={() => {
              setSuccessId(null);
              setName("");
              setEmail("");
              setPhone("");
              setDesignation("");
              setFrom("");
              setTo("");
              setDate("");
              setIsReturn(false);
              setConnectionRequired(false);
              setIndentRaiser("");
              setTravelApprover("");
              setApproverTitle("");
            }}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition duration-150 active:scale-[0.98] shadow-lg cursor-pointer"
          >
            Submit Another Request
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 my-8"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto border border-orange-400/20 mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              HEMRAJ <span className="text-orange-500 font-medium">GROUP</span>
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">
              Public Travel Desk Submission
            </p>
          </div>
        </div>

        {errorText && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs font-bold uppercase tracking-wide leading-relaxed">
              <span className="font-black text-rose-400 block mb-0.5">Submission Error</span>
              {errorText}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Traveler Personal Details */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-orange-500" />
              1. Traveler Identity
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Travel Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as TravelCategory)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition cursor-pointer"
                >
                  <option value="DOMESTIC">Domestic Flight</option>
                  <option value="INTERNATIONAL">International Flight</option>
                  <option value="INTERNATIONAL_RETURN">International Return Flight</option>
                  <option value="TRAIN">Train</option>
                  <option value="BUS">Bus</option>
                  <option value="CAB">Cab</option>
                  <option value="VISA">Visa Processing</option>
                  <option value="VENDOR">Vendor/Other Service</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Corporate Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@hemrajgroup.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phone / WhatsApp No.</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition cursor-pointer"
                >
                  <option value="Purchase">Purchase</option>
                  <option value="Ops">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="IT">Information Technology</option>
                  <option value="Admin">Administration</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchase Manager"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Travel Particulars */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              2. Trip Particulars
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Origin (Source)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai (BOM)"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Destination</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lagos (LOS)"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Travel Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Indent Raised By (Name)</label>
                <input
                  type="text"
                  required
                  placeholder="Raised By..."
                  value={indentRaiser}
                  onChange={e => setIndentRaiser(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Required Approver Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit ji (COO)"
                  value={travelApprover}
                  onChange={e => setTravelApprover(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Approver Title / Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Operating Officer"
                  value={approverTitle}
                  onChange={e => setApproverTitle(e.target.value)}
                  className="w-full h-11 bg-slate-950/60 border border-slate-800 text-white rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="flex items-center gap-2 p-3 bg-slate-950/40 border border-slate-800 rounded-2xl select-none animate-fade-in">
                <input
                  type="checkbox"
                  id="chk-is-return"
                  checked={isReturn}
                  onChange={e => setIsReturn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                />
                <label htmlFor="chk-is-return" className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer">
                  Return Travel Required
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-950/40 border border-slate-800 rounded-2xl select-none animate-fade-in">
                <input
                  type="checkbox"
                  id="chk-connection"
                  checked={connectionRequired}
                  onChange={e => setConnectionRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                />
                <label htmlFor="chk-connection" className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer">
                  Connection Flights Req.
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition duration-150 active:scale-[0.98] shadow-lg shadow-orange-500/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Registering Indent..." : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit Travel Indent Request
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
