import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as N8nService from "../services/n8n.service";

// Helper function to map normalized database schema back to flat JSON format expected by frontend.
function mapJobCardToFrontend(dbJobCard: any): any {
  if (!dbJobCard) return null;
  const {
    indent,
    quotes,
    auditLogs,
    booking,
    invoice,
    payment,
    rescheduling,
    rfqVendors,
    ...rest
  } = dbJobCard;

  const travelerName = indent?.employee?.name || "";
  const destination = indent?.destination || "";
  const department = indent?.employee?.department || "";

  return {
    ...rest,
    travelerName,
    destination,
    department,
    quotes: quotes || [],
    auditLogs: auditLogs || [],
    rfqVendors: rfqVendors ? JSON.parse(JSON.stringify(rfqVendors)) : [],

    // Booking Section
    bookingPNR: booking?.bookingPNR || null,
    bookingVendor: booking?.bookingVendor || null,
    finalBookingAmount: booking?.finalBookingAmount || null,
    bookingCurrency: booking?.bookingCurrency || null,
    ticketFileUrl: booking?.ticketFileUrl || null,
    ticketFileName: booking?.ticketFileName || null,
    ticketVendorInvoiceUrl: booking?.ticketVendorInvoiceUrl || null,
    ticketVendorInvoiceName: booking?.ticketVendorInvoiceName || null,
    bookingRecordedAt: booking?.bookingRecordedAt || null,

    // Invoice Section
    invoiceVendorAmount: invoice?.invoiceVendorAmount || null,
    invoiceCurrency: invoice?.invoiceCurrency || null,
    invoiceNumber: invoice?.invoiceNumber || null,
    gstDetailsCorrect: invoice?.gstDetailsCorrect ?? false,
    physicalInvoiceHandedOver: invoice?.physicalInvoiceHandedOver ?? false,
    varianceWarning: invoice?.varianceWarning || null,
    airlineGstInvoiceUrl: invoice?.airlineGstInvoiceUrl || null,
    airlineGstInvoiceName: invoice?.airlineGstInvoiceName || null,
    quoted_total: invoice?.quoted_total || null,
    actual_total: invoice?.actual_total || null,
    variance_percentage: invoice?.variance_percentage || null,
    vendor_name: invoice?.vendor_name || null,
    attachments_url: invoice?.attachments_url || null,
    airlineGstNumber: invoice?.airlineGstNumber || null,
    airlineGstAmount: invoice?.airlineGstAmount || null,
    airlineGstVendorName: invoice?.airlineGstVendorName || null,
    reconciliationRecordedAt: invoice?.reconciliationRecordedAt || null,

    // Payment Section
    financeCleared: payment?.financeCleared ?? false,
    financeVarianceReason: payment?.financeVarianceReason || null,
    paymentStatus: payment?.paymentStatus || "PENDING",
    paymentDate: payment?.paymentDate || null,
    paymentTransactionRef: payment?.paymentTransactionRef || null,
    paymentMode: payment?.paymentMode || null,
    paymentCurrency: payment?.paymentCurrency || null,
    paymentAmountINR: payment?.paymentAmountINR || null,
    paymentRecordedAt: payment?.paymentRecordedAt || null,

    // Rescheduling Section
    isCancelled: rescheduling?.isCancelled ?? false,
    cancellationReason: rescheduling?.cancellationReason || null,
    cancelledAt: rescheduling?.cancelledAt || null,
    cancellationCharges: rescheduling?.cancellationCharges || null,
    cancellationGstInvoiceUrl: rescheduling?.cancellationGstInvoiceUrl || null,
    cancellationGstInvoiceName: rescheduling?.cancellationGstInvoiceName || null,
    reschedulingCharges: rescheduling?.reschedulingCharges || null,
    fareDifference: rescheduling?.fareDifference || null,
    reschedulingReason: rescheduling?.reschedulingReason || null,
    parentJobCardId: rescheduling?.parentJobCardId || null,
    rescheduledToCardId: rescheduling?.rescheduledToCardId || null,
  };
}

