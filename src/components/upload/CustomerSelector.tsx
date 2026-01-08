import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelector = ({ selectedCustomerId, onSelectCustomer }: CustomerSelectorProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar clientes');
      console.error(error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Digite o nome do cliente');
      return;
    }

    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomerName.trim(),
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar cliente: ' + error.message);
    } else {
      toast.success('Cliente criado com sucesso!');
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      onSelectCustomer(data);
      setNewCustomerName('');
      setDialogOpen(false);
    }

    setCreating(false);
  };

  const handleSelectChange = (value: string) => {
    if (value === 'new') {
      setDialogOpen(true);
    } else {
      const customer = customers.find(c => c.id === value);
      onSelectCustomer(customer || null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando clientes...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Cliente</Label>
      <div className="flex gap-2">
        <Select value={selectedCustomerId || ''} onValueChange={handleSelectChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {customer.name}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="new" className="text-[#2563EB]">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo cliente...
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente para associar os arquivos PCAP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Nome do Cliente</Label>
              <Input
                id="customer-name"
                placeholder="Ex: Usina Solar Nordeste"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Cliente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};