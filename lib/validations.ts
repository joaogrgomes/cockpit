import { z } from "zod";
import { DEBT_STATUS_VALUES, PROPOSAL_STATUS_VALUES } from "@/lib/db/schema";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalPositiveInt = z.number().int().positive().optional();

export const DebtSchema = z
  .object({
    name: z.string().min(2),
    creditor: z.string().min(2),
    type: z.string().min(1),
    status: z.enum(DEBT_STATUS_VALUES),
    currentValue: z.number().int().positive(),
    originalValue: optionalPositiveInt,
    monthlyPayment: optionalPositiveInt,
    dueDay: z.number().int().min(1).max(31).optional(),
    dueDate: z.string().regex(dateRegex).optional(),
    totalInstallments: optionalPositiveInt,
    paidInstallments: z.number().int().min(0).optional(),
    overdueSince: z.string().regex(dateRegex).optional(),
    priority: z.string().optional(),
    perceivedRisk: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.paidInstallments !== undefined &&
      data.totalInstallments !== undefined &&
      data.paidInstallments > data.totalInstallments
    ) {
      ctx.addIssue({
        code: "custom",
        message: "paidInstallments não pode ser maior que totalInstallments",
        path: ["paidInstallments"],
      });
    }
  });

export const DebtProposalSchema = z
  .object({
    debtId: z.string().uuid(),
    proposedValue: z.number().int().positive(),
    proposedAt: z.string().regex(dateRegex),
    expiresAt: z.string().regex(dateRegex).optional(),
    origin: z.string().optional(),
    status: z.enum(PROPOSAL_STATUS_VALUES).default("ativa"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.expiresAt) {
      return;
    }

    const proposedDate = new Date(data.proposedAt);
    const expiresDate = new Date(data.expiresAt);

    if (expiresDate < proposedDate) {
      ctx.addIssue({
        code: "custom",
        message: "expiresAt não pode ser menor que proposedAt",
        path: ["expiresAt"],
      });
    }
  });

export const DebtValueUpdateSchema = z.object({
  debtId: z.string().uuid(),
  recordedValue: z.number().int().positive(),
  recordedAt: z.string().regex(dateRegex),
  source: z.string().optional(),
  notes: z.string().optional(),
});
