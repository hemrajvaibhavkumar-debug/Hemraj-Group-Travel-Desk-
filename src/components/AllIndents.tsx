import React, { useState, useMemo } from "react";
import { TravelIndent, Employee, JobCard } from "../types";
import { Briefcase, Search, Filter, ArrowRight, BadgeHelp, Users, FileText } from "lucide-react";
import { usePersistedState } from "../hooks/usePersistedState";
import ApprovalQueue from "./ApprovalQueue";

interface AllIndentsProps {
  indents: TravelIndent[];
  employees: Employee[];
  jobCards: JobCard[];
}

export default function AllIndents({ indents, employees, jobCards }: AllIndentsProps) {
  const [searchQuery, setSearchQuery] = usePersistedState("all-indents-search-query", "");
  const [selectedCategory, setSelectedCategory] = usePersistedState("all-indents-category", "ALL");

  const detailedIndents = useMemo(() => {
    return indents.map(ind => {
      const emp = employees.find(e => e.employee_code === ind.employee_code);
      return {
        ...ind,
        // Raiser info
        indentRaiserName: ind.indent_raiser ? (employees.find(e => e.employee_code === ind.indent_raiser)?.name || "Unknown") : "N/A",
        // Approver info
        travelApproverName: ind.travel_approver ? (employees.find(e => e.employee_code === ind.travel_approver)?.name || "Unknown") : (employees.find(e => e.employee_code === ind.employee_code)?.default_travel_approver || "N/A"),
        employeeName: emp ? emp.name : "Unknown Employee",
        employeeDept: emp ? emp.department : "Unknown Dept"
      };
    });
  }, [indents, employees]);

  const filteredIndents = useMemo(() => {
    return detailedIndents.filter(item => {
      const matchSearch = 
        item.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === "ALL" || item.travel_type === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [detailedIndents, searchQuery, selectedCategory]);

  return (
    <div id="all-indents-panel" className="space-y-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between pb-6 border-b border-slate-200 mb-6">
                <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900">All Travel Indents History</h2>                
                <div className="flex flex-wrap gap-3 w-full xl:w-auto justify-end">
                  <div className="relative w-full xl:max-w-md">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-900" />
                    <input
                      type="text"
                      placeholder="Search traveler, destination, or purpose..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl focus:outline-none focus:border-slate-900 text-slate-950"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <Filter className="w-3.5 h-3.5 text-slate-900" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-950 outline-none cursor-pointer"
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
                </div>
            </div>

            {/* Indents Table */}
            {filteredIndents.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <BadgeHelp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-extrabold text-xs uppercase tracking-wider">No indents found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-950">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Traveler</th>
                        <th className="px-6 py-4">Raiser</th>
                        <th className="px-6 py-4">Approver</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-bold">
                    {filteredIndents.map((indent) => (
                        <tr key={indent.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4 font-mono font-black text-slate-900">{indent.id}</td>
                        <td className="px-6 py-4">{indent.employeeName}</td>
                        <td className="px-6 py-4">{indent.indentRaiserName}</td>
                        <td className="px-6 py-4">{indent.travelApproverName}</td>
                        <td className="px-6 py-4">{indent.travel_date}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-black text-slate-900">
                            {indent.source_location} <ArrowRight className="w-3.5 h-3.5 text-orange-500" /> {indent.destination}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            {indent.voided ? <span className="text-orange-600 font-black">VOID</span> : <span className="text-green-600 font-black">ACTIVE</span>}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            
            {/* Approval Queue Section */}
            <div className="pt-8 border-t border-slate-200 mt-8">
                <ApprovalQueue jobCards={jobCards} indents={indents} />
            </div>
        </div>
    </div>
  );
}
