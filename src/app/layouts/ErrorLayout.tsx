import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { AlertCircle } from 'lucide-react';

export function ErrorLayout() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : null;
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'Something went wrong';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 bg-background">
      <div className="rounded-xl border border-border bg-card p-8 shadow-card max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {status ? `${status} — ` : ''}{message}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === 403
            ? "You don't have permission to view this page."
            : status === 404
              ? "This page doesn't exist."
              : 'An unexpected error occurred.'}
        </p>
        <Button asChild className="mt-6">
          <Link to={ROUTES.LOGIN}>Go to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
