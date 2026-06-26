import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { TravelCategory, PriorityLevel, Employee, TravelIndent, Department, BillingCurrency } from "../types";
import { Upload, HelpCircle, Save, CheckCircle2, AlertTriangle, RefreshCw, FileText, X } from "lucide-react";

interface IndentFormProps {
  employees: Employee[];
  onSubmit: (indent: Partial<TravelIndent>, employee?: Employee) => Promise<void>;
  onCancel: () => void;
}

export default function IndentForm({ employees, onSubmit, onCancel }: IndentFormProps) {
  // Toggle traveler sourcing
  const [useExistingEmployee, setUseExistingEmployee] = useState<boolean>(true);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Validation State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const nextStep = () => {
    const section2Errors = validateSection2();
    if (Object.keys(section2Errors).length === 0) {
      setFormErrors({});
      setCurrentStep(2);
    } else {
      setFormErrors(section2Errors);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  // 1. Section 1 State: Travel Particulars
  const [travelForm, setTravelForm] = useState({
    type: "DOMESTIC" as TravelCategory,
    gstApplicable: true,
    priority: "MEDIUM" as PriorityLevel,
    date: "",
    wpNumber: "",
    nearestBoardingPoint: "",
    luggage: "",
    visaType: "BUSINESS",
    visaTypeOther: "",
    seatPreference: "WINDOW",
    seatPreferenceOther: "",
    mealPreference: "VEG",
    mealPreferenceOther: "",
    from: "",
    to: "",
    purpose: "",
    plant: "HIPL",
    travelApprover: "",
    approverTitle: "",
    indentRaiser: ""
  });

  // 2. Section 2 State: Traveler Assignment (New Employee Details)
  const [travelerForm, setTravelerForm] = useState({
    employeeId: "",
    aadharPanNumber: "",
    name: "",
    email: "",
    phone: "",
    designation: "",
    department: "Purchase",
    defaultTravelApprover: "Rohit ji",
    approverDesignation: "Chief Operating Officer",
    costCentre: "",
    defaultBillingCurrency: "INR" as BillingCurrency,

    // Domestic Specific fields
    baseCity: "",
    nearestAirport: "",
    nearestRailwayStation: "",
    defaultModeOfTransport: "Flight",
    extraBaggageRequired: false,
    photograph: "", // simulated url
    supportingDocuments: "", // simulated url

    // International Specific fields
    presentLocationAbroad: "",
    assignedPlantSite: "Sunagrow",
    nearestAirportIndia: "",
    passportNumber: "",
    passportIssueDate: "",
    passportExpiryDate: "",
    passportFrontPage: "", // simulated url
    passportBackPage: "", // simulated url
    offerLetter: "", // simulated url
    polioVaccineStatus: "Vaccinated",
    polioCertificateExpiry: "",
    yfvStatus: "Vaccinated",
    yfvCertificateExpiry: "",
    visaNumber: "",
    visaExpiryDate: "",
    visaCountry: ""
  });

  // Mock File Upload Ref & State
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, { name: string; progress: number; error?: string }>>({});

  const handleTravelFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (name === "gstApplicable") {
      finalValue = value === "true";
    }
    setTravelForm(prev => ({ ...prev, [name]: finalValue }));
    // Clear error
    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleTravelerFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (name === "extraBaggageRequired") {
      finalValue = value === "true";
    }
    setTravelerForm(prev => ({ ...prev, [name]: finalValue }));
    // Clear error
    if (formErrors[`traveler_${name}`]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[`traveler_${name}`];
        return copy;
      });
    }
  };

  // Drag and Drop simulated upload handler
  const handleFileUpload = async (fieldName: string, file: File) => {
    setUploadingFiles(prev => ({
      ...prev,
      [fieldName]: { name: file.name, progress: 10 }
    }));

    try {
      // Direct compression/simulation using Base64 so we hit `/api/upload`
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        // Progress update simulation
        setUploadingFiles(prev => ({
          ...prev,
          [fieldName]: { name: file.name, progress: 60 }
        }));

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileData: base64Data
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Upload failed");
          }

          setUploadingFiles(prev => ({
            ...prev,
            [fieldName]: { name: file.name, progress: 100 }
          }));

          // Save URL to TravelerForm state
          setTravelerForm(prev => ({
            ...prev,
            [fieldName]: data.url
          }));
        } catch (uploadErr: any) {
          setUploadingFiles(prev => ({
            ...prev,
            [fieldName]: { name: file.name, progress: 0, error: uploadErr.message }
          }));
        }
      };
    } catch (err: any) {
      setUploadingFiles(prev => ({
        ...prev,
        [fieldName]: { name: file.name, progress: 0, error: err.message }
      }));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, fieldName: string) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(fieldName, e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(fieldName, e.target.files[0]);
    }
  };

  // New helper functions
  const validateSection1 = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!travelForm.date) errors.date = "Expected Travel Date is mandatory.";
    else {
      const selectedDate = new Date(travelForm.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) {
        errors.date = "Travel date cannot be in the past.";
      }
    }
    
    if (!travelForm.nearestBoardingPoint.trim()) errors.nearestBoardingPoint = "Boarding Point is required.";
    if (!travelForm.from.trim()) errors.from = "Origin Location is required.";
    if (!travelForm.to.trim()) errors.to = "Destination Location is required.";
    if (!travelForm.purpose.trim()) errors.purpose = "Purpose of journey is required.";
    if (travelForm.purpose.trim().length < 10) errors.purpose = "Purpose should contain at least 10 characters.";
    return errors;
  };

  const validateSection2 = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (useExistingEmployee) {
      if (!selectedEmpCode) {
        errors.selectedEmpCode = "Please select an assigned saved employee profile.";
      } else {
        const emp = employees.find(e => e.employee_code === selectedEmpCode);
        const isInt = travelForm.type === "INTERNATIONAL" || travelForm.type === "INTERNATIONAL_RETURN";
        if (isInt) {
          if (!emp || !emp.passport_expiry) {
            errors.passport_compliance = "This traveler has no passport expiry date recorded. International booking is strictly blocked.";
          } else {
            const expiry = new Date(emp.passport_expiry).getTime();
            const now = Date.now();
            const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
              errors.passport_compliance = `CRITICAL COMPLIANCE FAILURE: Traveler's passport expired ${Math.abs(diffDays)} days ago (RED ZONE). Flight booking is strictly blocked!`;
            } else if (diffDays < 180) {
              errors.passport_compliance = `CRITICAL VISAS WARNING: Passport has only ${diffDays} days of validity (YELLOW ZONE, under 6 months). Booking is blocked until renewal!`;
            }
          }
        }
      }
    } else {
      // Validate Traveler assignment details
      const t = travelerForm;
      if (!t.employeeId.trim()) errors.traveler_employeeId = "Employee ID is mandatory.";
      if (!t.aadharPanNumber.trim()) errors.traveler_aadharPanNumber = "Aadhar/PAN Number is mandatory.";
      if (!t.name.trim()) errors.traveler_name = "Full Name is required.";
      if (!t.email.trim()) errors.traveler_email = "Email field is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) {
        errors.traveler_email = "Please key in a valid email pattern.";
      }
      if (!t.phone.trim()) errors.traveler_phone = "Contact number is mandatory.";
      if (!t.designation.trim()) errors.traveler_designation = "Corporate Designation is required.";
      if (!t.costCentre.trim()) errors.traveler_costCentre = "Billing Cost Centre code is mandatory.";

      // Conditional sections validation depending on Selected travel Category
      const isDomestic = travelForm.type === "DOMESTIC" || travelForm.type === "SL";
      const isInternational = travelForm.type === "INTERNATIONAL" || travelForm.type === "INTERNATIONAL_RETURN";

      if (isDomestic) {
        if (!t.baseCity.trim()) errors.traveler_baseCity = "Base City state is required.";
        if (!t.nearestAirport.trim()) errors.traveler_nearestAirport = "Nearest Domestic Airport is required.";
      }

      if (isInternational) {
        // Since Passport and Visa are now optional, only validate if at least one field is filled
        const hasPassportData = t.passportNumber.trim() || t.passportIssueDate || t.passportExpiryDate;
        if (hasPassportData) {
          if (!t.passportNumber.trim()) errors.traveler_passportNumber = "Passport Number is required if passport details are provided.";
          if (!t.passportIssueDate) errors.traveler_passportIssueDate = "Passport Issue Date is required if passport details are provided.";
          if (!t.passportExpiryDate) errors.traveler_passportExpiryDate = "Passport Expiry Date is required if passport details are provided.";
          else if (t.passportIssueDate && new Date(t.passportExpiryDate) <= new Date(t.passportIssueDate)) {
            errors.traveler_passportExpiryDate = "Passport Expiry must register after the issue date.";
          } else {
            const expiry = new Date(t.passportExpiryDate).getTime();
            const now = Date.now();
            const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
              errors.passport_compliance = `CRITICAL COMPLIANCE FAILURE: Passport is already expired (${Math.abs(diffDays)} days ago)!`;
            } else if (diffDays < 180) {
              errors.passport_compliance = `CRITICAL VISAS WARNING: Passport must have at least 180 days (6 months) validity remaining (only ${diffDays} days registered).`;
            }
          }
        }
        
        const hasVisaData = t.visaNumber.trim() || t.visaCountry.trim();
        if (hasVisaData) {
          if (!t.visaNumber.trim()) errors.traveler_visaNumber = "Visa clearance Number is required if visa details are provided.";
          if (!t.visaCountry.trim()) errors.traveler_visaCountry = "Visa Country is required if visa details are provided.";
        }
      }
    }
    return errors;
  };

  const handleFormSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const s1Errors = validateSection1();
    const s2Errors = validateSection2();
    const allErrors = {...s1Errors, ...s2Errors};
    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      // If errors are in the other step, don't necessarily switch, but usually we should
      if (Object.keys(s2Errors).length > 0) setCurrentStep(1);
      else if (Object.keys(s1Errors).length > 0) setCurrentStep(2);
      return;
    }

    // Passport Expiry Warning Logic (< 1 year)
    const isInternational = travelForm.type === "INTERNATIONAL" || travelForm.type === "INTERNATIONAL_RETURN";
    if (isInternational) {
      let expiryDateStr = "";
      if (useExistingEmployee) {
        const emp = employees.find(e => e.employee_code === selectedEmpCode);
        if (emp && emp.passport_expiry) expiryDateStr = emp.passport_expiry;
      } else {
        expiryDateStr = travelerForm.passportExpiryDate;
      }

      if (expiryDateStr) {
        const expiry = new Date(expiryDateStr).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        // Only warn if it's not already blocked by hard validation (< 180 days)
        // Hard validation already caught < 180 days in validateSection2
        if (diffDays >= 180 && diffDays < 365) {
          const proceed = window.confirm(`PASSPORT VALIDITY WARNING: The traveler's passport expires in ${diffDays} days (less than 1 year). Most international travel requires at least 6 months, but some regions recommend more. Do you still want to continue with this indent?`);
          if (!proceed) return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      let finalEmployee: Employee | undefined = undefined;
      let targetEmployeeCode = selectedEmpCode;

      if (!useExistingEmployee) {
        // Prepare new registered employee payload
        finalEmployee = {
          employee_code: travelerForm.employeeId,
          aadhar_pan_number: travelerForm.aadharPanNumber,
          name: travelerForm.name,
          email: travelerForm.email,
          phone: travelerForm.phone,
          designation: travelerForm.designation,
          department: travelerForm.department,
          default_travel_approver: travelerForm.defaultTravelApprover,
          approver_designation: travelerForm.approverDesignation,
          cost_centre: travelerForm.costCentre,
          default_billing_currency: travelerForm.defaultBillingCurrency,
          
          // Domestic
          native_city: travelerForm.baseCity || undefined,
          nearest_airport: travelerForm.nearestAirport || undefined,
          nearest_railway_station: travelerForm.nearestRailwayStation || undefined,
          default_mode_of_transport: travelerForm.defaultModeOfTransport || undefined,
          extra_baggage_required: travelerForm.extraBaggageRequired,
          photograph_url: travelerForm.photograph || undefined,
          supporting_documents_url: travelerForm.supportingDocuments || undefined,

          // International
          present_location_abroad: travelerForm.presentLocationAbroad || undefined,
          assigned_plant_site: travelerForm.assignedPlantSite || undefined,
          nearest_airport_india: travelerForm.nearestAirportIndia || undefined,
          passport_number: travelerForm.passportNumber || undefined,
          passport_issue_date: travelerForm.passportIssueDate || undefined,
          passport_expiry: travelerForm.passportExpiryDate || undefined,
          passport_front_page_url: travelerForm.passportFrontPage || undefined,
          passport_back_page_url: travelerForm.passportBackPage || undefined,
          offer_letter_url: travelerForm.offerLetter || undefined,
          polio_vaccine_status: travelerForm.polioVaccineStatus || undefined,
          polio_certificate_expiry: travelerForm.polioCertificateExpiry || undefined,
          yfv_status: travelerForm.yfvStatus || undefined,
          yfv_certificate_expiry: travelerForm.yfvCertificateExpiry || undefined,
          visa_number: travelerForm.visaNumber || undefined,
          visa_expiry_date: travelerForm.visaExpiryDate || undefined,
          visa_country: travelerForm.visaCountry || undefined
        };
        targetEmployeeCode = travelerForm.employeeId;
      }

      // Prepare Travel Indent payload
      const indentPayload: Partial<TravelIndent> = {
        travel_type: travelForm.type,
        gst_applicable: travelForm.gstApplicable,
        priority: travelForm.priority,
        travel_date: travelForm.date,
        wp_number: travelForm.wpNumber || "N/A",
        nearest_boarding_point: travelForm.nearestBoardingPoint,
        luggage: travelForm.luggage || "Standard (15kg)",
        visa_type: travelForm.visaType === "OTHER" ? travelForm.visaTypeOther : travelForm.visaType,
        seat_preference: travelForm.seatPreference === "OTHER" ? travelForm.seatPreferenceOther : travelForm.seatPreference,
        meal_preference: travelForm.mealPreference === "OTHER" ? travelForm.mealPreferenceOther : travelForm.mealPreference,
        source_location: travelForm.from,
        destination: travelForm.to,
        purpose: travelForm.purpose,
        employee_code: targetEmployeeCode,
        plant: travelForm.plant,
        travel_approver: travelForm.travelApprover,
        approver_title: travelForm.approverTitle,
        indent_raiser: travelForm.indentRaiser
      };

      await onSubmit(indentPayload, finalEmployee);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="indent-form-panel" className="bg-white rounded-3xl border-2 border-slate-900 overflow-hidden max-w-4xl mx-auto shadow-xl">
      {/* Form Header */}
      <div className="bg-slate-950 px-8 py-6 text-white flex justify-between items-center border-b border-slate-900">
        <div>
          <h2 id="form-heading" className="text-2xl font-black uppercase tracking-tighter">Create Travel Indent</h2>
          <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">Hemraj Group Personal Travel Desk System Initialization</p>
        </div>
        <button 
          onClick={onCancel}
          id="btn-close-form"
          className="text-white hover:text-orange-500 hover:bg-slate-900 p-2.5 rounded-full border border-slate-850 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleFormSubmission} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
        
        {/* Dynamic Alerts if Validation fails */}
        {Object.keys(formErrors).length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 p-5 rounded-2xl flex items-start gap-4 text-orange-950 text-xs font-bold uppercase tracking-wide">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block text-sm">Please fix the following validation warnings:</span>
              <ul className="list-disc pl-5 mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-[11px] font-bold text-orange-900">
                {Object.entries(formErrors).map(([key, msg]) => (
                  <li key={key}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className={currentStep === 1 ? "space-y-8" : "hidden"}>
          {/* SECTION 1: TRAVELER ASSIGNMENT */}
          <div>
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3 mb-6">
              <div className="w-8 h-8 bg-slate-950 text-orange-500 rounded flex items-center justify-center font-black text-xs leading-none">
                1
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">User Selection (Traveler Assignment)</h3>
            </div>

            {/* Selector Tabs: Existing Employee vs Register Profile */}
            <div className="bg-slate-50 p-1 rounded-xl flex gap-1 mb-6 max-w-md">
              <button
                id="btn-source-existing"
                type="button"
                onClick={() => {
                  setUseExistingEmployee(true);
                  // Clear any traveler validations
                  setFormErrors(prev => {
                    const copy = { ...prev };
                    Object.keys(copy).forEach(k => {
                      if (k.startsWith("traveler_")) delete copy[k];
                    });
                    return copy;
                  });
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${useExistingEmployee ? "bg-white text-teal-900 shadow-xs border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Select Existing Traveler
              </button>
              <button
                id="btn-source-new"
                type="button"
                onClick={() => {
                  setUseExistingEmployee(false);
                  if (formErrors.selectedEmpCode) {
                    setFormErrors(prev => {
                      const copy = { ...prev };
                      delete copy.selectedEmpCode;
                      return copy;
                    });
                  }
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${!useExistingEmployee ? "bg-white text-teal-900 shadow-xs border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Register New Profile
              </button>
            </div>

            {useExistingEmployee ? (
              /* EXISTS EMP SELECTOR FIELD */
              <div className="space-y-3">
                <label htmlFor="input-selected-empcode" className="block text-xs font-bold text-slate-600 uppercase font-sans tracking-wider">
                  Select Traveler Profile from Hemraj Group Master Table *
                </label>
                <select
                  id="input-selected-empcode"
                  value={selectedEmpCode}
                  onChange={(e) => {
                    setSelectedEmpCode(e.target.value);
                    if (formErrors.selectedEmpCode) {
                      setFormErrors(prev => {
                        const copy = { ...prev };
                        delete copy.selectedEmpCode;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full max-w-lg bg-slate-50 border ${formErrors.selectedEmpCode ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm`}
                >
                  <option value="">-- Choose Profile --</option>
                  {employees.map(emp => (
                    <option key={emp.employee_code} value={emp.employee_code}>
                      {emp.name} ({emp.employee_code}) - {emp.designation} [{emp.department}]
                    </option>
                  ))}
                </select>
                {formErrors.selectedEmpCode && (
                  <span className="text-xs font-medium text-rose-500 block">{formErrors.selectedEmpCode}</span>
                )}
                {selectedEmpCode && (
                  <div id="selected-employee-preview" className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-4 mt-3 max-w-2xl">
                    {employees.find(e => e.employee_code === selectedEmpCode)?.photograph_url ? (
                      <img
                        src={employees.find(e => e.employee_code === selectedEmpCode)?.photograph_url}
                        alt="Traveler avatar"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 mt-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {employees.find(e => e.employee_code === selectedEmpCode)?.name.charAt(0)}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block">Employee Code</span>
                        <span className="text-slate-800 font-bold">{selectedEmpCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Department / Cost Centre</span>
                        <span className="text-slate-800 font-semibold">
                          {employees.find(e => e.employee_code === selectedEmpCode)?.department} / {employees.find(e => e.employee_code === selectedEmpCode)?.cost_centre}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Email Address</span>
                        <span className="text-slate-700">{employees.find(e => e.employee_code === selectedEmpCode)?.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Contact Approver</span>
                        <span className="text-slate-700 font-semibold">{employees.find(e => e.employee_code === selectedEmpCode)?.default_travel_approver} ({employees.find(e => e.employee_code === selectedEmpCode)?.approver_designation})</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* NEW TRAVELER PROFILE FORM FIELDS */
              <div className="space-y-6">
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-xs text-teal-800 mb-2">
                  <strong>Corporate Rules Information:</strong> Registering traveler profiles here automatically registers them inside the <code>employees</code> master table matching primary index.
                </div>

                {/* Shared Traveler Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="input-traveler-employeeId" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Employee ID Code *
                    </label>
                    <input
                      id="input-traveler-employeeId"
                      type="text"
                      name="employeeId"
                      placeholder="e.g. EMP-9392"
                      value={travelerForm.employeeId}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_employeeId ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm text-slate-800`}
                    />
                    {formErrors.traveler_employeeId && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_employeeId}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-aadharPanNumber" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Aadhar/PAN Number *
                    </label>
                    <input
                      id="input-traveler-aadharPanNumber"
                      type="text"
                      name="aadharPanNumber"
                      placeholder="e.g. ABCDE1234F"
                      value={travelerForm.aadharPanNumber}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_aadharPanNumber ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm text-slate-800`}
                    />
                    {formErrors.traveler_aadharPanNumber && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_aadharPanNumber}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-name" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Full Name *
                    </label>
                    <input
                      id="input-traveler-name"
                      type="text"
                      name="name"
                      placeholder="e.g. Ramesh Hemraj"
                      value={travelerForm.name}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_name ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                    />
                    {formErrors.traveler_name && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_name}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-email" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Email Address *
                    </label>
                    <input
                      id="input-traveler-email"
                      type="email"
                      name="email"
                      placeholder="traveler@hemrajgroup.com"
                      value={travelerForm.email}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_email ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                    />
                    {formErrors.traveler_email && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_email}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-phone" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      WhatsApp / Phone *
                    </label>
                    <input
                      id="input-traveler-phone"
                      type="text"
                      name="phone"
                      placeholder="+91 99999 88888"
                      value={travelerForm.phone}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_phone ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                    />
                    {formErrors.traveler_phone && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_phone}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-designation" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Corporate Designation *
                    </label>
                    <input
                      id="input-traveler-designation"
                      type="text"
                      name="designation"
                      placeholder="e.g. Senior Manager"
                      value={travelerForm.designation}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_designation ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                    />
                    {formErrors.traveler_designation && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_designation}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-department" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Department *
                    </label>
                    <select
                      id="input-traveler-department"
                      name="department"
                      value={travelerForm.department}
                      onChange={handleTravelerFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="Purchase">Purchase Division</option>
                      <option value="Finance">Finance / Audit</option>
                      <option value="Ops">Operations Team</option>
                      <option value="HR">HR / Talent</option>
                      <option value="IT">IT Infrastructure</option>
                      <option value="Other">Other Department</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="input-traveler-approver" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Travel Approver *
                    </label>
                    <select
                      id="input-traveler-approver"
                      name="defaultTravelApprover"
                      value={travelerForm.defaultTravelApprover}
                      onChange={handleTravelerFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="Rohit ji">Rohit ji</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Board Director">Board Director</option>
                      <option value="Management Office">Management Office</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="input-traveler-approverDesignation" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Approver Title *
                    </label>
                    <input
                      id="input-traveler-approverDesignation"
                      type="text"
                      name="approverDesignation"
                      placeholder="COO / VP"
                      value={travelerForm.approverDesignation}
                      onChange={handleTravelerFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="input-traveler-costCentre" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Cost Centre / Billing *
                    </label>
                    <input
                      id="input-traveler-costCentre"
                      type="text"
                      name="costCentre"
                      placeholder="e.g. HEM-FIN-MUM"
                      value={travelerForm.costCentre}
                      onChange={handleTravelerFormChange}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_costCentre ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                    />
                    {formErrors.traveler_costCentre && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_costCentre}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-traveler-currency" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider">
                      Billing Currency *
                    </label>
                    <select
                      id="input-traveler-currency"
                      name="defaultBillingCurrency"
                      value={travelerForm.defaultBillingCurrency}
                      onChange={handleTravelerFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="INR">INR (Indian Rupee)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="NGN">NGN (Nigerian Naira)</option>
                    </select>
                  </div>
                </div>

                {/* DYNAMIC PROFILE FIELD RENDERER BY CATEGORY TYPE */}
                {(travelForm.type === "DOMESTIC" || travelForm.type === "SL") ? (
                  /* DOMESTIC PROFILE FIELDS */
                  <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 mt-6">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                      Domestic Traveler Specifics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="input-traveler-baseCity" className="block text-xs font-bold text-slate-500 mb-1">
                          Base City *
                        </label>
                        <input
                          id="input-traveler-baseCity"
                          type="text"
                          name="baseCity"
                          placeholder="Mumbai, Nagpur, Delhi"
                          value={travelerForm.baseCity}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_baseCity ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_baseCity && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_baseCity}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-traveler-nearestAirport" className="block text-xs font-bold text-slate-500 mb-1">
                          Nearest Airport *
                        </label>
                        <input
                          id="input-traveler-nearestAirport"
                          type="text"
                          name="nearestAirport"
                          placeholder="e.g. BOM, Airport Road"
                          value={travelerForm.nearestAirport}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_nearestAirport ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_nearestAirport && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_nearestAirport}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-traveler-nearestRailwayStation" className="block text-xs font-bold text-slate-500 mb-1">
                          Nearest Railway Stn.
                        </label>
                        <input
                          id="input-traveler-nearestRailwayStation"
                          type="text"
                          name="nearestRailwayStation"
                          placeholder="Nagpur station"
                          value={travelerForm.nearestRailwayStation}
                          onChange={handleTravelerFormChange}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <span className="block text-xs font-bold text-slate-500 mb-2">Default Transport Mode</span>
                        <div className="flex flex-wrap gap-4">
                          {["Flight", "SL", "3AC", "2AC", "Other"].map(mode => (
                            <label key={mode} className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="defaultModeOfTransport"
                                value={mode}
                                checked={travelerForm.defaultModeOfTransport === mode}
                                onChange={handleTravelerFormChange}
                                className="mr-1.5 accent-teal-600"
                              />
                              {mode}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <span className="block text-[11px] font-bold text-slate-500 mb-2">Extra Baggage Required?</span>
                        <div className="flex gap-4">
                          <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="extraBaggageRequired"
                              value="true"
                              checked={travelerForm.extraBaggageRequired === true}
                              onChange={handleTravelerFormChange}
                              className="mr-1.5 accent-teal-600"
                            />
                            Yes Req. (Extra weight)
                          </label>
                          <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="extraBaggageRequired"
                              value="false"
                              checked={travelerForm.extraBaggageRequired === false}
                              onChange={handleTravelerFormChange}
                              className="mr-1.5 accent-teal-600"
                            />
                            No
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* DOMESTIC FILE UPLOADS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-3 border-t border-slate-100">
                      <div>
                        <span className="block text-xs font-bold text-slate-500 mb-2">Photograph Upload</span>
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, "photograph")}
                          className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors"
                        >
                          <input
                            type="file"
                            id="upload-photo"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileInputChange(e, "photograph")}
                          />
                          <label htmlFor="upload-photo" className="cursor-pointer">
                            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                            <span className="block text-xs font-bold text-slate-600 hover:text-teal-700">Choose photograph file or drag & drop</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Accepts PNG, JPG</span>
                          </label>
                          {uploadingFiles.photograph && (
                            <div className="mt-2 text-left">
                              <span className="text-[10px] font-mono block text-slate-500 truncate">{uploadingFiles.photograph.name}</span>
                              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${uploadingFiles.photograph.error ? "bg-rose-500" : "bg-teal-500"}`}
                                  style={{ width: `${uploadingFiles.photograph.progress}%` }}
                                ></div>
                              </div>
                              {uploadingFiles.photograph.error && (
                                <span className="text-[9px] font-bold text-rose-500 mt-0.5 block">{uploadingFiles.photograph.error}</span>
                              )}
                            </div>
                          )}
                          {travelerForm.photograph && (
                            <div className="mt-2 text-teal-600 text-xs font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Attached Photograph File
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-500 mb-2">Supporting Docs (ID proofs, Aadhaar, etc)</span>
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, "supportingDocuments")}
                          className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors"
                        >
                          <input
                            type="file"
                            id="upload-support"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "supportingDocuments")}
                          />
                          <label htmlFor="upload-support" className="cursor-pointer">
                            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                            <span className="block text-xs font-bold text-slate-600 hover:text-teal-700">Choose support file or drag & drop</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Aadhaar, Voter cards</span>
                          </label>
                          {uploadingFiles.supportingDocuments && (
                            <div className="mt-2 text-left">
                              <span className="text-[10px] font-mono block text-slate-500 truncate">{uploadingFiles.supportingDocuments.name}</span>
                              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${uploadingFiles.supportingDocuments.error ? "bg-rose-500" : "bg-teal-500"}`}
                                  style={{ width: `${uploadingFiles.supportingDocuments.progress}%` }}
                                ></div>
                              </div>
                              {uploadingFiles.supportingDocuments.error && (
                                <span className="text-[9px] font-bold text-rose-500 mt-0.5 block">{uploadingFiles.supportingDocuments.error}</span>
                              )}
                            </div>
                          )}
                          {travelerForm.supportingDocuments && (
                            <div className="mt-2 text-teal-600 text-xs font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Attached Support Documents
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* INTERNATIONAL PROFILE FIELDS */
                  <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 mt-6">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                      Additional Details: International Travel
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="input-traveler-presentLocationAbroad" className="block text-xs font-bold text-slate-550 mb-1">
                          Location Abroad
                        </label>
                        <input
                          id="input-traveler-presentLocationAbroad"
                          type="text"
                          name="presentLocationAbroad"
                          placeholder="e.g. Lagos, Nigeria"
                          value={travelerForm.presentLocationAbroad}
                          onChange={handleTravelerFormChange}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <span className="block text-[11px] font-bold text-slate-555 mb-2">Assigned Plant / Site</span>
                        <div className="flex gap-4">
                          {["Sunagrow", "Ricefield", "Other"].map(site => (
                            <label key={site} className="inline-flex items-center text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="assignedPlantSite"
                                value={site}
                                checked={travelerForm.assignedPlantSite === site}
                                onChange={handleTravelerFormChange}
                                className="mr-1 accent-teal-600"
                              />
                              {site}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="input-traveler-nearestAirportIndia" className="block text-xs font-bold text-slate-550 mb-1">
                          Nearest Airport (India)
                        </label>
                        <input
                          id="input-traveler-nearestAirportIndia"
                          type="text"
                          name="nearestAirportIndia"
                          placeholder="e.g. BOM Mumbai, Nagpur"
                          value={travelerForm.nearestAirportIndia}
                          onChange={handleTravelerFormChange}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="input-traveler-passportNumber" className="block text-xs font-bold text-slate-550 mb-1">
                          Passport Number
                        </label>
                        <input
                          id="input-traveler-passportNumber"
                          type="text"
                          name="passportNumber"
                          placeholder="A01234567"
                          value={travelerForm.passportNumber}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_passportNumber ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_passportNumber && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_passportNumber}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-traveler-passportIssueDate" className="block text-xs font-bold text-slate-550 mb-1">
                          Passport Issue Date
                        </label>
                        <input
                          id="input-traveler-passportIssueDate"
                          type="date"
                          name="passportIssueDate"
                          value={travelerForm.passportIssueDate}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_passportIssueDate ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_passportIssueDate && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_passportIssueDate}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-traveler-passportExpiryDate" className="block text-xs font-bold text-slate-550 mb-1">
                          Passport Expiry Date
                        </label>
                        <input
                          id="input-traveler-passportExpiryDate"
                          type="date"
                          name="passportExpiryDate"
                          value={travelerForm.passportExpiryDate}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_passportExpiryDate ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_passportExpiryDate && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_passportExpiryDate}</span>
                        )}
                      </div>

                      {/* Passport Scan uploads */}
                      <div>
                        <span className="block text-xs font-bold text-slate-550 mb-1.5">Passport Front Scan *</span>
                        <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2 text-center text-[11px]">
                          <input
                            type="file"
                            id="upload-passfront"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "passportFrontPage")}
                          />
                          <label htmlFor="upload-passfront" className="cursor-pointer block p-1">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="font-bold text-teal-800">Attach Page</span>
                          </label>
                          {travelerForm.passportFrontPage && <div className="text-[10px] text-teal-600 font-bold">✓ Attached Scan</div>}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-550 mb-1.5">Passport Back Scan</span>
                        <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2 text-center text-[11px]">
                          <input
                            type="file"
                            id="upload-passback"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "passportBackPage")}
                          />
                          <label htmlFor="upload-passback" className="cursor-pointer block p-1">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="font-bold text-teal-800">Attach Page</span>
                          </label>
                          {travelerForm.passportBackPage && <div className="text-[10px] text-teal-600 font-bold">✓ Attached Scan</div>}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-550 mb-1.5">Offer/Appt. Letter</span>
                        <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2 text-center text-[11px]">
                          <input
                            type="file"
                            id="upload-offer"
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, "offerLetter")}
                          />
                          <label htmlFor="upload-offer" className="cursor-pointer block p-1">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="font-bold text-teal-800">Attach Offer Letter</span>
                          </label>
                          {travelerForm.offerLetter && <div className="text-[10px] text-teal-600 font-bold">✓ Attached Letter</div>}
                        </div>
                      </div>

                      {/* Vaccines */}
                      <div>
                        <span className="block text-xs font-bold text-slate-550 mb-1">Polio Vaccine Status</span>
                        <div className="flex gap-2">
                          {["Vaccinated", "Not Vaccinated", "Pending"].map(v => (
                            <label key={v} className="inline-flex items-center text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="polioVaccineStatus"
                                value={v}
                                checked={travelerForm.polioVaccineStatus === v}
                                onChange={handleTravelerFormChange}
                              />
                              <span className="ml-0.5">{v.split(" ")[0]}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          type="date"
                          name="polioCertificateExpiry"
                          value={travelerForm.polioCertificateExpiry}
                          onChange={handleTravelerFormChange}
                          placeholder="Cert Expiry"
                          className="w-full mt-1 bg-white border border-slate-200 rounded-md p-1.5 text-[10px]"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-550 mb-1">YFV Vaccine Status</span>
                        <div className="flex gap-2">
                          {["Vaccinated", "Not Vaccinated", "Pending"].map(v => (
                            <label key={v} className="inline-flex items-center text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="yfvStatus"
                                value={v}
                                checked={travelerForm.yfvStatus === v}
                                onChange={handleTravelerFormChange}
                              />
                              <span className="ml-0.5">{v.split(" ")[0]}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          type="date"
                          name="yfvCertificateExpiry"
                          value={travelerForm.yfvCertificateExpiry}
                          onChange={handleTravelerFormChange}
                          placeholder="YFV Expiry"
                          className="w-full mt-1 bg-white border border-slate-200 rounded-md p-1.5 text-[10px]"
                        />
                      </div>

                      <div>
                        <label htmlFor="input-traveler-visaNumber" className="block text-xs font-bold text-slate-505 mb-1">
                          Visa Number
                        </label>
                        <input
                          id="input-traveler-visaNumber"
                          type="text"
                          name="visaNumber"
                          placeholder="e.g. IN-943029"
                          value={travelerForm.visaNumber}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_visaNumber ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_visaNumber && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_visaNumber}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-traveler-visaExpiryDate" className="block text-xs font-bold text-slate-505 mb-1">
                          Visa Expiry Date
                        </label>
                        <input
                          id="input-traveler-visaExpiryDate"
                          type="date"
                          name="visaExpiryDate"
                          value={travelerForm.visaExpiryDate}
                          onChange={handleTravelerFormChange}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="input-traveler-visaCountry" className="block text-xs font-bold text-slate-505 mb-1">
                          Registration Visa Country
                        </label>
                        <input
                          id="input-traveler-visaCountry"
                          type="text"
                          name="visaCountry"
                          placeholder="e.g. India / Nigeria"
                          value={travelerForm.visaCountry}
                          onChange={handleTravelerFormChange}
                          className={`w-full bg-white border ${formErrors.traveler_visaCountry ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                        />
                        {formErrors.traveler_visaCountry && (
                          <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_visaCountry}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={currentStep === 2 ? "space-y-8" : "hidden"}>
          {/* SECTION 2: TRAVEL PARTICULARS */}
          <div>
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3 mb-6">
              <div className="w-8 h-8 bg-slate-950 text-orange-500 rounded flex items-center justify-center font-black text-xs leading-none">
                2
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Travel Particulars</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Travel Category */}
            <div>
              <label htmlFor="input-travel-type" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Travel Category *
              </label>
              <select
                id="input-travel-type"
                name="type"
                value={travelForm.type}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 focus:border-teal-600 transition font-medium"
              >
                <option value="DOMESTIC">DOMESTIC</option>
                <option value="INTERNATIONAL">INTERNATIONAL</option>
                <option value="INTERNATIONAL_RETURN">INTERNATIONAL RETURN</option>
                <option value="SL">SL (SICK LEAVE / SPECIAL)</option>
                <option value="LOCAL">LOCAL RUN</option>
              </select>
            </div>

            {/* GST Billing */}
            <div>
              <label htmlFor="input-gst-applicable" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                GST Billing *
              </label>
              <select
                id="input-gst-applicable"
                name="gstApplicable"
                value={String(travelForm.gstApplicable)}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 focus:border-teal-600 transition font-medium"
              >
                <option value="true">GST Billing (Hemraj Group)</option>
                <option value="false">Non-GST</option>
              </select>
            </div>

            {/* Priority Level */}
            <div>
              <label htmlFor="input-priority" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Priority Level *
              </label>
              <select
                id="input-priority"
                name="priority"
                value={travelForm.priority}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 focus:border-teal-600 transition font-medium"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Plant Site selection */}
            <div>
              <label htmlFor="input-plant" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Assigned Plant *
              </label>
              <select
                id="input-plant"
                name="plant"
                value={travelForm.plant}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 focus:border-teal-600 transition font-medium"
              >
                <option value="HIPL">HIPL</option>
                <option value="RSIPL">RSIPL</option>
                <option value="HRM">HRM</option>
                <option value="SUNAGROW">SUNAGROW</option>
                <option value="RICEFIELD">RICEFIELD</option>
              </select>
            </div>

            {/* Expected Travel Date */}
            <div>
              <label htmlFor="input-date" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Expected Travel Date *
              </label>
              <input
                id="input-date"
                type="date"
                name="date"
                value={travelForm.date}
                onChange={handleTravelFormChange}
                className={`w-full bg-slate-50 border ${formErrors.date ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 transition font-medium`}
              />
              {formErrors.date && (
                <span className="text-[10px] font-medium text-rose-500 mt-1 block">{formErrors.date}</span>
              )}
            </div>

            {/* Passenger W/P Number */}
            <div>
              <label htmlFor="input-wpNumber" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Passenger W/P / WhatsApp No.
              </label>
              <input
                id="input-wpNumber"
                type="text"
                name="wpNumber"
                placeholder="e.g. WP-4835 or WhatsApp Code"
                value={travelForm.wpNumber}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 transition"
              />
            </div>

            {/* Nearest Boarding Pt. */}
            <div>
              <label htmlFor="input-nearestBoardingPoint" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Nearest Boarding Pt. *
              </label>
              <input
                id="input-nearestBoardingPoint"
                type="text"
                name="nearestBoardingPoint"
                placeholder="e.g. Juhu Office, Lagos Suite"
                value={travelForm.nearestBoardingPoint}
                onChange={handleTravelFormChange}
                className={`w-full bg-slate-50 border ${formErrors.nearestBoardingPoint ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 transition`}
              />
              {formErrors.nearestBoardingPoint && (
                <span className="text-[10px] font-medium text-rose-500 mt-1 block">{formErrors.nearestBoardingPoint}</span>
              )}
            </div>

            {/* Luggage Allowance */}
            <div>
              <label htmlFor="input-luggage" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Luggage
              </label>
              <input
                id="input-luggage"
                type="text"
                name="luggage"
                placeholder="e.g. 2 x 23 kg, 15 kg cabin"
                value={travelForm.luggage}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden"
              />
            </div>

            {/* Origin & Destination Locations */}
            <div>
              <label htmlFor="input-from" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Origin Location *
              </label>
              <input
                id="input-from"
                type="text"
                name="from"
                placeholder="e.g. Lagos, Nigeria (LOS)"
                value={travelForm.from}
                onChange={handleTravelFormChange}
                className={`w-full bg-slate-50 border ${formErrors.from ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm`}
              />
              {formErrors.from && (
                <span className="text-[10px] font-medium text-rose-500 mt-1 block">{formErrors.from}</span>
              )}
            </div>

            <div>
              <label htmlFor="input-to" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Destination Location *
              </label>
              <input
                id="input-to"
                type="text"
                name="to"
                placeholder="e.g. Mumbai (BOM)"
                value={travelForm.to}
                onChange={handleTravelFormChange}
                className={`w-full bg-slate-50 border ${formErrors.to ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm`}
              />
              {formErrors.to && (
                <span className="text-[10px] font-medium text-rose-500 mt-1 block">{formErrors.to}</span>
              )}
            </div>
          </div>

          {/* Preferences Section (Collapsible looking Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 pt-4 border-t border-dashed border-slate-100">
            {/* Visa Type Preferences */}
            <div>
              <label htmlFor="input-visaType" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Card/Visa Type Requirement
              </label>
              <select
                id="input-visaType"
                name="visaType"
                value={travelForm.visaType}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden"
              >
                <option value="BUSINESS">Business Visa</option>
                <option value="TOURIST">Tourist Visa</option>
                <option value="EMPLOYMENT">Employment / Work Permit</option>
                <option value="OTHER">Other Type (Specify)</option>
              </select>
              {travelForm.visaType === "OTHER" && (
                <input
                  type="text"
                  name="visaTypeOther"
                  placeholder="Tell us other visa requirements..."
                  value={travelForm.visaTypeOther}
                  onChange={handleTravelFormChange}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              )}
            </div>

            {/* Seat Preference */}
            <div>
              <label htmlFor="input-seatPreference" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Seat Preference
              </label>
              <select
                id="input-seatPreference"
                name="seatPreference"
                value={travelForm.seatPreference}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="WINDOW">Window Seat</option>
                <option value="AISLE">Aisle Seat</option>
                <option value="MIDDLE">Middle Seat</option>
                <option value="OTHER">Other Preference</option>
              </select>
              {travelForm.seatPreference === "OTHER" && (
                <input
                  type="text"
                  name="seatPreferenceOther"
                  placeholder="Tell us other seat requests..."
                  value={travelForm.seatPreferenceOther}
                  onChange={handleTravelFormChange}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              )}
            </div>

            {/* Meal Preference */}
            <div>
              <label htmlFor="input-mealPreference" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Meal Preference
              </label>
              <select
                id="input-mealPreference"
                name="mealPreference"
                value={travelForm.mealPreference}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="VEG">Vegetarian (Asian/Indian)</option>
                <option value="NON_VEG">Non Vegetarian</option>
                <option value="VEGAN">Strict Vegan</option>
                <option value="OTHER">Other Preferences (Halal/Kosher/Gluten)</option>
              </select>
              {travelForm.mealPreference === "OTHER" && (
                <input
                  type="text"
                  name="mealPreferenceOther"
                  placeholder="Specify dietary constraint..."
                  value={travelForm.mealPreferenceOther}
                  onChange={handleTravelFormChange}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              )}
            </div>
          </div>

          {/* Purpose */}
          <div className="mt-4">
            <label htmlFor="input-purpose" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
              Purpose of Travel *
            </label>
            <textarea
              id="input-purpose"
              name="purpose"
              rows={3}
              placeholder="Provide a clear, brief breakdown of the commercial reasons or assignments prompting this business travel..."
              value={travelForm.purpose}
              onChange={handleTravelFormChange}
              className={`w-full bg-slate-50 border ${formErrors.purpose ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden`}
            ></textarea>
            {formErrors.purpose && (
              <span className="text-[10px] font-medium text-rose-500 mt-1 block">{formErrors.purpose}</span>
            )}
          </div>
          
          {/* Section 2 additions: Approver & Raiser */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 border-2 border-slate-100 p-5 rounded-2xl bg-teal-50/30">
            <div>
              <label htmlFor="input-travelApprover" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">Travel Approver</label>
              <input type="text" id="input-travelApprover" name="travelApprover" value={travelForm.travelApprover} onChange={handleTravelFormChange} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Rohit ji" />
            </div>
            <div>
              <label htmlFor="input-approverTitle" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">Approver Title</label>
              <input type="text" id="input-approverTitle" name="approverTitle" value={travelForm.approverTitle} onChange={handleTravelFormChange} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. COO / VP" />
            </div>
            <div>
              <label htmlFor="input-indentRaiser" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">Indent Raiser</label>
              <input type="text" id="input-indentRaiser" name="indentRaiser" value={travelForm.indentRaiser} onChange={handleTravelFormChange} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. Employee Name" />
            </div>
          </div>
        </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="flex gap-4 pt-6 border-t-2 border-slate-200 justify-between items-center">
          <button
            id="btn-form-cancel"
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 duration-150"
          >
            Cancel
          </button>
          <div className="flex gap-4">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 text-xs font-black text-slate-600 uppercase tracking-widest hover:text-slate-900 duration-150"
              >
                Back
              </button>
            )}
            {currentStep === 1 && (
              <button
                type="button"
                onClick={nextStep}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-full shadow-lg duration-150"
              >
                Next Step
              </button>
            )}
            {currentStep === 2 && (
              <button
                id="btn-form-submit"
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-full shadow-lg flex items-center gap-2 duration-150 disabled:bg-teal-600/50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Submitting Desk Indent...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    Submit Indent Request
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
