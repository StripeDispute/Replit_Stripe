import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#1a1f35] to-[#0b1220]">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 backdrop-blur-sm border border-primary/20">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Secure Stripe Integration</span>
        </div>

        <h1 className="text-5xl font-bold text-white mb-6 max-w-4xl leading-tight">
          Automatically detect and manage Stripe disputes
        </h1>

        <p className="text-xl text-gray-300 mb-12 max-w-2xl">
          Connect your Stripe account to start tracking and responding to disputes with intelligent evidence management and automated PDF generation.
        </p>

        <Link href="/app">
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg h-auto hover-elevate active-elevate-2"
            data-testid="button-go-dashboard"
          >
            Go to Dashboard
          </Button>
        </Link>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6 hover-elevate">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-white" data-testid="text-open-disputes">5</p>
                <p className="text-sm text-gray-400">Open Disputes</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6 hover-elevate">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-white" data-testid="text-won-disputes">20</p>
                <p className="text-sm text-gray-400">Won Disputes</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6 hover-elevate">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-white" data-testid="text-lost-disputes">3</p>
                <p className="text-sm text-gray-400">Lost Disputes</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
