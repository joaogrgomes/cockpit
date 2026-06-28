import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDb } from "@/lib/db";
import { patrimonyAssets } from "@/lib/db/schema";
import { calculatePatrimonyDashboard, calculatePatrimonyTotals } from "@/lib/patrimony";
import { PatrimonyAssetSchema } from "@/lib/validations";
import {
  archivePatrimonyAsset,
  createPatrimonyAsset,
  getPatrimonyLiabilitiesSummary,
  listPatrimonyAssets,
  updatePatrimonyAsset,
} from "@/lib/services/patrimony.service";
import type { PatrimonyAsset } from "@/types";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

const mockedGetDb = vi.mocked(getDb);

function makeSelectQuery(resultRows: unknown[]) {
  const query: {
    where: () => unknown;
    orderBy: () => unknown;
    limit: (count: number) => Promise<unknown[]>;
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ) => Promise<TResult1 | TResult2>;
  } = {
    where: () => query,
    orderBy: () => query,
    limit: (count: number) => Promise.resolve(resultRows.slice(0, count)),
    then: (onfulfilled, onrejected) => Promise.resolve(resultRows).then(onfulfilled, onrejected),
  };

  return query;
}

function createDbMock({
  selectResults = [],
  insertResults = [],
  updateResults = [],
}: {
  selectResults?: unknown[][];
  insertResults?: unknown[][];
  updateResults?: unknown[][];
}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  let selectIndex = 0;
  let insertIndex = 0;
  let updateIndex = 0;

  const mockDb: any = {
    select: () => ({
      from: () => makeSelectQuery(selectResults[selectIndex++] ?? []),
    }),
    insert: (table: unknown) => ({
      values(values: unknown) {
        inserts.push({ table, values });
        return this;
      },
      returning() {
        return Promise.resolve(insertResults[insertIndex++] ?? []);
      },
    }),
    update: (table: unknown) => ({
      set(values: unknown) {
        updates.push({ table, values });
        return {
          where: () => ({
            returning: () => Promise.resolve(updateResults[updateIndex++] ?? []),
          }),
        };
      },
    }),
    inserts,
    updates,
  };

  return mockDb;
}

function makeAsset(overrides: Partial<PatrimonyAsset>): PatrimonyAsset {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Conta Inter",
    institution: overrides.institution ?? "Inter",
    productName: overrides.productName ?? "Porquinho",
    assetType: overrides.assetType ?? "piggy_bank",
    objective: overrides.objective ?? "Reserva de Emergência",
    balanceCents: overrides.balanceCents ?? 100_000,
    liquidity: overrides.liquidity ?? "imediata",
    profitabilityLabel: overrides.profitabilityLabel ?? "100% CDI",
    isReserved: overrides.isReserved ?? true,
    notes: overrides.notes ?? null,
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? new Date("2026-06-10T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-06-10T12:00:00.000Z"),
  };
}

beforeEach(() => {
  mockedGetDb.mockReset();
});

