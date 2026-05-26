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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <div>
                  {item.href ? (
                    <Link href={item.href} className="font-medium hover:underline">
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
                <p className="text-right font-semibold">{item.value}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