export async function getAllJobCards(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = parseInt(req.query.skip as string) || 0;
    const jobCards = await prisma.jobCard.findMany({
      include: {
        quotes: true,
        auditLogs: true,
        booking: true,
        invoice: true,
        payment: true,
        rescheduling: true,
        indent: {
          include: {
            employee: true
          }
        }
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: skip
    });
    return res.json(jobCards.map(mapJobCardToFrontend));
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve job cards: " + error.message });
  }
}

export async function createJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const { indentId, travelerName } = req.body;
    if (!indentId || !travelerName) {
      return res.status(400).json({ error: "Missing travelerName or indentId parameters." });
    }

    const jobCardInclude = {
      quotes: true,
      auditLogs: true,
      booking: true,
      invoice: true,
      payment: true,
      rescheduling: true,
      indent: {
        include: {
          employee: true
        }
      }
    };

    const existingJob = await prisma.jobCard.findFirst({
      where: { indentId },
      include: jobCardInclude
    });

    if (existingJob) {
      return res.status(200).json({ success: true, jobCard: mapJobCardToFrontend(existingJob), alreadyExisted: true });
    }

    const newJob = await prisma.jobCard.create({
      data: {
        id: indentId,
        indentId,
        stage: "QUOTATION",
        rfqVendors: JSON.parse(JSON.stringify([])),
        approvalStatus: "PENDING",
        booking: {
          create: {}
        },
        invoice: {
          create: {
            gstDetailsCorrect: false,
            physicalInvoiceHandedOver: false
          }
        },
        payment: {
          create: {
            financeCleared: false
          }
        },
        rescheduling: {
          create: {
            isCancelled: false
          }
        },
        auditLogs: {
          create: {
            timestamp: new Date().toISOString(),
            userId: "Travel Desk Office",
            action: "Job Card Opened",
            notes: `Job Card successfully generated for approved travel desk indent ${indentId}.`
          }
        }
      },
      include: jobCardInclude
    });

    return res.status(201).json({ success: true, jobCard: mapJobCardToFrontend(newJob) });
  } catch (error: any) {
    const isUniqueConstraintError = error?.code === "P2002" && Array.isArray(error?.meta?.target);
    if (isUniqueConstraintError) {
      const existingJob = await prisma.jobCard.findFirst({
        where: { indentId: req.body.indentId },
        include: {
          quotes: true,
          auditLogs: true,
          booking: true,
          invoice: true,
          payment: true,
          rescheduling: true,
          indent: {
            include: {
              employee: true
            }
          }
        }
      });

      if (existingJob) {
        return res.status(200).json({ success: true, jobCard: mapJobCardToFrontend(existingJob), alreadyExisted: true });
      }
    }

    return res.status(500).json({ error: "Server process failure initializing Job Card: " + error.message });
  }
}

