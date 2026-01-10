import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/upload';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelector = ({ selectedCustomerId, onSelectCustomer }: CustomerSelectorProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (!error) {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelectChange = (value: string) => {
    if (value === 'manage') {
      navigate('/customers');
    } else {
      const customer = customers.find(c => c.id === value);
      onSelectCustomer(customer || null);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading customers...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Customer</Label>
      <div className="flex gap-2">
        <Select value={selectedCustomerId || ''} onValueChange={handleSelectChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    {(customer.city || customer.state) && (
                      <span className="text-xs text-muted-foreground">
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
            {customers.length === 0 && (
              <SelectItem value="none" disabled>
                No customers registered
              </SelectItem>
            )}
            <SelectItem value="manage" className="text-[#2563EB]">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Manage customers...
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show selected customer details */}
      {selectedCustomer && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border text-sm">
          <div className="font-medium">{selectedCustomer.name}</div>
          {(selectedCustomer.city || selectedCustomer.state) && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ')}
            </div>
          )}
          {selectedCustomer.unique_id && (
            <div className="mt-1">
              <code className="text-xs bg-white px-1.5 py-0.5 rounded border font-mono">
                {selectedCustomer.unique_id}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};