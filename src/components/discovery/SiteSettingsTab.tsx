import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Loader2, Database, Server, Variable } from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettingsTabProps {
  siteIdentifier: string;
  siteName?: string;
  onDataCleared?: () => void;
}

interface DataCounts {
  learning_samples_count: number;
  equipment_count: number;
  variables_count: number;
}

export const SiteSettingsTab = ({ siteIdentifier, siteName, onDataCleared }: SiteSettingsTabProps) => {
  const { profile } = useAuth();
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.is_admin === true;
  const displayName = siteName || siteIdentifier.slice(0, 8) + '...';
  const confirmRequired = siteName ? siteName.toUpperCase() : siteIdentifier.slice(0, 8).toUpperCase();

  const fetchDataCounts = async () => {
    setLoadingCounts(true);
    
    const { data, error } = await supabase
      .rpc('get_site_data_counts', { p_site_identifier: siteIdentifier });
    
    if (error) {
      console.error('Error fetching data counts:', error);
    } else if (data && data.length > 0) {
      setDataCounts(data[0]);
    }
    
    setLoadingCounts(false);
  };

  useEffect(() => {
    fetchDataCounts();
  }, [siteIdentifier]);

  const handleClearData = async () => {
    if (confirmText.toUpperCase() !== confirmRequired) {
      toast.error('Confirmation text does not match');
      return;
    }

    setDeleting(true);

    // Call the RPC function which now handles all three tables
    const { data, error } = await supabase
      .rpc('clear_site_data', { p_site_identifier: siteIdentifier });

    if (error) {
      console.error('Error clearing data:', error);
      toast.error('Error clearing data: ' + error.message);
      setDeleting(false);
      return;
    }

    const result = data?.[0];
    const totalDeleted = (result?.learning_samples_deleted || 0) + 
                         (result?.equipment_deleted || 0) + 
                         (result?.variables_deleted || 0);

    toast.success(`Successfully deleted ${totalDeleted.toLocaleString()} records`);
    
    setDialogOpen(false);
    setConfirmText('');
    setDeleting(false);
    
    // Refresh counts
    await fetchDataCounts();
    
    // Notify parent
    onDataCleared?.();
  };

  const totalRecords = dataCounts 
    ? dataCounts.learning_samples_count + dataCounts.equipment_count + dataCounts.variables_count
    : 0;

  if (!isAdmin) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Site configuration and data management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Only administrators can access site settings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Overview</CardTitle>
          <CardDescription>
            Current data stored for this site
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dataCounts ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{dataCounts.learning_samples_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Learning Samples</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Server className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{dataCounts.equipment_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Equipment Records</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Variable className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{dataCounts.variables_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Discovered Variables</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            Irreversible actions that permanently delete data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 rounded-lg bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-medium text-red-900">Clear All Site Data</h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete all learning samples, discovered equipment, and discovered variables for this site.
                  This action cannot be undone.
                </p>
                {totalRecords > 0 && (
                  <p className="text-sm font-medium text-red-800 mt-2">
                    This will delete {totalRecords.toLocaleString()} records.
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                onClick={() => setDialogOpen(true)}
                disabled={totalRecords === 0}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Clear Site Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to permanently delete all discovery data for <strong>{displayName}</strong>.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                  <p className="font-medium text-red-800">This will delete:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• {dataCounts?.learning_samples_count.toLocaleString() || 0} learning samples</li>
                    <li>• {dataCounts?.equipment_count.toLocaleString() || 0} equipment records</li>
                    <li>• {dataCounts?.variables_count.toLocaleString() || 0} discovered variables</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-text" className="text-foreground">
                    Type <strong>{confirmRequired}</strong> to confirm:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={confirmRequired}
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={confirmText.toUpperCase() !== confirmRequired || deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Data
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};