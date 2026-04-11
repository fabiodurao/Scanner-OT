import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostmanExportProps {
  baseUrl: string;
}

export function PostmanExport({ baseUrl }: PostmanExportProps) {
  const { toast } = useToast();

  const generateCollection = () => {
    const siteId = "550e8400-e29b-41d4-a716-446655440000";
    const sessionId = "770e8400-e29b-41d4-a716-446655440002";
    const fileId = "990e8400-e29b-41d4-a716-446655440004";
    const macAddress = "00:1a:2b:3c:4d:5e";

    const h = (extra?: { key: string; value: string; type: string }[]) => [
      { key: "X-API-Key", value: "{{api_key}}", type: "text" },
      ...(extra || []),
    ];
    const jsonHeader = { key: "Content-Type", value: "application/json", type: "text" };
    const jsonBody = (obj: unknown) => ({
      mode: "raw" as const,
      raw: JSON.stringify(obj, null, 2),
      options: { raw: { language: "json" } },
    });
    const u = (path: string) => ({
      raw: `{{base_url}}${path}`,
      host: ["{{base_url}}"],
      path: path.split('/').filter(Boolean),
    });

    const collection = {
      info: {
        name: "OT Scanner External API",
        description: "External API for OT Scanner SaaS integration. Authenticate using the X-API-Key header.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        _postman_id: crypto.randomUUID(),
      },
      variable: [
        { key: "base_url", value: `${baseUrl}/functions/v1/external-api`, type: "string" },
        { key: "api_key", value: "otsk_your_api_key_here", type: "string" },
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
              request: { method: "GET", header: h(), url: u("/sites/list"), description: "Returns all sites." },
            },
            {
              name: "Create Site",
              request: {
                method: "POST", header: h([jsonHeader]),
                body: jsonBody({ name: "Wind Farm Beta", site_type: "eolica", city: "Fortaleza", state: "CE", country: "Brasil" }),
                url: u("/sites"), description: "Create a new site.",
              },
            },
            {
              name: "Get Site",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}`), description: "Get a single site by ID." },
            },
            {
              name: "Update Site",
              request: {
                method: "PATCH", header: h([jsonHeader]),
                body: jsonBody({ name: "Updated Site Name", slug: "updated-slug" }),
                url: u(`/sites/${siteId}`), description: "Update a site's fields.",
              },
            },
            {
              name: "Get Site Stats",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}/stats`), description: "Get aggregated statistics." },
            },
          ],
        },
        {
          name: "Equipment",
          item: [
            {
              name: "List Equipment",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}/equipment`), description: "List all equipment for a site." },
            },
            {
              name: "Get Equipment by MAC",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}/equipment/${macAddress}`), description: "Get equipment by MAC address." },
            },
            {
              name: "Update Equipment",
              request: {
                method: "PATCH", header: h([jsonHeader]),
                body: jsonBody({ role: "master", manufacturer: "Schneider Electric", model: "M340" }),
                url: u(`/sites/${siteId}/equipment/${macAddress}`), description: "Update equipment metadata.",
              },
            },
          ],
        },
        {
          name: "Upload Sessions",
          item: [
            {
              name: "List Sessions",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}/sessions`), description: "List all upload sessions for a site." },
            },
            {
              name: "Create Session",
              request: {
                method: "POST", header: h([jsonHeader]),
                body: jsonBody({ name: "April 2025 Capture", description: "Automated capture from tap" }),
                url: u(`/sites/${siteId}/sessions`), description: "Create a new upload session.",
              },
            },
          ],
        },
        {
          name: "PCAP Files",
          description: "Upload flow: 1) POST /files → get presigned URL, 2) PUT file to S3, 3) PATCH /files/{id} to confirm.",
          item: [
            {
              name: "List Files",
              request: { method: "GET", header: h(), url: u(`/sites/${siteId}/sessions/${sessionId}/files`), description: "List all files in a session." },
            },
            {
              name: "Step 1 - Request Upload URL",
              request: {
                method: "POST", header: h([jsonHeader]),
                body: jsonBody({ filename: "captura_2025-04-11.pcap", content_type: "application/octet-stream", size_bytes: 52428800 }),
                url: u(`/sites/${siteId}/sessions/${sessionId}/files`),
                description: "Request a presigned S3 URL for uploading a PCAP file.",
              },
            },
            {
              name: "Step 3 - Confirm Upload",
              request: {
                method: "PATCH", header: h([jsonHeader]),
                body: jsonBody({ status: "completed" }),
                url: u(`/sites/${siteId}/sessions/${sessionId}/files/${fileId}`),
                description: "Confirm the file upload was completed (after PUT to S3).",
              },
            },
          ],
        },
        {
          name: "Catalogs",
          item: [
            {
              name: "List Manufacturers",
              request: { method: "GET", header: h(), url: u("/manufacturers"), description: "List all registered manufacturers." },
            },
            {
              name: "List Equipment Models",
              request: { method: "GET", header: h(), url: u("/equipment-models"), description: "List all equipment models." },
            },
            {
              name: "List Protocols",
              request: { method: "GET", header: h(), url: u("/protocols"), description: "List known OT/ICS protocols." },
            },
            {
              name: "List Site Types",
              request: { method: "GET", header: h(), url: u("/site-types"), description: "List valid site type values." },
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
