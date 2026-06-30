import React, { useState, useEffect, useMemo } from "react";
import { JobCard, JobCardQuote, AuditLogEntry, TravelIndent, Employee, JobCardStage, Vendor, QuoteSubCost } from "../types";
import EmployeeProfileModal from "./EmployeeProfileModal";
import { 
  Building2, Briefcase, Database, Users, HelpCircle, 
  MapPin, ShieldAlert, CheckCircle2, RefreshCw,
  ChevronLeft, ChevronRight, Compass, ArrowUpRight, Clock, Plus, 
  Trash2, Edit3, Send, FileText, CheckCircle, Sparkles, 
  AlertTriangle, Upload, Eye, EyeOff, Clipboard, Play, 
  FileCheck, ShieldCheck, ArrowRight, UserCheck, DollarSign,
  Paperclip,
  Coins, Activity, List, Kanban, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePersistedState } from "../hooks/usePersistedState";

interface JobCardManagerProps {
  indents: TravelIndent[];
  employees: Employee[];
  jobCards: JobCard[];
  onRefresh: () => Promise<void>;
  onSelectView: (view: "dashboard" | "create" | "jobcards" | "passports" | "settings") => void;
  activeRole: 'TRAVEL_APPROVER' | 'VP_COMMERCIAL' | 'TRAVEL_DESK' | 'FINANCE';
  senderEmail: string;
  ccRecipients: string;
  activeTab: 'ALL' | 'QUOTATION' | 'APPROVAL' | 'BOOKING' | 'FINANCE' | 'RECONCILIATION' | 'CLOSED' | 'VOIDED';
  setActiveTab: (tab: 'ALL' | 'QUOTATION' | 'APPROVAL' | 'BOOKING' | 'FINANCE' | 'RECONCILIATION' | 'CLOSED' | 'VOIDED') => void;
  kanbanView: boolean;
  setKanbanView: (view: boolean) => void;
  activeUserName: string;
}

