import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { resolveBackTo } from '@/modules/common/utils/navigationState';

/** Back navigation to the page that opened this PO (PO search, dashboard, uploads, etc.). */
export function VendorPoBackLink() {
  const { state } = useLocation();
  const to = resolveBackTo(state, ROUTES.VENDOR.PO_SEARCH);
  return (
    <Button variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground hover:text-foreground" asChild>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        Back to PO search
      </Link>
    </Button>
  );
}
