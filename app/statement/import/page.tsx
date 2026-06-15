import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatementImportUploader } from "@/components/statement-import/StatementImportUploader";
import { StatementImportReviewTable } from "@/components/statement-import/StatementImportReviewTable";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import { listMonthlyIncomes } from "@/lib/services/monthly-income.service";
import { getStatementImportBatchWithRows } from "@/lib/services/statement-import.service";
import {
  commitStatementImportRowsAction,
  uploadStatementCsvAction,
} from "./actions";

export const dynamic = "force-dynamic";

type StatementImportPageProps = {
  searchParams?: Promise<{
    batchId?: string;
    inserted?: string;
    duplicates?: string;
  }>;
};

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default async function StatementImportPage({ searchParams }: StatementImportPageProps) {
  const params = searchParams ? await searchParams : {};
  const batchId = typeof params.batchId === "string" ? params.batchId : null;
  const insertedCount = parseCount(params.inserted);
  const duplicateCount = parseCount(params.duplicates);

  const batchData = batchId ? await getStatementImportBatchWithRows(batchId) : null;
  const monthlyExpenses = batchData ? await listMonthlyExpenses({ isActive: "true" }) : [];
  const monthlyIncomes = batchData ? await listMonthlyIncomes({ isActive: "true" }) : [];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Importar extrato"
        description="Envie o CSV do Banco Inter, revise linha por linha e confirme só o que deve virar lançamento."
        actions={
          <Link href="/statement" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Voltar ao extrato
          </Link>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fluxo do MVP</CardTitle>
          <CardDescription>
            Upload do CSV, staging, revisão manual e gravação só após confirmação.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O parser usa o cabeçalho <code>Data Lançamento;Histórico;Descrição;Valor;Saldo</code> e
          preserva o saldo por transação como apoio visual.
        </CardContent>
      </Card>

      {typeof insertedCount === "number" || typeof duplicateCount === "number" ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Último upload</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {insertedCount !== null ? <p>Linhas novas: {insertedCount}</p> : null}
            {duplicateCount !== null ? <p>Duplicadas ignoradas: {duplicateCount}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {!batchData ? (
        <StatementImportUploader action={uploadStatementCsvAction} />
      ) : (
        <div className="space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lote selecionado</CardTitle>
              <CardDescription>
                {batchData.batch.originalFilename ? `Arquivo: ${batchData.batch.originalFilename}` : "Arquivo sem nome"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <p>Status: {batchData.batch.status}</p>
              <p>
                Período:{" "}
                {batchData.batch.periodStart && batchData.batch.periodEnd
                  ? `${formatDateOnlyBR(batchData.batch.periodStart)} a ${formatDateOnlyBR(batchData.batch.periodEnd)}`
                  : "não identificado"}
              </p>
              <p>Linhas em staging: {batchData.rows.length}</p>
            </CardContent>
          </Card>

          {batchData.rows.length > 0 ? (
            <StatementImportReviewTable
              batchId={batchData.batch.id}
              rows={batchData.rows}
              monthlyExpenses={monthlyExpenses}
              monthlyIncomes={monthlyIncomes}
              action={commitStatementImportRowsAction}
            />
          ) : (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma linha nova encontrada para revisar. Se este arquivo já tiver sido importado,
                o dedupe por hash impediu novas linhas.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
