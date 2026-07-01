import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { TravelCategory, PriorityLevel, Employee, TravelIndent, Department, BillingCurrency } from "../types";
import { Upload, HelpCircle, Save, CheckCircle2, AlertTriangle, RefreshCw, FileText, X, Scan, Loader2 } from "lucide-react";

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

  // ID Scanner state
  const [scanningId, setScanningId] = useState(false);
  const [idScanError, setIdScanError] = useState("");
  const [idScanSuccess, setIdScanSuccess] = useState("");
  const [scanProgressStep, setScanProgressStep] = useState("");
  const [dragOverScanZone, setDragOverScanZone] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);

  const handleIdScan = async (file: File) => {
    setScanningId(true);
    setScanProgressStep("Reading file data...");
    setIdScanError("");
    setIdScanSuccess("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          setScanProgressStep("Invoking AI OCR engine...");
          const res = await fetch("/api/job-cards/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileType: "id_document",
              fileData: base64Data,
              mimeType: file.type || "image/png",
              fileName: file.name
            })
          });

          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error || "ID scanning failed.");
          }

          setScanProgressStep("Populating employee record...");
          const data = result.scannedData;
          
          setTravelerForm(prev => {
            const updated = { ...prev };
            if (data.name) updated.name = data.name;
            if (data.passportNumber) updated.passportNumber = data.passportNumber;
            if (data.passportIssueDate) updated.passportIssueDate = data.passportIssueDate;
            if (data.passportExpiryDate) updated.passportExpiryDate = data.passportExpiryDate;
            if (data.aadharPanNumber) updated.aadharPanNumber = data.aadharPanNumber;
            return updated;
          });

          setIdScanSuccess("ID scanned successfully! Details filled in form.");
        } catch (err: any) {
          setIdScanError(err.message || "Failed to scan the ID.");
        } finally {
          setScanningId(false);
          setScanProgressStep("");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIdScanError("Failed to read file.");
      setScanningId(false);
      setScanProgressStep("");
    }
  };

  const handleIdDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverScanZone(true);
  };

  const handleIdDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverScanZone(false);
  };

  const handleIdDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverScanZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleIdScan(e.dataTransfer.files[0]);
    }
  };

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
    employeeId: "EMP-" + Math.floor(1000 + Math.random() * 9000),
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

    // Train Specific fields
    trainPreferredClass: "3AC",
    trainBerthPreference: "No Preference",
    trainMealPreference: "No Meal",
    trainPreferredNumber: "",

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

  const selectEmployeeProfile = (emp: Employee) => {
    setTravelerForm({
      employeeId: emp.employee_code,
      aadharPanNumber: emp.aadhar_pan_number || "",
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department || "Purchase",
      defaultTravelApprover: emp.default_travel_approver || "Rohit ji",
      approverDesignation: emp.approver_designation || "Chief Operating Officer",
      costCentre: emp.cost_centre || "",
      defaultBillingCurrency: (emp.default_billing_currency as BillingCurrency) || "INR",
      
      // Domestic
      baseCity: emp.native_city || "",
      nearestAirport: emp.nearest_airport || "",
      nearestRailwayStation: emp.nearest_railway_station || "",
      defaultModeOfTransport: emp.default_mode_of_transport || "Flight",
      extraBaggageRequired: emp.extra_baggage_required || false,
      photograph: emp.photograph_url || "",
      supportingDocuments: emp.supporting_documents_url || "",

      // Train Specifics
      trainPreferredClass: emp.train_preferred_class || "3AC",
      trainBerthPreference: emp.train_berth_preference || "No Preference",
      trainMealPreference: emp.train_meal_preference || "No Meal",
      trainPreferredNumber: emp.train_preferred_number || "",

      // International
      presentLocationAbroad: emp.present_location_abroad || "",
      assignedPlantSite: emp.assigned_plant_site || "Sunagrow",
      nearestAirportIndia: emp.nearest_airport_india || "",
      passportNumber: emp.passport_number || "",
      passportIssueDate: emp.passport_issue_date || "",
      passportExpiryDate: emp.passport_expiry || "",
      passportFrontPage: emp.passport_front_page_url || "",
      passportBackPage: emp.passport_back_page_url || "",
      offerLetter: emp.offer_letter_url || "",
      polioVaccineStatus: emp.polio_vaccine_status || "Vaccinated",
      polioCertificateExpiry: emp.polio_certificate_expiry || "",
      yfvStatus: emp.yfv_status || "Vaccinated",
      yfvCertificateExpiry: emp.yfv_certificate_expiry || "",
      visaNumber: emp.visa_number || "",
      visaExpiryDate: emp.visa_expiry_date || "",
      visaCountry: emp.visa_country || ""
    });
    setShowEmployeeSearch(false);
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
    if (travelForm.date) {
      const selectedDate = new Date(travelForm.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) {
        errors.date = "Travel date cannot be in the past.";
      }
    }
    return errors;
  };

  const validateSection2 = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (useExistingEmployee) {
      if (!selectedEmpCode) {
        errors.selectedEmpCode = "Please select an assigned saved employee profile.";
      }
    } else {
      const t = travelerForm;
      if (t.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) {
        errors.traveler_email = "Please key in a valid email pattern.";
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
        // Fallbacks for Employee database constraints
        const empCode = travelerForm.employeeId.trim() || "EMP-" + Math.floor(1000 + Math.random() * 9000);
        const aadharPan = travelerForm.aadharPanNumber.trim() || "PAN-MOCK-" + Math.floor(10000 + Math.random() * 90000);
        const fullName = travelerForm.name.trim() || "Guest Traveler";
        const emailAddress = travelerForm.email.trim() || `guest.${Math.floor(1000 + Math.random() * 9000)}@hemrajgroup.com`;
        const phoneNumber = travelerForm.phone.trim() || "+91 00000 00000";
        const roleDesignation = travelerForm.designation.trim() || "Executive";
        const dept = travelerForm.department.trim() || "Purchase";
        const approver = travelerForm.defaultTravelApprover.trim() || "Rohit ji";
        const appTitle = travelerForm.approverDesignation.trim() || "Chief Operating Officer";
        const billingCost = travelerForm.costCentre.trim() || "HEM-GEN";

        // Prepare new registered employee payload
        finalEmployee = {
          employee_code: empCode,
          aadhar_pan_number: aadharPan,
          name: fullName,
          email: emailAddress,
          phone: phoneNumber,
          designation: roleDesignation,
          department: dept,
          default_travel_approver: approver,
          approver_designation: appTitle,
          cost_centre: billingCost,
          default_billing_currency: travelerForm.defaultBillingCurrency || "INR",
          
          // Domestic
          native_city: travelerForm.baseCity || undefined,
          nearest_airport: travelerForm.nearestAirport || undefined,
          nearest_railway_station: travelerForm.nearestRailwayStation || undefined,
          default_mode_of_transport: travelerForm.defaultModeOfTransport || undefined,
          extra_baggage_required: travelerForm.extraBaggageRequired,
          photograph_url: travelerForm.photograph || undefined,
          supporting_documents_url: travelerForm.supportingDocuments || undefined,
          
          // Train
          train_preferred_class: travelerForm.trainPreferredClass || undefined,
          train_berth_preference: travelerForm.trainBerthPreference || undefined,
          train_meal_preference: travelerForm.trainMealPreference || undefined,
          train_preferred_number: travelerForm.trainPreferredNumber || undefined,

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
        targetEmployeeCode = empCode;
      }

      // Prepare Travel Indent payload
      const indentPayload: Partial<TravelIndent> = {
        travel_type: travelForm.type,
        gst_applicable: travelForm.gstApplicable,
        priority: travelForm.priority,
        travel_date: travelForm.date || new Date().toISOString().split("T")[0],
        wp_number: travelForm.wpNumber || "N/A",
        nearest_boarding_point: travelForm.nearestBoardingPoint.trim() || "TBD",
        luggage: travelForm.luggage || "Standard (15kg)",
        visa_type: travelForm.visaType === "OTHER" ? travelForm.visaTypeOther : travelForm.visaType,
        seat_preference: travelForm.seatPreference === "OTHER" ? travelForm.seatPreferenceOther : travelForm.seatPreference,
        meal_preference: travelForm.mealPreference === "OTHER" ? travelForm.mealPreferenceOther : travelForm.mealPreference,
        source_location: travelForm.from.trim() || "TBD",
        destination: travelForm.to.trim() || "TBD",
        purpose: travelForm.purpose.trim() || "Business Travel",
        employee_code: targetEmployeeCode,
        plant: travelForm.plant || "HIPL",
        travel_approver: travelForm.travelApprover || "Rohit ji",
        approver_title: travelForm.approverTitle || "Chief Operating Officer",
        indent_raiser: travelForm.indentRaiser || "Travel Planner"
      };

      await onSubmit(indentPayload, finalEmployee);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="indent-form-panel" className="max-w-4xl mx-auto text-left">
      {/* Form Header */}
      <div className="bg-slate-950 px-8 py-6 text-white flex justify-between items-center rounded-3xl shadow-sm">
        <div>
          <h2 id="form-heading" className="text-2xl font-black uppercase tracking-tighter">New Travel Request</h2>
          <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">Hemraj Group Personal Travel Desk</p>
        </div>
        <button 
          onClick={onCancel}
          id="btn-close-form"
          className="text-white hover:text-orange-500 hover:bg-slate-900 p-2.5 rounded-full border border-slate-800 transition animate-hover"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleFormSubmission} className="py-6 space-y-8">
        
        {/* Dynamic Alerts if Validation fails */}
        {Object.keys(formErrors).length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 p-5 rounded-2xl flex items-start gap-4 text-orange-950 text-xs font-bold uppercase tracking-wide">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block text-sm">Please fix the following errors:</span>
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

            {/* Travel Category */}
            <div className="mb-6 max-w-md">
              <label htmlFor="input-travel-type" className="block text-xs font-bold text-slate-600 uppercase mb-1.5 font-sans tracking-wider">
                Travel Type *
              </label>
              <select
                id="input-travel-type"
                name="type"
                value={travelForm.type}
                onChange={handleTravelFormChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 focus:border-teal-600 transition font-bold"
              >
                <option value="DOMESTIC">Domestic Flight</option>
                <option value="INTERNATIONAL">International Flight</option>
                <option value="INTERNATIONAL_RETURN">International Return Flight</option>
                <option value="TRAIN">Train</option>
                <option value="BUS">Bus</option>
                <option value="CAB">Cab</option>
              </select>
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
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-xs text-teal-800 mb-2 font-bold">
                  Note: Registering a traveler here will automatically save them to the main employee directory.
                </div>

                {/* ID OCR Scanner Upload Zone */}
                <div 
                  onDragOver={handleIdDragOver}
                  onDragLeave={handleIdDragLeave}
                  onDrop={handleIdDrop}
                  className={`bg-slate-50 border-2 border-dashed ${dragOverScanZone ? "border-teal-600 bg-teal-50/55 scale-[1.01]" : "border-teal-300 hover:border-teal-500"} rounded-2xl p-6 text-center cursor-pointer transition-all relative`}
                >
                  {scanningId && (
                    <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-2" />
                      <span className="text-xs font-black text-teal-900 uppercase tracking-wider">{scanProgressStep}</span>
                      <span className="text-[9px] text-slate-400 block mt-1 uppercase font-black tracking-widest">Hemraj Group Document Parsing</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="id-scanner-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleIdScan(e.target.files[0]);
                    }}
                  />
                  <label htmlFor="id-scanner-upload" className="cursor-pointer block">
                    <Scan className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                    <span className="block text-sm font-bold text-slate-700">Scan ID Document to Auto-Fill</span>
                    <span className="text-xs text-slate-500 block mt-1">Drag & drop passport or ID card (PDF/Image) here, or click to choose file</span>
                  </label>

                  {idScanSuccess && (
                    <div className="mt-3 text-xs font-bold text-teal-600 bg-teal-50 py-1.5 px-3 rounded-lg inline-block">
                      {idScanSuccess}
                    </div>
                  )}
                  {idScanError && (
                    <div className="mt-3 text-xs font-bold text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg inline-block">
                      {idScanError}
                    </div>
                  )}
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

                  <div className="relative">
                    <label htmlFor="input-traveler-name" className="block text-xs font-bold text-slate-600 uppercase mb-1 font-sans tracking-wider flex justify-between items-center">
                      <span>Full Name *</span>
                      <span className="text-[9px] text-slate-400 normal-case">(Type to search master database)</span>
                    </label>
                    <input
                      id="input-traveler-name"
                      type="text"
                      name="name"
                      placeholder="e.g. Ramesh Hemraj"
                      value={travelerForm.name}
                      onFocus={() => setShowEmployeeSearch(true)}
                      onBlur={() => setTimeout(() => setShowEmployeeSearch(false), 200)}
                      onChange={(e) => {
                        handleTravelerFormChange(e);
                        setShowEmployeeSearch(true);
                      }}
                      className={`w-full bg-slate-50 border ${formErrors.traveler_name ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm font-bold`}
                    />
                    {formErrors.traveler_name && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_name}</span>
                    )}

                    {/* Autocomplete Dropdown overlay */}
                    {showEmployeeSearch && travelerForm.name.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {employees.filter(emp => 
                          emp.name.toLowerCase().includes(travelerForm.name.toLowerCase()) || 
                          emp.employee_code.toLowerCase().includes(travelerForm.name.toLowerCase())
                        ).length === 0 ? (
                          <div className="p-3 text-[11px] text-slate-500 italic">No matching saved profile found. Continue typing to register brand new.</div>
                        ) : (
                          employees.filter(emp => 
                            emp.name.toLowerCase().includes(travelerForm.name.toLowerCase()) || 
                            emp.employee_code.toLowerCase().includes(travelerForm.name.toLowerCase())
                          ).map(emp => (
                            <button
                              key={emp.employee_code}
                              type="button"
                              onClick={() => selectEmployeeProfile(emp)}
                              className="w-full text-left p-3 hover:bg-slate-50/80 flex justify-between items-center transition-colors font-bold text-xs"
                            >
                              <div>
                                <span className="text-slate-900 block font-black">{emp.name}</span>
                                <span className="text-[10px] text-slate-500 block font-medium">{emp.designation} &bull; {emp.department}</span>
                              </div>
                              <span className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">{emp.employee_code}</span>
                            </button>
                          ))
                        )}
                      </div>
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
                {(() => {
                  if (travelForm.type === "DOMESTIC") {
                    return (
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
                    );
                  } else if (travelForm.type === "BUS") {
                    return (
                      /* BUS PROFILE FIELDS */
                      <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 mt-6">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                          Bus Traveler Specifics
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Base City
                            </label>
                            <input
                              type="text"
                              name="baseCity"
                              placeholder="Mumbai, Pune, Nagpur"
                              value={travelerForm.baseCity}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Nearest Bus Terminal
                            </label>
                            <input
                              type="text"
                              name="nearestAirport"
                              placeholder="e.g. Swargate, Borivali East"
                              value={travelerForm.nearestAirport}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Preferred Bus Class
                            </label>
                            <select
                              name="trainPreferredClass"
                              value={travelerForm.trainPreferredClass}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                            >
                              <option value="AC Sleeper">AC Sleeper (Volvo/Scania)</option>
                              <option value="Non-AC Sleeper">Non-AC Sleeper</option>
                              <option value="AC Seater">AC Seater</option>
                              <option value="Non-AC Seater">Non-AC Seater</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (travelForm.type === "CAB") {
                    return (
                      /* CAB PROFILE FIELDS */
                      <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 mt-6">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                          Cab Traveler Specifics
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Detailed Pickup Address
                            </label>
                            <input
                              type="text"
                              name="baseCity"
                              placeholder="e.g. HIPL Plant Site, Pune"
                              value={travelerForm.baseCity}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Detailed Dropoff Address
                            </label>
                            <input
                              type="text"
                              name="nearestAirport"
                              placeholder="e.g. Swargate Bus Stand"
                              value={travelerForm.nearestAirport}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Cab Segment Preference
                            </label>
                            <select
                              name="trainPreferredClass"
                              value={travelerForm.trainPreferredClass}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                            >
                              <option value="SUV">SUV (Innova / Ertiga)</option>
                              <option value="Sedan">Sedan (Dzire / Etios)</option>
                              <option value="Hatchback">Hatchback (WagonR / Tiago)</option>
                              <option value="Luxury">Luxury Sedan (Ciaz / City)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (travelForm.type === "TRAIN") {
                    return (
                      /* TRAIN PROFILE FIELDS */
                      <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 mt-6">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                          Train Traveler Specifics
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label htmlFor="input-traveler-baseCity-train" className="block text-xs font-bold text-slate-500 mb-1">
                              Base City *
                            </label>
                            <input
                              id="input-traveler-baseCity-train"
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
                            <label htmlFor="input-traveler-nearestRailwayStation-train" className="block text-xs font-bold text-slate-500 mb-1">
                              Nearest Railway Station *
                            </label>
                            <input
                              id="input-traveler-nearestRailwayStation-train"
                              type="text"
                              name="nearestRailwayStation"
                              placeholder="Nagpur Station"
                              value={travelerForm.nearestRailwayStation}
                              onChange={handleTravelerFormChange}
                              className={`w-full bg-white border ${formErrors.traveler_nearestRailwayStation ? "border-rose-400" : "border-slate-200"} rounded-lg px-3 py-2 text-sm`}
                            />
                            {formErrors.traveler_nearestRailwayStation && (
                              <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.traveler_nearestRailwayStation}</span>
                            )}
                          </div>

                          <div>
                            <label htmlFor="input-traveler-trainPreferredClass" className="block text-xs font-bold text-slate-500 mb-1">
                              Preferred Train Class
                            </label>
                            <select
                              id="input-traveler-trainPreferredClass"
                              name="trainPreferredClass"
                              value={travelerForm.trainPreferredClass}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                            >
                              <option value="1AC">1AC (First AC)</option>
                              <option value="2AC">2AC (Second AC)</option>
                              <option value="3AC">3AC (Third AC)</option>
                              <option value="Sleeper">Sleeper Class</option>
                              <option value="CC">CC (AC Chair Car)</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="input-traveler-trainBerthPreference" className="block text-xs font-bold text-slate-500 mb-1">
                              Berth Preference
                            </label>
                            <select
                              id="input-traveler-trainBerthPreference"
                              name="trainBerthPreference"
                              value={travelerForm.trainBerthPreference}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                            >
                              <option value="No Preference">No Preference</option>
                              <option value="Lower">Lower Berth</option>
                              <option value="Middle">Middle Berth</option>
                              <option value="Upper">Upper Berth</option>
                              <option value="Side Lower">Side Lower</option>
                              <option value="Side Upper">Side Upper</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="input-traveler-trainMealPreference" className="block text-xs font-bold text-slate-500 mb-1">
                              Meal Choice
                            </label>
                            <select
                              id="input-traveler-trainMealPreference"
                              name="trainMealPreference"
                              value={travelerForm.trainMealPreference}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                            >
                              <option value="No Meal">No Meal</option>
                              <option value="Veg">Vegetarian</option>
                              <option value="Non-Veg">Non-Vegetarian</option>
                              <option value="Jain Meal">Jain Meal</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="input-traveler-trainPreferredNumber" className="block text-xs font-bold text-slate-500 mb-1">
                              Preferred Train Name/No. (Optional)
                            </label>
                            <input
                              id="input-traveler-trainPreferredNumber"
                              type="text"
                              name="trainPreferredNumber"
                              placeholder="e.g. 12289 Duronto Exp"
                              value={travelerForm.trainPreferredNumber}
                              onChange={handleTravelerFormChange}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        {/* Train File Uploads */}
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
                                id="upload-photo-train"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileInputChange(e, "photograph")}
                              />
                              <label htmlFor="upload-photo-train" className="cursor-pointer">
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
                                id="upload-support-train"
                                className="hidden"
                                onChange={(e) => handleFileInputChange(e, "supportingDocuments")}
                              />
                              <label htmlFor="upload-support-train" className="cursor-pointer">
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
                    );
                  } else if (travelForm.type === "INTERNATIONAL" || travelForm.type === "INTERNATIONAL_RETURN") {
                    return (
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
                            <span className="block text-xs font-bold text-slate-555 mb-1.5">Passport Front Scan *</span>
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
                            <span className="block text-xs font-bold text-slate-555 mb-1.5">Passport Back Scan</span>
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
                            <span className="block text-xs font-bold text-slate-555 mb-1.5">Offer/Appt. Letter</span>
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
                    );
                  }
                  return null;
                })()}
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
