import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StatementCategoryGroup, StatementTypeFilter } from "@/lib/statement";

type StatementFiltersProps = {
  periodMonth: string;
  type: StatementTypeFilter;
  category: string;
  query: string;
  categoryGroups: StatementCategoryGroup[];
};

export function StatementFilters({
  periodMonth,
  type,
  category,
  query,
  categoryGroups,
}: StatementFiltersProps) {
  return (
    <form method="get" className="grid gap-4 lg:grid-cols-[180px_160px_220px_1fr_auto]">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="month">
          Mês
        </label>
        <Input id="month" name="month" type="month" defaultValue={periodMonth} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="type">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          <option value="all">Todos</option>
          <option value="income">Entradas</option>
          <option value="expense">Gastos</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="category">
          Categoria
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category || "all"}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          <option value="all">Todas</option>
          {categoryGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="q">
          Buscar
        </label>
        <Input
          id="q"
          name="q"
          placeholder="Descrição ou observação"
          defaultValue={query}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" size="sm">
          Aplicar
        </Button>
      </div>
    </form>
  );
}
