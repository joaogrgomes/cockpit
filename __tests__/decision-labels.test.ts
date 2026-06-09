import { describe, expect, it } from "vitest";
import { buildDecisionItems } from "@/lib/decision-labels";

describe("buildDecisionItems", () => {
  it("aplica múltiplos rótulos e exclui dívidas quitadas", () => {
    const now = new Date(2026, 5, 10);

    const items = buildDecisionItems(
      [
        {
          id: "debt-a",
          name: "Dívida A",
          creditor: "Banco A",
          status: "em_aberto",
          currentValue: 100_000,
          originalValue: 50_000,
          lastUpdatedAt: "2026-04-20T10:00:00.000Z",
          priority: "alta",
          perceivedRisk: "medio",
          activeProposal: {
            proposedValue: 70_000,
            expiresAt: "2026-06-15",
          },
        },
        {
          id: "debt-b",
          name: "Dívida B",
          creditor: "Banco B",
          status: "em_negociacao",
          currentValue: 60_000,
          originalValue: 40_000,
          lastUpdatedAt: "2026-06-05T10:00:00.000Z",
          priority: "critica",
          perceivedRisk: "alto",
          activeProposal: {
            proposedValue: 55_000,
            expiresAt: "2026-07-01",
          },
        },
        {
          id: "debt-c",
          name: "Dívida C",
          creditor: "Banco C",
          status: "em_aberto",
          currentValue: 40_000,
          originalValue: 20_000,
          lastUpdatedAt: "2026-04-20T10:00:00.000Z",
          priority: "baixa",
          perceivedRisk: "baixo",
          activeProposal: null,
        },
        {
          id: "debt-d",
          name: "Dívida D",
          creditor: "Banco D",
          status: "quitada",
          currentValue: 10_000,
          originalValue: 10_000,
          lastUpdatedAt: "2026-06-01T10:00:00.000Z",
          priority: "critica",
          perceivedRisk: "juridico",
          activeProposal: {
            proposedValue: 1_000,
            expiresAt: "2026-06-12",
          },
        },
        {
          id: "debt-e",
          name: "Dívida E",
          creditor: "Banco E",
          status: "arquivada",
          currentValue: 15_000,
          originalValue: 15_000,
          lastUpdatedAt: "2026-06-01T10:00:00.000Z",
          priority: "media",
          perceivedRisk: "baixo",
          activeProposal: null,
        },
      ],
      now
    );

    const byId = new Map(items.map((item) => [item.id, item]));

    expect(byId.has("debt-d")).toBe(false);
    expect(byId.has("debt-e")).toBe(false);

    const debtA = byId.get("debt-a");
    const debtB = byId.get("debt-b");
    const debtC = byId.get("debt-c");

    expect(debtA).toBeDefined();
    expect(debtB).toBeDefined();
    expect(debtC).toBeDefined();

    const labelsA = debtA?.labels.map((label) => label.key) ?? [];
    expect(labelsA).toContain("melhor_oportunidade_quitacao");
    expect(labelsA).toContain("mais_cara_em_crescimento");
    expect(labelsA).toContain("proposta_vencendo");
    expect(labelsA).toContain("precisa_atualizar_valor");
    expect(
      debtA?.labels.find((label) => label.key === "melhor_oportunidade_quitacao")?.reason
    ).toBe("Maior desconto percentual entre as propostas ativas");
    expect(debtA?.labels.find((label) => label.key === "proposta_vencendo")?.reason).toContain(
      "Vence em"
    );

    const labelsB = debtB?.labels.map((label) => label.key) ?? [];
    expect(labelsB).toContain("mais_barata_para_resolver");
    expect(labelsB).toContain("maior_risco");
    expect(labelsB).toContain("aguardando_negociacao");
    expect(debtB?.labels.find((label) => label.key === "maior_risco")?.reason).toBe(
      "Prioridade crítica"
    );
    expect(
      debtB?.labels.find((label) => label.key === "aguardando_negociacao")?.reason
    ).toBe("Status atual: em negociação");

    const labelsC = debtC?.labels.map((label) => label.key) ?? [];
    expect(labelsC).toContain("precisa_atualizar_valor");
    expect(
      debtC?.labels.find((label) => label.key === "precisa_atualizar_valor")?.reason
    ).toContain("Última atualização há");

    expect(debtA?.daysSinceLastUpdate).toBeGreaterThan(30);
    expect(debtA?.daysUntilProposalExpiry).toBeGreaterThanOrEqual(4);
    expect(debtA?.daysUntilProposalExpiry).toBeLessThanOrEqual(5);
  });
});
