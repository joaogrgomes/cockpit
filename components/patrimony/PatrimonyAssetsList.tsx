"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import {
  getPatrimonyAssetStatusLabel,
  getPatrimonyAssetTypeLabel,
} from "@/lib/patrimony";
import type { PatrimonyAssetView } from "@/lib/patrimony";
import { PatrimonyAssetForm } from "./PatrimonyAssetForm";

type PatrimonyActionResult = {
  ok: boolean;
  error?: string;
};

type PatrimonyAssetsListProps = {
  assets: PatrimonyAssetView[];
  updateAction: (formData: FormData) => Promise<PatrimonyActionResult>;
  archiveAction: (formData: FormData) => Promise<PatrimonyActionResult>;
};

function PatrimonyAssetCard({
  asset,
  updateAction,
  archiveAction,
}: {
  asset: PatrimonyAssetView;
  updateAction: (formData: FormData) => Promise<PatrimonyActionResult>;
  archiveAction: (formData: FormData) => Promise<PatrimonyActionResult>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingArchive, startArchive] = useTransition();
  const archived = asset.status === "archived";

  return (
    <Card className={archived ? "border-border/60 bg-muted/30 shadow-sm" : "border-border/80 shadow-sm"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{asset.name}</CardTitle>
            <CardDescription>
              {asset.institution?.trim() ? asset.institution : "Sem instituição"}
              {asset.productName?.trim() ? ` · ${asset.productName}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={archived ? "outline" : "default"}>{getPatrimonyAssetStatusLabel(asset.status)}</Badge>
            <Badge variant={asset.isReserved ? "secondary" : "outline"}>
              {asset.isReserved ? "Comprometido" : "Livre"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{formatBRL(asset.balanceCents)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tipo
            </p>
            <p className="mt-2 text-sm font-medium">{getPatrimonyAssetTypeLabel(asset.assetType)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {asset.liquidity?.trim() ? `Liquidez: ${asset.liquidity}` : "Liquidez não informada"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Objetivo
            </p>
            <p className="mt-2 text-sm font-medium">{asset.objective}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rentabilidade
            </p>
            <p className="mt-2 text-sm font-medium">
              {asset.profitabilityLabel?.trim() ? asset.profitabilityLabel : "Não informada"}
            </p>
          </div>
        </div>

        {asset.notes?.trim() ? (
          <p className="text-sm text-muted-foreground">{asset.notes}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {archived ? (
            <Button variant="outline" size="sm" disabled>
              Arquivado
            </Button>
          ) : (
            <>
              <PatrimonyAssetForm mode="edit" asset={asset} action={updateAction} />

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="sm">
                      Arquivar
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar ativo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O ativo continuará salvo, mas sairá dos totais do Patrimônio.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isPendingArchive}
                      onClick={() => {
                        setError(null);
                        startArchive(async () => {
                          const formData = new FormData();
                          formData.set("assetId", asset.id);

                          const result = await archiveAction(formData);
                          if (!result.ok) {
                            setError(result.error ?? "Falha ao arquivar o ativo.");
                            return;
                          }

                          router.refresh();
                        });
                      }}
                    >
                      {isPendingArchive ? "Arquivando..." : "Confirmar arquivamento"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PatrimonyAssetsList({ assets, updateAction, archiveAction }: PatrimonyAssetsListProps) {
  if (assets.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum ativo cadastrado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {assets.map((asset) => (
        <PatrimonyAssetCard
          key={asset.id}
          asset={asset}
          updateAction={updateAction}
          archiveAction={archiveAction}
        />
      ))}
    </div>
  );
}
