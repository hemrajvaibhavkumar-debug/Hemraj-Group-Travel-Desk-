import React, { useMemo } from "react";
import { TravelIndent, Employee, JobCard, Vendor } from "../types";
import { 
  TrendingUp, BarChart2, Calendar, MapPin, Briefcase, 
  Clock, CheckCircle, AlertTriangle, Users, Compass, 
  Activity, ArrowUpRight, DollarSign, ListCollapse
} from "lucide-react";

interface DashboardReportsProps {
  indents: TravelIndent[];
  jobCards: JobCard[];
  employees: Employee[];
  vendors: Vendor[];
  onSelectView: (view: "dashboard" | "indents" | "create" | "jobcards" | "passports" | "settings" | "employees") => void;
}

export default function DashboardReports({
  indents,
  jobCards,
  employees,
  vendors,
  onSelectView
}: DashboardReportsProps) {
  
  // Compute analytics
  const reports = useMemo(() => {
    const totalIndents = indents.length;
    const activeJobCards = jobCards.filter(jc => jc.stage !== 'CLOSED' && !jc.voided).length;
    const closedJobCards = jobCards.filter(jc => jc.stage === 'CLOSED').length;
    const voidedIndents = indents.filter(i => i.voided).length;
    
    // Spend calculations
    const clearedPayments = jobCards.filter(jc => jc.financeCleared && typeof jc.finalBookingAmount === 'number');
    const totalSpendINR = clearedPayments.reduce((sum, jc) => {
      const amt = jc.finalBookingAmount || 0;
      // Convert basic currencies for approximate reporting
      if (jc.invoiceCurrency === 'USD') return sum + (amt * 83);
      if (jc.invoiceCurrency === 'VND') return sum + (amt * 0.0034);
      return sum + amt;
    }, 0);

    // Travel categories breakdown
    const categoryCounts: Record<string, number> = {
      DOMESTIC: 0,
      INTERNATIONAL: 0,
      TRAIN: 0,
      BUS: 0,
      CAB: 0
    };
    indents.forEach(i => {
      const cat = i.travel_type;
      if (cat.startsWith("INTERNATIONAL")) {
        categoryCounts.INTERNATIONAL++;
      } else if (categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++;
      }
    });

    // Priority breakdown
    const criticalCount = indents.filter(i => i.priority === 'CRITICAL').length;
    const highCount = indents.filter(i => i.priority === 'HIGH').length;

    // Stage breakdown
    const stageCounts: Record<string, number> = {
      QUOTATION: 0,
      APPROVAL: 0,
      BOOKING: 0,
      FINANCE: 0,
      RECONCILIATION: 0
    };
    jobCards.forEach(jc => {
      if (stageCounts[jc.stage] !== undefined && !jc.voided) {
        stageCounts[jc.stage]++;
      }
    });

    // Stale requests: Raised > 7 days ago and not in job cards
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const staleIndents = indents.filter(i => {
      const isLinked = jobCards.some(jc => jc.indentId === i.id || jc.id === i.id);
      return !isLinked && new Date(i.created_at) < sevenDaysAgo && !i.voided;
    });

    // Department breakdown
    const deptCounts: Record<string, number> = {};
    indents.forEach(i => {
      const emp = employees.find(e => e.employee_code === i.employee_code);
      const dept = emp?.department || "Operations";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    // Extract recent audit logs
    const allLogs: Array<{ travelerName: string; action: string; timestamp: string; notes: string }> = [];
    jobCards.forEach(jc => {
      if (jc.auditLogs) {
        jc.auditLogs.forEach(log => {
          allLogs.push({
            travelerName: jc.travelerName,
            action: log.action,
            timestamp: log.timestamp,
            notes: log.notes
          });
        });
      }
    });
    const recentLogs = allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    return {
      totalIndents,
      activeJobCards,
      closedJobCards,
      voidedIndents,
      totalSpendINR,
      categoryCounts,
      criticalCount,
      highCount,
      stageCounts,
      staleIndents,
      deptCounts,
      recentLogs
    };
  }, [indents, jobCards, employees]);

  return (
    <div className="space-y-8 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-slate-900 text-white rounded-3xl p-6.5 shadow-sm">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Executive Analytics</span>
          <h3 className="text-xl font-black uppercase tracking-tight mt-1 text-white">Travel Desk Performance & Reporting</h3>
        </div>
        <button
          onClick={() => onSelectView("create")}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>New Indent</span>
        </button>
      </div>

      {/* KPI STATS CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active Indents */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5.5 shadow-xs flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Indents</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{reports.totalIndents}</span>
              <span className="text-[8px] bg-slate-100 text-slate-650 px-1 rounded font-bold uppercase">
                {reports.voidedIndents} Void
              </span>
            </div>
          </div>
        </div>

        {/* Spent Total */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5.5 shadow-xs flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Cleared Spend</span>
            <span className="text-xl font-black text-slate-900 tracking-tight font-mono">
              ₹{Math.round(reports.totalSpendINR).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Active Tracking Job Cards */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5.5 shadow-xs flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Active Job Cards</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{reports.activeJobCards}</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">({reports.closedJobCards} cleared)</span>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5.5 shadow-xs flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Critical Requests</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{reports.criticalCount}</span>
              <span className="text-[8px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase animate-pulse">Action required</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED BREAKDOWNS & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Travel Categories Distribution */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-orange-655" />
              Travel Categories Distribution
            </h4>
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Based on Indents</span>
          </div>

          <div className="space-y-4.5">
            {Object.entries(reports.categoryCounts).map(([cat, countVal]) => {
              const count = countVal as number;
              const percentage = reports.totalIndents > 0 ? (count / reports.totalIndents) * 100 : 0;
              let barColor = "bg-orange-500";
              if (cat === 'INTERNATIONAL') barColor = "bg-slate-900";
              if (cat === 'TRAIN') barColor = "bg-teal-500";
              if (cat === 'BUS') barColor = "bg-indigo-500";
              if (cat === 'CAB') barColor = "bg-amber-500";

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 uppercase tracking-wide">
                    <span>{cat.replace("_", " ")}</span>
                    <span className="font-mono">{count} requests ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Section: Stage Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-655" />
              Active pipeline Stages
            </h4>
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Job Cards</span>
          </div>

          <div className="space-y-4">
            {Object.entries(reports.stageCounts).map(([stage, countVal]) => {
              const count = countVal as number;
              const maxCount = Math.max(...Object.values(reports.stageCounts) as number[], 1);
              const barPercent = (count / maxCount) * 100;
              
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stage.replace("_", " ")}</span>
                  <div className="flex-1 h-5 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100">
                    <div 
                      className="h-full bg-slate-900/10 transition-all duration-500"
                      style={{ width: `${barPercent}%` }}
                    ></div>
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-[10px] font-black text-slate-700 uppercase font-mono">{count} Cards</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LOWER SECTION: STALE REQUESTS & AUDIT TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Stale Requests Warning Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              Stale Requests (&gt; 7 Days Idle)
            </h4>
            <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-full">{reports.staleIndents.length} Stale</span>
          </div>

          {reports.staleIndents.length === 0 ? (
            <div className="py-8 text-center text-slate-405 text-xs font-medium italic">
              All travel indents processed within compliance cycles. No stale indents!
            </div>
          ) : (
            <div className="space-y-3.5 max-h-64 overflow-y-auto pr-2">
              {reports.staleIndents.map(indent => {
                const ageDays = Math.round((new Date().getTime() - new Date(indent.created_at).getTime()) / (1000 * 3600 * 24));
                return (
                  <div key={indent.id} className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-black text-slate-400 block">#{indent.id} &bull; {indent.source_location} &rarr; {indent.destination}</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">{indent.employee_code} &bull; {indent.purpose}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-250 px-2 py-1 rounded-xl block tracking-wider uppercase">{ageDays} days stale</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Audit Chronology Log */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Recent Operations timeline
            </h4>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global Audit logs</span>
          </div>

          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-2">
            {reports.recentLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium italic">
                No recent workflow logs registered.
              </div>
            ) : (
              reports.recentLogs.map((log, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] block leading-relaxed font-bold">
                  <div className="flex justify-between items-center text-slate-400 font-black text-[9px] mb-1">
                    <span>{log.travelerName.toUpperCase()} — {log.action.toUpperCase()}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-slate-850 font-semibold">{log.notes || "No extra metadata captured."}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