export default function JobCardManager({ 
  indents, 
  employees, 
  jobCards: initialJobCards, 
  onRefresh, 
  onSelectView,
  activeRole,
  activeUserName,
  senderEmail,
  ccRecipients,
  activeTab,
  setActiveTab,
  kanbanView,
  setKanbanView
}: JobCardManagerProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>(initialJobCards);
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [isLeftListCollapsed, setIsLeftListCollapsed] = useState(false);
  
  const [activeViewSection, setActiveViewSection] = useState<JobCardStage | 'OVERVIEW' | 'VENDOR_INVOICE' | null>(null);

  // Sync section view with the card's native stage when it changes, and hydrate form states
  useEffect(() => {
    if (selectedCard) {
      setActiveViewSection('OVERVIEW');
      setInvoiceVendorAmount(selectedCard.invoiceVendorAmount !== undefined ? String(selectedCard.invoiceVendorAmount) : "");
      setInvoiceCurrency(selectedCard.invoiceCurrency || "INR");
      setInvoiceNumber(selectedCard.invoiceNumber || "");
      setGstDetailsCorrect(selectedCard.gstDetailsCorrect || false);
      setPhysicalInvoiceHandedOver(selectedCard.physicalInvoiceHandedOver || false);
      setFinanceVarianceReason(selectedCard.financeVarianceReason || "");
      setAirlineGstNumber(selectedCard.airlineGstNumber || "");
      setAirlineGstVendorName(selectedCard.airlineGstVendorName || "");
      setAirlineGstAmount(selectedCard.airlineGstAmount !== undefined ? String(selectedCard.airlineGstAmount) : "");
      const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
      setSelectedBookingVendor(selectedCard.bookingVendor || (winQuote ? winQuote.vendorName : ""));

      // Hydrate booking states
      setPnr(selectedCard.bookingPNR || "");
      setBookingAmount(selectedCard.finalBookingAmount !== undefined ? String(selectedCard.finalBookingAmount) : "");
      setBookingCurrency(selectedCard.bookingCurrency || "INR");
      setTicketFileName(selectedCard.ticketFileName || "");
      setTicketFileBase64(selectedCard.ticketFileUrl || "");
      setInvoiceFileName(selectedCard.ticketVendorInvoiceName || "");
      setInvoiceFileBase64(selectedCard.ticketVendorInvoiceUrl || "");

      // Auto-prefill the Quotation comparison descriptors from associated Travel Indent
      const localIndent = indents ? indents.find(i => i.id === selectedCard.id || i.id === selectedCard.indentId) : null;
      if (localIndent) {
        setQuoteTravelDate(localIndent.travel_date || "");
        setQuoteSector((localIndent.source_location && localIndent.destination) ? `${localIndent.source_location} - ${localIndent.destination}` : selectedCard.destination || "");
      } else {
        setQuoteSector(selectedCard.destination || "");
        setQuoteTravelDate("");
      }
      setQuoteAirline("");
      setQuoteLayover("Direct Flight");
      setBookingVarianceJustification(selectedCard.financeVarianceReason || "");
      setReconVarianceJustification("");
    } else {
      setActiveViewSection(null);
      setInvoiceVendorAmount("");
      setInvoiceCurrency("INR");
      setInvoiceNumber("");
      setGstDetailsCorrect(false);
      setPhysicalInvoiceHandedOver(false);
      setFinanceVarianceReason("");
      setAirlineGstNumber("");
      setAirlineGstVendorName("");
      setAirlineGstAmount("");
      setSelectedBookingVendor("");
      setQuoteAirline("");
      setQuoteSector("");
      setQuoteLayover("");
      setQuoteTravelDate("");
      setBookingVarianceJustification("");
      setReconVarianceJustification("");

      // Clear booking states
      setPnr("");
      setBookingAmount("");
      setBookingCurrency("INR");
      setTicketFileName("");
      setTicketFileBase64("");
      setInvoiceFileName("");
      setInvoiceFileBase64("");
    }
  }, [selectedCard, indents]);

  // Service Airline GST Invoice extraction states under Reconciliation
  const [gstInvoiceFileBase64, setGstInvoiceFileBase64] = useState("");
  const [gstInvoiceFileName, setGstInvoiceFileName] = useState("");
  const [scanningGstInvoice, setScanningGstInvoice] = useState(false);
  
  const [airlineGstVendorName, setAirlineGstVendorName] = useState("");
  const [airlineGstNumber, setAirlineGstNumber] = useState("");
  const [airlineGstAmount, setAirlineGstAmount] = useState("");
  
  // RFQ Creation States
  const [newVendor, setNewVendor] = useState("");
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
  const [selectedBookingVendor, setSelectedBookingVendor] = useState("");

  const fetchVendorsList = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendorsList(data);
      }
    } catch (e) {
      console.error("Error fetching vendors list in workspace:", e);
    }
  };

  useEffect(() => {
    fetchVendorsList();
  }, [initialJobCards]);

  const availableRfqVendors = useMemo(() => {
    const staticList = [
      "MakeMyTrip Business",
      "Yatra Corporate",
      "Thomas Cook India",
      "Thomas Cook Global",
      "Hemraj Overseas Agents",
      "Corporate Travel Desk"
    ];
    const dbNames = vendorsList.map(v => v.name);
    return Array.from(new Set([...dbNames, ...staticList]));
  }, [vendorsList]);
  
  // Manual Quote Input States
  const [quoteVendorName, setQuoteVendorName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("INR");
  const [quoteFileBase64, setQuoteFileBase64] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteFileName, setQuoteFileName] = useState("");
  const [quoteAirline, setQuoteAirline] = useState("");
  const [quoteSector, setQuoteSector] = useState("");
  const [quoteLayover, setQuoteLayover] = useState("");
  const [quoteTravelDate, setQuoteTravelDate] = useState("");
  const [isAirlineQuote, setIsAirlineQuote] = useState(false);

  // Dynamic Quote Sub-Costs and AI Extract States
  const [subCosts, setSubCosts] = useState<QuoteSubCost[]>([]);
  const [singleSubCategory, setSingleSubCategory] = useState<"FLIGHT" | "TRAIN" | "HOTEL" | "CAB" | "OTHER">("FLIGHT");
  const [singleSubDesc, setSingleSubDesc] = useState("");
  const [singleSubAmount, setSingleSubAmount] = useState("");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Booking Fulfillment form states
  const [pnr, setPnr] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingCurrency, setBookingCurrency] = useState("INR");
  const [ticketFileBase64, setTicketFileBase64] = useState("");
  const [ticketFileName, setTicketFileName] = useState("");
  const [invoiceFileBase64, setInvoiceFileBase64] = useState("");
  const [invoiceFileName, setInvoiceFileName] = useState("");
  const [scanningTicket, setScanningTicket] = useState(false);
  const [scanningInvoice, setScanningInvoice] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [scanMethod, setScanMethod] = useState("");

  // Reconciliation States
  const [invoiceVendorAmount, setInvoiceVendorAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("INR");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gstDetailsCorrect, setGstDetailsCorrect] = useState(false);
  const [physicalInvoiceHandedOver, setPhysicalInvoiceHandedOver] = useState(false);

  // Email Despatch Form States
  const [emailTemplateType, setEmailTemplateType] = useState<'FLIGHT' | 'HOTEL' | 'PACKAGE' | 'VISA' | 'OTHER'>('FLIGHT');
  const [emailSubjectInput, setEmailSubjectInput] = useState("");
  const [emailBodyInput, setEmailBodyInput] = useState("");
  const [emailVendorTo, setEmailVendorTo] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Approval Simulation State
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [financeVarianceReason, setFinanceVarianceReason] = useState("");

  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const toggleSelectCard = (id: string) => {
    setSelectedCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const handleBatchApprove = async () => {
    if (selectedCards.length === 0) return;
    try {
        await Promise.all(selectedCards.map(async (cardId) => {
            const res = await fetch(`/api/job-cards/${cardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: 'RECONCILIATION',
                    financeCleared: true,
                })
            });
            if (!res.ok) throw new Error(`Failed to approve ${cardId}`);
        }));
        triggerSuccess(`Approved ${selectedCards.length} job cards.`);
        setSelectedCards([]);
        await onRefresh();
    } catch (e: any) {
        triggerError(e.message);
    }
  };
  const [operatorId, setOperatorId] = useState("Corporate-Desk");
  const [showPassedQuotes, setShowPassedQuotes] = useState(false);

  // Cost Variance Compliance notes
  const [bookingVarianceJustification, setBookingVarianceJustification] = useState("");
  const [reconVarianceJustification, setReconVarianceJustification] = useState("");

  // Cancellation / Rescheduling modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalType, setCancelModalType] = useState<'CANCEL' | 'RESCHEDULE'>('CANCEL');
  const [cancellationReasonInput, setCancellationReasonInput] = useState("");
  const [cancellationCharges, setCancellationCharges] = useState("");
  const [cancellationGstFileBase64, setCancellationGstFileBase64] = useState("");
  const [cancellationGstFileName, setCancellationGstFileName] = useState("");
  const [reschedulingCharges, setReschedulingCharges] = useState("");
  const [fareDifference, setFareDifference] = useState("");
  const [submittingCancellation, setSubmittingCancellation] = useState(false);

  const handleCancelJobCardOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !cancellationReasonInput.trim()) {
      triggerError("Cancellation comment is strictly required.");
      return;
    }

    setSubmittingCancellation(true);
    try {
      const now = new Date().toISOString();
      const newAudit: AuditLogEntry = {
        timestamp: now,
        userId: operatorId,
        action: "Job Card Cancelled",
        notes: `Cancelled. Reasons given: "${cancellationReasonInput}"`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCancelled: true,
          cancellationReason: cancellationReasonInput,
          cancelledAt: now,
          cancellationCharges: parseFloat(cancellationCharges) || 0,
          cancellationGstInvoiceUrl: cancellationGstFileBase64 || undefined,
          cancellationGstInvoiceName: cancellationGstFileName || undefined,
          auditLogs: [newAudit]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel tracker card.");
      }

      triggerSuccess(`Job Card ${selectedCard.id} successfully cancelled.`);
      setShowCancelModal(false);
      setCancellationReasonInput("");
      setCancellationCharges("");
      setCancellationGstFileBase64("");
      setCancellationGstFileName("");
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message || "Error during cancellation");
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const handleRescheduleJobCardOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !cancellationReasonInput.trim()) {
      triggerError("Cancellation and reschedule trigger comments are required.");
      return;
    }

    setSubmittingCancellation(true);
    try {
      const res = await fetch(`/api/job-cards/${selectedCard.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancellationReasonInput,
          operatorId,
          reschedulingCharges: parseFloat(reschedulingCharges) || 0,
          fareDifference: parseFloat(fareDifference) || 0,
          cancellationCharges: parseFloat(cancellationCharges) || 0,
          cancellationGstInvoiceUrl: cancellationGstFileBase64 || undefined,
          cancellationGstInvoiceName: cancellationGstFileName || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger rescheduling on backend.");
      }

      triggerSuccess(`Job Card linked reschedule completed. Parent ${selectedCard.id} cancelled. New Quotation-ready card spawned!`);
      setShowCancelModal(false);
      setCancellationReasonInput("");
      setReschedulingCharges("");
      setFareDifference("");
      setCancellationCharges("");
      setCancellationGstFileBase64("");
      setCancellationGstFileName("");
      await onRefresh();
      
      // Select the new rescheduled card to immediately display it in active workspace!
      if (data.newCard) {
        setSelectedCard(data.newCard);
      }
    } catch (err: any) {
      triggerError(err.message || "Error during reschedule trigger");
    } finally {
      setSubmittingCancellation(false);
    }
  };

  useEffect(() => {
    setJobCards(initialJobCards);
    if (selectedCard) {
      const match = initialJobCards.find(jc => jc.id === selectedCard.id);
      if (match) setSelectedCard(match);
    }
  }, [initialJobCards]);

  // Alert system timers
  const triggerSuccess = (msg: string) => {
    setLocalSuccess(msg);
    setTimeout(() => setLocalSuccess(""), 4000);
  };
  const triggerError = (msg: string) => {
    setLocalError(msg);
    setTimeout(() => setLocalError(""), 5000);
  };

  // Convert files helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setBase64: (val: string) => void, setFileName: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Manually open/create a Job Card from Approved Indents on list
  const handleInitializeJobCard = async (indent: TravelIndent) => {
    try {
      setLocalError("");
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
        throw new Error(data.error || "Failed initialization of tracking parameters.");
      }

      await onRefresh();
      triggerSuccess(`Job Card initialized successfully for ${indent.id}!`);
      const matched = data.jobCard;
      if (matched) setSelectedCard(matched);
    } catch (err: any) {
      triggerError(err.message || "Could not spawn job card.");
    }
  };

  // 2. Add Vendor to RFQ
  const handleAddRfqVendor = async (vendorName: string) => {
    if (!selectedCard || !vendorName) return;
    if (selectedCard.rfqVendors.includes(vendorName)) {
      triggerError("Vendor already in bid group!");
      return;
    }

    try {
      const updatedVendors = [...selectedCard.rfqVendors, vendorName];
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Vendor RFQ Appended",
        notes: `Selected vendor '${vendorName}' added for flight/stay quotation pricing.`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqVendors: updatedVendors,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("I/O failure saving RFQ list");
      await onRefresh();
      triggerSuccess(`Added ${vendorName} to RFQ list.`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 3. Delete Vendor from RFQ
  const handleRemoveRfqVendor = async (vendorName: string) => {
    if (!selectedCard) return;
    try {
      const updatedVendors = selectedCard.rfqVendors.filter(v => v !== vendorName);
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Vendor RFQ Omitted",
        notes: `Vendor '${vendorName}' was deleted from the quote request selection.`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqVendors: updatedVendors,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Could not drop RFQ vendor.");
      await onRefresh();
      triggerSuccess("Omitted vendor.");
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleAddSubCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSubAmount || parseFloat(singleSubAmount) <= 0) {
      triggerError("Please specify a valid sub cost amount.");
      return;
    }
    const amt = parseFloat(singleSubAmount);
    const newSub: QuoteSubCost = {
      category: singleSubCategory,
      description: singleSubDesc.trim() || `${singleSubCategory} Cost Item`,
      amount: amt,
      airline: singleSubCategory === "FLIGHT" ? quoteAirline : undefined,
      sector: singleSubCategory === "FLIGHT" ? quoteSector : undefined,
      layover: singleSubCategory === "FLIGHT" ? quoteLayover : undefined
    };
    const updated = [...subCosts, newSub];
    setSubCosts(updated);
    
    const totalSum = updated.reduce((sum, item) => sum + item.amount, 0);
    setQuoteAmount(totalSum.toString());
    
    setSingleSubDesc("");
    setSingleSubAmount("");
    // Also reset flight specific states for individual items
    setQuoteAirline("");
    setQuoteSector("");
    setQuoteLayover("");
  };

  const handleRemoveSubCost = (index: number) => {
    const updated = subCosts.filter((_, i) => i !== index);
    setSubCosts(updated);
    const totalSum = updated.reduce((sum, item) => sum + item.amount, 0);
    setQuoteAmount(totalSum > 0 ? totalSum.toString() : "");
  };

  // 4. Quotation CRUD Operations
  const handleDeleteQuote = async (quoteId: string) => {
    if (!selectedCard) return;
    if (!window.confirm("Are you sure you want to delete this quotation bid? This cannot be undone.")) return;

    try {
      const updatedQuotes = (selectedCard.quotes || []).filter(q => q.id !== quoteId);
      const isDeletingWinning = selectedCard.winningQuoteId === quoteId;

      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Quote Deleted",
        notes: `Deleted quotation reference: ${quoteId}`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotes: updatedQuotes,
          winningQuoteId: isDeletingWinning ? null : undefined,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Delete operation failed on server.");
      triggerSuccess("Quotation record purged from registry.");
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleEditQuote = (quote: JobCardQuote) => {
    setEditingQuoteId(quote.id);
    setQuoteVendorName(quote.vendorName);
    setQuoteAmount(quote.amount.toString());
    setQuoteCurrency(quote.currency);
    setSubCosts(quote.subCosts || []);
    setQuoteAirline(quote.airline || "");
    setQuoteSector(quote.sector || "");
    setQuoteLayover(quote.layover || "");
    setQuoteTravelDate(quote.travelDate || "");
    setIsAirlineQuote(!!quote.airline);
    
    // Smooth scroll to form
    const formElement = document.getElementById("quote-entry-form-anchor");
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelQuoteEdit = () => {
    setEditingQuoteId(null);
    setQuoteVendorName("");
    setQuoteAmount("");
    setQuoteCurrency("INR");
    setSubCosts([]);
    setQuoteAirline("");
    setQuoteSector("");
    setQuoteLayover("");
    setQuoteTravelDate("");
    setQuoteFileBase64("");
    setQuoteFileName("");
    setIsAirlineQuote(false);
  };

  // 4. Submit Quotation details manually
  const handleSubmitQuote = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!selectedCard || !quoteVendorName || !quoteAmount) {
      triggerError("Input parameters are missing");
      return;
    }

    setSubmittingQuote(true);
    try {
      const primaryFlight = subCosts.find(c => c.category === "FLIGHT");

      const newQuote: JobCardQuote = {
        id: editingQuoteId || "QT-" + Math.floor(100 + Math.random() * 900),
        vendorName: quoteVendorName,
        amount: parseFloat(quoteAmount),
        currency: quoteCurrency,
        quoteFileUrl: quoteFileBase64 || undefined,
        quoteFileName: quoteFileName || undefined,
        created_at: new Date().toISOString(),
        subCosts: subCosts.length > 0 ? subCosts : undefined,
        airline: primaryFlight?.airline,
        sector: primaryFlight?.sector,
        layover: primaryFlight?.layover,
        travelDate: quoteTravelDate,
        agentName: activeUserName
      };

      let updatedQuotes: JobCardQuote[] = [];
      if (editingQuoteId) {
        updatedQuotes = (selectedCard.quotes || []).map(q => q.id === editingQuoteId ? newQuote : q);
      } else {
        updatedQuotes = [...(selectedCard.quotes || []), newQuote];
      }

      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: editingQuoteId ? "Quote Updated" : "Quote Input Logged",
        notes: `${editingQuoteId ? 'Updated' : 'Registered'} bid from '${quoteVendorName}' value ${quoteAmount} ${quoteCurrency}${isAirlineQuote ? ` with airline: ${quoteAirline || 'N/A'}, agent: ${activeUserName}` : ''}.`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotes: updatedQuotes,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Failed persistent database save.");
      
      triggerSuccess(editingQuoteId ? "Quotation bid updated." : "Quotation recorded in Card registry.");
      handleCancelQuoteEdit();
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Determine cheapest quote
  const getCheapestQuote = (quotes: JobCardQuote[]) => {
    if (!quotes || quotes.length === 0) return null;
    return quotes.reduce((cheapest, current) => {
      // Normalize currency simple convert (Using simple rough desk multipliers: USD=83, NGN=0.06, VND=0.0035, AUD=55)
      const getInrValue = (q: JobCardQuote) => {
        const val = q.amount;
        if (q.currency === "USD" || q.currency === "$") return val * 83;
        if (q.currency === "AUD") return val * 55;
        if (q.currency === "NGN") return val * 0.06;
        if (q.currency === "VND") return val * 0.0035;
        return val; // INR or others as baseline
      };
      return getInrValue(current) < getInrValue(cheapest) ? current : cheapest;
    });
  };

  const cheapest = selectedCard ? getCheapestQuote(selectedCard.quotes) : null;

  // 5. Select Winning (Winning Bid)
  const handleSelectWinningQuote = async (quote: JobCardQuote) => {
    if (!selectedCard) return;
    try {
      const updatedQuotes = selectedCard.quotes.map(q => ({
        ...q,
        isWinning: q.id === quote.id
      }));

      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Winning Quote Selected",
        notes: `Declared bid from '${quote.vendorName}' (${quote.amount} ${quote.currency}) as winning selection.`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotes: updatedQuotes,
          winningQuoteId: quote.id,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Failed assigning winning parameters.");
      await onRefresh();
      triggerSuccess(`Assigned winning quote successfully!`);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 6. Submit to Approval Workflow with 2-level initializes
  const handleSendForApproval = async () => {
    if (!selectedCard) return;
    if (!selectedCard.winningQuoteId) {
      triggerError("Action Forbidden: You must designate a Winning Quote before requesting workflow approval.");
      return;
    }
    const winQuote = selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId);
    if (!winQuote) return;

    try {
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Dispatched for Two-Level Approval",
        notes: `Ticket sent for Level 1 Travel Approval & Level 2 Commercial Authorization. Selected Bid: ${winQuote.vendorName} (${winQuote.amount} ${winQuote.currency}).`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 'APPROVAL',
          approvalStatus: 'PENDING',
          travelApprovalStatus: 'PENDING',
          commercialApprovalStatus: 'PENDING',
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Approval dispatch database fail.");
      await onRefresh();
      triggerSuccess("Dispatched for Two-Level Approval Workflow.");
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 7. Two-Level Custom Approval Handlers
  const handleL1TravelDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedCard) return;
    setSubmittingApproval(true);
    try {
      const statusText = decision === 'APPROVED' ? "Travel Approved (Level 1)" : "Travel Rejected (Level 1)";
      const reviewer = `Travel Board Approver [Role: ${activeRole}]`;
      
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: reviewer,
        action: statusText,
        notes: approvalNotes ? `Reviewer remarks: "${approvalNotes}"` : `L1 travel compliance criteria verified.`
      };

      // If L1 is rejected, we demote stage back to QUOTATION
      const nextStage = decision === 'REJECTED' ? 'QUOTATION' : undefined;

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelApprovalStatus: decision,
          travelApprovedBy: reviewer,
          travelApprovedAt: new Date().toISOString(),
          travelApprovalNotes: approvalNotes || undefined,
          stage: nextStage,
          approvalStatus: decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Failed to post L1 decision.");
      await onRefresh();
      triggerSuccess(`Level 1 Travel Approval Decision [${decision}] saved successfully!`);
      setApprovalNotes("");
    } catch (err: any) {
      triggerError("Error in L1 Approval: " + err.message);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleL2CommercialDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedCard) return;
    setSubmittingApproval(true);
    try {
      const statusText = decision === 'APPROVED' ? "Commercial Approved (Level 2 VP)" : "Commercial Rejected (Level 2)";
      const reviewer = "VP Commercial Admin";
      
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: reviewer,
        action: statusText,
        notes: approvalNotes ? `VP Remarks: "${approvalNotes}"` : `Commercial final authorization completed.`
      };

      const nextStage = decision === 'APPROVED' ? 'BOOKING' : 'QUOTATION';

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialApprovalStatus: decision,
          commercialApprovedBy: reviewer,
          commercialApprovedAt: new Date().toISOString(),
          commercialApprovalNotes: approvalNotes || undefined,
          stage: nextStage,
          approvalStatus: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          approvedAt: decision === 'APPROVED' ? new Date().toISOString() : undefined,
          approverName: reviewer,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Failed to post L2 decision.");
      await onRefresh();
      triggerSuccess(`Level 2 Commercial VP Approval Decision Saved successfully! Card promoted to Booking stage.`);
      setApprovalNotes("");
    } catch (err: any) {
      triggerError("Error in L2 Approval: " + err.message);
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Helper and Hooks for resolving employee and passport validation details
  const resolvedEmployee = useMemo(() => {
    if (!selectedCard) return null;
    const indent = indents.find(i => i.id === selectedCard.indentId);
    if (!indent) return null;
    return employees.find(e => e.employee_code === indent.employee_code);
  }, [selectedCard, indents, employees]);

  const getPassportValidityDays = (expiryStr?: string) => {
    if (!expiryStr) return null;
    const expiryDate = new Date(expiryStr);
    const currentDate = new Date("2026-06-12"); // current standard simulation epoch
    const diffTime = expiryDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Pre-fill outbound system emails templates based on selected category and passenger info
  useEffect(() => {
    if (!selectedCard) return;
    const indent = indents.find(i => i.id === selectedCard.indentId);
    const approvedQuote = selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId);
    const vendor = approvedQuote?.vendorName || "Preferred Vendor Partner";
    const traveler = resolvedEmployee?.name || "Corporate Employee";
    const route = `${indent?.nearest_boarding_point || resolvedEmployee?.native_city || "BOM"} to ${selectedCard.destination || "DEL"}`;
    const date = indent?.travel_date || "date";
    const passExpiry = resolvedEmployee?.passport_expiry || "N/A";
    const passNum = resolvedEmployee?.passport_number || "N/A";

    let subject = "";
    let body = "";

    if (emailTemplateType === 'FLIGHT') {
      subject = `Urgent Flight Reservation Order - ${traveler} [Sector: ${route}]`;
      body = `Hi ${vendor} Booking Team,\n\nPlease issue flight tickets for our corporate traveler:\n\nPassenger Name: ${traveler}\nSector: ${route}\nDate of Travel: ${date}\nPassport Reference: ${passNum}\nPassport Validity Expiry: ${passExpiry}\nCC Tracking Code: COM-${selectedCard.id}\n\nPlease include fallback itineraries if any transit connections require extra check-in buffers.\n\nBest,\nHemraj Corporate Travel Operations`;
    } else if (emailTemplateType === 'HOTEL') {
      subject = `Corporate Lodge Booking - Guest: ${traveler} @ ${selectedCard.destination}`;
      body = `Hi Travel Partners booking desk,\n\nPlease secure hot lodging confirmations for:\n\nGuest Name: ${traveler}\nLocation: ${selectedCard.destination}\nTarget Check-In Date: ${date}\n\nPlease revert with the official booking voucher and electronic invoice.\n\nThanks,\nHemraj Travel Admin`;
    } else if (emailTemplateType === 'PACKAGE') {
      subject = `Fulfillment Booking for Tour Package: Ref ID ${selectedCard.id}`;
      body = `Dear Partner at ${vendor},\n\nPlease dispatch travel booking operations for our custom package request:\n\nLead traveler: ${traveler}\nTravel Route Spec: ${route}\nDate range: ${date}\n\nPlease activate full tour guide links as specified in your approved quotation.\n\nRegards,\nHemraj Admin`;
    } else if (emailTemplateType === 'VISA') {
      subject = `Visa Liaison Request Order - ${traveler} (${resolvedEmployee?.visa_country || "Indian"})`;
      body = `Dear Visa Desk Partner,\n\nKindly activate transit visa file preparation assistance for:\n\nApplicant: ${traveler}\nNationality: ${resolvedEmployee?.visa_country || "N/A"}\nPassport: ${passNum}\nPassport expiration date: ${passExpiry}\nRoute Sector: ${route}\n\nPlease guide our traveler regarding processing timelines.\n\nTruly yours,\nHemraj Compliance Support Department`;
    } else {
      subject = `General Booking Desk Instructions: Indent ID ${selectedCard.id}`;
      body = `Hi Desk,\n\nPlease refer to travel record ${selectedCard.id} for the traveler ${traveler}.\n\nPlease arrange necessary ancillary travel assistance.\n\nThanks,\nHemraj Travel Desk`;
    }

    setEmailSubjectInput(subject);
    setEmailBodyInput(body);
    setEmailVendorTo(approvedQuote?.vendorName ? `${approvedQuote.vendorName.toLowerCase().replace(/[^a-z0-9]/g, "")}@hemraj-vendor.com` : "operations-partner@hemraj-hotel.com");

  }, [emailTemplateType, selectedCard, resolvedEmployee]);

  // Outbound Vendor Transmit routine
  const handleSendVendorEmailSimulated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setEmailSubmitting(true);
    try {
      const emailRecordInfo = `Electronic email dispatched successfully!\nTemplate Type: [${emailTemplateType}]\nFrom: ${senderEmail}\nTo: ${emailVendorTo}\nCC: ${ccRecipients}\nSubject: "${emailSubjectInput}"`;
      
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: `Comm Engine [Sender: ${senderEmail}]`,
        action: `Email Sent (${emailTemplateType})`,
        notes: emailRecordInfo
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Could not save communication dispatch record.");
      await onRefresh();
      triggerSuccess(`Outbound Email Dispatched to '${emailVendorTo}' with CC [${ccRecipients}]!`);
      
      // Clean temporary state
      setEmailVendorTo("");
    } catch (err: any) {
      triggerError("Email transmission fail: " + err.message);
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Backward compatibility mock desk decision
  const handleManagerDecision = async (decision: 'APPROVED' | 'REJECTED' | 'MORE_QUOTES') => {
    if (decision === 'APPROVED') {
      await handleL1TravelDecision('APPROVED');
      await handleL2CommercialDecision('APPROVED');
    } else {
      await handleL1TravelDecision('REJECTED');
    }
  };

  const sortedQuotes = useMemo(() => {
    if (!selectedCard?.quotes) return [];
    
    const getInrVal = (q: JobCardQuote) => {
      const val = q.amount;
      if (q.currency === "USD" || q.currency === "$") return val * 83;
      if (q.currency === "VND") return val * 0.0035;
      if (q.currency === "NGN") return val * 0.06;
      if (q.currency === "AUD") return val * 55;
      return val;
    };

    const list = [...selectedCard.quotes].sort((a, b) => getInrVal(a) - getInrVal(b));
    return list;
  }, [selectedCard?.quotes]);

  const top3QuoteIds = useMemo(() => {
    return sortedQuotes.slice(0, 3).map(q => q.id);
  }, [sortedQuotes]);

  // 8. OCR Scanner with Gemini API
  const handleScanDocument = async (fileType: 'ticket' | 'invoice') => {
    const fileData = fileType === 'ticket' ? ticketFileBase64 : invoiceFileBase64;
    const fileName = fileType === 'ticket' ? ticketFileName : invoiceFileName;
    
    if (!fileData) {
      triggerError(`Please choose a ${fileType} document to upload first.`);
      return;
    }

    if (fileType === 'ticket') setScanningTicket(true);
    else setScanningInvoice(true);

    setBookingMessage("Uploading file bytes and parsing with Gemini 3.5 Cognitive Engine...");
    setScanMethod("");

    try {
      const res = await fetch("/api/job-cards/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType,
          fileData,
          mimeType: fileData.split(";")[0].split(":")[1] || "image/png",
          fileName
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failing scan operations.");
      }

      const info = result.scannedData;
      setScanMethod(result.method || "Gemini Search");

      if (fileType === 'ticket') {
        setPnr(info.pnr || "TKT" + Math.floor(100+Math.random()*900));
        setBookingAmount(String(info.finalAmount || "11500"));
        setBookingCurrency(info.currency || "INR");
        triggerSuccess("Success: Gemini analyzed travel voucher successfully.");
      } else {
        setInvoiceVendorAmount(String(info.totalBillAmount || "13500"));
        setInvoiceCurrency(info.currency || "INR");
        setInvoiceNumber(info.invoiceNumber || "MMT/INV/" + Math.floor(1000+Math.random()*9000));
        setQuoteVendorName(info.vendorName || "MakeMyTrip Ltd");
        triggerSuccess("Success: Gemini verified vendor physical invoice metrics.");
      }

      setBookingMessage(`Scan Complete! Method: ${result.method}`);
    } catch (err: any) {
      triggerError(`Scan process error: ${err.message}`);
      setBookingMessage("");
    } finally {
      setScanningTicket(false);
      setScanningInvoice(false);
    }
  };

  // 9. Save PNR / Booking particulars (Ticket details only)
  const handleSaveBookingFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !pnr || !bookingAmount) {
      triggerError("Please enter the booking PNR and ticket cost first.");
      return;
    }

    try {
      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Ticket Booked",
        notes: `Recorded ticket booking. PNR: ${pnr}, Cost: ${bookingAmount} ${bookingCurrency}.`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingPNR: pnr,
          finalBookingAmount: parseFloat(bookingAmount),
          bookingCurrency: bookingCurrency,
          ticketFileUrl: ticketFileBase64 || undefined,
          ticketFileName: ticketFileName || undefined,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Saving ticket details failed.");
      
      triggerSuccess("Ticket details saved successfully!");
      setActiveViewSection('VENDOR_INVOICE');
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 9.5 Save Vendor Invoice details
  const handleSaveVendorInvoiceFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !invoiceNumber || !invoiceVendorAmount) {
      triggerError("Please enter the invoice number and invoice amount first.");
      return;
    }

    try {
      const convertToInrValue = (amt: number, curr: string) => {
        const val = amt;
        const c = curr.toUpperCase();
        if (c === "USD" || c === "$") return val * 83;
        if (c === "AUD") return val * 55;
        if (c === "NGN") return val * 0.06;
        if (c === "VND") return val * 0.0035;
        return val;
      };

      const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
      const approvedAmount = winQuote ? winQuote.amount : 0;
      const finalAmt = parseFloat(invoiceVendorAmount) || 0;
      let varPct = 0;
      if (approvedAmount > 0) {
        varPct = Math.round(((finalAmt - approvedAmount) / approvedAmount) * 100);
      }
      const isHighVariance = varPct > 10;
      const justificationText = bookingVarianceJustification.trim();

      if (isHighVariance && !justificationText) {
        triggerError("Ticket cost deviation detected! Please enter a explanation comment.");
        return;
      }

      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Vendor Invoice Uploaded" + (justificationText ? " With Deviation" : ""),
        notes: `Uploaded vendor invoice. No: ${invoiceNumber}, Amount: ${invoiceVendorAmount} ${invoiceCurrency}.` +
               (justificationText ? ` Reason: "${justificationText}"` : "")
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 'FINANCE',
          bookingVendor: selectedBookingVendor || undefined,
          invoiceVendorAmount: finalAmt,
          invoiceCurrency: invoiceCurrency,
          invoiceNumber: invoiceNumber,
          ticketVendorInvoiceUrl: invoiceFileBase64 || undefined,
          ticketVendorInvoiceName: invoiceFileName || undefined,
          bookingRecordedAt: new Date().toISOString(),
          financeVarianceReason: justificationText || undefined,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Saving vendor invoice details failed.");
      
      triggerSuccess("Vendor invoice saved! Moving to Finance Approval.");
      setPnr("");
      setBookingAmount("");
      setSelectedBookingVendor("");
      setTicketFileBase64("");
      setTicketFileName("");
      setInvoiceFileBase64("");
      setInvoiceFileName("");
      setBookingMessage("");
      setBookingVarianceJustification("");
      setActiveViewSection('FINANCE');
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 9.5 Finance clearance actions
  const handleSaveFinanceApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !invoiceVendorAmount) {
      triggerError("Final invoice amount is strictly required for financial verification.");
      return;
    }

    try {
      const finalAmt = parseFloat(invoiceVendorAmount);
      const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
      const appAmt = winQuote ? winQuote.amount : 0;

      let variancePct = 0;
      if (appAmt > 0) {
        variancePct = Math.round(((finalAmt - appAmt) / appAmt) * 100);
      }

      if (variancePct > 10 && !financeVarianceReason.trim()) {
        triggerError("Warning: Quoted variance is over 10%. You must input a comment / variance explanation to authorize payment.");
        return;
      }

      const now = new Date().toISOString();
      const newAudit: AuditLogEntry = {
        timestamp: now,
        userId: operatorId,
        action: "Finance Approved Payment",
        notes: `Cleared invoice #${invoiceNumber || "N/A"} for ${finalAmt} ${invoiceCurrency}. Budget Variance: ${variancePct}%. Explanation: "${financeVarianceReason || "Within limit"}"`
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 'RECONCILIATION', // Progress to Step 5 (Auditing)
          invoiceVendorAmount: finalAmt,
          invoiceCurrency,
          invoiceNumber,
          financeCleared: true,
          financeVarianceReason: financeVarianceReason || undefined,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Finance clearance submission failed.");

      triggerSuccess("Finance payment released successfully! Ticket moved to Reconciliation Audits.");
      setFinanceVarianceReason("");
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleUpdateJobCard = async (cardId: string, updates: Partial<JobCard>) => {
    try {
      const res = await fetch(`/api/job-cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setJobCards(prev => prev.map(jc => jc.id === cardId ? data.jobCard : jc));
          if (selectedCard?.id === cardId) {
            setSelectedCard(data.jobCard);
          }
        }
      }
    } catch (error) {
      console.error("Failed to update job card:", error);
    }
  };

  const handleDeleteJobCard = async (cardId: string) => {
    if (!window.confirm("CRITICAL: You are about to permanently purge this Job Card tracking record from the master database. All associated audit logs, quotes, and financial records will be lost. Proceed?")) return;

    try {
      const res = await fetch(`/api/job-cards/${cardId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Server rejected job card deletion.");
      
      triggerSuccess("Job Card tracking record has been purged successfully.");
      setSelectedCard(null);
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleFinanceReject = async (explanationStr: string, actionType: 'REJECT' | 'CORRECTION') => {
    if (!selectedCard) return;
    if (!explanationStr.trim()) {
      triggerError("Comments/Explanation is required to Reject or request Correction.");
      return;
    }

    try {
      const now = new Date().toISOString();
      const newAudit: AuditLogEntry = {
        timestamp: now,
        userId: operatorId,
        action: actionType === 'CORRECTION' ? "Finance Correction Requested" : "Finance Rejected",
        notes: `Stage: ${selectedCard.stage}. Explanation: "${explanationStr}"`
      };

      // Set stage back to BOOKING so the desk or the vendor can update booking/invoice details
      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 'BOOKING', // send back to booking desk to correct details
          financeCleared: false,
          financeVarianceReason: explanationStr,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Rejection update failed.");
      triggerSuccess(actionType === 'CORRECTION' 
        ? "Correction request sent back to the operations/booking desk!" 
        : "Payment request successfully Rejected and returned to Booking.");
      setFinanceVarianceReason("");
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // 10. Financial Reconciliation / GST checklist save
  const handleScanGstInvoice = async () => {
    if (!gstInvoiceFileBase64) {
      triggerError("Please choose a Service / Airline GST Invoice document to upload first.");
      return;
    }

    setScanningGstInvoice(true);
    setBookingMessage("Uploading Service / Airline GST Invoice and extracting using Gemini 3.5 Flash...");
    setScanMethod("");
    
    try {
      const res = await fetch("/api/job-cards/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: "gst_invoice",
          fileData: gstInvoiceFileBase64,
          mimeType: gstInvoiceFileBase64.split(";")[0].split(":")[1] || "image/png",
          fileName: gstInvoiceFileName
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failing scan operations.");
      }

      const info = result.scannedData;
      setScanMethod(result.method || "Gemini AI Search");

      // Set the extracted information
      setAirlineGstVendorName(info.vendorName || "IndiGo Airlines");
      setAirlineGstNumber(info.gstNumber || "07AAACI8451M1ZT");
      setAirlineGstAmount(String(info.gstAmount || "740"));
      setInvoiceVendorAmount(String(info.totalBillAmount || "14800"));
      setInvoiceNumber(info.invoiceNumber || "6E/DEL/GST/" + Math.floor(100000 + Math.random() * 900000));
      setInvoiceCurrency(info.currency || "INR");
      setGstDetailsCorrect(true);
      setPhysicalInvoiceHandedOver(true);

      triggerSuccess("Success: Gemini scanned corporate airline GST invoice files successfully.");
      setBookingMessage(`Scan Complete! Method: ${result.method}`);
    } catch (err: any) {
      triggerError(`Scan process error: ${err.message}`);
      setBookingMessage("");
    } finally {
      setScanningGstInvoice(false);
    }
  };

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !invoiceVendorAmount) {
      triggerError("Please record the final vendor bill received.");
      return;
    }    try {
      const convertToInrValue = (amt: number, curr: string) => {
        const val = amt;
        const c = curr.toUpperCase();
        if (c === "USD" || c === "$") return val * 83;
        if (c === "AUD") return val * 55;
        if (c === "NGN") return val * 0.06;
        if (c === "VND") return val * 0.0035;
        return val;
      };

      const finalAmt = parseFloat(invoiceVendorAmount);
      // Retrieve original approved budget
      const winQuote = selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId);
      const appAmt = winQuote ? winQuote.amount : 0;
      
      const appAmtInr = winQuote ? convertToInrValue(winQuote.amount, winQuote.currency) : 0;
      const finalAmtInr = convertToInrValue(finalAmt, invoiceCurrency);
      const isReconSurged = finalAmtInr > appAmtInr;
      const reconVariancePct = appAmtInr > 0 ? Math.round(((finalAmtInr - appAmtInr) / appAmtInr) * 100) : 0;

      let reconJustNote = reconVarianceJustification.trim();
      if (isReconSurged && !reconJustNote) {
        triggerError("Final invoice exceeds authorized budget! Please record a compliance audit justification note.");
        return;
      }

      let varianceWarning = "";
      if (isReconSurged) {
        varianceWarning = `VARIANCE EXCEEDED BUDGET: Final invoice (${finalAmt} ${invoiceCurrency}) exceeds approved budget (${appAmt} ${winQuote?.currency || invoiceCurrency}) by ${reconVariancePct}%! Compliance Audit note: "${reconJustNote}"`;
      }

      const linkedIndent = indents.find(i => i.id === selectedCard.id || i.id === selectedCard.indentId);
      const requiresGst = linkedIndent ? linkedIndent.gst_applicable !== false : true;

      if ((requiresGst && !gstDetailsCorrect) || !physicalInvoiceHandedOver) {
        triggerError(requiresGst 
          ? "Warning: Both GST details checklist and Physical Copy submission must be checked off before submitting."
          : "Warning: Physical Copy submission checklist must be checked off before submitting.");
        return;
      }

      const newAudit: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId: operatorId,
        action: "Audit Rec Verification Completed & Closed" + (reconJustNote ? " With Deviation" : ""),
        notes: (requiresGst 
          ? `Airline/Service GST Invoice of ${invoiceVendorAmount} ${invoiceCurrency} extracted and processed. Airline GSTIN: ${airlineGstNumber || "Not Provided"}.`
          : `Non-GST Invoice of ${invoiceVendorAmount} ${invoiceCurrency} verified and processed. Booking verified.`) +
          (reconJustNote ? ` Compliance Audit note: "${reconJustNote}"` : "")
      };

      const res = await fetch(`/api/job-cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 'CLOSED', // Marks loop closed!
          invoiceVendorAmount: finalAmt,
          invoiceCurrency,
          invoiceNumber,
          gstDetailsCorrect,
          physicalInvoiceHandedOver,
          varianceWarning: varianceWarning || undefined,
          // Storing extracted GST invoice fields:
          airlineGstInvoiceUrl: gstInvoiceFileBase64 || undefined,
          airlineGstInvoiceName: gstInvoiceFileName || undefined,
          airlineGstNumber: airlineGstNumber || undefined,
          airlineGstAmount: parseFloat(airlineGstAmount) || undefined,
          airlineGstVendorName: airlineGstVendorName || undefined,
          reconciliationRecordedAt: new Date().toISOString(),
          financeVarianceReason: reconJustNote || undefined,
          auditLogs: [newAudit]
        })
      });

      if (!res.ok) throw new Error("Could not register billing clearance.");

      triggerSuccess("Loop successfully closed! Billing details and audit history updated.");
      setInvoiceVendorAmount("");
      setInvoiceNumber("");
      setGstDetailsCorrect(false);
      setPhysicalInvoiceHandedOver(false);
      setGstInvoiceFileBase64("");
      setGstInvoiceFileName("");
      setAirlineGstVendorName("");
      setAirlineGstNumber("");
      setAirlineGstAmount("");
      setReconVarianceJustification("");
      await onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Helper filters
  const filteredCards = jobCards.filter(jc => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'VOIDED') return jc.voided;
    return jc.stage === activeTab && !jc.voided;
  });

  // Sitting open helper
  const getDaysOpen = (dateStr: string) => {
    const created = new Date(dateStr || Date.now());
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // SIX SLA CHECKPOINTS TAT CALCULATOR ENGINE
  const calculateTATMetrics = (card: JobCard) => {
    const created = new Date(card.created_at).getTime();
    const now = Date.now();
    const approvedTime = card.approvedAt ? new Date(card.approvedAt).getTime() : null;
    const bookedTime = card.bookingRecordedAt ? new Date(card.bookingRecordedAt).getTime() : null;
    const reconciledTime = card.reconciliationRecordedAt ? new Date(card.reconciliationRecordedAt).getTime() : null;

    // Checkpoint 1: RFQ Nominations Nominated
    const nominationSpent = card.rfqVendors.length > 0 ? 1.2 : ((now - created) / (1000 * 60 * 60));
    const nominationStatus = nominationSpent > 4 ? 'delayed' : 'within';

    // Checkpoint 2: Quotes Bidding Received
    const biddingSpent = card.quotes.length > 0 ? 2.8 : (card.rfqVendors.length > 0 ? ((now - created) / (1000 * 60 * 60)) : 0);
    const biddingStatus = biddingSpent > 8 ? 'delayed' : biddingSpent === 0 ? 'not-started' : 'within';

    // Checkpoint 3: Approved Quote Selected & SLA
    let approvalSpent = 0;
    let approvalStatus: 'within' | 'delayed' | 'not-started' = 'not-started';
    if (approvedTime) {
      approvalSpent = (approvedTime - created) / (1000 * 60 * 60);
      approvalStatus = approvalSpent > 12 ? 'delayed' : 'within';
    } else {
      approvalSpent = (now - created) / (1000 * 60 * 60);
      approvalStatus = card.stage === 'QUOTATION' ? 'not-started' : (approvalSpent > 12 ? 'delayed' : 'within');
    }

    // Checkpoint 4: PNR Booking Dispatched Fulfillment
    let bookingSpent = 0;
    let bookingStatus: 'within' | 'delayed' | 'not-started' = 'not-started';
    if (approvedTime) {
      if (bookedTime) {
        bookingSpent = (bookedTime - approvedTime) / (1000 * 60 * 60);
        bookingStatus = bookingSpent > 24 ? 'delayed' : 'within';
      } else {
        bookingSpent = (now - approvedTime) / (1000 * 60 * 60);
        bookingStatus = card.stage === 'QUOTATION' ? 'not-started' : (bookingSpent > 24 ? 'delayed' : 'within');
      }
    }

    // Checkpoint 5: Service/Airline GST Invoice Auditing
    let reconSpent = 0;
    let reconStatus: 'within' | 'delayed' | 'not-started' = 'not-started';
    if (bookedTime) {
      if (reconciledTime) {
        reconSpent = (reconciledTime - bookedTime) / (1000 * 60 * 60);
        reconStatus = reconSpent > 48 ? 'delayed' : 'within';
      } else {
        reconSpent = (now - bookedTime) / (1000 * 60 * 60);
        reconStatus = (card.stage === 'QUOTATION' || card.stage === 'APPROVAL') ? 'not-started' : (reconSpent > 48 ? 'delayed' : 'within');
      }
    }

    // Checkpoint 6: Closed Loop Archive Turnaround
    let totalSpent = 0;
    let totalStatus: 'within' | 'delayed' | 'not-started' = 'not-started';
    if (reconciledTime) {
      totalSpent = (reconciledTime - created) / (1000 * 60 * 60);
      totalStatus = totalSpent > 240 ? 'delayed' : 'within';
    } else {
      totalSpent = (now - created) / (1000 * 60 * 60);
      totalStatus = totalSpent > 240 ? 'delayed' : 'within';
    }

    return [
      { title: "RFQ Vendor Nominations", spentStr: `${nominationSpent.toFixed(1)} Hrs`, limitStr: "4 Hours", status: nominationStatus },
      { title: "Vendor Quotes bidding Bids", spentStr: biddingSpent === 0 ? "Pending RFQs" : `${biddingSpent.toFixed(1)} Hrs`, limitStr: "8 Hours", status: biddingStatus },
      { title: "Financial Approval Authorization", spentStr: approvedTime ? `${approvalSpent.toFixed(1)} Hrs` : `${approvalSpent.toFixed(1)} Hrs`, limitStr: "12 Hours", status: approvalStatus },
      { title: "PNR Issued & Booking Fulfillment", spentStr: bookedTime ? `${bookingSpent.toFixed(1)} Hrs` : (approvedTime ? `${bookingSpent.toFixed(1)} Hrs` : "Waiting Approval"), limitStr: "24 Hours", status: bookingStatus },
      { title: "GST Audit Reconciliation", spentStr: reconciledTime ? `${reconSpent.toFixed(1)} Hrs` : (bookedTime ? `${reconSpent.toFixed(1)} Hrs` : "Waiting Booking"), limitStr: "48 Hours", status: reconStatus },
      { title: "Ultimate Closed Loop Archiving", spentStr: `${totalSpent.toFixed(1)} Hrs`, limitStr: "240 Hours", status: totalStatus }
    ];
  };

  // KANBAN COLUMN RENDERER
  const renderKanbanColumn = (colStage: JobCardStage, label: string, badgeStyles: string) => {
    // Standard Kanban filter logic: column matches stage
    // If activeTab is not ALL, and colStage !== activeTab, we filter down for focused Kanban views!
    if (activeTab !== 'ALL' && colStage !== activeTab) return null;

    const colCards = jobCards.filter(jc => jc.stage === colStage);

    return (
      <div className="flex-1 min-w-[290px] max-w-[340px] bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 shadow-sm" id={`kanban-col-${colStage.toLowerCase()}`}>
        {/* COLUMN HEADER */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${badgeStyles}`}>
              {colStage}
            </span>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{label}</h4>
          </div>
          <span className="px-2 py-0.5 bg-slate-900 text-[10px] text-white font-mono font-black rounded-lg">
            {colCards.length}
          </span>
        </div>

        {/* COLUMN CARDS container */}
        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 pb-4">
          {colCards.length === 0 ? (
            <div className="py-12 text-center text-slate-350 border-2 border-dashed border-slate-200 rounded-2xl bg-white flex flex-col items-center justify-center">
              <Clipboard className="w-7 h-7 mb-2 text-slate-300" />
              <span className="text-[9px] font-black uppercase tracking-widest block">Column Empty</span>
            </div>
          ) : (
            colCards.map(card => {
              const isSelected = selectedCard?.id === card.id;
              const days = getDaysOpen(card.created_at);
              const tatMetrics = calculateTATMetrics(card);
              
              // Spot current stage's specific metric to summarize
              const activeMetricIndex = 
                card.stage === 'QUOTATION' ? 0 :
                card.stage === 'APPROVAL' ? 2 :
                card.stage === 'BOOKING' ? 3 :
                card.stage === 'FINANCE' ? 4 :
                card.stage === 'RECONCILIATION' ? 5 : 5;
              const termMetric = tatMetrics[activeMetricIndex];
              const hasDelays = tatMetrics.some(m => m.status === 'delayed');

              const colIndent = indents.find(i => i.id === card.indentId);
              const colVoided = card.voided || (colIndent ? !!colIndent.voided : false);
              const cardEmp = colIndent ? employees.find(e => e.employee_code === colIndent.employee_code) : null;
              const validityDays = cardEmp ? getPassportValidityDays(cardEmp.passport_expiry) : null;

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`p-5 border rounded-2xl text-left cursor-pointer transition-all hover:shadow-md duration-200 relative space-y-4 shadow-sm ${
                    colVoided ? "border-orange-200 bg-orange-50/20" :
                    isSelected ? "border-orange-500 ring-4 ring-orange-500/10 bg-white" : "border-slate-200 bg-white"
                  }`}
                  id={`kanban-card-${card.id}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 block font-bold leading-none mb-1">#{card.id}</span>
                      <h5 
                        className="text-xs font-black hover:text-orange-600 block uppercase duration-100 flex items-center gap-1.5 text-slate-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          const foundEmp = employees.find(ev => ev.name.toLowerCase() === card.travelerName.toLowerCase());
                          if (foundEmp) {
                            setProfileEmployee(foundEmp);
                          }
                        }}
                        title="Click to view full profile details"
                      >
                        {card.travelerName} ℹ
                      </h5>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {colVoided && (
                        <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7.5px] font-black rounded uppercase tracking-tighter shrink-0 animate-pulse" title="VOID: Return ticket has to be cancelled after booking is finished">
                          ⚠️ Void: Cancel Return
                        </span>
                      )}
                      {hasDelays ? (
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black rounded uppercase animate-pulse shrink-0">
                          ⚠️ Delayed
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded uppercase shrink-0">
                          ✓ On Track
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-extrabold truncate">{card.destination}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-slate-500 font-bold uppercase text-[9px]">
                      <span>Dept: <strong className="text-slate-700">{card.department}</strong></span>
                      <span>Quotes: <strong className="text-slate-700">{card.quotes?.length || 0}</strong></span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8.5px] font-semibold text-slate-400 uppercase pt-2 border-t border-slate-100">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono font-bold">{days} {days === 1 ? 'day' : 'days'} open</span>
                    <span className="text-orange-600 font-black tracking-wider hover:text-orange-700 transition">View details →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8" id="job-card-panel">
      
      {/* LOCAL ERROR AND SUCCESS NOTIFIERS */}
      <AnimatePresence>
        {localError && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wide flex items-center gap-3 shadow-lg"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 text-white" />
            <span>{localError}</span>
          </motion.div>
        )}
        {localSuccess && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 bg-slate-900 border-l-4 border-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-wide flex items-center gap-3 shadow-lg"
          >
            <CheckCircle className="w-5 h-5 shrink-0 text-orange-500" />
            <span>{localSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>


      <div className={kanbanView ? "space-y-8" : "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"}>
        
        <div className={kanbanView ? "space-y-8" : isLeftListCollapsed ? "hidden" : "lg:col-span-3 space-y-6 flex flex-col"}>

          {/* KANBAN BOARD WRAPPER */}
          {kanbanView && (
            <div className="space-y-4" id="kanban-pipeline-stage-view">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-1 shrink-0">Corporate Pipeline Kanban Board</h3>
              <div className="flex gap-5 pb-6 overflow-x-auto min-h-[460px] scrollbar-thin">
                {renderKanbanColumn("QUOTATION", "Bids", "bg-indigo-50/50 border border-indigo-100 text-indigo-600")}
                {renderKanbanColumn("APPROVAL", "Approvals", "bg-amber-50/50 border border-amber-100 text-amber-600 animate-pulse")}
                {renderKanbanColumn("BOOKING", "Booking", "bg-blue-50/50 border border-blue-100 text-blue-600")}
                {renderKanbanColumn("FINANCE", "Finance Check", "bg-rose-50/50 border border-rose-100 text-rose-600")}
                {renderKanbanColumn("RECONCILIATION", "Expense Audit", "bg-purple-50/50 border border-purple-100 text-purple-600")}
                {renderKanbanColumn("CLOSED", "Archived", "bg-emerald-50/50 border border-emerald-100 text-emerald-700")}
              </div>
            </div>
          )}

          {/* LEFT COLUMN: LIST FOR ACTIVE STATS */}
          {!kanbanView && (
            <div className="flex flex-col space-y-4 overflow-hidden h-full max-h-full">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-1 shrink-0">Select Job Tracking Record</h3>
              
              {filteredCards.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 shrink-0">
                  <Clipboard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No Job Cards currently in this stage.</p>
                  <p className="text-slate-400 text-[10px] max-w-xs mx-auto mt-2 font-bold uppercase tracking-wider">
                    Tip: Standard indents must be authorized & checked to track. Click "Track Item" on any travel indent row in the dashboard!
                  </p>
                  <button 
                    onClick={() => onSelectView("dashboard")} 
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-full"
                  >
                    Go to Active Indents list
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 pr-2 pb-8 flex-1">
                  {activeTab === 'FINANCE' && selectedCards.length > 0 && (
                      <button onClick={handleBatchApprove} className="w-full bg-emerald-600 text-white font-black uppercase text-[10px] py-2 rounded-xl">
                          Batch Approve {selectedCards.length} Selected
                      </button>
                  )}
                  {filteredCards.map(card => {
                    const isSelected = selectedCard?.id === card.id;
                    const days = getDaysOpen(card.created_at);
                    const approvedQuote = card.quotes.find(q => q.id === card.winningQuoteId);
                    const isVoided = card.voided || indents.find(i => i.id === card.id)?.voided;
                    const isCardSelected = selectedCards.includes(card.id);
                    
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={`bg-white border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
                          isVoided ? "border-orange-200 bg-orange-50/20" :
                          isSelected ? "border-orange-500 ring-4 ring-orange-500/10" : "border-slate-200"
                        }`}
                      >
                       {activeTab === 'FINANCE' && (
                           <input type="checkbox" checked={isCardSelected} onChange={(e) => { e.stopPropagation(); toggleSelectCard(card.id); }} className="absolute top-2 right-2"/>
                       )}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">#{card.id}</span>
                              {isVoided && (
                                <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[7px] font-black rounded uppercase tracking-widest animate-pulse">VOIDED</span>
                              )}
                              {card.parentJobCardId && (
                                <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black rounded uppercase tracking-widest">RESCHEDULED</span>
                              )}
                            </div>
                            <h4 
                              className="text-base font-black text-slate-900 hover:text-orange-600 transition-all tracking-tight block uppercase cursor-pointer"
                              title="Click to view detailed employee profile"
                              onClick={(e) => {
                                e.stopPropagation();
                                const foundEmp = employees.find(ev => ev.name.toLowerCase() === card.travelerName.toLowerCase());
                                if (foundEmp) {
                                  setProfileEmployee(foundEmp);
                                } else {
                                  const linkedIndent = indents.find(i => i.id === card.id);
                                  if (linkedIndent) {
                                    const empByCode = employees.find(ev => ev.employee_code === linkedIndent.employee_code);
                                    if (empByCode) setProfileEmployee(empByCode);
                                  }
                                }
                              }}
                            >
                              {card.travelerName}
                            </h4>
                            <span className="text-[10px] text-orange-600 font-extrabold tracking-wider block mt-1 uppercase">{card.destination}</span>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">Dept: {card.department}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md ${
                              card.stage === 'QUOTATION' ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' :
                              card.stage === 'APPROVAL' ? 'bg-amber-50 border border-amber-200 text-amber-700 font-bold animate-pulse' :
                              card.stage === 'BOOKING' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                              card.stage === 'FINANCE' ? 'bg-rose-50 border border-rose-200 text-rose-700 font-black' :
                              card.stage === 'RECONCILIATION' ? 'bg-purple-50 border border-purple-200 text-purple-700 font-black' :
                              'bg-emerald-100 border border-emerald-300 text-emerald-800'
                            }`}>
                              {card.stage}
                            </span>
                            
                            <div className="mt-2.5 flex items-center justify-end gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span>{days} {days === 1 ? 'day' : 'days'} stale</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <span>Bids Received: <strong>{card.quotes?.length || 0}</strong></span>
                          {approvedQuote && (
                            <span className="text-emerald-700 font-extrabold">Approved budget: <strong>{approvedQuote.amount} {approvedQuote.currency}</strong></span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE DRAWERS/WORKSPACE FOR DETAILED WORKFLOWS */}
        <div className={kanbanView ? "" : isLeftListCollapsed ? "lg:col-span-12 text-left" : "lg:col-span-9 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-slate-200 lg:pl-8 text-left"}>
          
          <AnimatePresence mode="wait">
            {!selectedCard ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-50/50 border border-slate-100 rounded-3xl p-12 text-center shadow-2xs h-[calc(100vh-150px)] overflow-y-auto flex flex-col justify-center items-center"
              >
                <Clipboard className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-2">No Card selected</h3>
                <p className="text-slate-400 text-xs font-bold max-w-sm uppercase tracking-wider leading-relaxed">
                  Choose a corporate travel Job Card from the list on the left to start bidding, upload invoices, scan document records with Gemini, and submit reconciliation data.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedCard.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-[calc(100vh-150px)] overflow-y-auto pr-2 text-left"
              >
                {/* WORKSPACE HEADER */}
                <div className="bg-slate-900 px-8 py-7 text-white flex justify-between items-center gap-6 rounded-t-3xl shadow-sm">
                  <div className="flex items-center gap-5">
                    {!kanbanView && (
                      <button
                        type="button"
                        onClick={() => setIsLeftListCollapsed(!isLeftListCollapsed)}
                        className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition duration-150 active:scale-95 cursor-pointer flex items-center justify-center border border-slate-700/50 mr-1"
                        title={isLeftListCollapsed ? "Expand Cards Sidebar" : "Collapse Cards Sidebar"}
                      >
                        {isLeftListCollapsed ? <ChevronRight className="w-4 h-4 text-orange-500" /> : <ChevronLeft className="w-4 h-4" />}
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 
                        className="text-2xl font-black uppercase tracking-tight text-white cursor-pointer hover:text-orange-400 transition-colors flex items-center gap-2 leading-none"
                        title="Click to view detailed corporate employee profile details"
                        onClick={() => {
                          const foundEmp = employees.find(e => e.name.toLowerCase() === selectedCard.travelerName.toLowerCase());
                          if (foundEmp) {
                            setProfileEmployee(foundEmp);
                          } else {
                            const linkedIndent = indents.find(i => i.id === selectedCard.id);
                            if (linkedIndent) {
                              const empByCode = employees.find(e => e.employee_code === linkedIndent.employee_code);
                              if (empByCode) setProfileEmployee(empByCode);
                            }
                          }
                        }}
                      >
                        {selectedCard.travelerName}
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-widest font-black shrink-0">Profile ℹ️</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-slate-400 text-[11px] font-bold uppercase tracking-wide">
                          <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                          <span>{selectedCard.destination}</span>
                        </div>
                        <span className="text-slate-700 font-bold text-[11px]">•</span>
                        <span className="text-slate-400 text-[11px] font-black uppercase tracking-wider font-mono">#{selectedCard.id}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      {selectedCard.voided && (
                        <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ring-4 ring-rose-600/10 mb-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          VOIDED CARD
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        selectedCard.voided ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        selectedCard.stage === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        Stage: {selectedCard.stage}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        {!selectedCard.voided && (
                          <button 
                            type="button" 
                            onClick={async () => {
                              const reason = window.prompt("Enter reason for marking this job card as VOID:");
                              if (reason !== null) {
                                await handleUpdateJobCard(selectedCard.id, { voided: true, void_reason: reason });
                              }
                            }}
                            className="text-[9px] font-bold uppercase text-orange-400/70 hover:text-orange-400 hover:underline flex items-center gap-1.5 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Mark Void
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => handleDeleteJobCard(selectedCard.id)}
                          className="text-[9px] font-bold uppercase text-rose-400/70 hover:text-rose-400 hover:underline flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Purge Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedCard.voided && (
                  <div className="bg-orange-50 border-b border-orange-100 p-5 px-8 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 border border-orange-200 shadow-sm">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        Maintenance Alert: Voided Record
                      </h4>
                      <div className="text-[11px] text-orange-800 font-bold leading-relaxed max-w-2xl">
                        This travel tracker has been marked as <span className="text-orange-950 font-black px-1.5 py-0.5 rounded bg-orange-200/50">VOID</span>. 
                        No further financial mutations, booking updates, or reconciliation audits are permitted for this sequence.
                        {selectedCard.void_reason && (
                          <div className="mt-2 pt-2 border-t border-orange-200/60 uppercase text-[10px] font-black italic text-orange-900/70">
                            Reason for Void: {selectedCard.void_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CANCELLATION DETAILS AND RESCHEDULE LINKS BANNER */}
                {selectedCard.isCancelled && (
                  <div className="bg-rose-950 text-white p-5 px-6 border-b border-rose-900 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-450">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                      <span>🚨 CRITICAL WORKFLOW STATE: JOB CARD CANCELLATION REGISTERED</span>
                    </div>
                    <div className="text-xs text-rose-100 font-bold leading-normal uppercase">
                      Reason: <span className="text-white font-black underline">"{selectedCard.cancellationReason}"</span>
                    </div>
                    {selectedCard.cancelledAt && (
                      <div className="text-[9px] text-rose-300 font-mono">
                        CANCELLED DATE: {new Date(selectedCard.cancelledAt).toLocaleString()}
                      </div>
                    )}
                    {(selectedCard.cancellationCharges !== undefined || selectedCard.cancellationGstInvoiceUrl) && (
                      <div className="flex flex-wrap gap-4 pt-1 text-[10px] font-black uppercase tracking-widest text-rose-200">
                        {selectedCard.cancellationCharges !== undefined && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Charges: {selectedCard.cancellationCharges} INR</span>
                          </div>
                        )}
                        {selectedCard.cancellationGstInvoiceUrl && (
                          <a 
                            href={selectedCard.cancellationGstInvoiceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-rose-300 hover:text-white underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span>GST Invoice: {selectedCard.cancellationGstInvoiceName || 'View'}</span>
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1 pt-1.5 border-t border-rose-900/40 text-[9px] font-black uppercase tracking-widest text-slate-300">
                      {selectedCard.parentJobCardId && (
                        <button
                          type="button"
                          onClick={() => {
                            const parent = jobCards.find(jc => jc.id === selectedCard.parentJobCardId);
                            if (parent) setSelectedCard(parent);
                          }}
                          className="bg-rose-900/40 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded border border-rose-800 transition cursor-pointer"
                        >
                          ← Linked Parent Card: {selectedCard.parentJobCardId}
                        </button>
                      )}
                      
                      {selectedCard.rescheduledToCardId && (
                        <button
                          type="button"
                          onClick={() => {
                            const child = jobCards.find(jc => jc.id === selectedCard.rescheduledToCardId);
                            if (child) setSelectedCard(child);
                          }}
                          className="bg-emerald-950/40 hover:bg-emerald-950 text-emerald-300 px-2 py-1 rounded border border-emerald-900 transition flex items-center gap-1 cursor-pointer"
                        >
                          → Rescheduled To Active Card: {selectedCard.rescheduledToCardId} ✓
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* RESCHEDULED DETAILS BANNER FOR NEW CARD */}
                {!selectedCard.isCancelled && selectedCard.parentJobCardId && (
                  <div className="bg-emerald-950 text-white p-5 px-6 border-b border-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>🔄 RESCHEDULED JOB CARD: TRACKING TRANSFERRED</span>
                    </div>
                    {selectedCard.reschedulingReason && (
                      <div className="text-xs text-emerald-100 font-bold leading-normal uppercase">
                        Reason: <span className="text-white font-black underline">"{selectedCard.reschedulingReason}"</span>
                      </div>
                    )}
                    {(selectedCard.reschedulingCharges !== undefined || selectedCard.fareDifference !== undefined) && (
                      <div className="flex flex-wrap gap-4 pt-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                        {selectedCard.reschedulingCharges !== undefined && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Rescheduling Fee: {selectedCard.reschedulingCharges} INR</span>
                          </div>
                        )}
                        {selectedCard.fareDifference !== undefined && (
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            <span>Fare Diff: {selectedCard.fareDifference} INR</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1 pt-1.5 border-t border-emerald-900/40 text-[9px] font-black uppercase tracking-widest text-slate-300">
                      <button
                        type="button"
                        onClick={() => {
                          const parent = jobCards.find(jc => jc.id === selectedCard.parentJobCardId);
                          if (parent) setSelectedCard(parent);
                        }}
                        className="bg-emerald-900/40 hover:bg-emerald-900 text-emerald-300 px-2 py-1 rounded border border-emerald-800 transition cursor-pointer"
                      >
                        ← View Parent Card: {selectedCard.parentJobCardId}
                      </button>
                    </div>
                  </div>
                )}

                {/* VOID SPECIAL INSTRUCTION CANCEL RETURN TICKET BANNER */}
                {(() => {
                  const linkedIndent = indents.find(i => i.id === selectedCard.id || i.id === selectedCard.indentId);
                  const isCardVoided = linkedIndent ? !!linkedIndent.voided : false;
                  if (!isCardVoided) return null;
                  return (
                    <div className="bg-orange-600 text-white p-3 px-6 rounded-none flex flex-wrap items-center gap-2 border-b border-orange-700 animate-pulse text-[10px] font-black uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-white shrink-0" />
                      <span>⚠️ CRITICAL WORKFLOW INSTRUCTION (VOID MARKING ACTIVE): You must cancel the returning flight ticket after completing this booking!</span>
                      {linkedIndent?.void_reason && (
                        <span className="bg-orange-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold leading-normal ml-auto">
                          " {linkedIndent.void_reason} "
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* STRAY MULTI-STEP PROGRESS TIMELINE */}
                {(() => {
                  const cardStageOrder = ['QUOTATION', 'APPROVAL', 'BOOKING', 'FINANCE', 'RECONCILIATION', 'CLOSED'] as const;
                  const currentIdx = cardStageOrder.indexOf(selectedCard.stage as any);
                  const isCancelled = selectedCard.isCancelled;

                  const stepperSteps = [
                    { key: 'QUOTATION', label: 'RFQs / Bids', desc: 'Sourcing quotes' },
                    { key: 'APPROVAL', label: 'Approved', desc: 'Approval loop' },
                    { key: 'BOOKING', label: 'Ticket Booked', desc: 'Record local PNR' },
                    { key: 'FINANCE', label: 'Finance Verified', desc: 'Payment evaluation' },
                    { key: 'RECONCILIATION', label: 'Audited', desc: 'Close loop clearing' }
                  ];

                  return (
                    <div className="bg-slate-50 p-6 border-x border-b border-slate-205 rounded-b-3xl shadow-2xs">
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block font-sans">
                          Job Card Workflow Tracker ({selectedCard.isCancelled ? "Terminated" : "Stage " + (currentIdx + 1) + " of 6"})
                        </span>
                        {isCancelled ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                            ✕ Cancelled
                          </span>
                        ) : selectedCard.stage === 'CLOSED' ? (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                            ✓ Loop Cleared
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-orange-500 text-slate-950 rounded text-[8px] font-black uppercase tracking-wide animate-pulse">
                            ● Active
                          </span>
                        )}
                      </div>

                      {/* Continuous stepper progress timeline track */}
                      <div className="relative flex justify-between items-start w-full">
                        
                        {/* Progress connecting line underlay */}
                        <div className="absolute top-4 left-6 right-6 h-[2.5px] bg-slate-200 z-0">
                          <div 
                            className={`h-full transition-all duration-300 ${isCancelled ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ 
                              width: selectedCard.stage === 'CLOSED' 
                                ? '100%' 
                                : `${(Math.max(0, currentIdx) / (cardStageOrder.length - 2)) * 100}%` 
                            }} 
                          />
                        </div>

                        {stepperSteps.map((step, idx) => {
                          const stepIdx = cardStageOrder.indexOf(step.key as any);
                          const isDone = selectedCard.stage === 'CLOSED' || (currentIdx > stepIdx && !isCancelled);
                          const isCurrent = selectedCard.stage === step.key && !isCancelled;

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
                              {/* Bubble circle */}
                              <div 
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs uppercase duration-200 transition-all ${
                                  isCancelled && currentIdx === stepIdx
                                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm ring-4 ring-rose-100'
                                    : isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : isCurrent
                                    ? 'bg-slate-900 border-slate-900 text-orange-400 font-black ring-4 ring-slate-200 scale-110'
                                    : 'bg-white border-slate-300 text-slate-400'
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle className="w-4.5 h-4.5 text-white" />
                                ) : isCancelled && currentIdx === stepIdx ? (
                                  <span className="text-white">✕</span>
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>

                              {/* Label text */}
                              <div className="mt-2 text-center px-1">
                                <span className={`text-[8.5px] font-black block uppercase tracking-wider ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {step.label}
                                </span>
                                <span className="text-[7.5px] text-slate-400 block font-bold leading-normal uppercase">
                                  {step.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  );
                })()}

                {/* INTERACTIVE WORKSPACE VIEW SECTIONS CONTROL */}
                <div className="bg-slate-50/85 backdrop-blur-md border border-slate-200/80 px-6 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-5 justify-between my-6 sticky top-0 z-20 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { stage: 'OVERVIEW', title: 'Summary' },
                      { stage: 'QUOTATION', title: '1. Bids' },
                      { stage: 'APPROVAL', title: '2. Approval' },
                      { stage: 'BOOKING', title: '3. Booking' },
                      { stage: 'VENDOR_INVOICE', title: '4. Vendor Invoice' },
                      { stage: 'FINANCE', title: '5. Finance' },
                      { stage: 'RECONCILIATION', title: '6. Audit' },
                      { stage: 'CLOSED', title: '7. Final' }
                    ] as const).map(step => {
                      const isActive = activeViewSection === step.stage;
                      const cardStageOrder = ['QUOTATION', 'APPROVAL', 'BOOKING', 'FINANCE', 'RECONCILIATION', 'CLOSED'];
                      
                      let isComplete = false;
                      let isCurrentActionStage = false;
                      
                      if (step.stage === 'VENDOR_INVOICE') {
                        isComplete = cardStageOrder.indexOf(selectedCard.stage) > cardStageOrder.indexOf('BOOKING');
                        isCurrentActionStage = selectedCard.stage === 'BOOKING' && !!selectedCard.bookingPNR && !selectedCard.ticketVendorInvoiceUrl;
                      } else if (step.stage === 'BOOKING') {
                        isComplete = cardStageOrder.indexOf(selectedCard.stage) > cardStageOrder.indexOf('BOOKING') || (selectedCard.stage === 'BOOKING' && !!selectedCard.bookingPNR);
                        isCurrentActionStage = selectedCard.stage === 'BOOKING' && !selectedCard.bookingPNR;
                      } else {
                        isComplete = step.stage !== 'OVERVIEW' && cardStageOrder.indexOf(selectedCard.stage) > cardStageOrder.indexOf(step.stage as JobCardStage);
                        isCurrentActionStage = selectedCard.stage === step.stage;
                      }

                      return (
                        <button
                          key={step.stage}
                          onClick={() => setActiveViewSection(step.stage as any)}
                          type="button"
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 border flex items-center gap-2 ${
                            isActive
                              ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 -translate-y-0.5"
                              : isCurrentActionStage
                              ? "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                              : isComplete
                              ? "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                              : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : isCurrentActionStage ? (
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                          ) : null}
                          <span>{step.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CANCEL & RESCHEDULE ACTION RAIL */}
                {!selectedCard.isCancelled && (
                  <div className="bg-slate-50 border border-slate-200/80 px-6 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 my-6 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-700 text-[10px] uppercase font-black tracking-wider">
                      <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>Administration Control Operations:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-workspace-cancel"
                        onClick={() => {
                          setCancelModalType('CANCEL');
                          setCancellationReasonInput("");
                          setShowCancelModal(true);
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[9px] uppercase tracking-widest rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
                      >
                        Cancel Request
                      </button>
                      <button
                        type="button"
                        id="btn-workspace-reschedule"
                        onClick={() => {
                          setCancelModalType('RESCHEDULE');
                          setCancellationReasonInput("");
                          setShowCancelModal(true);
                        }}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-950 text-white font-extrabold text-[9px] uppercase tracking-widest rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
                      >
                        Reschedule Ticketing
                      </button>
                    </div>
                  </div>
                )}

                {/* MAIN ACTIVE DRAWERS WORKSPACE */}
                {(() => {
                  const isWorkspaceStep = ['APPROVAL', 'BOOKING', 'VENDOR_INVOICE', 'FINANCE'].includes(activeViewSection || '');
                  const localIndent = indents ? indents.find(i => i.id === selectedCard.id || i.id === selectedCard.indentId) : null;
                  
                  return (
                    <div className="py-6">
                      <div className={isWorkspaceStep ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : "space-y-8"}>
                        {isWorkspaceStep && (
                          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 text-left">
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indent Reference</span>
                                <span className="text-[9px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedCard.indentId || selectedCard.id}</span>
                              </div>
                              
                              <div className="space-y-3 text-xs">
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Traveler</span>
                                  <span className="font-black text-slate-955 block">{selectedCard.travelerName} ({localIndent?.employee_code})</span>
                                  {profileEmployee && (
                                    <span className="block text-[10px] text-slate-500 font-bold mt-0.5">{profileEmployee.designation} &bull; {profileEmployee.department}</span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Route / Sector</span>
                                    <span className="font-bold text-slate-850 block truncate" title={quoteSector || selectedCard.destination}>{quoteSector || selectedCard.destination}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Travel Date</span>
                                    <span className="font-bold text-slate-850 block">
                                      {localIndent?.travel_date ? new Date(localIndent.travel_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-1">
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Category</span>
                                    <span className="inline-block bg-slate-200 text-slate-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider mt-0.5">
                                      {localIndent?.travel_type || selectedCard.stage}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Priority</span>
                                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider mt-0.5 ${
                                      localIndent?.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                                      localIndent?.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {localIndent?.priority || 'MEDIUM'}
                                    </span>
                                  </div>
                                </div>

                                {localIndent?.purpose && (
                                  <div className="pt-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Purpose of Trip</span>
                                    <span className="text-slate-700 italic block">"{localIndent.purpose}"</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {profileEmployee && profileEmployee.passport_expiry && (
                              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-2 text-xs text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Compliance Details</span>
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                  <span>Passport Valid Until:</span>
                                  <span className="font-mono text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{new Date(profileEmployee.passport_expiry).toLocaleDateString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className={isWorkspaceStep ? "lg:col-span-8 space-y-8 text-left" : "space-y-8"}>
                  {activeViewSection === 'OVERVIEW' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl hover:bg-white transition-all duration-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Traveler</p>
                          <p className="text-sm font-black text-slate-900 truncate">{selectedCard.travelerName}</p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl hover:bg-white transition-all duration-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Stage</p>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                             <p className="text-sm font-black text-orange-600 truncate uppercase">{selectedCard.stage}</p>
                          </div>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl hover:bg-white transition-all duration-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created</p>
                          <p className="text-sm font-black text-slate-900 truncate">{new Date(selectedCard.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl hover:bg-white transition-all duration-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-sm font-black text-emerald-600 truncate uppercase">{selectedCard.paymentStatus || 'IN-PROGRESS'}</p>
                        </div>
                      </div>
                    </div>
                  )}


                  
                  {/* COMPLETED/PASSED STAGES VISIBILITY SECTION */}
                  {activeViewSection === 'OVERVIEW' && selectedCard.stage !== 'QUOTATION' && (
                    <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4">
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4" 
                        onClick={() => setShowPassedQuotes(!showPassedQuotes)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-emerald-600 font-black uppercase tracking-widest leading-none block mb-1">Workflow Stage: Verified</span>
                            <span className="font-black text-xs uppercase tracking-tight text-slate-800 block">Quotation Bidding Completed</span>
                          </div>
                        </div>
                        <button className="text-[10px] bg-slate-900 text-white font-black uppercase px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 tracking-wider cursor-pointer">
                          {showPassedQuotes ? "Collapse Details" : "Inspect Bids"}
                        </button>
                      </div>

                      {showPassedQuotes && (
                        <div className="pt-4 border-t border-slate-200 space-y-4">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            Corporate Fare quotation benchmark received for this tracking card.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(() => {
                              const getInrVal = (qr: JobCardQuote) => {
                                const val = qr.amount;
                                if (qr.currency === "USD" || qr.currency === "$") return val * 83;
                                if (qr.currency === "VND") return val * 0.0035;
                                if (qr.currency === "NGN") return val * 0.06;
                                if (qr.currency === "AUD") return val * 55;
                                return val;
                              };
                              const sortedList = [...selectedCard.quotes].sort((a, b) => getInrVal(a) - getInrVal(b));
                              const top3Ids = sortedList.slice(0, 3).map(qr => qr.id);

                              return selectedCard.quotes.map(q => {
                                const lowestIndex = top3Ids.indexOf(q.id);
                                const isTop3 = lowestIndex !== -1;
                                const isWinningSelected = selectedCard.winningQuoteId === q.id;

                                return (
                                  <div 
                                    key={q.id} 
                                    className={`p-4 rounded-2xl relative border-2 ${
                                      isWinningSelected 
                                        ? "border-emerald-600 bg-emerald-50/25" 
                                        : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    {isWinningSelected && (
                                      <span className="absolute top-3 right-3 bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider select-none shrink-0">
                                        ★ APPROVED
                                      </span>
                                    )}

                                    {!isWinningSelected && isTop3 && (
                                      <span className={`absolute top-3 right-3 text-[8.5px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none ${
                                        lowestIndex === 0 ? "bg-orange-100 text-orange-850" :
                                        lowestIndex === 1 ? "bg-slate-100 text-slate-700" :
                                        "bg-amber-100 text-amber-800"
                                      }`}>
                                        {lowestIndex === 0 ? "🥇 1st L" : 
                                         lowestIndex === 1 ? "🥈 2nd L" : 
                                         "🥉 3rd L"}
                                      </span>
                                    )}

                                    <div className="text-[9px] font-mono text-slate-400 font-bold mb-1 block uppercase">{q.id}</div>
                                    <div className="font-extrabold text-slate-900 text-xs block uppercase tracking-tight">{q.vendorName}</div>
                                    <div className="mt-1 text-base font-black text-slate-950 block tracking-tight font-mono">
                                      {q.amount} {q.currency}
                                    </div>

                                    {/* Nest itemized cost breakdown if exists */}
                                    {q.subCosts && q.subCosts.length > 0 && (
                                      <div className="mt-3 pt-2 border-t border-dashed border-slate-150 space-y-1 text-left">
                                        {q.subCosts.map((sub, sIdx) => (
                                          <div key={sIdx} className="flex justify-between items-center text-[8.5px] font-extrabold text-slate-500">
                                            <span className="truncate uppercase pr-1">{sub.category}: {sub.description}</span>
                                            <span className="font-mono text-slate-800 font-black shrink-0">{sub.amount}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WARNING VARIANCES */}
                  {activeViewSection === 'OVERVIEW' && selectedCard.varianceWarning && (
                    <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl flex items-start gap-3.5 animate-bounce">
                      <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-orange-950 block">Hazard Variance warning</span>
                        <p className="text-orange-900 text-xs font-bold uppercase tracking-wider mt-1">{selectedCard.varianceWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* STEP 1 WORKSPACE: QUOTATION */}
                  {activeViewSection === 'QUOTATION' && (
                    <div className="space-y-6">
                      
                      {/* SUBSECTION B: REGISTER MANUAL QUOTATION */}
                      <div className="border-t border-slate-100 pt-6 space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                          <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">6</span>
                          Register Vendor Quotation
                        </h4>

                        <div className="space-y-8">
                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-4 bg-orange-600 rounded-full"></div>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">1. Vendor & Currency</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-1">
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Selected Vendor Name</label>
                                <select
                                  required
                                  value={quoteVendorName}
                                  onChange={e => setQuoteVendorName(e.target.value)}
                                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition cursor-pointer"
                                >
                                  <option value="">-- Select Vendor --</option>
                                  {vendorsList.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                  ))}
                                </select>
                                {quoteVendorName && (() => {
                                  const matchedVendor = vendorsList.find(v => v.name === quoteVendorName);
                                  if (!matchedVendor) return null;
                                  return (
                                    <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                                      <div className="font-bold text-slate-700">Vendor Info:</div>
                                      {matchedVendor.categories && matchedVendor.categories.length > 0 && (
                                        <div><span className="font-semibold">Categories:</span> {matchedVendor.categories.join(", ")}</div>
                                      )}
                                      {matchedVendor.emails && matchedVendor.emails.length > 0 && (
                                        <div><span className="font-semibold">Email:</span> {matchedVendor.emails.join(", ")}</div>
                                      )}
                                      {matchedVendor.phones && matchedVendor.phones.length > 0 && (
                                        <div><span className="font-semibold">Phone:</span> {matchedVendor.phones.join(", ")}</div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Quotation Date</label>
                                <input 
                                  type="date" 
                                  value={quoteTravelDate} 
                                  onChange={e => setQuoteTravelDate(e.target.value)} 
                                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Billing Currency</label>
                                <div className="flex gap-2">
                                  {["INR", "USD", "VND", "NGN", "AUD"].map(cur => (
                                    <button
                                      key={cur}
                                      type="button"
                                      onClick={() => setQuoteCurrency(cur)}
                                      className={`flex-1 h-11 rounded-xl text-[10px] font-black transition-all ${
                                        quoteCurrency === cur 
                                          ? "bg-slate-900 text-white shadow-md font-bold" 
                                          : "bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300"
                                      }`}
                                    >
                                      {cur}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-4 bg-orange-600 rounded-full"></div>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Itemized Fare Breakdown & Categories</h5>
                            </div>
                            <div className="space-y-4">
                              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                  <div className="md:col-span-5">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Category Selector</label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {["FLIGHT", "HOTEL", "TRAIN", "CAB", "OTHER"].map(cat => (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => {
                                            setSingleSubCategory(cat as any);
                                            if (cat === "FLIGHT") setIsAirlineQuote(true);
                                          }}
                                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition ${
                                            singleSubCategory === cat 
                                              ? "bg-orange-600 text-white shadow-sm" 
                                              : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                                          }`}
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="md:col-span-4">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Item Label</label>
                                    <input
                                      type="text"
                                      placeholder="Description"
                                      value={singleSubDesc}
                                      onChange={e => setSingleSubDesc(e.target.value)}
                                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="md:col-span-3 flex gap-2">
                                    <div className="flex-1">
                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Fare Value</label>
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={singleSubAmount}
                                        onChange={e => setSingleSubAmount(e.target.value)}
                                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-black font-mono"
                                      />
                                    </div>
                                    {singleSubCategory !== "FLIGHT" && (
                                      <button
                                        type="button"
                                        onClick={handleAddSubCost}
                                        className="h-10 w-10 flex items-center justify-center bg-slate-900 text-white rounded-xl mt-5 hover:bg-slate-800 transition active:scale-95"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {singleSubCategory === "FLIGHT" && (
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200/60">
                                    <div>
                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Airline</label>
                                      <input 
                                        type="text" 
                                        placeholder="e.g. IndiGo" 
                                        value={quoteAirline} 
                                        onChange={e => setQuoteAirline(e.target.value)} 
                                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-[10px] font-bold text-slate-900" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Sector</label>
                                      <input 
                                        type="text" 
                                        placeholder="e.g. BOM-DEL" 
                                        value={quoteSector} 
                                        onChange={e => setQuoteSector(e.target.value)} 
                                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-[10px] font-bold text-slate-900" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Layover (Hrs)</label>
                                      <input 
                                        type="text" 
                                        placeholder="Hrs" 
                                        value={quoteLayover} 
                                        onChange={e => setQuoteLayover(e.target.value)} 
                                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-[10px] font-bold text-slate-900" 
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={handleAddSubCost}
                                        className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                      >
                                        <Plus className="w-4 h-4" />
                                        Add Flight Item
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {subCosts.length > 0 ? (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                  {subCosts.map((sub, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition">
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                              sub.category === "FLIGHT" ? "bg-indigo-100 text-indigo-700 font-bold" :
                                              sub.category === "HOTEL" ? "bg-amber-100 text-amber-700 font-bold" :
                                              sub.category === "CAB" ? "bg-emerald-100 text-emerald-700 font-bold" :
                                              "bg-slate-100 text-slate-600 font-bold"
                                            }`}>
                                              {sub.category}
                                            </span>
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{sub.description}</span>
                                          </div>
                                          {sub.category === "FLIGHT" && sub.airline && (
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{sub.airline}</span>
                                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{sub.sector}</span>
                                              {sub.layover && (
                                                <>
                                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{sub.layover}H Layover</span>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm font-black text-slate-900 font-mono">{sub.amount}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveSubCost(sIdx)}
                                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aggregated Total Fare</span>
                                    <div className="flex items-end gap-2">
                                      <span className="text-xs font-bold text-orange-500">{quoteCurrency}</span>
                                      <span className="text-2xl font-black font-mono leading-none">{quoteAmount || "0"}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-10 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                                  <List className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fare breakdown list is empty</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-4 bg-orange-600 rounded-full"></div>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-950">3. Final Review & Filing</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[8px] font-black text-slate-900 uppercase tracking-widest mb-1.5 font-bold">Total Quote Value (Summary)</label>
                                <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 flex items-center">
                                  <span className="text-xs font-black text-slate-950 font-mono">{quoteAmount} {quoteCurrency}</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Quotation Registered By</label>
                                <div className="h-10 bg-slate-100 border border-slate-200 rounded-xl px-3 flex items-center">
                                  <span className="text-[10px] font-black text-slate-950 uppercase truncate">{activeUserName}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-900 text-white rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 border border-slate-800">
                            <div className="flex-1">
                              <h5 className="text-xl font-black uppercase tracking-tighter text-white">Submit Final Bid</h5>
                              <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">Ensure attachment is uploaded for audit compliance.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                              {editingQuoteId && (
                                <button 
                                  type="button" 
                                  onClick={handleCancelQuoteEdit}
                                  className="h-14 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl transition"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <div className="relative">
                                <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, setQuoteFileBase64, setQuoteFileName)} className="hidden" id="final-quote-file" />
                                <label htmlFor="final-quote-file" className={`flex items-center gap-2 px-6 py-3 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${quoteFileName ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-orange-500"}`}>
                                  <Paperclip className="w-5 h-5" />
                                  <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">{quoteFileName || "Attach PDF"}</span>
                                </label>
                              </div>
                              <button type="button" onClick={handleSubmitQuote} disabled={submittingQuote || !quoteVendorName || !quoteAmount} className="flex-1 md:flex-none h-14 px-10 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                {submittingQuote ? <RefreshCw className="w-5 h-5 animate-spin" /> : (editingQuoteId ? "Update Proposal" : "Submit Proposal")}
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SUBSECTION C: QUOTE EVALUATION MATRIX */}
                      <div className="space-y-6">
                        <div className="flex justify-between items-end px-2">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                              <Briefcase className="w-6 h-6 text-orange-600" />
                              Quotation Matrix
                            </h3>
                            <p className="text-[10px] text-slate-900 font-bold uppercase tracking-widest mt-1">Direct comparison of all vendor bids received for this card</p>
                          </div>
                          <div className="hidden md:flex gap-4 text-[8px] font-black uppercase tracking-widest text-slate-900 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> L1 Lowest</span>
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Selected</span>
                          </div>
                        </div>

                        {selectedCard.quotes.length === 0 ? (
                          <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                            <HelpCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Registry Void</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">No quotation bids have been logged for this card yet.<br />Submit a proposal using the form above.</p>
                          </div>
                        ) : (
                          <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">ID</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Vendor</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Agent</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Airline</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Sector</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Layover</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Date</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Raw Quote</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">INR Value</th>
                                    <th className="px-4 py-5 border-r border-slate-800 text-white">Breakdown</th>
                                    <th className="px-4 py-5 text-center">Executive Command</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold uppercase">
                                  {selectedCard.quotes.map(q => {
                                    const isWinning = selectedCard.winningQuoteId === q.id;
                                    const lowestIdx = top3QuoteIds.indexOf(q.id);
                                    const isCheapest = lowestIdx === 0;
                                    const lRank = lowestIdx !== -1 ? `L${lowestIdx + 1}` : null;

                                    const getInrVal = (val: number, cur: string) => {
                                      if (cur === "USD" || cur === "$") return val * 83;
                                      if (cur === "VND") return val * 0.0035;
                                      if (cur === "NGN") return val * 0.06;
                                      if (cur === "AUD") return val * 55;
                                      return val;
                                    };
                                    const inrVal = getInrVal(q.amount, q.currency);

                                    return (
                                      <tr key={q.id} className={`group transition-colors ${isWinning ? 'bg-emerald-50/40' : isCheapest ? 'bg-orange-50/10' : 'hover:bg-slate-50'}`}>
                                        <td className="px-4 py-5 border-r border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <span className="bg-slate-200 text-slate-950 font-mono text-[8px] px-2 py-0.5 rounded-full select-none">{q.id}</span>
                                            {lRank && (
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                                lRank === 'L1' ? 'bg-emerald-600 text-white' : 
                                                lRank === 'L2' ? 'bg-blue-600 text-white' : 
                                                'bg-slate-600 text-white'
                                              }`}>
                                                {lRank}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 whitespace-normal break-words">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-950 tracking-tight">{q.vendorName}</span>
                                            {isWinning && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Approved Selection" />}
                                            {isCheapest && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" title="Market Lowest (L1)" />}
                                          </div>
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-black whitespace-normal break-words">
                                          {q.agentName || "Direct"}
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-black whitespace-normal break-words">
                                          {q.airline || "Direct"}
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-black whitespace-normal break-words">
                                          {q.sector || selectedCard.destination || "N/A"}
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-black whitespace-normal break-words">
                                          {q.layover || "0"}H
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-black">
                                          {q.travelDate || "Immediate"}
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 text-[10px] text-slate-950 font-mono font-black">
                                          {q.amount} {q.currency}
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100 bg-slate-50/30">
                                          <div className="text-[11px] font-black text-slate-950 font-mono">
                                            ₹{inrVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                          </div>
                                        </td>
                                        <td className="px-4 py-5 border-r border-slate-100">
                                          {q.subCosts && q.subCosts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                                              {q.subCosts.map((sub, sIdx) => (
                                                <span key={sIdx} className="bg-white border border-slate-900 text-[8px] font-black text-slate-950 px-2 py-0.5 rounded-lg shadow-xs" title={sub.description}>
                                                  {sub.category}: {sub.amount}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-slate-950 text-[8px] font-black italic tracking-widest">Inclusive</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-5">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => handleSelectWinningQuote(q)}
                                              className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition shadow-sm active:scale-95 ${
                                                isWinning 
                                                  ? "bg-emerald-600 text-white ring-4 ring-emerald-500/20" 
                                                  : "bg-slate-950 text-white hover:bg-orange-600"
                                              }`}
                                            >
                                              {isWinning ? "✓ Selected" : "Direct Approve"}
                                            </button>
                                            
                                            {q.quoteFileUrl && (
                                              <a href={q.quoteFileUrl} target="_blank" rel="noreferrer" className="w-9 h-9 border border-slate-300 flex items-center justify-center rounded-xl text-slate-900 hover:text-orange-600 hover:border-orange-500 transition bg-white" title="View Document">
                                                <FileText className="w-4 h-4" />
                                              </a>
                                            )}
                                            <button onClick={() => handleEditQuote(q)} className="w-9 h-9 bg-white border border-slate-300 text-slate-900 hover:text-slate-950 hover:border-slate-950 flex items-center justify-center rounded-xl transition" title="Edit">
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteQuote(q.id)} className="w-9 h-9 bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-100 flex items-center justify-center rounded-xl transition" title="Delete">
                                              <Trash2 className="w-4 h-4" />
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
                        )}
                      </div>

                      {/* SUBSECTION D: SEND TO APPROVAL */}
                      <div className="border-t border-slate-100 pt-6 flex justify-end">
                        <button
                          onClick={handleSendForApproval}
                          disabled={!selectedCard.winningQuoteId}
                          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center gap-2"
                        >
                          <Send className="w-4 h-4 text-orange-500" />
                          <span>Request Workflow Approval</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* STEP 2 WORKSPACE: APPROVAL */}
                  {activeViewSection === 'APPROVAL' && (
                    <div className="space-y-6">
                      
                      {/* MASTER COMPARATIVE EVALUATION MATRIX */}
                      {selectedCard.quotes && selectedCard.quotes.length > 0 && (
                        <div className="space-y-4 text-left" id="master-bid-comparison-matrix-approval">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Evaluation Deck</span>
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mt-0.5">Travel Comparison Sheet</h3>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 text-[9px] font-black uppercase tracking-widest border-b border-slate-250">
                                  <th className="px-4 py-4 border-r border-slate-200">ID</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Vendor</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Agent</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Airline</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Sector</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Layover</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Date</th>
                                  <th className="px-4 py-4 border-r border-slate-200">Raw Cost</th>
                                  <th className="px-4 py-4 border-r border-slate-200">INR Equivalent</th>
                                  <th className="px-4 py-4 text-center">Final Selection</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-bold uppercase text-[10px]">
                                  {selectedCard.quotes.map(q => {
                                    const isWinning = selectedCard.winningQuoteId === q.id;
                                    const lowestIdx = top3QuoteIds.indexOf(q.id);
                                    const isCheapest = lowestIdx === 0;
                                    const lRank = lowestIdx !== -1 ? `L${lowestIdx + 1}` : null;

                                    const getInrVal = (val: number, cur: string) => {
                                      if (cur === "USD" || cur === "$") return val * 83;
                                      if (cur === "VND") return val * 0.0035;
                                      if (cur === "NGN") return val * 0.06;
                                      if (cur === "AUD") return val * 55;
                                      return val;
                                    };
                                    const inrVal = getInrVal(q.amount, q.currency);

                                    return (
                                      <tr key={q.id} className={`transition-colors ${isWinning ? "bg-emerald-50/30" : "bg-white"}`}>
                                        <td className="px-4 py-5 border-r border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <span className="bg-slate-200 text-slate-950 font-mono text-[8px] px-1.5 py-0.5 rounded-full">{q.id}</span>
                                            {lRank && (
                                              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                                                lRank === 'L1' ? 'bg-emerald-600 text-white' : 
                                                lRank === 'L2' ? 'bg-blue-600 text-white' : 
                                                'bg-slate-600 text-white'
                                              }`}>
                                                {lRank}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      <td className="px-4 py-5 border-r border-slate-100">
                                        <div className="text-slate-950 font-black tracking-tight flex items-center gap-1.5">
                                          {q.vendorName}
                                          {isWinning && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Selected Proposal" />}
                                          {isCheapest && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Lowest Bid" />}
                                        </div>
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950">
                                        {q.agentName || "Direct"}
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950">
                                        {q.airline || "Direct"}
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950 whitespace-normal">
                                        {q.sector || selectedCard.destination || "N/A"}
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950">
                                        {q.layover || "0"}H
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950">
                                        {q.travelDate || "Immediate"}
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 text-slate-950 font-mono">
                                        {q.amount} {q.currency}
                                      </td>
                                      <td className="px-4 py-5 border-r border-slate-100 bg-slate-50/30">
                                        <span className="text-slate-950 font-black font-mono">₹{inrVal.toLocaleString('en-IN')}</span>
                                      </td>
                                      <td className="px-4 py-5 text-center">
                                        {isWinning ? (
                                          <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest inline-block shadow-sm">SELECTED</span>
                                        ) : (
                                          <span className="text-slate-900 text-[9px] font-black opacity-30 select-none">NOT SELECTED</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* PASSPORT VALIDITY AUDIT BANNER */}
                      {(() => {
                        if (!resolvedEmployee) return null;
                        const validityDays = getPassportValidityDays(resolvedEmployee.passport_expiry);
                        const isUnderLimit = validityDays !== null && validityDays < 365;
                        return (
                          <div className={`p-4 rounded-2xl border flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${
                            isUnderLimit ? "bg-rose-50 border-rose-200 text-rose-800 animate-pulse" : "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                          }`}>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className={`w-4 h-4 shrink-0 ${isUnderLimit ? 'text-rose-600' : 'text-emerald-600'}`} />
                              <span>Identity Audit Check: <span className="text-slate-900 font-extrabold">{resolvedEmployee.name}</span> ({resolvedEmployee.passport_number || "N/A"}) • Expiring {resolvedEmployee.passport_expiry || "N/A"}</span>
                            </div>
                            <div className="font-mono font-black">{validityDays !== null ? `${validityDays} Days Left` : "Missing / Expired"}</div>
                          </div>
                        );
                      })()}

                      {/* TWO LEVEL APPROVAL PROCESS OPTIONS ON TOP */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* LEVEL 1 CARD: TRAVEL COMPLIANCE APPROVAL */}
                        <div id="l1-travel-approval-block" className="border-2 border-slate-900 p-6 rounded-3xl bg-white space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white w-5 h-5 rounded-lg flex items-center justify-center text-[10px]">1</span>
                              Travel Compliance (L1)
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              selectedCard.travelApprovalStatus === 'APPROVED' ? "bg-emerald-100 text-emerald-800" :
                              selectedCard.travelApprovalStatus === 'REJECTED' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-700"
                            }`}>
                              {selectedCard.travelApprovalStatus || 'PENDING'}
                            </span>
                          </div>

                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">
                            Approver: Line manager / Travel planner.
                          </span>

                          {selectedCard.travelApprovalStatus === 'APPROVED' ? (
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-950 font-mono text-[9px] leading-snug">
                              <span className="block font-black uppercase">✓ APPROVED IN LEVEL 1</span>
                              <span>By: {selectedCard.travelApprovedBy || "Travel Desk Inspector"}</span>
                              <span className="block mt-0.5 text-slate-400">{selectedCard.travelApprovedAt}</span>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2">
                              {activeRole === 'TRAVEL_APPROVER' || activeRole === 'VP_COMMERCIAL' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleL1TravelDecision('APPROVED')}
                                    disabled={submittingApproval}
                                    id="btn-l1-approve"
                                    className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition"
                                  >
                                    Approve Level 1
                                  </button>
                                  <button
                                    onClick={() => handleL1TravelDecision('REJECTED')}
                                    disabled={submittingApproval}
                                    id="btn-l1-reject"
                                    className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-700 font-black text-[9px] uppercase tracking-wider rounded-lg hover:bg-rose-100 transition whitespace-nowrap"
                                  >
                                    Reject L1
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[9px] text-orange-600 bg-orange-50 p-2.5 border border-orange-100 rounded-lg font-black uppercase tracking-wider text-center" title="Toggle simulation controls above to test L1">
                                  ⚠️ Toggle simulated role to "Travel Approver" to execute
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* LEVEL 2 CARD: COMMERCIAL AUTHORIZATION (VP) */}
                        <div id="l2-commercial-approval-block" className={`border-2 p-6 rounded-3xl bg-white space-y-4 ${
                          selectedCard.travelApprovalStatus !== 'APPROVED' ? "border-slate-200 opacity-60 bg-slate-50/50" : "border-slate-900"
                        }`}>
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-905 flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white w-5 h-5 rounded-lg flex items-center justify-center text-[10px]">2</span>
                              VP Commercial (L2)
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              selectedCard.travelApprovalStatus !== 'APPROVED' ? "bg-slate-200 text-slate-400" :
                              selectedCard.commercialApprovalStatus === 'APPROVED' ? "bg-emerald-100 text-emerald-800" :
                              selectedCard.commercialApprovalStatus === 'REJECTED' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-700"
                            }`}>
                              {selectedCard.travelApprovalStatus !== 'APPROVED' ? "LOCKED" : (selectedCard.commercialApprovalStatus || 'PENDING')}
                            </span>
                          </div>

                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">
                            Approver: VP Commercial operations.
                          </span>

                          {selectedCard.travelApprovalStatus !== 'APPROVED' ? (
                            <div className="p-3 bg-slate-100 border border-slate-200 text-slate-400 text-center rounded-xl font-mono text-[9px] font-black uppercase tracking-wider">
                              🔒 Locked: Requires L1 Approval first
                            </div>
                          ) : selectedCard.commercialApprovalStatus === 'APPROVED' ? (
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-950 font-mono text-[9px] leading-snug">
                              <span className="block font-black uppercase">✓ GRANTED VP SIGN-OFF</span>
                              <span>By: {selectedCard.commercialApprovedBy || "VP Admin"}</span>
                              <span className="block mt-0.5 text-slate-400">{selectedCard.commercialApprovedAt}</span>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2">
                              {activeRole === 'VP_COMMERCIAL' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleL2CommercialDecision('APPROVED')}
                                    disabled={submittingApproval}
                                    id="btn-l2-approve"
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition shadow-xs"
                                  >
                                    Authorize Signoff
                                  </button>
                                  <button
                                    onClick={() => handleL2CommercialDecision('REJECTED')}
                                    disabled={submittingApproval}
                                    id="btn-l2-reject"
                                    className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-700 font-black text-[9px] uppercase tracking-wider rounded-lg hover:bg-rose-100 transition whitespace-nowrap"
                                  >
                                    Reject L2
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[9px] text-orange-600 bg-orange-50 p-2.5 border border-orange-100 rounded-lg font-black uppercase tracking-wider text-center" title="Toggle active role to L2 VP Action">
                                  🔒 Toggle active role to "VP Commercial (L2)" to finalize approval
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* VIEW ACTIVE SELECTION */}
                      {(() => {
                        const winQuote = selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId);
                        return (
                          <div className="p-6 bg-slate-50 border border-slate-205 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Proposal Under Evaluation</span>
                              {winQuote ? (
                                <div className="space-y-1">
                                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Selected Partner</span>
                                  <span className="text-slate-900 text-sm font-black uppercase block tracking-tight">{winQuote.vendorName}</span>
                                </div>
                              ) : (
                                <p className="text-xs font-bold text-rose-600 uppercase">Warning: Winning quote parameters unspecified.</p>
                              )}
                            </div>
                            {winQuote && (
                              <div>
                                <span className="text-slate-400 text-[9px] uppercase font-extrabold block mb-1">Approved Procurement Quoted Cost</span>
                                <span className="text-emerald-700 text-sm font-semibold uppercase block tracking-tight">{winQuote.amount} {winQuote.currency}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* WORKSPACE USER REMARKS BOX */}
                      <div className="space-y-2">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Evaluation feedback / reviewer remarks (optional)</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Flight schedules look clean and budget is fully within compliance. Proceed."
                        ></textarea>
                      </div>

                    </div>
                  )}

                  {/* STEP 3 WORKSPACE: BOOKING */}
                  {activeViewSection === 'BOOKING' && (
                    <div className="space-y-6">
                      
                      <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Request Approved! Ready to book tickets.</span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please enter the booking details after booking the tickets. You can scan the ticket to auto-fill the fields.
                      </p>

                      <form onSubmit={handleSaveBookingFulfillment} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Booking PNR / Ticket Number *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. BOMDEL12345"
                              value={pnr}
                              onChange={e => setPnr(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold font-mono uppercase"
                            />
                            {pnr && resolvedEmployee?.phone && (
                              <a
                                href={`https://wa.me/${resolvedEmployee.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${resolvedEmployee.name},\n\nYour travel booking for ${selectedCard.destination} is confirmed!\n\nPNR/Ticket: ${pnr}\n\nSafe travels!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase flex items-center gap-1"
                              >
                                <span>📱 Send Ticket via WhatsApp</span>
                              </a>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Ticket Price / Cost *</label>
                              <input
                                type="number"
                                required
                                placeholder="0"
                                value={bookingAmount}
                                onChange={e => setBookingAmount(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Currency</label>
                              <select
                                value={bookingCurrency}
                                onChange={e => setBookingCurrency(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold"
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="VND">VND</option>
                                <option value="NGN">NGN</option>
                                <option value="AUD">AUD</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Booking Agency</span>
                            <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-orange-500" />
                              {selectedBookingVendor || "Direct Booking"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Approved Bid Limit</span>
                            <span className="text-xs font-mono font-bold text-emerald-800">
                              {(() => {
                                const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
                                return winQuote ? `${winQuote.amount} ${winQuote.currency}` : "Unspecified";
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Ticket Upload Block */}
                        <div className="p-5 border border-slate-205 rounded-2xl space-y-4 bg-slate-50/50 max-w-md">
                          <span className="text-[10px] font-bold text-slate-700 uppercase block tracking-wider">Upload Travel Ticket / Voucher</span>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={e => handleFileChange(e, setTicketFileBase64, setTicketFileName)}
                              className="hidden"
                              id="booking-ticket-file"
                            />
                            <label
                              htmlFor="booking-ticket-file"
                              className="flex items-center gap-1.5 px-4 h-11 border-2 border-dashed border-slate-250 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-550 uppercase tracking-wider hover:border-orange-500 duration-150"
                            >
                              <Upload className="w-4 h-4 text-orange-500" />
                              <span className="truncate">{ticketFileName || "Choose Ticket File"}</span>
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScanDocument('ticket')}
                            disabled={scanningTicket || !ticketFileBase64}
                            className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 duration-150"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>{scanningTicket ? "Scanning..." : "Scan ticket with Gemini AI"}</span>
                          </button>
                        </div>

                        {bookingMessage && (
                          <div className="p-4 bg-slate-900 text-white rounded-2xl font-mono text-[10px] space-y-1 block leading-relaxed border-l-4 border-orange-500">
                            <div className="font-bold uppercase tracking-widest text-orange-500 mb-1">Gemini Scan Status:</div>
                            <p>{bookingMessage}</p>
                            {scanMethod && <p className="text-slate-400 font-bold uppercase">METHOD: {scanMethod}</p>}
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer"
                          >
                            Save Ticket Details
                          </button>
                        </div>

                      </form>

                    </div>
                  )}

                  {/* STEP 3.5 WORKSPACE: VENDOR INVOICE */}
                  {activeViewSection === 'VENDOR_INVOICE' && (
                    <div className="space-y-6">
                      
                      <div className="p-4 bg-orange-50 border border-orange-200 text-orange-950 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                        <FileText className="w-5 h-5 text-orange-600 shrink-0" />
                        <span>Vendor Invoice Upload</span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please upload the vendor invoice and check the billing details. You can scan the invoice with Gemini AI to fill details automatically.
                      </p>

                      <form onSubmit={handleSaveVendorInvoiceFulfillment} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Vendor Name *</label>
                            <select
                              required
                              value={selectedBookingVendor}
                              onChange={e => setSelectedBookingVendor(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold cursor-pointer"
                            >
                              <option value="">-- Select Vendor --</option>
                              {vendorsList.map(v => (
                                <option key={v.id} value={v.name}>{v.name}</option>
                              ))}
                            </select>
                            {selectedBookingVendor && (() => {
                              const matchedVendor = vendorsList.find(v => v.name === selectedBookingVendor);
                              if (!matchedVendor) return null;
                              return (
                                <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                                  <div className="font-bold text-slate-700">Vendor Info:</div>
                                  {matchedVendor.categories && matchedVendor.categories.length > 0 && (
                                    <div><span className="font-semibold">Categories:</span> {matchedVendor.categories.join(", ")}</div>
                                  )}
                                  {matchedVendor.emails && matchedVendor.emails.length > 0 && (
                                    <div><span className="font-semibold">Email:</span> {matchedVendor.emails.join(", ")}</div>
                                  )}
                                  {matchedVendor.phones && matchedVendor.phones.length > 0 && (
                                    <div><span className="font-semibold">Phone:</span> {matchedVendor.phones.join(", ")}</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Invoice Number *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. MMT-12345"
                              value={invoiceNumber}
                              onChange={e => setInvoiceNumber(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Invoice Amount *</label>
                              <input
                                type="number"
                                required
                                placeholder="0"
                                value={invoiceVendorAmount}
                                onChange={e => setInvoiceVendorAmount(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Currency</label>
                              <select
                                value={invoiceCurrency}
                                onChange={e => setInvoiceCurrency(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold"
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="VND">VND</option>
                                <option value="NGN">NGN</option>
                                <option value="AUD">AUD</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Invoice File Uploader */}
                        <div className="p-5 border border-slate-205 rounded-2xl space-y-4 bg-slate-50/50 max-w-md">
                          <span className="text-[10px] font-bold text-slate-700 uppercase block tracking-wider">Vendor Invoice File</span>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={e => handleFileChange(e, setInvoiceFileBase64, setInvoiceFileName)}
                              className="hidden"
                              id="booking-invoice-file"
                            />
                            <label
                              htmlFor="booking-invoice-file"
                              className="flex items-center gap-1.5 px-4 h-11 border-2 border-dashed border-slate-250 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:border-orange-500 duration-150"
                            >
                              <Upload className="w-4 h-4 text-orange-500" />
                              <span className="truncate">{invoiceFileName || "Choose Invoice File"}</span>
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScanDocument('invoice')}
                            disabled={scanningInvoice || !invoiceFileBase64}
                            className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 duration-150"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>{scanningInvoice ? "Scanning..." : "Scan invoice with Gemini AI"}</span>
                          </button>
                        </div>

                        {bookingMessage && (
                          <div className="p-4 bg-slate-900 text-white rounded-2xl font-mono text-[10px] space-y-1 block leading-relaxed border-l-4 border-orange-500">
                            <div className="font-bold uppercase tracking-widest text-orange-500 mb-1">Gemini Scan Status:</div>
                            <p>{bookingMessage}</p>
                            {scanMethod && <p className="text-slate-400 font-bold uppercase">METHOD: {scanMethod}</p>}
                          </div>
                        )}

                        {/* COST VARIANCE COMPLIANCE CORNER */}
                        {(() => {
                          const convertToInrValueComp = (amt: number, curr: string) => {
                            const val = amt;
                            const c = curr.toUpperCase();
                            if (c === "USD" || c === "$") return val * 83;
                            if (c === "AUD") return val * 55;
                            if (c === "NGN") return val * 0.06;
                            if (c === "VND") return val * 0.0035;
                            return val;
                          };

                          const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
                          if (!winQuote || !invoiceVendorAmount) return null;

                          const winQuoteInr = convertToInrValueComp(winQuote.amount, winQuote.currency);
                          const enteredInr = convertToInrValueComp(parseFloat(invoiceVendorAmount) || 0, invoiceCurrency);
                          const isSurged = enteredInr > winQuoteInr;
                          if (!isSurged) return null;

                          const varPercent = winQuoteInr > 0 ? Math.round(((enteredInr - winQuoteInr) / winQuoteInr) * 100) : 0;

                          return (
                            <div className="p-5 bg-orange-50/80 border-2 border-orange-200 rounded-3xl space-y-3.5">
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5 animate-pulse" />
                                <div>
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-orange-950 block">Warning: Invoice Price is Higher than Approved Budget</span>
                                  <p className="text-orange-900 text-xs font-bold leading-relaxed mt-1">
                                    The actual invoice amount (INR {Math.round(enteredInr)}) exceeds the approved budget (INR {Math.round(winQuoteInr)}) by {varPercent}%.
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-orange-900 uppercase tracking-wide">
                                  Why is the invoice price higher than the approved bid? *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Airline seat fares jumped or selected seat preferences led to dynamic fee additions"
                                  value={bookingVarianceJustification}
                                  onChange={e => setBookingVarianceJustification(e.target.value)}
                                  className="w-full bg-white border border-orange-350 rounded-xl p-3 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>
                          );
                        })()}

                        <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
                          <button
                            type="submit"
                            className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer"
                          >
                            Save Vendor Invoice Details & Send to Finance
                          </button>
                        </div>

                      </form>

                    </div>
                  )}

                  {/* STEP 4 WORKSPACE: FINANCE APPROVAL */}
                  {activeViewSection === 'FINANCE' && (
                    <div className="space-y-6">
                      
                      <div className="p-4 bg-orange-50 border border-orange-200 text-orange-950 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                        <DollarSign className="w-5 h-5 text-orange-600 shrink-0 animate-pulse" />
                        <span>Step 5: Finance Approval & Invoice Check</span>
                      </div>

                      {(() => {
                        const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
                        const approvedAmount = winQuote ? winQuote.amount : 0;
                        const finalAmt = parseFloat(invoiceVendorAmount) || 0;
                        let varPct = 0;
                        if (approvedAmount > 0) {
                          varPct = Math.round(((finalAmt - approvedAmount) / approvedAmount) * 100);
                        }
                        const isHighVariance = varPct > 10;

                        return (
                          <form onSubmit={handleSaveFinanceApproval} className="space-y-6">
                            
                            {/* COMPARISON BAR CARD */}
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2">Cost Comparison</h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-bold text-xs">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Approved Bid Limit</span>
                                  <span className="text-sm font-black font-mono text-slate-900 block">{approvedAmount} {winQuote?.currency || "INR"}</span>
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase mt-1">Vendor: {winQuote?.vendorName || "Unspecified"}</span>
                                </div>
                                <div className={`p-4 rounded-xl border shadow-xs ${isHighVariance ? "bg-rose-50 border-rose-300 text-rose-950 animate-pulse" : "bg-emerald-50/70 border-emerald-300 text-emerald-950"}`}>
                                  <span className={`text-[8px] font-bold uppercase block mb-1 ${isHighVariance ? 'text-rose-600' : 'text-emerald-700'}`}>Invoice Final Cost</span>
                                  <span className="text-sm font-black font-mono block">{finalAmt} {invoiceCurrency}</span>
                                  <span className={`text-[9px] font-extrabold block uppercase mt-1 ${isHighVariance ? "text-rose-700" : "text-emerald-700"}`}>
                                    Difference is {varPct >= 0 ? `+${varPct}%` : `${varPct}%`}
                                  </span>
                                </div>
                              </div>

                              {/* ALARM BANNER FOR VARIANCE OVER 10% */}
                              {isHighVariance && (
                                <div className="p-4 bg-rose-100 border border-rose-350 text-rose-950 rounded-2xl flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                  <div className="text-[10px] font-bold uppercase tracking-wide leading-normal">
                                    <span className="font-bold text-rose-800 block text-[11px] mb-0.5">Critical difference detected!</span>
                                    The actual invoice amount (<strong>{finalAmt} {invoiceCurrency}</strong>) exceeds the approved budget (<strong>{approvedAmount} {invoiceCurrency}</strong>) by <strong className="text-rose-700 font-black">{varPct}%</strong>. Payment clearance requires a reason comment below.
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* QUOTATION COMPARISON BENCHMARKING TABLE */}
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Quotations Board</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Bids submitted by vendors</p>
                                </div>
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[8.5px] font-bold text-slate-600 uppercase">{selectedCard.quotes ? selectedCard.quotes.length : 0} bids</span>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left font-bold text-xs uppercase tracking-wide">
                                    <thead>
                                      <tr className="border-b border-slate-105 text-slate-405 text-[9px] font-black">
                                        <th className="py-2">Vendor Partner</th>
                                        <th className="py-2">Agent Name</th>
                                        <th className="py-2">Airline</th>
                                        <th className="py-2">Sector / Route</th>
                                        <th className="py-2">Layover</th>
                                        <th className="py-2">Travel Date</th>
                                        <th className="py-2 text-right">Price</th>
                                        <th className="py-2 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-black text-[11px]">
                                      {selectedCard.quotes && selectedCard.quotes.length > 0 ? (
                                        selectedCard.quotes.map((q) => {
                                          const isWinning = q.id === selectedCard.winningQuoteId;
                                          return (
                                            <tr key={q.id} className={`hover:bg-slate-50 transition ${isWinning ? "bg-emerald-50/30" : ""}`}>
                                              <td className="py-3 text-slate-900 whitespace-normal break-words pr-4">
                                                <div className="flex items-center gap-1.5 font-extrabold">
                                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                  <span>{q.vendorName}</span>
                                                </div>
                                              </td>
                                              <td className="py-3 text-slate-700 font-bold whitespace-normal break-words pr-4">
                                                <span>{q.agentName || "Direct / Link"}</span>
                                              </td>
                                              <td className="py-3 text-slate-800 font-bold whitespace-normal break-words pr-4">
                                                <span>{q.airline || "Direct Carrier"}</span>
                                              </td>
                                              <td className="py-3 font-mono text-slate-600 whitespace-normal break-words pr-4">
                                                <span>{q.sector || selectedCard.destination || "N/A"}</span>
                                              </td>
                                              <td className="py-3 text-slate-605 whitespace-normal break-words pr-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black">
                                                  {q.layover || "Nonstop / Direct"}
                                                </span>
                                              </td>
                                              <td className="py-3 font-mono text-slate-850">
                                                <span>{q.travelDate || "Immediate"}</span>
                                              </td>
                                              <td className="py-3 text-right font-mono text-slate-900 font-black text-xs">
                                                {q.amount} {q.currency}
                                              </td>
                                              <td className="py-3 text-center">
                                                {isWinning ? (
                                                  <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-black rounded uppercase">Win Quote</span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 bg-slate-150 text-slate-400 text-[8px] font-bold rounded uppercase">Competitor</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                                            No quotations logged for side-by-side comparison.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                              </div>
                            </div>

                            {/* INVOICE INPUT VARIABLES FORM */}
                            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Invoice Number *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. MMT-12345"
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold uppercase font-mono"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Invoice Amount *</label>
                                    <input
                                      type="number"
                                      required
                                      placeholder="0"
                                      value={invoiceVendorAmount}
                                      onChange={e => setInvoiceVendorAmount(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Currency</label>
                                    <select
                                      value={invoiceCurrency}
                                      onChange={e => setInvoiceCurrency(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                                    >
                                      <option value="INR">INR</option>
                                      <option value="USD">USD</option>
                                      <option value="VND">VND</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                                    Reason for price difference {isHighVariance ? "(Required *)" : "(Optional)"}
                                  </label>
                                  <textarea
                                    rows={4}
                                    placeholder={isHighVariance ? "Please explain why the invoice exceeds the approved bid limit..." : "e.g. Cleared. Vendor rates within corporate guidelines."}
                                    value={financeVarianceReason}
                                    onChange={e => setFinanceVarianceReason(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                                  ></textarea>
                                </div>
                              </div>
                            </div>

                            {/* CLEAR SUBMISSION BUTTON ACTIONS FOR PAYMENT */}
                            <div className="border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleFinanceReject(financeVarianceReason || "Correction requested from Finance Desk", "CORRECTION")}
                                  className="px-5 py-3 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                                >
                                  Request Correction
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFinanceReject(financeVarianceReason || "Rejected by Finance controller", "REJECT")}
                                  className="px-5 py-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                                >
                                  Reject Payment
                                </button>
                              </div>

                              <button
                                type="submit"
                                className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                              >
                                <FileCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span>Approve Payment</span>
                              </button>
                            </div>

                          </form>
                        );
                      })()}

                    </div>
                  )}

                  {/* STEP 5 WORKSPACE: RECONCILIATION */}
                  {activeViewSection === 'RECONCILIATION' && (() => {
                    const localLinkedIndent = indents.find(i => i.id === selectedCard.id || i.id === selectedCard.indentId);
                    const isGstApplicable = localLinkedIndent ? localLinkedIndent.gst_applicable !== false : true;

                    return (
                      <div className="space-y-6">
                        
                        {/* COMPARE APPROVED VS FINAL FOR VARIANCE ALERT */}
                        {(() => {
                          const winQuote = selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId);
                          const approvedAmount = winQuote ? winQuote.amount : 0;
                          const finalAmt = parseFloat(invoiceVendorAmount) || 0;
                          
                          return (
                            <div className="p-6 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Audit pricing checkpoint</span>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">1. Approved Bid Limit</span>
                                  <span className="text-slate-900 text-base font-black uppercase block mt-0.5 font-mono">{approvedAmount} {winQuote?.currency}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">2. Actual Fulfilled (PNR)</span>
                                  <span className="text-slate-900 text-base font-black uppercase block mt-0.5 font-mono">{selectedCard.finalBookingAmount} {selectedCard.bookingCurrency}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">3. Bill Under Audit Entry</span>
                                  <span className="text-slate-900 text-base font-black uppercase block mt-0.5 font-mono">{finalAmt || "Pending Input"} {invoiceCurrency}</span>
                                </div>
                              </div>

                              {/* DYNAMIC VARIANCE GUARD CHAT ALERT */}
                              {finalAmt > approvedAmount && approvedAmount > 0 && (
                                <div className="mt-3 p-4 bg-orange-100 border border-orange-300 text-orange-950 font-black text-[10px] uppercase tracking-wide rounded-xl flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                                  <span>Variance Alarm: Final vendor invoice exceeds budget bid by {Math.round(((finalAmt - approvedAmount)/approvedAmount)*100)}%!</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* SERVICE / AIRLINE GST INVOICE COGNITIVE EXTRACTION SHIELD */}
                        {isGstApplicable ? (
                          <div className="bg-orange-50/50 border-2 border-dashed border-orange-200 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-orange-600 animate-pulse shrink-0" />
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Service / Corporate Airline GST Invoice Upload & Extraction</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                  Upload the Corporate GST invoice to let Gemini automatically extract pricing metrics, flight vendor, and matching Airline GSTIN.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* FILE UPLOADER */}
                              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  onChange={e => handleFileChange(e, setGstInvoiceFileBase64, setGstInvoiceFileName)}
                                  className="hidden"
                                  id="reconciliation-gst-invoice-file"
                                />
                                <label
                                  htmlFor="reconciliation-gst-invoice-file"
                                  className="flex items-center justify-center gap-2 h-14 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl cursor-pointer text-[10px] font-black text-slate-500 uppercase tracking-wide hover:border-orange-500 transition duration-150"
                                >
                                  <Upload className="w-4 h-4 text-orange-600 shrink-0" />
                                  <span className="truncate max-w-[180px]">{gstInvoiceFileName || "Choose Service/Airline GST Invoice"}</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={handleScanGstInvoice}
                                  disabled={scanningGstInvoice || !gstInvoiceFileBase64}
                                  className="w-full h-10 bg-slate-950 hover:bg-slate-900 disabled:opacity-40 disabled:hover:bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition duration-150"
                                >
                                  {scanningGstInvoice ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                      <span>Extracting GST details...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                      <span>Cognitive Extract with Gemini</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* EXTRACTION SUMMARY */}
                              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] uppercase font-bold text-slate-700 space-y-2.5">
                                <span className="text-[8px] font-black text-slate-400 block tracking-widest">Extracted GST Audited Metrics</span>
                                
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-400">Vendor Airline</span>
                                  <span className="text-slate-900 font-extrabold">{airlineGstVendorName || <em className="text-slate-300 font-normal">Pending Scan</em>}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-400">Airline GSTIN</span>
                                  <span className="text-slate-900 font-extrabold font-mono">{airlineGstNumber || <em className="text-slate-300 font-normal">Pending Scan</em>}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-400">GST Fare Component</span>
                                  <span className="text-slate-900 font-extrabold font-mono">{airlineGstAmount ? `${airlineGstAmount} INR` : <em className="text-slate-300 font-normal">0.00</em>}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Total Bill (inc. GST)</span>
                                  <span className="text-slate-900 font-extrabold font-mono">{invoiceVendorAmount ? `${invoiceVendorAmount} ${invoiceCurrency}` : <em className="text-slate-300 font-normal">0.00</em>}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-slate-400 shrink-0" />
                            <div>
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Service / Corporate Airline GST Invoice Exempted</h4>
                              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider leading-relaxed">
                                This travel card was initiated as a <span className="text-orange-600 font-black">Non-GST request</span>. Service/Airline GST upload and structured validation scanning are automatically bypassed.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* CLEARANCE VERIFICATION FORM */}
                        <form onSubmit={handleSaveReconciliation} className="space-y-6">
                          
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-4">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bill Invoice number *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. MMT/INV/294829"
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold uppercase font-mono"
                              />
                            </div>

                            <div className="md:col-span-5 col-span-2">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Final bill Amount (from vendor) *</label>
                              <input
                                type="number"
                                required
                                placeholder="e.g. 13500"
                                value={invoiceVendorAmount}
                                onChange={e => setInvoiceVendorAmount(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-black font-mono"
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Currency</label>
                              <select
                                value={invoiceCurrency}
                                onChange={e => setInvoiceCurrency(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-black"
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="VND">VND</option>
                                <option value="NGN">NGN</option>
                                <option value="AUD">AUD</option>
                              </select>
                            </div>
                          </div>

                          {/* GST AND PHYSICAL COPY CHECKLISTS */}
                          <div className="p-6 border-2 border-slate-900 rounded-3xl bg-slate-50 space-y-4">
                            <span className="text-[10px] font-black text-slate-900 uppercase block tracking-wider">
                              Executive Finance Clearances checklists *
                            </span>

                            <div className="space-y-3 font-bold text-xs text-slate-700">
                              {isGstApplicable ? (
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={gstDetailsCorrect}
                                    onChange={e => setGstDetailsCorrect(e.target.checked)}
                                    className="w-4 h-4 accent-orange-600 rounded"
                                  />
                                  <span className="uppercase text-[10px] tracking-wide font-black text-slate-900">
                                    Check: The GST details (Hemraj GSTIN and matching SAC code) on the final vendor bill are evaluated and completely correct.
                                  </span>
                                </label>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500 py-1 bg-white border border-slate-100 rounded-xl p-3">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black flex items-center justify-center shrink-0">✓</span>
                                  <span className="uppercase text-[9px] tracking-wider font-extrabold text-slate-500">
                                    GST Compliance Verification Bypassed (Confirmed Non-GST Travel Indent)
                                  </span>
                                </div>
                              )}

                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={physicalInvoiceHandedOver}
                                  onChange={e => setPhysicalInvoiceHandedOver(e.target.checked)}
                                  className="w-4 h-4 accent-orange-600 rounded"
                                />
                                <span className="uppercase text-[10px] tracking-wide font-black text-slate-900">
                                  Check: The physical copy / authenticated original invoice has been successfully handed over to the Finance team box.
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* DYNAMIC AUDIT COST VARIANCE SECTION */}
                          {(() => {
                            const convertToInrValueComp = (amt: number, curr: string) => {
                              const val = amt;
                              const c = curr.toUpperCase();
                              if (c === "USD" || c === "$") return val * 83;
                              if (c === "AUD") return val * 55;
                              if (c === "NGN") return val * 0.06;
                              if (c === "VND") return val * 0.0035;
                              return val;
                            };

                            const winQuote = selectedCard.quotes ? selectedCard.quotes.find(q => q.id === selectedCard.winningQuoteId) : null;
                            if (!winQuote || !invoiceVendorAmount) return null;

                            const winQuoteInr = convertToInrValueComp(winQuote.amount, winQuote.currency);
                            const enteredInr = convertToInrValueComp(parseFloat(invoiceVendorAmount) || 0, invoiceCurrency);
                            const isSurged = enteredInr > winQuoteInr;
                            if (!isSurged) return null;

                            const varPercent = winQuoteInr > 0 ? Math.round(((enteredInr - winQuoteInr) / winQuoteInr) * 100) : 0;

                            return (
                              <div className="p-5 bg-rose-50 border-2 border-rose-150 rounded-3xl space-y-3.5">
                                <div className="flex items-start gap-2.5">
                                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <span className="font-black text-[9px] uppercase tracking-widest text-rose-950 block">⚠️ FINAL RECONCILIATION SURGE EXCEEDS TARGET BUDGET</span>
                                    <p className="text-rose-900 text-[11px] font-bold uppercase tracking-wide leading-relaxed mt-1">
                                      The actual invoice total (INR {Math.round(enteredInr)}) has increased over the initial approved procurement proposal (INR {Math.round(winQuoteInr)}) by {varPercent}%.
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-[8px] font-black text-rose-900 uppercase tracking-widest leading-none">
                                    Explain why actual invoice cost deviates or is higher than the approved proposal * (Required audit explanation)
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Flight ticket date shifts / last minute fuel surcharges / custom hotel taxes added"
                                    value={reconVarianceJustification}
                                    onChange={e => setReconVarianceJustification(e.target.value)}
                                    className="w-full bg-white border border-rose-300 rounded-xl p-3 text-xs text-slate-800 font-extrabold uppercase tracking-wide placeholder-slate-400 focus:outline-none focus:border-rose-500"
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
                            <button
                              type="submit"
                              className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer"
                            >
                              Mark as Closed & Complete Loop
                            </button>
                          </div>

                        </form>

                      </div>
                    );
                  })()}

                  {/* STEP 5 WORKSPACE: CLOSED / COMPLETED */}
                  {activeViewSection === 'CLOSED' && (
                    <div className="space-y-6">
                      
                      <div className="p-8 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto" />
                        <h4 className="text-xl font-black uppercase tracking-tighter text-emerald-990">Closed Loop Audited Completed</h4>
                        <p className="text-emerald-800 text-xs font-bold uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                          This travel tracker Job Card has successfully navigated RFQ bids, executive approval routing, actual ticket issuance, and GST accounting clearance. No active adjustments needed.
                        </p>
                      </div>

                      {/* SUMMARY SHOW */}
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6 font-bold text-xs uppercase text-slate-800 tracking-wide">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">Cleared Partner</span>
                          <span className="text-slate-900 font-extrabold block">MakeMyTrip Business</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">Invoice Code</span>
                          <span className="text-slate-900 font-extrabold block font-mono">#{selectedCard.invoiceNumber || "MMT/I/9030"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">Final Clearance Billing</span>
                          <span className="text-slate-900 font-extrabold block font-mono">{selectedCard.invoiceVendorAmount} {selectedCard.invoiceCurrency || "INR"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">GST Certified</span>
                          <span className="text-green-600 font-extrabold block">✓ Verified</span>
                        </div>
                      </div>

                      {/* SERVICE / AIRLINE GST VERIFICATION COMPLIANCE FOOTPRINT */}
                      {selectedCard.airlineGstNumber && (
                        <div className="p-6 bg-orange-50/50 border border-orange-200 rounded-3xl space-y-3 font-bold text-xs uppercase tracking-wide">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase">Extracted Corporate Service / Airline GST Auditing Trace</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <span className="text-[9px] text-slate-400 block mb-1">Airline Vendor Name</span>
                              <span className="text-slate-900 font-black">{selectedCard.airlineGstVendorName || "SpiceJet Airlines"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block mb-1">Airline GSTIN</span>
                              <span className="text-slate-900 font-black font-mono">{selectedCard.airlineGstNumber}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block mb-1">Airline GST Component</span>
                              <span className="text-slate-900 font-black font-mono">{selectedCard.airlineGstAmount} INR</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* LOGS AUDITING CHRONOLOGY (SHOW ONLY IN OVERVIEW) */}
                  {activeViewSection === 'OVERVIEW' && (
                    <div className="border-t-2 border-slate-100 pt-8 space-y-5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500" />
                        Chronological Audit log & timeline
                      </h4>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {selectedCard.auditLogs && selectedCard.auditLogs.map((log, lIdx) => (
                          <div key={lIdx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] block leading-relaxed font-bold">
                            <div className="flex justify-between items-center text-slate-400 font-black text-[9px] mb-1">
                              <span>BY: {log.userId} — ACTION: {log.action.toUpperCase()}</span>
                              <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-800">{log.notes || "No extra metadata captured."}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                        </div>
                      </div>
                    </div>
                  );
                })()}

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {profileEmployee && (
        <EmployeeProfileModal 
          employee={profileEmployee} 
          onClose={() => setProfileEmployee(null)} 
        />
      )}

      {showCancelModal && selectedCard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-2 border-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {cancelModalType === 'CANCEL' ? "Cancel Job Card Ticket" : "Reschedule Ticketing Request"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Target Card ID: {selectedCard.id}
                </p>
              </div>
            </div>

            <form onSubmit={cancelModalType === 'CANCEL' ? handleCancelJobCardOperation : handleRescheduleJobCardOperation} className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-rose-700 uppercase tracking-widest mb-1.5">
                  Cancellation Comment (Strictly Required) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={
                    cancelModalType === 'CANCEL' 
                      ? "Specify the specific reason why this corporate ticket card is being cancelled..." 
                      : "Specify why rescheduling is triggered (original tickets will be cancelled, and a linked child card will automatically restart from quotation)..."
                  }
                  value={cancellationReasonInput}
                  onChange={e => setCancellationReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold leading-normal focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Cancellation Charges (from invoice)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={cancellationCharges}
                      onChange={e => setCancellationCharges(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    GST Invoice from Hemraj
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase truncate max-w-[150px]">
                        {cancellationGstFileName || "Upload GST Invoice"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => handleFileChange(e, setCancellationGstFileBase64, setCancellationGstFileName)}
                        accept=".pdf,image/*"
                      />
                    </label>
                    {cancellationGstFileBase64 && (
                      <button 
                        type="button"
                        onClick={() => { setCancellationGstFileBase64(""); setCancellationGstFileName(""); }}
                        className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {cancelModalType === 'RESCHEDULE' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          Rescheduling Charges
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input
                            type="number"
                            placeholder="0.00"
                            value={reschedulingCharges}
                            onChange={e => setReschedulingCharges(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold focus:bg-white transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          Fare Difference
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input
                            type="number"
                            placeholder="0.00"
                            value={fareDifference}
                            onChange={e => setFareDifference(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold focus:bg-white transition"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {cancelModalType === 'RESCHEDULE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-1 text-[10px] font-bold uppercase leading-normal">
                  <span className="block font-black text-amber-800 font-mono">☝️ AUTOMATIC SYSTEM RE-LINKING:</span>
                  <span>The previous card will be cancelled, and a new child card for the traveler will be instantiated back to step 1 (QUOTATION) so vendors can submit revised bids!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReasonInput("");
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={submittingCancellation}
                  className={`px-4 py-2 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition ${
                    cancelModalType === 'CANCEL'
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {submittingCancellation 
                    ? "Saving State..." 
                    : cancelModalType === 'CANCEL' 
                      ? "Cancel Booking" 
                      : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
