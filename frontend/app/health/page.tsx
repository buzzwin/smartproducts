"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Copy, Check } from "lucide-react";

export default function HealthCheckPage() {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendTestResult, setBackendTestResult] = useState<any>(null);
  const [manualTestUrl, setManualTestUrl] = useState("");
  const [manualTestEndpoint, setManualTestEndpoint] = useState("/health");
  const [manualTestResult, setManualTestResult] = useState<any>(null);
  const [testingManual, setTestingManual] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<any>(null);
  const [testingProxy, setTestingProxy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEnvInfo();
  }, []);

  const loadEnvInfo = async () => {
    try {
      setLoadingEnv(true);
      const response = await fetch("/api/health/env");
      const data = await response.json();
      setEnvInfo(data);
    } catch (error) {
      console.error("Failed to load env info:", error);
      setEnvInfo({ error: "Failed to load environment information" });
    } finally {
      setLoadingEnv(false);
    }
  };

  const testBackendFromEnv = async () => {
    try {
      setTestingBackend(true);
      setBackendTestResult(null);
      const response = await fetch("/api/health/backend");
      const data = await response.json();
      setBackendTestResult(data);
    } catch (error: any) {
      setBackendTestResult({
        success: false,
        error: error.message || "Failed to test backend",
      });
    } finally {
      setTestingBackend(false);
    }
  };

  const testManualUrl = async () => {
    if (!manualTestUrl.trim()) {
      alert("Please enter a backend URL to test");
      return;
    }

    try {
      setTestingManual(true);
      setManualTestResult(null);
      const response = await fetch("/api/health/backend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testUrl: manualTestUrl.trim(),
          endpoint: manualTestEndpoint || "/health",
        }),
      });
      const data = await response.json();
      setManualTestResult(data);
    } catch (error: any) {
      setManualTestResult({
        success: false,
        error: error.message || "Failed to test URL",
      });
    } finally {
      setTestingManual(false);
    }
  };

  const testProxyRoute = async () => {
    try {
      setTestingProxy(true);
      setProxyTestResult(null);
      const response = await fetch("/api/proxy/health");
      const data = await response.json();
      setProxyTestResult({
        success: true,
        status: response.status,
        data,
      });
    } catch (error: any) {
      setProxyTestResult({
        success: false,
        error: error.message || "Failed to test proxy route",
      });
    } finally {
      setTestingProxy(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Health Check & Connectivity Test</h1>
        <p className="text-muted-foreground">
          Test backend connectivity and verify environment variables
        </p>
      </div>

      <div className="space-y-6">
        {/* Environment Variables Card */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Server-side environment variables (from Next.js API routes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEnv ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading environment info...</span>
              </div>
            ) : envInfo ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Server-Side (API_URL / BACKEND_URL)
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-mono">
                        API_URL: {envInfo.serverSide?.API_URL || "not set"}
                      </span>
                      {envInfo.serverSide?.API_URL && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(envInfo.serverSide.API_URL)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {envInfo.serverSide?.BACKEND_URL && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-mono">
                          BACKEND_URL: {envInfo.serverSide.BACKEND_URL}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(envInfo.serverSide.BACKEND_URL)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Client-Side (NEXT_PUBLIC_*)
                  </Label>
                  <div className="space-y-2">
                    <div className="p-2 bg-muted rounded">
                      <span className="text-sm font-mono">
                        NEXT_PUBLIC_API_URL: {envInfo.clientSide?.NEXT_PUBLIC_API_URL || "not set"}
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-sm font-mono">
                        NEXT_PUBLIC_USE_API_PROXY: {envInfo.clientSide?.NEXT_PUBLIC_USE_API_PROXY || "not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Proxy Configuration</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={envInfo.proxy?.enabled ? "default" : "secondary"}>
                      {envInfo.proxy?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Route: {envInfo.proxy?.route}
                    </span>
                  </div>
                </div>

                {envInfo.note && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm text-muted-foreground">
                    {envInfo.note}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600">Failed to load environment information</div>
            )}
          </CardContent>
        </Card>

        {/* Backend Test from Env Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Backend (from Environment)</CardTitle>
            <CardDescription>
              Test connectivity to backend using API_URL from environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={testBackendFromEnv}
              disabled={testingBackend}
              className="w-full sm:w-auto"
            >
              {testingBackend ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Backend Health"
              )}
            </Button>

            {backendTestResult && (
              <div className="mt-4 p-4 rounded-lg border" style={{
                backgroundColor: backendTestResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                borderColor: backendTestResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {backendTestResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {backendTestResult.success ? "Connection Successful" : "Connection Failed"}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-mono text-xs bg-background p-1 rounded">
                      URL: {backendTestResult.testUrl || backendTestResult.backendUrl}
                    </span>
                  </div>
                  {backendTestResult.status && (
                    <div>
                      Status: <Badge variant="outline">{backendTestResult.status} {backendTestResult.statusText}</Badge>
                    </div>
                  )}
                  {backendTestResult.response && (
                    <div>
                      <Label className="text-xs">Response:</Label>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(backendTestResult.response, null, 2)}
                      </pre>
                    </div>
                  )}
                  {backendTestResult.error && (
                    <div className="text-red-600">
                      <Label className="text-xs">Error:</Label>
                      <div className="mt-1 p-2 bg-background rounded text-xs">
                        {backendTestResult.error}
                      </div>
                      {backendTestResult.errorType && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Type: {backendTestResult.errorType}
                        </div>
                      )}
                      {backendTestResult.errorDetails && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Details: {JSON.stringify(backendTestResult.errorDetails, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual URL Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Custom Backend URL</CardTitle>
            <CardDescription>
              Enter a backend URL manually to test connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="manual-url">Backend URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="manual-url"
                      type="text"
                      placeholder="http://your-service-name:5000"
                      value={manualTestUrl}
                      onChange={(e) => setManualTestUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={testManualUrl}
                      disabled={testingManual || !manualTestUrl.trim()}
                    >
                      {testingManual ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Examples: http://incredible-prosperity:5000, http://backend:8000, http://localhost:8000
                  </p>
                </div>
                <div>
                  <Label htmlFor="manual-endpoint">Endpoint (optional)</Label>
                  <Input
                    id="manual-endpoint"
                    type="text"
                    placeholder="/health"
                    value={manualTestEndpoint}
                    onChange={(e) => setManualTestEndpoint(e.target.value)}
                    className="font-mono text-sm mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Common endpoints: /health, /, /api/products, /api/health
                  </p>
                </div>
              </div>

              {manualTestResult && (
                <div className="p-4 rounded-lg border" style={{
                  backgroundColor: manualTestResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  borderColor: manualTestResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    {manualTestResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {manualTestResult.success ? "Connection Successful" : "Connection Failed"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-mono text-xs bg-background p-1 rounded">
                        URL: {manualTestResult.testUrl}
                      </span>
                    </div>
                    {manualTestResult.status && (
                      <div>
                        Status: <Badge variant="outline">{manualTestResult.status} {manualTestResult.statusText}</Badge>
                      </div>
                    )}
                    {manualTestResult.response && (
                      <div>
                        <Label className="text-xs">Response:</Label>
                        <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(manualTestResult.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    {manualTestResult.error && (
                      <div className="text-red-600">
                        <Label className="text-xs">Error:</Label>
                        <div className="mt-1 p-2 bg-background rounded text-xs">
                          {manualTestResult.error}
                        </div>
                        {manualTestResult.errorType && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Type: {manualTestResult.errorType}
                          </div>
                        )}
                        {manualTestResult.errorDetails && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Details: {JSON.stringify(manualTestResult.errorDetails, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Proxy Route Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Proxy Route</CardTitle>
            <CardDescription>
              Test the Next.js proxy route (/api/proxy/*) to verify it can reach the backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={testProxyRoute}
              disabled={testingProxy}
              className="w-full sm:w-auto"
            >
              {testingProxy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Proxy...
                </>
              ) : (
                "Test Proxy Route (/api/proxy/health)"
              )}
            </Button>

            {proxyTestResult && (
              <div className="mt-4 p-4 rounded-lg border" style={{
                backgroundColor: proxyTestResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                borderColor: proxyTestResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {proxyTestResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {proxyTestResult.success ? "Proxy Working" : "Proxy Failed"}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-mono text-xs bg-background p-1 rounded">
                      Route: /api/proxy/health
                    </span>
                  </div>
                  {proxyTestResult.status && (
                    <div>
                      Status: <Badge variant="outline">{proxyTestResult.status}</Badge>
                    </div>
                  )}
                  {proxyTestResult.data && (
                    <div>
                      <Label className="text-xs">Response:</Label>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(proxyTestResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {proxyTestResult.error && (
                    <div className="text-red-600">
                      <Label className="text-xs">Error:</Label>
                      <div className="mt-1 p-2 bg-background rounded text-xs">
                        {proxyTestResult.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Troubleshooting Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>1. Check Railway Service Names:</strong>
                <p className="text-muted-foreground mt-1">
                  In Railway dashboard, check your backend service name. Use that name in API_URL.
                  Example: If service is named "incredible-prosperity", use <code className="bg-muted px-1 rounded">http://incredible-prosperity:5000</code>
                </p>
              </div>
              <div>
                <strong>2. Verify Port:</strong>
                <p className="text-muted-foreground mt-1">
                  Check what port your backend is listening on. Common ports: 5000, 8000, 8080
                </p>
              </div>
              <div>
                <strong>3. Test Common Endpoints:</strong>
                <p className="text-muted-foreground mt-1">
                  Try these endpoints: <code className="bg-muted px-1 rounded">/health</code>, <code className="bg-muted px-1 rounded">/</code>, <code className="bg-muted px-1 rounded">/api/products</code>
                </p>
              </div>
              <div>
                <strong>4. Check Railway Networking:</strong>
                <p className="text-muted-foreground mt-1">
                  Services in the same Railway project can communicate using service names.
                  Make sure both services are in the same Railway project.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

