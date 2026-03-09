import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

const Inventory = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials and stock</p>
        </div>
        <Button>+ Add Material</Button>
      </div>

      <Card>
        <p className="text-center text-muted-foreground py-8">
          Inventory management interface - Coming soon
        </p>
      </Card>
    </div>
  );
};

export default Inventory;
