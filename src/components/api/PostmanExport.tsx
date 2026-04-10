import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostmanExportProps {
  baseUrl: string;
}

export function PostmanExport({ baseUrl }: PostmanExportProps) {
  const { toast } = useToast();

  const generateCollection = () => {
    const collection = {
      info: {
        name: "OT Scanner External API",
        description: "External API for OT Scanner SaaS integration. Authenticate using the X-API-Key header with a valid API key.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        _postman_id: crypto.randomUUID(),
      },
      variable: [
        {
          key: "base_url",
          value: `${baseUrl}/functions/v1/external-api`,
          type: "string",
        },
        {
          key: "api_key",
          value: "otsk_your_api_key_here",
          type: "string",
        },
      ],
      auth: {
        type: "apikey",
        apikey: [
          { key: "key", value: "X-API-Key", type: "string" },
          { key: "value", value: "{{api_key}}", type: "string" },
          { key: "in", value: "header", type: "string" },
        ],
      },
      item: [
        {
          name: "Sites",
          item: [
            {
              name: "List Sites",
              request: {
                method: "GET",
                header: [
                  { key: "X-API-Key", value: "{{api_key}}", type: "text" },
                ],
                url: {
                  raw: "{{base_url}}/sites/list",
                  host: ["{{base_url}}"],
                  path: ["sites", "list"],
                },
                description: "Returns a list of all sites with their basic information including id, name, slug, site_type, city, state, country, and created_at.",
              },
              response: [
                {
                  name: "Success",
                  status: "OK",
                  code: 200,
                  header: [{ key: "Content-Type", value: "application/json" }],
                  body: JSON.stringify({
                    sites: [
                      {
                        id: "550e8400-e29b-41d4-a716-446655440000",
                        name: "Solar Farm Alpha",
                        slug: "solar-farm-alpha",
                        site_type: "fotovoltaica",
                        city: "São Paulo",
                        state: "SP",
                        country: "Brasil",
                        created_at: "2024-01-15T10:30:00Z",
                      },
                    ],
                    count: 1,
                  }, null, 2),
                },
              ],
            },
            {
              name: "Update Site",
              request: {
                method: "PATCH",
                header: [
                  { key: "X-API-Key", value: "{{api_key}}", type: "text" },
                  { key: "Content-Type", value: "application/json", type: "text" },
                ],
                body: {
                  mode: "raw",
                  raw: JSON.stringify({ name: "Updated Site Name", slug: "updated-slug" }, null, 2),
                  options: { raw: { language: "json" } },
                },
                url: {
                  raw: "{{base_url}}/sites/550e8400-e29b-41d4-a716-446655440000",
                  host: ["{{base_url}}"],
                  path: ["sites", "550e8400-e29b-41d4-a716-446655440000"],
                },
                description: "Update a site's name and/or slug. At least one field must be provided. The slug must be unique across all sites.",
              },
              response: [
                {
                  name: "Success",
                  status: "OK",
                  code: 200,
                  header: [{ key: "Content-Type", value: "application/json" }],
                  body: JSON.stringify({
                    site: {
                      id: "550e8400-e29b-41d4-a716-446655440000",
                      name: "Updated Site Name",
                      slug: "updated-slug",
                      site_type: "fotovoltaica",
                      city: "São Paulo",
                      state: "SP",
                      country: "Brasil",
                      created_at: "2024-01-15T10:30:00Z",
                      updated_at: "2024-06-20T14:00:00Z",
                    },
                  }, null, 2),
                },
                {
                  name: "Not Found",
                  status: "Not Found",
                  code: 404,
                  header: [{ key: "Content-Type", value: "application/json" }],
                  body: JSON.stringify({ error: "Site not found" }, null, 2),
                },
                {
                  name: "Conflict",
                  status: "Conflict",
                  code: 409,
                  header: [{ key: "Content-Type", value: "application/json" }],
                  body: JSON.stringify({ error: "Slug already in use by another site" }, null, 2),
                },
              ],
            },
          ],
        },
      ],
    };

    return collection;
  };

  const handleDownload = () => {
    const collection = generateCollection();
    const json = JSON.stringify(collection, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OT_Scanner_API.postman_collection.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Postman collection downloaded successfully' });
  };

  return (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download Postman Collection
    </Button>
  );
}
