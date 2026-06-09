import type { DebtAttachmentType } from "@/types";

export const MAX_DEBT_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_DEBT_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function validateDebtAttachmentFile(file: File): string | null {
  if (file.size > MAX_DEBT_ATTACHMENT_SIZE) {
    return "O arquivo é muito grande. Envie um arquivo de até 10 MB.";
  }

  if (!ALLOWED_DEBT_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return "Tipo de arquivo não permitido. Envie PDF, PNG, JPG/JPEG ou WebP.";
  }

  return null;
}

export function isValidDebtAttachmentType(value: string): value is DebtAttachmentType {
  return (
    value === "proposal_slip" ||
    value === "whatsapp_screenshot" ||
    value === "payment_receipt" ||
    value === "serasa_clearance" ||
    value === "other"
  );
}