export async function updateJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const quotesData = updates.quotes;
    const auditLogsData = updates.auditLogs;

    delete updates.quotes;
    delete updates.auditLogs;

    const bookingFields = [
      "bookingPNR", "bookingVendor", "finalBookingAmount", "bookingCurrency",
      "ticketFileUrl", "ticketFileName", "ticketVendorInvoiceUrl", "ticketVendorInvoiceName", "bookingRecordedAt"
    ];
    const invoiceFields = [
      "invoiceVendorAmount", "invoiceCurrency", "invoiceNumber", "gstDetailsCorrect",
      "physicalInvoiceHandedOver", "varianceWarning", "airlineGstInvoiceUrl",
      "airlineGstInvoiceName", "quoted_total", "actual_total", "variance_percentage",
      "vendor_name", "attachments_url", "airlineGstNumber", "airlineGstAmount",
      "airlineGstVendorName", "reconciliationRecordedAt"
    ];
    const paymentFields = [
      "financeCleared", "financeVarianceReason", "paymentStatus", "paymentDate",
      "paymentTransactionRef", "paymentMode", "paymentCurrency", "paymentAmountINR", "paymentRecordedAt"
    ];
    const reschedulingFields = [
      "isCancelled", "cancellationReason", "cancelledAt", "cancellationCharges",
      "cancellationGstInvoiceUrl", "cancellationGstInvoiceName", "reschedulingCharges",
      "fareDifference", "reschedulingReason", "parentJobCardId", "rescheduledToCardId"
    ];

    const jobCardUpdates: any = {};
    const bookingUpdates: any = {};
    const invoiceUpdates: any = {};
    const paymentUpdates: any = {};
    const reschedulingUpdates: any = {};

    for (const [key, val] of Object.entries(updates)) {
      if (bookingFields.includes(key)) {
        bookingUpdates[key] = val;
      } else if (invoiceFields.includes(key)) {
        invoiceUpdates[key] = val;
      } else if (paymentFields.includes(key)) {
        paymentUpdates[key] = val;
      } else if (reschedulingFields.includes(key)) {
        reschedulingUpdates[key] = val;
      } else if (key !== "id" && key !== "indentId" && key !== "travelerName" && key !== "destination" && key !== "department") {
        if (key === "rfqVendors") {
          jobCardUpdates.rfqVendors = val ? JSON.parse(JSON.stringify(val)) : undefined;
        } else {
          jobCardUpdates[key] = val;
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.jobCard.update({
        where: { id },
        data: {
          ...jobCardUpdates,
          booking: Object.keys(bookingUpdates).length > 0 ? {
            upsert: {
              create: bookingUpdates,
              update: bookingUpdates
            }
          } : undefined,
          invoice: Object.keys(invoiceUpdates).length > 0 ? {
            upsert: {
              create: invoiceUpdates,
              update: invoiceUpdates
            }
          } : undefined,
          payment: Object.keys(paymentUpdates).length > 0 ? {
            upsert: {
              create: paymentUpdates,
              update: paymentUpdates
            }
          } : undefined,
          rescheduling: Object.keys(reschedulingUpdates).length > 0 ? {
            upsert: {
              create: reschedulingUpdates,
              update: reschedulingUpdates
            }
          } : undefined
        }
      });

      if (quotesData && Array.isArray(quotesData)) {
        const quoteIds = quotesData.map(q => q.id);
        await tx.jobCardQuote.deleteMany({
          where: {
            jobCardId: id,
            id: { notIn: quoteIds }
          }
        });

        for (const q of quotesData) {
          await tx.jobCardQuote.upsert({
            where: { id: q.id },
            update: {
              vendorName: q.vendorName,
              amount: q.amount,
              currency: q.currency,
              quoteFileUrl: q.quoteFileUrl,
              quoteFileName: q.quoteFileName,
              isWinning: q.isWinning,
              airline: q.airline,
              sector: q.sector,
              layover: q.layover,
              travelDate: q.travelDate,
              agentName: q.agentName,
              selectedEmails: q.selectedEmails ? JSON.parse(JSON.stringify(q.selectedEmails)) : undefined,
              selectedPhones: q.selectedPhones ? JSON.parse(JSON.stringify(q.selectedPhones)) : undefined
            },
            create: {
              id: q.id,
              jobCardId: id,
              vendorName: q.vendorName,
              amount: q.amount,
              currency: q.currency,
              quoteFileUrl: q.quoteFileUrl,
              quoteFileName: q.quoteFileName,
              isWinning: q.isWinning || false,
              created_at: q.created_at || new Date().toISOString(),
              airline: q.airline,
              sector: q.sector,
              layover: q.layover,
              travelDate: q.travelDate,
              agentName: q.agentName,
              selectedEmails: q.selectedEmails ? JSON.parse(JSON.stringify(q.selectedEmails)) : undefined,
              selectedPhones: q.selectedPhones ? JSON.parse(JSON.stringify(q.selectedPhones)) : undefined
            }
          });
        }
      }

      if (auditLogsData && Array.isArray(auditLogsData)) {
        for (const log of auditLogsData) {
          await tx.auditLog.create({
            data: {
              jobCardId: id,
              timestamp: log.timestamp || new Date().toISOString(),
              userId: log.userId || "System",
              action: log.action,
              notes: log.notes
            }
          });
        }
      }

      return await tx.jobCard.findUnique({
        where: { id },
        include: {
          quotes: true,
          auditLogs: true,
          booking: true,
          invoice: true,
          payment: true,
          rescheduling: true,
          indent: {
            include: {
              employee: true
            }
          }
        }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    return res.json({ success: true, jobCard: mapJobCardToFrontend(updated) });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to persist Job Card adjustments: " + error.message });
  }
}

export async function rescheduleJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      reason,
      operatorId,
      reschedulingCharges,
      fareDifference,
      cancellationCharges,
      cancellationGstInvoiceUrl,
      cancellationGstInvoiceName
    } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Cancellation Reason is required for rescheduling." });
    }

    const now = new Date().toISOString();
    const parentCard = await prisma.jobCard.findUnique({ where: { id } });
    if (!parentCard) return res.status(404).json({ error: `Parent Job Card ${id} not found.` });

    const siblingCount = await prisma.jobCard.count({
      where: { indentId: parentCard.indentId }
    });
    const childId = `${parentCard.indentId}-RS${siblingCount}`;

    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.jobCard.update({
        where: { id },
        data: {
          rescheduling: {
            upsert: {
              create: {
                isCancelled: true,
                cancellationReason: reason,
                cancelledAt: now,
                cancellationCharges,
                cancellationGstInvoiceUrl,
                cancellationGstInvoiceName,
                rescheduledToCardId: childId
              },
              update: {
                isCancelled: true,
                cancellationReason: reason,
                cancelledAt: now,
                cancellationCharges,
                cancellationGstInvoiceUrl,
                cancellationGstInvoiceName,
                rescheduledToCardId: childId
              }
            }
          },
          auditLogs: {
            create: {
              timestamp: now,
              userId: operatorId || "Travel Desk Operator",
              action: "Job Card Cancelled (Rescheduled)",
              notes: `Cancelled due to reschedule trigger. New Card ID initiated: ${childId}. Reason: ${reason}`
            }
          }
        },
        include: {
          quotes: true,
          auditLogs: true,
          booking: true,
          invoice: true,
          payment: true,
          rescheduling: true,
          indent: {
            include: {
              employee: true
            }
          }
        }
      });

      const child = await tx.jobCard.create({
        data: {
          id: childId,
          indentId: parentCard.indentId,
          stage: "QUOTATION",
          rfqVendors: JSON.parse(JSON.stringify([])),
          approvalStatus: "PENDING",
          booking: {
            create: {}
          },
          invoice: {
            create: {
              gstDetailsCorrect: false,
              physicalInvoiceHandedOver: false
            }
          },
          payment: {
            create: {
              financeCleared: false
            }
          },
          rescheduling: {
            create: {
              parentJobCardId: id,
              reschedulingCharges,
              fareDifference,
              reschedulingReason: reason
            }
          },
          auditLogs: {
            create: {
              timestamp: now,
              userId: operatorId || "Travel Desk Operator",
              action: "Job Card Opened (Rescheduled)",
              notes: `Rescheduled from parent travel ticket card ${id}. Rescheduling charges: ${reschedulingCharges || 0}, Fare difference: ${fareDifference || 0}. Process restarted from QUOTATION stage.`
            }
          }
        },
        include: {
          quotes: true,
          auditLogs: true,
          booking: true,
          invoice: true,
          payment: true,
          rescheduling: true,
          indent: {
            include: {
              employee: true
            }
          }
        }
      });

      return { parent, child };
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    return res.status(201).json({
      success: true,
      parentCard: mapJobCardToFrontend(result.parent),
      newCard: mapJobCardToFrontend(result.child)
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error rescheduling job card: " + error.message });
  }
}

export async function deleteJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.jobCard.delete({ where: { id } });
    return res.json({ success: true, message: `Job Card ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Deletion failure: " + error.message });
  }
}

export async function sendWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const workOrder = req.body;
    console.log("Work order send requested for Card:", workOrder.cardId);

    const ok = await N8nService.sendWorkOrderWebhook({
      workOrder,
      sentAt: new Date().toISOString()
    });

    if (ok) {
      return res.json({ success: true, message: "Work Order successfully sent to n8n webhook!" });
    } else {
      return res.json({
        success: true,
        mocked: true,
        message: "Work Order authorized! (Mocked dispatch: Webhook not configured in environment variables)"
      });
    }
  } catch (error: any) {
    console.error("Error sending work order to n8n:", error.message);
    return res.status(500).json({ error: "Failed to dispatch Work Order: " + error.message });
  }
}
