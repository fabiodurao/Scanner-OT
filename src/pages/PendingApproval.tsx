import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

const PendingApproval = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] to-[#0f172a] p-4">
      <Card className="w-full max-w-md text-center border-0 shadow-2xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Awaiting Approval</CardTitle>
          <CardDescription>
            Your access request is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-left border">
            <div className="text-sm text-muted-foreground mb-1">Name</div>
            <div className="font-medium">{profile?.full_name}</div>
            <div className="text-sm text-muted-foreground mb-1 mt-3">Email</div>
            <div className="font-medium">{profile?.email}</div>
            <div className="text-sm text-muted-foreground mb-1 mt-3">Role</div>
            <div className="font-medium">{profile?.role_in_company}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            The system administrator will review your request shortly. 
            You will gain access once approved.
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <div className="pt-4 border-t">
            <img 
              src="/logo-standard.png" 
              alt="Cyber Energia" 
              className="h-8 w-auto object-contain mx-auto opacity-50"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;