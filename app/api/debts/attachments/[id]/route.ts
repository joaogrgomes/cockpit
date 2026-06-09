import { NextResponse } from "next/server";
import { getDebtAttachmentById, readDebtAttachmentFile } from "@/lib/services/debt-attachment.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildContentDisposition(filename: string): string {
  const safeName = filename.replace(/["\\]/g, "_");
  return `attachment; filename="${safeName}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = await params;
  const attachment = await getDebtAttachmentById(id);

  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  try {
    const fileBuffer = await readDebtAttachmentFile(attachment);

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": buildContentDisposition(attachment.filename),
      },
    });
  } catch {
    return NextResponse.json({ error: "Anexo não encontrado no armazenamento." }, { status: 404 });
  }
}
