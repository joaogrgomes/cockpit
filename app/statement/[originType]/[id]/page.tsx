import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatementEntryDetail } from "@/components/statement/StatementEntryDetail";
import { isStatementOriginType } from "@/lib/statement";
import { getStatementEntryDetail } from "@/lib/services/statement-entry.service";
import {
  deleteStatementEntryAction,
  updateStatementEntryAction,
} from "./actions";
import { cn } from "@/lib/utils";

type StatementEntryPageProps = {
  params: Promise<{
    originType: string;
    id: string;
  }>;
};

export default async function StatementEntryPage({ params }: StatementEntryPageProps) {
  const { originType, id } = await params;

  if (!isStatementOriginType(originType)) {
    notFound();
  }

  const entry = await getStatementEntryDetail(originType, id);
  if (!entry) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={entry.description}
        description={`Extrato detalhado · ${entry.sourceLabel} · ${
          entry.kind === "income" ? "Entrada" : "Gasto"
        }`}
        actions={
          <Link
            href={`/statement?month=${entry.periodMonth}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
          >
            Voltar
          </Link>
        }
      />

      <StatementEntryDetail
        entry={entry}
        updateAction={updateStatementEntryAction}
        deleteAction={deleteStatementEntryAction}
      />
    </section>
  );
}
