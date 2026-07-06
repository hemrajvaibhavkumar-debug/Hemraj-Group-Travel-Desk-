export type TravelCategory = 'DOMESTIC' | 'INTERNATIONAL' | 'INTERNATIONAL_RETURN' | 'TRAIN' | 'BUS' | 'CAB';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VisaType = 'BUSINESS' | 'TOURIST' | 'EMPLOYMENT' | 'OTHER';
export type SeatPreference = 'WINDOW' | 'AISLE' | 'MIDDLE' | 'OTHER';
export type MealPreference = 'VEG' | 'NON_VEG' | 'VEGAN' | 'OTHER';
export type VaccineStatus = 'VACCINATED' | 'NOT_VACCINATED' | 'PENDING';
export type PlantSite = 'SUNAGROW' | 'RICEFIELD' | 'OTHER';
export type TransportMode = 'FLIGHT' | 'SL' | '3AC' | '2AC' | 'OTHER';
export type BillingCurrency = 'INR' | 'USD' | 'NGN';
export type Department = 'PURCHASE' | 'FINANCE' | 'OPS' | 'HR' | 'IT' | 'ADMIN' | 'OTHER';
export type TravelApprover = 'ROHIT_JI' | 'DEPARTMENT_HEAD' | 'MANAGEMENT' | 'OTHER';

export interface Employee {
  employee_code: string; // employeeId
  aadhar_pan_number?: string; // Additional unique identifier
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  default_travel_approver: string;
  approver_designation: string;
  cost_centre: string;
  default_billing_currency: string;
  
  // Domestic profile fields
  native_city?: string; // baseCity / native_state
  nearest_airport?: string;
  nearest_railway_station?: string;
  default_mode_of_transport?: string;
  extra_baggage_required?: boolean;
  photograph_url?: string;
  supporting_documents_url?: string;

  // International profile fields
  present_location_abroad?: string;
  assigned_plant_site?: string;
  nearest_airport_india?: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  passport_front_page_url?: string;
  passport_back_page_url?: string;
  offer_letter_url?: string;
  polio_vaccine_status?: string;
  polio_certificate_expiry?: string;
  yfv_status?: string;
  yfv_certificate_expiry?: string;
  visa_number?: string;
  visa_expiry_date?: string;
  visa_country?: string;
  
  // Train specific fields
  train_preferred_class?: string;
  train_berth_preference?: string;
  train_meal_preference?: string;
  train_preferred_number?: string;

  passport_history?: Array<{
    passport_number: string;
    passport_issue_date?: string;
    passport_expiry?: string;
    passport_front_page_url?: string;
    passport_back_page_url?: string;
    archive_date: string;
  }>;
}

export interface TravelIndent {
  id: string; // Database ID
  travel_type: TravelCategory;
  gst_applicable: boolean; // true = GST Billing, false = Non-GST
  priority: PriorityLevel;
  travel_date: string;
  wp_number: string;
  nearest_boarding_point: string;
  luggage: string;
  visa_type: string;
  visa_type_other?: string;
  seat_preference: string;
  seat_preference_other?: string;
  meal_preference: string;
  meal_preference_other?: string;
  source_location: string;
  destination: string;
  purpose: string;
  plant?: string; // HIPL, RSIPL, HRM, SUNAGROW, RICEFIELD
  
  // Counselor/Traveler Assignment
  employee_code: string; // maps to the assigned employee
  created_at: string;
  voided?: boolean;
  void_reason?: string;
  
  // Approver / Raiser info
  travel_approver?: string;
  approver_title?: string;
  indent_raiser?: string;
}

export type JobCardStage = 'QUOTATION' | 'APPROVAL' | 'BOOKING' | 'FINANCE' | 'RECONCILIATION' | 'CLOSED';