describe("patrimony helpers", () => {
  it("calcula patrimônio apenas com ativos ativos", () => {
    const totals = calculatePatrimonyTotals([
      makeAsset({ balanceCents: 800_000, objective: "Reserva de Emergência", isReserved: true }),
      makeAsset({
        balanceCents: 200_000,
        objective: "Reserva de Emergência",
        isReserved: false,
        institution: "Mercado Pago",
      }),
      makeAsset({
        balanceCents: 150_000,
        objective: "Manutenção do Carro",
        isReserved: true,
        status: "archived",
      }),
    ]);

    expect(totals.totalPatrimonyCents).toBe(1_000_000);
    expect(totals.reservedPatrimonyCents).toBe(800_000);
    expect(totals.freePatrimonyCents).toBe(200_000);
  });

  it("agrupa por objetivo, instituição e tipo", () => {
    const totals = calculatePatrimonyTotals([
      makeAsset({
        balanceCents: 800_000,
        objective: "Reserva de Emergência",
        institution: "Inter",
        assetType: "piggy_bank",
      }),
      makeAsset({
        balanceCents: 200_000,
        objective: "Reserva de Emergência",
        institution: "Mercado Pago",
        assetType: "savings",
        isReserved: false,
      }),
      makeAsset({
        balanceCents: 150_000,
        objective: "Manutenção do Carro",
        institution: "Inter",
        assetType: "cdb",
      }),
    ]);

    expect(totals.totalByObjective).toEqual([
      { label: "Reserva de Emergência", totalCents: 1_000_000, count: 2 },
      { label: "Manutenção do Carro", totalCents: 150_000, count: 1 },
    ]);
    expect(totals.totalByInstitution).toEqual([
      { label: "Inter", totalCents: 950_000, count: 2 },
      { label: "Mercado Pago", totalCents: 200_000, count: 1 },
    ]);
    expect(totals.totalByAssetType).toEqual([
      { label: "Porquinho", totalCents: 800_000, count: 1 },
      { label: "Poupança", totalCents: 200_000, count: 1 },
      { label: "CDB", totalCents: 150_000, count: 1 },
    ]);
  });

  it("monta a visão patrimonial consolidada", () => {
    const dashboard = calculatePatrimonyDashboard(
      [
        makeAsset({
          id: "cash-1",
          name: "Conta livre",
          objective: "Livre",
          assetType: "checking_account",
          balanceCents: 250_000,
          isReserved: false,
          liquidity: "imediata",
          institution: "Inter",
        }),
        makeAsset({
          id: "reserve-1",
          name: "Reserva emergência",
          objective: "Emergência",
          assetType: "piggy_bank",
          balanceCents: 400_000,
          isReserved: true,
          liquidity: "alta",
          institution: "Nubank",
        }),
        makeAsset({
          id: "pension-1",
          name: "Previ",
          objective: "Previdência",
          assetType: "other",
          balanceCents: 600_000,
          isReserved: false,
          liquidity: "muito baixa",
        }),
        makeAsset({
          id: "vehicle-1",
          name: "Prisma",
          objective: "Carro",
          assetType: "other",
          balanceCents: 500_000,
          isReserved: false,
          liquidity: "baixa",
        }),
        makeAsset({
          id: "archived-1",
          name: "Arquivado",
          objective: "Outro",
          assetType: "cdb",
          balanceCents: 900_000,
          isReserved: false,
          status: "archived",
        }),
      ],
      {
        totalOpenDebtsCents: 700_000,
        debtsCount: 2,
      }
    );

    expect(dashboard.grossAssetsCents).toBe(1_750_000);
    expect(dashboard.totalLiabilitiesCents).toBe(700_000);
    expect(dashboard.netWorthCents).toBe(1_050_000);
    expect(dashboard.availableNowCents).toBe(250_000);
    expect(dashboard.reservedCents).toBe(400_000);
    expect(dashboard.lowLiquidityCents).toBe(1_100_000);
    expect(dashboard.pensionCents).toBe(600_000);
    expect(dashboard.useAssetsCents).toBe(500_000);
    expect(dashboard.assetsCount).toBe(4);
    expect(dashboard.reservedAssetsCount).toBe(1);
    expect(dashboard.institutionsCount).toBe(2);
    expect(dashboard.byAssetType.map((item) => item.label)).toEqual([
      "Previdência",
      "Veículo",
      "Reserva",
      "Conta/Caixa",
    ]);
    expect(dashboard.byLiquidity.map((item) => item.label)).toEqual([
      "Imediata",
      "Alta",
      "Baixa",
      "Muito baixa",
    ]);
  });

  it("considera disponível agora apenas ativos financeiros não reservados com liquidez imediata ou alta", () => {
    const dashboard = calculatePatrimonyDashboard(
      [
        makeAsset({
          id: "cash-1",
          name: "Conta corrente",
          assetType: "checking_account",
          balanceCents: 100_000,
          isReserved: false,
          liquidity: "imediata",
          institution: "Inter",
        }),
        makeAsset({
          id: "cdb-1",
          name: "CDB liquidez alta",
          assetType: "cdb",
          balanceCents: 200_000,
          isReserved: false,
          liquidity: "alta",
          institution: "Nubank",
        }),
        makeAsset({
          id: "medium-1",
          name: "Fundo médio",
          assetType: "fund",
          balanceCents: 300_000,
          isReserved: false,
          liquidity: "média",
          institution: "BTG",
        }),
        makeAsset({
          id: "other-1",
          name: "Outro não financeiro",
          assetType: "other",
          balanceCents: 400_000,
          isReserved: false,
          liquidity: "imediata",
          institution: "Banco X",
        }),
        makeAsset({
          id: "reserve-1",
          name: "Reserva alta",
          assetType: "cdb",
          balanceCents: 500_000,
          isReserved: true,
          liquidity: "alta",
          institution: "Inter",
        }),
        makeAsset({
          id: "pension-1",
          name: "Previdência",
          assetType: "other",
          balanceCents: 600_000,
          isReserved: false,
          liquidity: "muito baixa",
        }),
        makeAsset({
          id: "vehicle-1",
          name: "Carro",
          assetType: "other",
          balanceCents: 700_000,
          isReserved: false,
          liquidity: "baixa",
        }),
        makeAsset({
          id: "real-estate-1",
          name: "Apartamento",
          assetType: "other",
          balanceCents: 800_000,
          isReserved: false,
          liquidity: "baixa",
        }),
      ],
      {
        totalOpenDebtsCents: 0,
        debtsCount: 0,
      }
    );

    expect(dashboard.availableNowCents).toBe(300_000);
    expect(dashboard.grossAssetsCents).toBe(3_600_000);
    expect(dashboard.reservedCents).toBe(500_000);
    expect(dashboard.lowLiquidityCents).toBe(2_100_000);
    expect(dashboard.pensionCents).toBe(600_000);
    expect(dashboard.useAssetsCents).toBe(1_500_000);
    expect(dashboard.reservedAssetsCount).toBe(1);
  });
});

