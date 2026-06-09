import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { debtAttachments } from "@/lib/db/schema";
import { validateDebtAttachmentFile } from "@/lib/debt-attachment-validation";
import type { DebtAttachment, DebtAttachmentType } from "@/types";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function sanitizeFilename(filename: string): string {
  const normalized = filename.trim().replace(/[^\w.\-]+/g, "_");
  return normalized.length > 0 ? normalized.slice(0, 180) : "arquivo";
}

function buildStorageRelativePath(debtId: string, attachmentId: string, filename: string): string {
  return path.join("debt-attachments", debtId, `${attachmentId}__${sanitizeFilename(filename)}`);
}

export function resolveDebtAttachmentAbsolutePath(storagePath: string): string | null {
  if (!storagePath || path.isAbsolute(storagePath)) {
    return null;
  }

  const resolved = path.resolve(STORAGE_ROOT, storagePath);
  const normalizedRoot = path.resolve(STORAGE_ROOT);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return resolved;
}

export type CreateDebtAttachmentInput = {
  debtId: string;
  type: DebtAttachmentType;
  file: File;
  notes?: string | null;
};

export async function listDebtAttachmentsByDebtId(
  debtId: string
): Promise<DebtAttachment[]> {
  const db = getDb();
  return db
    .select()
    .from(debtAttachments)
    .where(eq(debtAttachments.debtId, debtId))
    .orderBy(desc(debtAttachments.createdAt));
}

export async function getDebtAttachmentById(id: string): Promise<DebtAttachment | null> {
  const db = getDb();
  const result = await db.select().from(debtAttachments).where(eq(debtAttachments.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createDebtAttachment(input: CreateDebtAttachmentInput): Promise<DebtAttachment> {
  const db = getDb();
  const validationError = validateDebtAttachmentFile(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const attachmentId = crypto.randomUUID();
  const relativePath = buildStorageRelativePath(input.debtId, attachmentId, input.file.name);
  const absolutePath = resolveDebtAttachmentAbsolutePath(relativePath);

  if (!absolutePath) {
    throw new Error("Não foi possível preparar o caminho do anexo.");
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });

  try {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    const created = await db
      .insert(debtAttachments)
      .values({
        id: attachmentId,
        debtId: input.debtId,
        type: input.type,
        filename: input.file.name || "arquivo",
        storagePath: relativePath,
        mimeType: input.file.type || null,
        sizeBytes: input.file.size,
        notes: input.notes ?? null,
      })
      .returning();

    return created[0];
  } catch (error) {
    await rm(absolutePath, { force: true });
    throw error;
  }
}

export async function readDebtAttachmentFile(attachment: DebtAttachment): Promise<Buffer> {
  const absolutePath = resolveDebtAttachmentAbsolutePath(attachment.storagePath);
  if (!absolutePath) {
    throw new Error("Caminho de anexo inválido.");
  }

  return readFile(absolutePath);
}
