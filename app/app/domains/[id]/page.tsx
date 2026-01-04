'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = params?.id as string;

  const [domain, setDomain] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dnsStatus, setDnsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dnsChecking, setDnsChecking] = useState(false);
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDomainData();
  }, [domainId, days]);

  const loadDomainData = async () => {
    try {
      const [domainRes, analyticsRes] = await Promise.all([
        fetch(`/api/domains?id=${domainId}`),
        fetch(`/api/domains/${domainId}/analytics?days=${days}`),
      ]);

      if (domainRes.ok) {
        const domainData = await domainRes.json();
        const foundDomain = domainData.domains?.find((d: any) => d.id === domainId);
        setDomain(foundDomain);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Failed to load domain data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDNS = async () => {
    setDnsChecking(true);
    try {
      const response = await fetch(`/api/domains/${domainId}/dns-check`);
      const data = await response.json();
      setDnsStatus(data);
    } catch (err) {
      console.error('DNS check failed:', err);
    } finally {
      setDnsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dmarcRecord = domain
    ? `v=DMARC1; p=none; rua=mailto:${domain.rua_token}@${process.env.NEXT_PUBLIC_DMARC_DOMAIN}; fo=1`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900">Domain not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => router.push('/app/domains')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Domains
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {domain.domain_name}
            </h1>
            <p className="text-slate-600 mt-1">
              DMARC monitoring and analytics
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.totalVolume.toLocaleString() || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alignment Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {analytics?.summary.alignmentRate || 0}%
              {(analytics?.summary.alignmentRate || 0) >= 95 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">DKIM & SPF aligned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reports Received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.reportCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">From email providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.topSources.length || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Sending IPs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Top Sources</TabsTrigger>
          <TabsTrigger value="setup">DNS Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Volume Trend</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={days === 7 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDays(7)}
                  >
                    7d
                  </Button>
                  <Button
                    variant={days === 30 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDays(30)}
                  >
                    30d
                  </Button>
                  <Button
                    variant={days === 90 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDays(90)}
                  >
                    90d
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) =>
                      new Date(date).toLocaleDateString()
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#0f172a"
                    strokeWidth={2}
                    name="Total Emails"
                  />
                  <Line
                    type="monotone"
                    dataKey="pass_aligned"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Aligned"
                  />
                  <Line
                    type="monotone"
                    dataKey="fail_aligned"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Sending Sources</CardTitle>
              <CardDescription>
                IP addresses sending email on behalf of your domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topSources.map((source: any) => (
                    <TableRow key={source.ip}>
                      <TableCell className="font-mono">{source.ip}</TableCell>
                      <TableCell className="text-right">
                        {source.count.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {source.aligned ? (
                          <Badge className="gap-1 bg-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Aligned
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          {dnsStatus && (
            <Alert
              variant={
                dnsStatus.status === 'valid'
                  ? 'default'
                  : dnsStatus.status === 'detected'
                  ? 'default'
                  : 'destructive'
              }
            >
              {dnsStatus.status === 'valid' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : dnsStatus.status === 'detected' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>DNS Status: {dnsStatus.status}</AlertTitle>
              <AlertDescription>{dnsStatus.message}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>DMARC DNS Configuration</CardTitle>
              <CardDescription>
                Add this DNS record to start receiving DMARC reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Record Type
                </label>
                <div className="mt-1 p-3 bg-slate-50 rounded-md border">
                  <code className="text-sm">TXT</code>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Host / Name
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 rounded-md border">
                    <code className="text-sm">_dmarc.{domain.domain_name}</code>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(`_dmarc.${domain.domain_name}`)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Value
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 rounded-md border overflow-x-auto">
                    <code className="text-sm whitespace-nowrap">
                      {dmarcRecord}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(dmarcRecord)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {copied && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Copied to clipboard</AlertDescription>
                </Alert>
              )}

              <div className="pt-4">
                <Button onClick={checkDNS} disabled={dnsChecking} className="gap-2">
                  <RefreshCw
                    className={`h-4 w-4 ${dnsChecking ? 'animate-spin' : ''}`}
                  />
                  {dnsChecking ? 'Checking...' : 'Check DNS'}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>DMARC Policy Progression</AlertTitle>
                <AlertDescription>
                  Start with <code className="font-mono">p=none</code> to monitor
                  without affecting delivery. Once confident, progress to{' '}
                  <code className="font-mono">p=quarantine</code> then{' '}
                  <code className="font-mono">p=reject</code>.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
