import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useEditPermission } from '../components/ProtectedAction';

const Quotations = () => {
  const canEditQuotations = useEditPermission('quotations');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground mt-1">Manage price quotations</p>
        </div>
        {canEditQuotations && <Button>+ Create Quotation</Button>}
      </div>

      <Card>
        <p className="text-center text-muted-foreground py-8">
          Quotation management interface - Coming soon
        </p>
      </Card>
    </div>
  );
};

export default Quotations;
