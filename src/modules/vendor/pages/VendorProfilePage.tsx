import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { ArrowLeft, Building2, Mail, Shield, User } from 'lucide-react';

function labelForRole(role: string): string {
  if (role === 'operator') return 'Vendor user';
  if (role === 'admin') return 'Vendor admin';
  return role;
}

export function VendorProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.VENDOR.DASHBOARD} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <Card className="max-w-xl rounded-2xl border-border/80 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            Sign-in & identity
          </CardTitle>
          <CardDescription>Your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>
          {user.name ? (
            <div className="flex gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="text-sm font-medium text-foreground">{labelForRole(user.role)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-xl rounded-2xl border-border/80 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Organization
          </CardTitle>
          <CardDescription>Buyer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.orgName ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buyer organization</p>
              <p className="text-sm font-medium text-foreground">{user.orgName}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No organization name was returned for this account.</p>
          )}
          {user.vendorId ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor profile id</p>
              <p className="break-all font-mono text-sm text-foreground">{user.vendorId}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Internal id used when your buyer connects purchase orders to your company.
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your user is not linked to a vendor profile yet. Ask your buyer to complete vendor setup.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
