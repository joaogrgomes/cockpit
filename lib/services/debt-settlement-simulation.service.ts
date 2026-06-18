import "server-only";

import { listDebtSettlementOptions } from "@/lib/services/debt-settlement-option.service";
import { listDebts } from "@/lib/services/debt.service";
import type { DebtSettlementSimulationDebt } from "@/lib/debt-settlement-simulation";

export async function listDebtSettlementSimulationDebts(): Promise<DebtSettlementSimulationDebt[]> {
  const debts = await listDebts({
    showArchived: false,
    sort: "current_desc",
  });

  if (debts.length === 0) {
    return [];
  }

  const simulationDebts = await Promise.all(
    debts.map(async (debt) => {
      const settlementOptions = (await listDebtSettlementOptions(debt.id)).filter(
        (option) => option.status !== "rejected"
      );

      if (!settlementOptions.some((option) => option.status === "active" || option.status === "accepted")) {
        return null;
      }

      return {
        ...debt,
        settlementOptions,
      } satisfies DebtSettlementSimulationDebt;
    })
  );

  return simulationDebts.filter((item): item is DebtSettlementSimulationDebt => item !== null);
}
