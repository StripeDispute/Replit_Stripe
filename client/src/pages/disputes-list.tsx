import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Filter } from "lucide-react";
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

export default function DisputesList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ['/api/disputes'],
  });

  const disputes = data?.disputes || [];

  // Apply filters
  const filteredDisputes = disputes.filter(dispute => {
    if (statusFilter !== "all" && dispute.status !== statusFilter) return false;
    if (reasonFilter !== "all" && dispute.reason !== reasonFilter) return false;
    return true;
  });

  // Get unique reasons for filter
  const uniqueReasons = Array.from(new Set(disputes.map(d => d.reason)));

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
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-disputes-title">All Disputes</h1>
        <p className="text-muted-foreground">Manage and respond to Stripe disputes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="needs_response">Needs Response</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="warning_needs_response">Warning - Needs Response</SelectItem>
            <SelectItem value="warning_under_review">Warning - Under Review</SelectItem>
            <SelectItem value="warning_closed">Warning Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-reason-filter">
            <SelectValue placeholder="All Reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {uniqueReasons.map(reason => (
              <SelectItem key={reason} value={reason}>
                {reason.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || reasonFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setReasonFilter("all");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredDisputes.length} {filteredDisputes.length === 1 ? 'Dispute' : 'Disputes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-disputes">
              No disputes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dispute ID</th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</th>
                    <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Due Date</th>
                    <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisputes.map((dispute) => (
                    <tr 
                      key={dispute.id} 
                      className="border-b last:border-0 hover-elevate"
                      data-testid={`dispute-row-${dispute.id}`}
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm">{dispute.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{dispute.reason.replace(/_/g, " ")}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold">{formatCurrency(dispute.amount, dispute.currency)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={getStatusVariant(dispute.status)}>
                          {dispute.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{formatDate(dispute.dueBy)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/app/disputes/${dispute.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-open-${dispute.id}`}
                          >
                            Open
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