describe("patrimony validation", () => {
  it("aceita um ativo patrimonial válido", () => {
    const result = PatrimonyAssetSchema.safeParse({
      assetId: null,
      name: "Conta Inter",
      institution: "Inter",
      productName: "Porquinho",
      assetType: "piggy_bank",
      objective: "Reserva de Emergência",
      balanceCents: 120_000,
      liquidity: "imediata",
      profitabilityLabel: "100% CDI",
      isReserved: true,
      notes: "Dinheiro guardado",
      status: "active",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita saldo negativo", () => {
    const result = PatrimonyAssetSchema.safeParse({
      assetId: null,
      name: "Conta Inter",
      institution: "Inter",
      productName: "Porquinho",
      assetType: "piggy_bank",
      objective: "Reserva de Emergência",
      balanceCents: -1,
      liquidity: "imediata",
      profitabilityLabel: "100% CDI",
      isReserved: true,
      notes: "Dinheiro guardado",
      status: "active",
    });

    expect(result.success).toBe(false);
  });
});

describe("patrimony service", () => {
  it("cria ativo válido", async () => {
    const mockDb = createDbMock({
      insertResults: [[
        {
          id: "asset-1",
          name: "Conta Inter",
          institution: "Inter",
          productName: "Porquinho",
          assetType: "piggy_bank",
          objective: "Reserva de Emergência",
          balanceCents: 120_000,
          liquidity: "imediata",
          profitabilityLabel: "100% CDI",
          isReserved: true,
          notes: null,
          status: "active",
          createdAt: new Date("2026-06-10T12:00:00.000Z"),
          updatedAt: new Date("2026-06-10T12:00:00.000Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createPatrimonyAsset({
      name: "Conta Inter",
      institution: "Inter",
      productName: "Porquinho",
      assetType: "piggy_bank",
      objective: "Reserva de Emergência",
      balanceCents: 120_000,
      liquidity: "imediata",
      profitabilityLabel: "100% CDI",
      isReserved: true,
      notes: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.asset).toMatchObject({
        name: "Conta Inter",
        assetType: "piggy_bank",
        status: "active",
      });
    }

    const insert = mockDb.inserts.find((item: any) => item.table === patrimonyAssets);
    expect(insert).toBeTruthy();
  });

  it("atualiza saldo e objetivo", async () => {
    const mockDb = createDbMock({
      selectResults: [[makeAsset({ id: "asset-1", balanceCents: 120_000, objective: "Reserva" })]],
      updateResults: [[
        {
          id: "asset-1",
          name: "Conta Inter",
          institution: "Inter",
          productName: "Porquinho",
          assetType: "piggy_bank",
          objective: "Reserva de Emergência",
          balanceCents: 180_000,
          liquidity: "imediata",
          profitabilityLabel: "100% CDI",
          isReserved: true,
          notes: null,
          status: "active",
          createdAt: new Date("2026-06-10T12:00:00.000Z"),
          updatedAt: new Date("2026-06-11T12:00:00.000Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await updatePatrimonyAsset("asset-1", {
      name: "Conta Inter",
      institution: "Inter",
      productName: "Porquinho",
      assetType: "piggy_bank",
      objective: "Reserva de Emergência",
      balanceCents: 180_000,
      liquidity: "imediata",
      profitabilityLabel: "100% CDI",
      isReserved: true,
      notes: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.asset.balanceCents).toBe(180_000);
      expect(result.asset.objective).toBe("Reserva de Emergência");
    }
  });

  it("arquiva ativo e ele sai dos totais", async () => {
    const mockDb = createDbMock({
      selectResults: [[makeAsset({ id: "asset-1", balanceCents: 120_000, status: "active" })]],
      updateResults: [[
        {
          id: "asset-1",
          name: "Conta Inter",
          institution: "Inter",
          productName: "Porquinho",
          assetType: "piggy_bank",
          objective: "Reserva de Emergência",
          balanceCents: 120_000,
          liquidity: "imediata",
          profitabilityLabel: "100% CDI",
          isReserved: true,
          notes: null,
          status: "archived",
          createdAt: new Date("2026-06-10T12:00:00.000Z"),
          updatedAt: new Date("2026-06-11T12:00:00.000Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await archivePatrimonyAsset("asset-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.asset.status).toBe("archived");
    }
  });

  it("lista ativos com arquivados no fim", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        makeAsset({ id: "archived-1", name: "CDB", status: "archived", balanceCents: 50_000 }),
        makeAsset({ id: "active-1", name: "Conta Inter", status: "active", balanceCents: 100_000 }),
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const assets = await listPatrimonyAssets();

    expect(assets.map((asset) => asset.id)).toEqual(["active-1", "archived-1"]);
  });

  it("soma passivos abertos para o dashboard", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        { currentValue: 120_000 },
        { currentValue: 380_000 },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const summary = await getPatrimonyLiabilitiesSummary();

    expect(summary).toEqual({
      totalOpenDebtsCents: 500_000,
      debtsCount: 2,
    });
  });
});
