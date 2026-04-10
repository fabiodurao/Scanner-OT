import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeysManager } from '@/components/api/ApiKeysManager';
import { ApiDocumentation } from '@/components/api/ApiDocumentation';
import { Key, BookOpen } from 'lucide-react';

export default function ApiDocs() {
  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">API</h1>
          <p className="text-muted-foreground">
            Manage API keys and explore the external API documentation.
          </p>
        </div>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList>
            <TabsTrigger value="keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-6">
            <ApiKeysManager />
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
            <ApiDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
