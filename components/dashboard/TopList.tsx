import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TopListItem = {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  href?: string;
  meta?: string;
};

type TopListProps = {
  title: string;
  emptyMessage: string;
  items: TopListItem[];
};

export function TopList({ title, emptyMessage, items }: TopListProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5"
              >
                <div>
                  {item.href ? (
                    <Link href={item.href} className="font-medium text-foreground hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-medium">{item.title}</p>
                  )}
                  {item.subtitle ? (
                    <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                  ) : null}
                  {item.meta ? (
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  ) : null}
                </div>
                <p className="text-right text-sm font-semibold text-foreground">{item.value}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
