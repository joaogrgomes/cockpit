import { z } from "zod";
import {
  DEBT_STATUS_VALUES,
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  FUTURE_INCOME_STATUS_VALUES,
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  PAYMENT_METHOD_VALUES,
  PROPOSAL_STATUS_VALUES,
} from "@/lib/db/schema";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const optionalPositiveInt = z.number().int().positive().optional();
const PERCEIVED_RISK_VALUES = [
  "baixo",
  "medio",
  "alto",
  "juridico",
  "consignado",
  "negativacao",
  "nao_sei",
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

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
    perceivedRisk: z.enum(PERCEIVED_RISK_VALUES).nullish(),
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

export const DebtValueUpdateSchema = z
  .object({
    debtId: z.string().uuid(),
    recordedValue: z.number().int().positive(),
    recordedAt: z.string().regex(dateRegex),
    source: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recordedAt > todayIsoDate()) {
      ctx.addIssue({
        code: "custom",
        message: "recordedAt não pode ser uma data futura",
        path: ["recordedAt"],
      });
    }
  });

export const MonthlyExpenseSchema = z.object({
  name: z.string().min(2),
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  amount: z.number().int().positive(),
  expenseType: z.enum(EXPENSE_TYPE_VALUES),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).nullish(),
  dueDay: z.number().int().min(1).max(31).nullish(),
  dueLabel: z.string().trim().min(1).nullish(),
  notes: z.string().trim().min(1).nullish(),
  isActive: z.boolean().default(true),
});

export const MonthlyExpenseEntrySchema = z
  .object({
    monthlyExpenseId: z.string().uuid(),
    periodMonth: z.string().regex(periodMonthRegex),
    amount: z.number().int().positive(),
    paidAt: z.string().regex(dateRegex),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES).nullish(),
    notes: z.string().trim().min(1).nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.paidAt > todayIsoDate()) {
      ctx.addIssue({
        code: "custom",
        message: "paidAt não pode ser uma data futura",
        path: ["paidAt"],
      });
    }
  });

export const MonthlyIncomeSchema = z.object({
  name: z.string().min(2),
  category: z.enum(INCOME_CATEGORY_VALUES),
  amount: z.number().int().positive(),
  expectedDay: z.number().int().min(1).max(31).nullish(),
  paymentMethod: z.enum(INCOME_PAYMENT_METHOD_VALUES).nullish(),
  notes: z.string().trim().min(1).nullish(),
  isActive: z.boolean().default(true),
});

export const MonthlyIncomeEntrySchema = z
  .object({
    monthlyIncomeId: z.string().uuid().nullish(),
    name: z.string().trim().min(2).nullish(),
    category: z.enum(INCOME_CATEGORY_VALUES).nullish(),
    periodMonth: z.string().regex(periodMonthRegex),
    amount: z.number().int().positive(),
    receivedAt: z.string().regex(dateRegex),
    paymentMethod: z.enum(INCOME_PAYMENT_METHOD_VALUES).nullish(),
    notes: z.string().trim().min(1).nullish(),
  })
  .superRefine((data, ctx) => {
    if (!data.monthlyIncomeId) {
      if (!data.name) {
        ctx.addIssue({
          code: "custom",
          message: "name é obrigatório para entrada avulsa",
          path: ["name"],
        });
      }

      if (!data.category) {
        ctx.addIssue({
          code: "custom",
          message: "category é obrigatório para entrada avulsa",
          path: ["category"],
        });
      }
    }

    if (data.receivedAt > todayIsoDate()) {
      ctx.addIssue({
        code: "custom",
        message: "receivedAt não pode ser uma data futura",
        path: ["receivedAt"],
      });
    }
  });

export const FutureIncomeReceivableSchema = z.object({
  name: z.string().trim().min(2),
  category: z.enum(INCOME_CATEGORY_VALUES),
  expectedAmount: z.number().int().positive(),
  expectedDate: z.string().regex(dateRegex),
  status: z.enum(FUTURE_INCOME_STATUS_VALUES).default("prevista"),
  notes: z.string().trim().min(1).nullish(),
});

export const MarkFutureIncomeAsReceivedSchema = z
  .object({
    futureIncomeId: z.string().uuid(),
    receivedAmount: z.number().int().positive(),
    receivedAt: z.string().regex(dateRegex),
    paymentMethod: z.enum(INCOME_PAYMENT_METHOD_VALUES).nullish(),
    notes: z.string().trim().min(1).nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.receivedAt > todayIsoDate()) {
      ctx.addIssue({
        code: "custom",
        message: "receivedAt não pode ser uma data futura",
        path: ["receivedAt"],
      });
    }
  });

export const CashFlowSettingsSchema = z.object({
  startMonth: z.string().regex(periodMonthRegex),
  initialBalance: z.number().int(),
});

export const MonthlyClosingSchema = z.object({
  periodMonth: z.string().regex(periodMonthRegex),
});
