"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseInterCsvStatement, type StatementImportReviewedRow } from "@/lib/statement-import";
import {
  commitStatementImportBatch,
  createStatementImportBatchWithRows,
  type StatementImportBatchCreateResult,
} from "@/lib/services/statement-import.service";

export type StatementImportActionResult = {
  ok: boolean;
  error?: string;
  fieldErrorsByRowId?: Record<string, string[]>;
};

function parseFileFromFormData(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File ? file : null;
}

function parseRowsPayload(formData: FormData): StatementImportReviewedRow[] {
  const payload = formData.get("rowsJson");
  if (typeof payload !== "string" || !payload.trim()) {
    return [];
  }

  const parsed = JSON.parse(payload) as StatementImportReviewedRow[];
  return parsed;
}

function revalidateImportedPaths(batchId: string) {
  revalidatePath("/statement/import");
  revalidatePath(`/statement/import?batchId=${batchId}`);
  revalidatePath("/statement");
  revalidatePath("/expenses/tracking");
  revalidatePath("/incomes/tracking");
  revalidatePath("/cash-flow");
  revalidatePath("/reconciliation");
}

export async function uploadStatementCsvAction(
  _prevState: StatementImportActionResult,
  formData: FormData
): Promise<StatementImportActionResult> {
  let result: StatementImportBatchCreateResult | null = null;

  try {
    const file = parseFileFromFormData(formData);
    if (!file) {
      return { ok: false, error: "Selecione um arquivo CSV" };
    }

    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
      return { ok: false, error: "Envie um arquivo CSV válido" };
    }

    const content = await file.text();
    const items = parseInterCsvStatement(content);

    if (items.length === 0) {
      return { ok: false, error: "Nenhuma linha de lançamento foi encontrada no CSV" };
    }

    result = await createStatementImportBatchWithRows(
      {
        source: "inter_csv",
        originalFilename: file.name,
      },
      items
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler o CSV";
    return { ok: false, error: message };
  }

  if (!result) {
    return { ok: false, error: "Não foi possível ler o CSV" };
  }

  revalidatePath("/statement/import");

  if (result.kind === "created_batch") {
    redirect(
      `/statement/import?batchId=${result.batchId}&new=${result.insertedCount}&duplicates=${result.duplicateCount}`
    );
  }

  const duplicateSearchParams = new URLSearchParams({
    duplicate: "1",
    duplicates: String(result.duplicateCount),
  });

  if (result.existingBatchId) {
    duplicateSearchParams.set("existingBatchId", result.existingBatchId);
  }

  redirect(`/statement/import?${duplicateSearchParams.toString()}`);
}

export async function commitStatementImportRowsAction(
  _prevState: StatementImportActionResult,
  formData: FormData
): Promise<StatementImportActionResult> {
  let batchId: string | null = null;

  try {
    const batchIdValue = formData.get("batchId");
    if (typeof batchIdValue !== "string" || !batchIdValue) {
      return { ok: false, error: "Lote de importação inválido" };
    }
    batchId = batchIdValue;

    const rows = parseRowsPayload(formData);
    if (rows.length === 0) {
      return { ok: false, error: "Nenhuma linha foi enviada para importação" };
    }

    const result = await commitStatementImportBatch(batchId, rows);
    if (!result.ok) {
      return result;
    }

    revalidateImportedPaths(batchId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível importar os lançamentos";
    return { ok: false, error: message };
  }

  if (!batchId) {
    return { ok: false, error: "Lote de importação inválido" };
  }

  redirect(`/statement/import?batchId=${batchId}`);
}
