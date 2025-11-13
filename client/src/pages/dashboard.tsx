import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, DollarSign, Calendar, ArrowRight } from "lucide-react";
import type { Dispute } from "@shared/schema";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "needs_response" || status === "warning_needs_response") return "destructive";
  if (status === "under_review" || status === "warning_under_review") return "secondary";
  if (status === "won") return "outline";
  if (status === "lost") return "destructive";
  return "default";
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return "N/A";
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function getDaysUntil(timestamp: number | null): number | null {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = timestamp - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ['/api/disputes'],
  });

  const disputes = data?.disputes || [];
  
  // Calculate metrics
  const openDisputes = disputes.filter(d => 
    d.status === "needs_response" || d.status === "warning_needs_response"
  ).length;
  
  const totalAtRisk = disputes
    .filter(d => d.status === "needs_response" || d.status === "warning_needs_response")
    .reduce((sum, d) => sum + d.amount, 0);
  
  const wonDisputes = disputes.filter(d => d.status === "won").length;
  const lostDisputes = disputes.filter(d => d.status === "lost").length;
  const totalDecided = wonDisputes + lostDisputes;
  const winRate = totalDecided > 0 ? Math.round((wonDisputes / totalDecided) * 100) : 0;
  
  const dueDates = disputes
    .map(d => d.dueBy)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const nearestDueDate = dueDates[0];
  const daysUntilDue = getDaysUntil(nearestDueDate);

  // Recent disputes (last 5)
  const recentDisputes = [...disputes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading disputes: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Stripe disputes and response status</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-open-count">{openDisputes}</div>
                <p className="text-xs text-muted-foreground mt-1">Requires response</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount at Risk</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-amount-risk">
                  {formatCurrency(totalAtRisk, disputes[0]?.currency || "usd")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total open amount</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-win-rate">{winRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{wonDisputes} won / {lostDisputes} lost</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-days-until">
                  {daysUntilDue !== null ? `${daysUntilDue}d` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {daysUntilDue !== null ? formatDate(nearestDueDate) : "No pending"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Recent Disputes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Latest dispute activity</p>
          </div>
          <Link href="/app/disputes">
            <Button variant="outline" size="sm" data-testid="button-view-all">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentDisputes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-disputes">
              No disputes found
            </div>
          ) : (
            <div className="space-y-3">
              {recentDisputes.map((dispute) => (
                <Link key={dispute.id} href={`/app/disputes/${dispute.id}`}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2"
                    data-testid={`dispute-row-${dispute.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-medium">{dispute.id}</span>
                        <Badge variant={getStatusVariant(dispute.status)}>
                          {dispute.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{dispute.reason.replace(/_/g, " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(dispute.amount, dispute.currency)}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(dispute.dueBy)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
