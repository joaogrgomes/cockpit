"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { StatementEntryActionResult } from "@/app/statement/[originType]/[id]/actions";

type DeleteStatementEntryButtonProps = {
  originType: string;
  id: string;
  periodMonth: string;
  action: (formData: FormData) => Promise<StatementEntryActionResult>;
};

export function DeleteStatementEntryButton({
  originType,
  id,
  periodMonth,
  action,
}: DeleteStatementEntryButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm">
            Excluir lançamento
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Excluir este lançamento removerá ele do extrato, acompanhamento e fluxo de caixa. Esta
            ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          action={action as unknown as (formData: FormData) => void | Promise<void>}
          className="contents"
        >
          <input type="hidden" name="originType" value={originType} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="periodMonth" value={periodMonth} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive">
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
