import React, { useState, useMemo } from "react";
import { JobCard, TravelIndent } from "../types";
import { Search, Filter, CheckCircle2, AlertTriangle, FileCheck2, XCircle, FileText } from "lucide-react";

interface ApprovalQueueProps {
  jobCards: JobCard[];
  indents: TravelIndent[];
}

export default function ApprovalQueue({ jobCards, indents }: ApprovalQueueProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Logic to combine indents and job cards for review
  const pendingApprovals = useMemo(() => {
    return jobCards.filter(jc => jc.approvalStatus === 'PENDING');
  }, [jobCards]);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Pending Travel Expense Approvals</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
            <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Job Card ID</th>
                <th className="px-6 py-4">Traveler</th>
                <th className="px-6 py-4">Quoted</th>
                <th className="px-6 py-4">Actual</th>
                <th className="px-6 py-4">Variance</th>
                <th className="px-6 py-4">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-bold">
            {pendingApprovals.map((jc) => {
              const variance = jc.quoted_total && jc.actual_total ? ((jc.actual_total - jc.quoted_total) / jc.quoted_total) * 100 : 0;
              return (
              <tr key={jc.id} className="hover:bg-slate-50/70">
                <td className="px-6 py-4 font-mono font-black text-slate-900">{jc.id}</td>
                <td className="px-6 py-4">{jc.travelerName}</td>
                <td className="px-6 py-4">{jc.quoted_total || 0}</td>
                <td className="px-6 py-4">{jc.actual_total || 0}</td>
                <td className={`px-6 py-4 font-black ${variance > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {variance.toFixed(1)}%
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button className="text-green-600 hover:text-green-800"><CheckCircle2 className="w-5 h-5"/></button>
                  <button className="text-red-500 hover:text-red-700"><XCircle className="w-5 h-5"/></button>
                  <button className="text-slate-400 hover:text-slate-600"><FileText className="w-5 h-5"/></button>
                </td>
              </tr>
              );
            })}
            </tbody>
        </table>
      </div>
    </div>
  );
}
