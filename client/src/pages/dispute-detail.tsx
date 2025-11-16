import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import type {
  EvidenceFile,
  EvidenceKind,
  LatestPacketResponse,
} from "@shared/schema";
import { getEvidenceTemplate } from "@shared/schema";

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "needs_response" || status === "warning_needs_response")
    return "destructive";
  if (status === "under_review" || status === "warning_under_review")
    return "secondary";
  if (status === "won") return "outline";
  if (status === "lost") return "destructive";
  return "default";
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  );
}

export default function DisputeDetail() {
  const [, params] = useRoute("/app/disputes/:stripeId");
  const stripeId = params?.stripeId || "";
  const { toast } = useToast();
  const [selectedKind, setSelectedKind] =
    useState<EvidenceKind>("invoice");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch dispute details
  const {
    data: disputeData,
    isLoading: disputeLoading,
    error: disputeError,
  } = useQuery<{ dispute: any }>({
    queryKey: ["/api/disputes", stripeId],
    enabled: !!stripeId,
  });

  // Fetch evidence
  const {
    data: evidenceData,
    isLoading: evidenceLoading,
    error: evidenceError,
  } = useQuery<{ evidence: EvidenceFile[] }>({
    queryKey: ["/api/evidence", stripeId],
    enabled: !!stripeId,
  });

  // Fetch latest packet
  const {
    data: packetData,
    isLoading: packetLoading,
  } = useQuery<LatestPacketResponse>({
    queryKey: ["/api/packets/latest", stripeId],
    enabled: !!stripeId,
  });

  // Upload evidence mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/evidence/${stripeId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/evidence", stripeId],
      });
      setSelectedFile(null);
      toast({
        title: "Evidence uploaded",
        description:
          "Your evidence file has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete evidence mutation (new)
  const deleteMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error || "Delete failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/evidence", stripeId],
      });
      toast({
        title: "Evidence deleted",
        description: "The evidence file was removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate packet mutation
  const generatePacketMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/packets/${stripeId}`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error || "Generation failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/packets/latest", stripeId],
      });
      toast({
        title: "PDF packet generated",
        description: "Your evidence packet is ready to download.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("kind", selectedKind);
    uploadMutation.mutate(formData);
  };

  const handleDeleteEvidence = (id: string) => {
    deleteMutation.mutate(id);
  };

  const dispute = disputeData?.dispute;
  const evidence = evidenceData?.evidence || [];
  const packet = packetData?.packet;

  if (disputeError) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error loading dispute: {disputeError.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const evidenceTemplate = dispute
    ? getEvidenceTemplate(dispute.reason)
    : { required: [], optional: [] };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/app/disputes">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Disputes
          </Button>
        </Link>

        {disputeLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <div className="flex items-center gap-4">
            <h1
              className="text-3xl font-semibold font-mono"
              data-testid="text-dispute-id"
            >
              {stripeId}
            </h1>
            {dispute && (
              <Badge variant={getStatusVariant(dispute.status)}>
                {dispute.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {disputeLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          dispute && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-lg font-semibold"
                    data-testid="text-reason"
                  >
                    {dispute.reason.replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-lg font-semibold"
                    data-testid="text-amount"
                  >
                    {formatCurrency(dispute.amount, dispute.currency)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-lg font-semibold"
                    data-testid="text-status"
                  >
                    {dispute.status.replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Due Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-lg font-semibold"
                    data-testid="text-due-date"
                  >
                    {formatDate(
                      dispute.evidence_details?.due_by
                        ? dispute.evidence_details.due_by * 1000
                        : null,
                    )}
                  </p>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Evidence Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Evidence Checklist</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Based on the dispute reason, here's what you should
                provide
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Required Evidence
                </h4>
                <ul className="space-y-2">
                  {evidenceTemplate.required.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  Optional Evidence
                </h4>
                <ul className="space-y-2">
                  {evidenceTemplate.optional.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Existing Evidence */}
          <Card>
            <CardHeader>
              <CardTitle>
                Uploaded Evidence ({evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evidenceLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : evidenceError ? (
                <div className="text-sm text-destructive">
                  Error loading evidence.
                </div>
              ) : evidence.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground"
                  data-testid="text-no-evidence"
                >
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No evidence uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evidence.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`evidence-file-${file.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {file.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.kind} •{" "}
                            {formatBytes(file.sizeBytes)} •{" "}
                            {formatDate(
                              new Date(file.createdAt).getTime(),
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{file.kind}</Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleDeleteEvidence(file.id)
                          }
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Upload Evidence */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label
                  htmlFor="kind"
                  className="text-sm font-medium mb-2 block"
                >
                  Evidence Type
                </Label>
                <Select
                  value={selectedKind}
                  onValueChange={(v) =>
                    setSelectedKind(v as EvidenceKind)
                  }
                >
                  <SelectTrigger
                    id="kind"
                    data-testid="select-evidence-kind"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="tracking">Tracking</SelectItem>
                    <SelectItem value="chat">
                      Chat/Communication
                    </SelectItem>
                    <SelectItem value="tos">
                      Terms of Service
                    </SelectItem>
                    <SelectItem value="screenshot">
                      Screenshot
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="file"
                  className="text-sm font-medium mb-2 block"
                >
                  File
                </Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] || null)
                  }
                  data-testid="input-file"
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedFile.name} (
                    {formatBytes(selectedFile.size)})
                  </p>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Evidence
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* PDF Packet */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Evidence Packet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {packetLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : packet ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">
                      Last Generated
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(
                        new Date(packet.createdAt).getTime(),
                      )}
                    </p>
                  </div>
                  <a
                    href={`/api/packets/download/${packet.id}`}
                    download
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                      data-testid="button-download-packet"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Latest Packet
                    </Button>
                  </a>
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground text-center py-4"
                  data-testid="text-no-packet"
                >
                  No packet generated yet
                </p>
              )}

              <Button
                onClick={() => generatePacketMutation.mutate()}
                disabled={generatePacketMutation.isPending}
                className="w-full"
                data-testid="button-generate-packet"
              >
                {generatePacketMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate New PDF Packet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
