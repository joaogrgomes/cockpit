"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatementImportActionResult } from "@/app/statement/import/actions";

type StatementImportUploaderProps = {
  action: (
    prevState: StatementImportActionResult,
    formData: FormData
  ) => Promise<StatementImportActionResult>;
};

const initialState: StatementImportActionResult = { ok: false };

function SubmitButton() {
  return (
    <Button type="submit" size="sm">
      Upload e revisar
    </Button>
  );
}

export function StatementImportUploader({ action }: StatementImportUploaderProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Importar CSV do Banco Inter</CardTitle>
        <CardDescription>
          Envie o extrato em CSV para revisar as linhas antes de gravar os lançamentos no Cockpit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="file">
              Arquivo CSV
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton />
            <p className="text-sm text-muted-foreground">
              O upload não grava nada até você revisar e confirmar.
            </p>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
