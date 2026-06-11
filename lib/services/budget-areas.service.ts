import "server-only";

import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import { listMonthlyIncomes } from "@/lib/services/monthly-income.service";
import {
  calculateBudgetAreasAnalysis,
  getDefaultBudgetAreaModel,
  sumBudgetAreaBaseIncome,
  type BudgetAreaExpenseItem,
  type BudgetAreaIncomeItem,
  type BudgetAreaModel,
  type BudgetAreasAnalysis,
} from "@/lib/budget-areas";

export type BudgetAreasViewModel = {
  referenceMonth: string;
  defaultBaseIncomeCents: number;
  expenseItems: BudgetAreaExpenseItem[];
  model: BudgetAreaModel;
  defaultAnalysis: BudgetAreasAnalysis;
};

export async function getBudgetAreasViewModel(
  referenceMonth: string
): Promise<BudgetAreasViewModel> {
  const [monthlyIncomes, monthlyExpenses] = await Promise.all([
    listMonthlyIncomes({
      periodMonth: referenceMonth,
      isActive: "true",
    }),
    listMonthlyExpenses({
      periodMonth: referenceMonth,
      isActive: "true",
    }),
  ]);

  const incomeItems: BudgetAreaIncomeItem[] = monthlyIncomes.map((income) => ({
    id: income.id,
    name: income.name,
    category: income.category,
    amount: income.amount,
    startMonth: income.startMonth,
    endMonth: income.endMonth,
  }));

  const defaultBaseIncomeCents = sumBudgetAreaBaseIncome(incomeItems, referenceMonth);
  const expenseItems: BudgetAreaExpenseItem[] = monthlyExpenses.map((expense) => ({
    id: expense.id,
    name: expense.name,
    category: expense.category,
    expenseType: expense.expenseType,
    amount: expense.amount,
    startMonth: expense.startMonth,
    endMonth: expense.endMonth,
  }));

  const model = getDefaultBudgetAreaModel();

  return {
    referenceMonth,
    defaultBaseIncomeCents,
    expenseItems,
    model,
    defaultAnalysis: calculateBudgetAreasAnalysis({
      referenceMonth,
      baseIncomeCents: defaultBaseIncomeCents,
      expenseItems,
      model,
    }),
  };
}
