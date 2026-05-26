import { NextResponse } from "next/server";
import { runConnectionTest } from "@/lib/db";

export async function GET() {
  try {
    const result = await runConnectionTest();

    return NextResponse.json({
      ok: true,
      rows: result,
    });
  } catch (error) {
    const typedError = error as {
      name?: string;
      message?: string;
      code?: string;
      cause?: {
        name?: string;
        message?: string;
        code?: string;
      };
    };

    return NextResponse.json(
      {
        ok: false,
        errorName: typedError?.name ?? "UnknownError",
        errorMessage: typedError?.message ?? "Erro desconhecido ao testar conexão",
        errorCode: typedError?.code ?? null,
        causeName: typedError?.cause?.name ?? null,
        causeMessage: typedError?.cause?.message ?? null,
        causeCode: typedError?.cause?.code ?? null,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      { status: 500 }
    );
  }
}
