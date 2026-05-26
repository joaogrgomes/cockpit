import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string;
  description?: string;
};

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
