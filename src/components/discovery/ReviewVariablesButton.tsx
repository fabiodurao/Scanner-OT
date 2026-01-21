import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export function ReviewVariablesButton({ siteId }: { siteId: string }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      const { data, error } = await supabase
        .from('discovered_variables')
        .select('id', { count: 'exact', head: true })
        .eq('site_identifier', siteId)
        .not('ai_suggested_type', 'is', null)
        .not('learning_state', 'in', '(confirmed,published)');

      if (!error && data !== null) {
        setCount(data as unknown as number);
      }
      setLoading(false);
    };

    fetchCount();

    // Subscribe to changes
    const channel = supabase
      .channel(`review_count_${siteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_variables',
          filter: `site_identifier=eq.${siteId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteId]);

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Sparkles className="h-4 w-4 mr-2" />
        Review Variables
      </Button>
    );
  }

  return (
    <Link to={`/discovery/${siteId}/variables`}>
      <Button 
        variant={count > 0 ? 'default' : 'outline'}
        className={count > 0 ? 'bg-purple-600 hover:bg-purple-700 relative' : ''}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Review Variables
        {count > 0 && (
          <Badge className="ml-2 bg-purple-800 text-white">
            {count}
          </Badge>
        )}
      </Button>
    </Link>
  );
}