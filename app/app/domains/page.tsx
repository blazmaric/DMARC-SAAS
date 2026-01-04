'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Domain {
  id: string;
  domain_name: string;
  rua_token: string;
  created_at: string;
  customer: {
    name: string;
  };
}

export default function DomainsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/domains');
      const data = await response.json();

      if (response.ok) {
        setDomains(data.domains || []);
      }
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainName: newDomainName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create domain');
        return;
      }

      setDialogOpen(false);
      setNewDomainName('');
      loadDomains();
      router.push(`/app/domains/${data.domain.id}`);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (domain: Domain) => {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(domain.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation < 1) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          New
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        Active
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Domains</h1>
          <p className="text-slate-600 mt-1">
            Manage DMARC monitoring for your domains
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Enter your domain name to start monitoring DMARC reports
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDomain}>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="example.si"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Enter the domain without www or https://
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Domain'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Globe className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No domains yet
              </h3>
              <p className="text-slate-600 mb-6">
                Get started by adding your first domain to monitor
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <Card
              key={domain.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/app/domains/${domain.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Globe className="h-8 w-8 text-slate-600" />
                  {getStatusBadge(domain)}
                </div>
                <CardTitle className="mt-4">{domain.domain_name}</CardTitle>
                <CardDescription>{domain.customer.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500">
                  Added {new Date(domain.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
