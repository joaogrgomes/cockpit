import { DebtForm } from "@/components/debt/DebtForm";
import { DebtSelectionExplorer } from "@/components/debt/DebtSelectionExplorer";
import { PageHeader } from "@/components/layout/page-header";
import { listDebtSelectionItems } from "@/lib/services/debt-selection.service";
import { createDebtAction, deleteDebtAction, updateDebtAction } from "./actions";

export default async function DebtsPage() {
  const debts = await listDebtSelectionItems();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dívidas"
        description="Filtre grupos de dívidas, simule cenários de quitação e compare propostas à vista."
        actions={<DebtForm mode="create" action={createDebtAction} />}
      />

      <DebtSelectionExplorer
        debts={debts}
        updateAction={updateDebtAction}
        deleteAction={deleteDebtAction}
      />
    </section>
  );
}
