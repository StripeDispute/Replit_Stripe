import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Download, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#1a2332] to-[#0b1220]">
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        <div className="relative container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Streamline Your Stripe Dispute Management
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Automatically fetch disputes, organize evidence across multiple categories, and generate professional PDF packets—all in one powerful platform.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-white text-slate-900 hover:bg-white/90"
                data-testid="button-login"
              >
                Log In to Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything you need to win disputes</h2>
              <p className="text-muted-foreground text-lg">
                Purpose-built tools for efficient dispute resolution
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-elevate">
                <CardHeader>
                  <Shield className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>Auto-Sync Disputes</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Connect your Stripe account and automatically fetch all disputes with real-time status updates.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <FileText className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>Organized Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Upload and categorize evidence files across multiple types: invoices, tracking, chats, and more.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <Download className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>PDF Packets</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Generate professional evidence packets with dispute summaries and comprehensive file listings.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <TrendingUp className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>Analytics Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track win rates, response times, and dispute trends to optimize your resolution strategy.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to take control of your disputes?</h2>
            <p className="text-muted-foreground text-lg">
              Join businesses using Stripe Dispute Assistant to streamline their dispute workflow and improve win rates.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              data-testid="button-login-cta"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
