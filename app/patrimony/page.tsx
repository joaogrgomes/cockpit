import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import {
  calculatePatrimonyDashboard,
  type PatrimonyAssetView,
} from "@/lib/patrimony";
import {
  getPatrimonyLiabilitiesSummary,
  listPatrimonyAssets,
} from "@/lib/services/patrimony.service";
import { createPatrimonyAssetAction, archivePatrimonyAssetAction, updatePatrimonyAssetAction } from "./actions";
import { PatrimonyAssetForm } from "@/components/patrimony/PatrimonyAssetForm";
import { PatrimonyDashboardCards } from "@/components/patrimony/PatrimonyDashboardCards";
import { PatrimonyAssetsList } from "@/components/patrimony/PatrimonyAssetsList";

export const dynamic = "force-dynamic";

function renderGroupedItems(items: Array<{ label: string; totalCents: number; count: number }>) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum ativo cadastrado.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
          <div>
            <p className="font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.count} ativo(s)</p>
          </div>
          <span className="font-medium tabular-nums">{formatBRL(item.totalCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PatrimonyPage() {
  const [assets, liabilities] = await Promise.all([
    listPatrimonyAssets(),
    getPatrimonyLiabilitiesSummary(),
  ]);
  const dashboard = calculatePatrimonyDashboard(assets, liabilities);
  const clientAssets: PatrimonyAssetView[] = assets.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...asset }) => asset);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Patrimônio"
        description="Use este módulo para registrar onde está seu dinheiro e qual é a finalidade de cada parte dele. Não é um controle de investimentos, é uma visão patrimonial."
        actions={<PatrimonyAssetForm mode="create" action={createPatrimonyAssetAction} />}
      />

      <PatrimonyDashboardCards dashboard={dashboard} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como interpretar</CardTitle>
          <CardDescription>
            Patrimônio é a fotografia do que existe hoje. Aqui você separa dinheiro livre,
            comprometido e os objetivos de cada posição, sem acompanhar cotação diária ou
            rentabilidade detalhada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atualize manualmente conforme seu cenário mudar. Os totais acima consideram apenas
            ativos com status ativo.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por objetivo</CardTitle>
            <CardDescription>Quanto de patrimônio está alocado em cada finalidade.</CardDescription>
          </CardHeader>
          <CardContent>{renderGroupedItems(dashboard.byObjective)}</CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por instituição</CardTitle>
            <CardDescription>Onde o patrimônio está guardado hoje.</CardDescription>
          </CardHeader>
          <CardContent>{renderGroupedItems(dashboard.byInstitution)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por tipo de ativo</CardTitle>
            <CardDescription>Distribuição do patrimônio por conta, reserva, investimento e bens.</CardDescription>
          </CardHeader>
          <CardContent>{renderGroupedItems(dashboard.byAssetType)}</CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por liquidez</CardTitle>
            <CardDescription>Quanto é imediato, alto, médio, baixo ou muito baixo.</CardDescription>
          </CardHeader>
          <CardContent>{renderGroupedItems(dashboard.byLiquidity)}</CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ativos patrimoniais</CardTitle>
          <CardDescription>
            Cadastre posições manualmente enquanto o módulo ainda não conversa com Open Finance.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <PatrimonyAssetsList
            assets={clientAssets}
            updateAction={updatePatrimonyAssetAction}
            archiveAction={archivePatrimonyAssetAction}
          />
        </CardContent>
      </Card>
    </section>
  );
}
