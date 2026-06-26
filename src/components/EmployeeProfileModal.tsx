import React from "react";
import { Employee } from "../types";
import { X, User, Briefcase, Plane, Globe, Shield, FileText, CheckCircle2 } from "lucide-react";

interface EmployeeProfileModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function EmployeeProfileModal({ employee, onClose }: EmployeeProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white border-2 border-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Employee Travel Record</h3>
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{employee.employee_code}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-8 overflow-y-auto space-y-8 text-xs font-bold text-slate-800 uppercase tracking-wide">
          
          {/* Section 1: Hero Identity */}
          <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100">
            {employee.photograph_url ? (
              <img 
                src={employee.photograph_url} 
                alt={employee.name} 
                referrerPolicy="no-referrer"
                className="w-24 h-24 object-cover border-2 border-slate-900 rounded-2xl shrink-0"
              />
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400 shrink-0">
                <User className="w-8 h-8 mb-1" />
                <span className="text-[8px] font-black uppercase">No Photo</span>
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 normal-case mb-1">{employee.name}</h1>
              <div className="flex flex-wrap gap-2 text-[10px] tracking-wider">
                <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                  {employee.designation}
                </span>
                <span className="bg-orange-50 text-orange-900 px-2.5 py-1 rounded-md border border-orange-200 font-black">
                  Dept: {employee.department}
                </span>
                {employee.assigned_plant_site && (
                  <span className="bg-teal-50 text-teal-900 px-2.5 py-1 rounded-md border border-teal-200 font-black">
                    Plant: {employee.assigned_plant_site}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Budget details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-xs">Corporate & Contact Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Email Address</span>
                <span className="text-slate-900 break-all select-all font-mono norm-case">{employee.email}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Phone / Mobile</span>
                <span className="text-slate-900 break-all select-all font-mono">{employee.phone || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Primary Travel Approver</span>
                <span className="text-slate-900 block font-black">{employee.default_travel_approver}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{employee.approver_designation}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Cost Center & Currency</span>
                <span className="text-slate-900 block font-black">{employee.cost_centre || "General Code"}</span>
                <span className="text-[9px] text-orange-600 block mt-0.5">Currency: {employee.default_billing_currency || "INR"}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Domestic Travel Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Plane className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-xs">Domestic Preferences</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Base / Native City</span>
                <span className="text-slate-900 block">{employee.native_city || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Nearest Airport</span>
                <span className="text-slate-900 block font-mono">{employee.nearest_airport || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Nearest Railway Station</span>
                <span className="text-slate-900 block font-mono">{employee.nearest_railway_station || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Preferred Mode of Transport</span>
                <span className="text-slate-900 block text-teal-600 font-extrabold">{employee.default_mode_of_transport || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Extra Baggage Granted</span>
                <span className="text-slate-900 block">{employee.extra_baggage_required ? "YES (HEMRAJ PREMIUM)" : "NO"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Passport & International Clearance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Globe className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-xs">International Documents & Vaccine Clearances</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Passport credentials</span>
                <span className="text-slate-900 block font-mono font-black">{employee.passport_number || "NO RECORD REGISTERED"}</span>
                {employee.passport_expiry && (
                  <span className="text-[9px] text-orange-600 block mt-0.5">Expires: {employee.passport_expiry} (Issue: {employee.passport_issue_date || "N/A"})</span>
                )}
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Visa Clearance</span>
                <span className="text-slate-900 block font-mono font-black">{employee.visa_number || "N/A"}</span>
                {employee.visa_expiry_date && (
                  <span className="text-[9px] text-orange-600 block mt-0.5">Expiry: {employee.visa_expiry_date}</span>
                )}
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Yellow Fever Vaccine (YFV)</span>
                <span className={`text-xs font-black uppercase ${employee.yfv_status === "VALID" ? "text-emerald-600" : "text-amber-500"}`}>
                  Status: {employee.yfv_status || "NOT DOCUMENTED"}
                </span>
                {employee.yfv_certificate_expiry && (
                  <span className="text-[9px] text-slate-400 block mt-0.5">Cert Expiry: {employee.yfv_certificate_expiry}</span>
                )}
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block mb-0.5">Polio Vaccine status (OPV)</span>
                <span className="text-slate-900 block">{employee.polio_vaccine_status || "N/A"}</span>
                {employee.polio_certificate_expiry && (
                  <span className="text-[9px] text-slate-400 block mt-0.5">Expiry: {employee.polio_certificate_expiry}</span>
                )}
              </div>
            </div>

            {/* Scanned files previews */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {employee.passport_front_page_url && (
                <a 
                  href={employee.passport_front_page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition duration-100"
                >
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-[9px] text-slate-600 truncate normal-case">Passport Front Page.png</span>
                </a>
              )}
              {employee.passport_back_page_url && (
                <a 
                  href={employee.passport_back_page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition duration-100"
                >
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-[9px] text-slate-600 truncate normal-case">Passport Back Page.png</span>
                </a>
              )}
              {employee.offer_letter_url && (
                <a 
                  href={employee.offer_letter_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-800 transition duration-100"
                >
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-[9px] text-slate-600 truncate normal-case">Visa Copy / Offer Letter.pdf</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-full hover:bg-slate-800 transition duration-150 cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