export interface JobCardQuote {
  id: string;
  vendorName: string;
  amount: number;
  currency: string; // INR, USD, VND, NGN, $, AUD, etc.
  quoteFileUrl?: string;
  quoteFileName?: string;
  isWinning?: boolean;
  created_at: string;
  airline?: string;
  sector?: string;
  layover?: string;
  travelDate?: string;
  agentName?: string;
  selectedEmails?: string[];
  selectedPhones?: string[];
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  notes?: string;
}

export interface JobCard {
  id: string; // matches indentId
  indentId: string;
  travelerName: string;
  destination: string;
  department: string;
  created_at: string; // opened date
  stage: JobCardStage;
  
  // Quotation (Bidding Phase)
  rfqVendors: string[];
  quotes: JobCardQuote[];
  winningQuoteId?: string;
  
  // Approval
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_QUOTES';
  approvalNotes?: string;
  approverName?: string;
  approvedAt?: string;
  
  // Fulfillment (Booking Phase)
  bookingPNR?: string;
  bookingVendor?: string;
  finalBookingAmount?: number;
  bookingCurrency?: string;
  ticketFileUrl?: string;
  ticketFileName?: string;
  ticketVendorInvoiceUrl?: string;
  ticketVendorInvoiceName?: string;
  bookingRecordedAt?: string;
  
  // Financial Reconciliation
  invoiceVendorAmount?: number;
  invoiceCurrency?: string;
  invoiceNumber?: string;
  gstDetailsCorrect: boolean;
  physicalInvoiceHandedOver: boolean;
  varianceWarning?: string;
  airlineGstInvoiceUrl?: string;
  airlineGstInvoiceName?: string;
  // Requested functional fields
  quoted_total?: number;
  actual_total?: number;
  variance_percentage?: number;
  vendor_name?: string;
  attachments_url?: string;
  airlineGstNumber?: string;
  airlineGstAmount?: number;
  airlineGstVendorName?: string;
  reconciliationRecordedAt?: string;
  
  // Finance & Payment Processing
  financeCleared?: boolean;
  financeVarianceReason?: string;
  paymentStatus?: 'PENDING' | 'READY' | 'PAID';
  paymentDate?: string;
  paymentTransactionRef?: string;
  paymentMode?: 'Bank Transfer' | 'Cheque' | 'Credit Card' | 'Other';
  paymentCurrency?: string;
  paymentAmountINR?: number; // Equivalent INR Amount
  paymentRecordedAt?: string;
  
  // Turn Around Time (TAT) Tracking
  rfqCompletedAt?: string;
  l2ApprovedAt?: string;
  workOrderSentAt?: string;
  invoiceUploadedAt?: string;
  gstInvoiceUploadedAt?: string;
  
  // History logs
  auditLogs: AuditLogEntry[];
  voided?: boolean;
  void_reason?: string;
  travelApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  travelApprovedBy?: string;
  travelApprovedAt?: string;
  travelApprovalNotes?: string;
  commercialApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  commercialApprovedBy?: string;
  commercialApprovedAt?: string;
  commercialApprovalNotes?: string;
  
  // Cancellation & Rescheduling system
  isCancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
  cancellationCharges?: number;
  cancellationGstInvoiceUrl?: string;
  cancellationGstInvoiceName?: string;
  reschedulingCharges?: number;
  fareDifference?: number;
  reschedulingReason?: string;
  parentJobCardId?: string;
  rescheduledToCardId?: string;
}

export interface RbacUser {
  id: string; // unique identifier
  name: string;
  email: string;
  role: 'TRAVEL_DESK' | 'TRAVEL_APPROVER' | 'VP_COMMERCIAL' | 'FINANCE' | 'SUPERADMIN';
}

export interface RolePermission {
  role: 'TRAVEL_DESK' | 'TRAVEL_APPROVER' | 'VP_COMMERCIAL' | 'FINANCE' | 'SUPERADMIN';
  permissions: string[];
}

export interface RbacSettings {
  senderEmail: string;
  ccRecipients: string;
  activeSimulatedEmail: string;
}

export interface Vendor {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  categories: ("FLIGHT" | "TRAIN" | "HOTEL" | "CAB" | "OTHER")[];
}


