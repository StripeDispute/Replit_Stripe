import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Key } from "lucide-react";

export default function Settings() {
  const { data, isLoading, error } = useQuery<{ ok: boolean }>({
    queryKey: ['/api/health'],
  });

  const isConfigured = data?.ok && !error;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your Stripe integration and preferences</p>
      </div>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Stripe Integration
            </CardTitle>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isConfigured ? (
              <Badge variant="outline" className="gap-1" data-testid="badge-configured">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1" data-testid="badge-not-configured">
                <AlertCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-semibold mb-2">Connection Status</h3>
            {isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : isConfigured ? (
              <p className="text-sm text-muted-foreground" data-testid="text-status-connected">
                Your Stripe account is successfully connected. You can now view and manage disputes.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-status-not-connected">
                Stripe is not currently configured. Set your STRIPE_SECRET_KEY environment variable to connect.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">How to Connect</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span>Log in to your Stripe Dashboard</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>Navigate to Developers → API keys</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>Copy your Secret key (starts with sk_test_ for testing or sk_live_ for production)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">4.</span>
                <span>Set STRIPE_SECRET_KEY in your environment (.env or host env vars)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">5.</span>
                <span>Restart the application to apply changes</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              Security Note
            </h4>
            <p className="text-xs text-muted-foreground">
              Never share your secret key publicly. Use test keys (sk_test_) during development and keep live keys (sk_live_) secure in production.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Future Enhancements</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Multi-user support with team management
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Stripe Connect OAuth for seamless integration
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Automatic evidence submission to Stripe
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Email notifications for dispute deadlines
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
