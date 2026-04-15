import { useState } from 'react';
import { EndpointCard } from './EndpointCard';
import { PostmanExport } from './PostmanExport';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = 'https://jgclhfwigmxmqyhqngcm.supabase.co';

const errorCodes = [
  { code: '401', description: 'Unauthorized — Missing or invalid API key', example: '{ "error": "Missing X-API-Key header" }' },
  { code: '400', description: 'Bad Request — Invalid request body or parameters', example: '{ "error": "Field \\"name\\" is required" }' },
  { code: '404', description: 'Not Found — Resource or route not found', example: '{ "error": "Site not found" }' },
  { code: '409', description: 'Conflict — Resource conflict (e.g., duplicate slug)', example: '{ "error": "Slug already in use by another site" }' },
  { code: '500', description: 'Internal Server Error — Unexpected server error', example: '{ "error": "Internal server error" }' },
];

export function ApiDocumentation() {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const baseUrl = SUPABASE_URL;
  const apiBaseUrl = `${baseUrl}/functions/v1/external-api`;

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(apiBaseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: 'Copied', description: 'Base URL copied to clipboard' });
  };

  return (
    <div className="space-y-8">
      {/* Header with Postman Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Reference</h3>
          <p className="text-sm text-muted-foreground">
            Complete documentation for the OT Scanner external API.
          </p>
        </div>
        <PostmanExport baseUrl={baseUrl} />
      </div>

      {/* Base URL */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-2">Base URL</h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
              {apiBaseUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyBaseUrl}>
              {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h4 className="text-sm font-semibold">Authentication</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            All API requests must include a valid API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header.
          </p>
          <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto">
{`GET /functions/v1/external-api/sites/list
Host: ${baseUrl.replace('https://', '')}
X-API-Key: otsk_your_api_key_here`}
          </pre>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              API keys are prefixed with <code className="font-mono">otsk_</code> for easy identification. Generate keys in the "API Keys" tab.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SITES ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Sites</h3>
        <p className="text-sm text-muted-foreground mb-4">Manage sites (plants, substations, etc.).</p>
        <div className="space-y-3">
          <EndpointCard
            method="GET"
            path="/sites/list"
            description="List all sites."
            baseUrl={baseUrl}
            responseExample={JSON.stringify({
              data: [{
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "Solar Farm Alpha",
                slug: "solar-farm-alpha",
                unique_id: "019ba81c-7573-7bb3-8f99-c585fd61faa3",
                site_type: "fotovoltaica",
                city: "São Paulo", state: "SP", country: "Brasil",
                latitude: -23.55, longitude: -46.63,
                description: "Main solar plant",
                created_at: "2024-01-15T10:30:00Z"
              }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="POST"
            path="/sites"
            description="Create a new site."
            baseUrl={baseUrl}
            parameters={[
              { name: 'name', type: 'string', required: true, description: 'Site name', location: 'body' },
              { name: 'site_type', type: 'string', required: false, description: 'Type (use GET /site-types for valid values)', location: 'body' },
              { name: 'unique_id', type: 'uuid', required: false, description: 'UUID v7 identifier', location: 'body' },
              { name: 'slug', type: 'string', required: false, description: 'URL-friendly slug (must be unique)', location: 'body' },
              { name: 'city', type: 'string', required: false, description: 'City', location: 'body' },
              { name: 'state', type: 'string', required: false, description: 'State', location: 'body' },
              { name: 'country', type: 'string', required: false, description: 'Country', location: 'body' },
              { name: 'latitude', type: 'number', required: false, description: 'Latitude', location: 'body' },
              { name: 'longitude', type: 'number', required: false, description: 'Longitude', location: 'body' },
            ]}
            requestBody={JSON.stringify({ name: "Wind Farm Beta", site_type: "eolica", city: "Fortaleza", state: "CE", country: "Brasil" }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                id: "660e8400-e29b-41d4-a716-446655440001",
                name: "Wind Farm Beta",
                slug: null,
                unique_id: null,
                site_type: "eolica",
                city: "Fortaleza", state: "CE", country: "Brasil",
                latitude: null, longitude: null,
                description: null,
                created_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/sites/{siteId}"
            description="Get a single site by ID."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "Solar Farm Alpha",
                slug: "solar-farm-alpha",
                unique_id: "019ba81c-7573-7bb3-8f99-c585fd61faa3",
                site_type: "fotovoltaica",
                description: "Main solar plant",
                address: "Rua das Flores, 123",
                city: "São Paulo", state: "SP", country: "Brasil",
                latitude: -23.55, longitude: -46.63,
                created_at: "2024-01-15T10:30:00Z",
                updated_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />

          <EndpointCard
            method="PATCH"
            path="/sites/{siteId}"
            description="Update a site. At least one field must be provided."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'name', type: 'string', required: false, description: 'New name', location: 'body' },
              { name: 'slug', type: 'string', required: false, description: 'New slug (must be unique)', location: 'body' },
              { name: 'site_type', type: 'string', required: false, description: 'New type', location: 'body' },
              { name: 'city', type: 'string', required: false, description: 'City', location: 'body' },
              { name: 'state', type: 'string', required: false, description: 'State', location: 'body' },
            ]}
            requestBody={JSON.stringify({ name: "Updated Site Name", slug: "updated-slug" }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "Updated Site Name",
                slug: "updated-slug",
                site_type: "fotovoltaica",
                created_at: "2024-01-15T10:30:00Z",
                updated_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/sites/{siteId}/stats"
            description="Get aggregated statistics for a site."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: {
                site_id: "550e8400-e29b-41d4-a716-446655440000",
                equipment_count: 42,
                sessions_count: 5,
                files_count: 18,
                total_size_bytes: 524288000,
                unique_protocols: ["Modbus TCP", "DNP3", "IEC 61850"]
              }
            }, null, 2)}
          />
        </div>
      </div>

      {/* ── EQUIPMENT ──────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Equipment</h3>
        <p className="text-sm text-muted-foreground mb-4">Discovered equipment identified by MAC address.</p>
        <div className="space-y-3">
          <EndpointCard
            method="GET"
            path="/sites/{siteId}/equipment"
            description="List all equipment discovered in a site."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: [{
                id: "aaa-bbb-ccc",
                ip_address: "192.168.1.10",
                mac_address: "00:1a:2b:3c:4d:5e",
                role: "master",
                manufacturer: "Schneider Electric",
                model: "M340",
                device_name: "PLC-01",
                device_type: "PLC",
                firmware_version: "3.20",
                variable_count: 150,
                sample_count: 45000,
                protocols: ["Modbus TCP"],
                first_seen_at: "2024-01-15T10:30:00Z",
                last_seen_at: "2024-06-20T14:00:00Z"
              }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/sites/{siteId}/equipment/{macAddress}"
            description="Get a single equipment by MAC address."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'macAddress', type: 'string', required: true, description: 'MAC address (e.g., 00:1a:2b:3c:4d:5e)', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: {
                id: "aaa-bbb-ccc",
                ip_address: "192.168.1.10",
                mac_address: "00:1a:2b:3c:4d:5e",
                role: "master",
                manufacturer: "Schneider Electric",
                model: "M340",
                device_name: "PLC-01",
                device_type: "PLC",
                firmware_version: "3.20",
                variable_count: 150,
                sample_count: 45000,
                protocols: ["Modbus TCP"],
                first_seen_at: "2024-01-15T10:30:00Z",
                last_seen_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />

          <EndpointCard
            method="PATCH"
            path="/sites/{siteId}/equipment/{macAddress}"
            description="Update equipment metadata (role, manufacturer, model, etc.)."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'macAddress', type: 'string', required: true, description: 'MAC address', location: 'path' },
              { name: 'role', type: 'string', required: false, description: 'Equipment role (master, slave, unknown)', location: 'body' },
              { name: 'manufacturer', type: 'string', required: false, description: 'Manufacturer name', location: 'body' },
              { name: 'model', type: 'string', required: false, description: 'Equipment model', location: 'body' },
              { name: 'device_name', type: 'string', required: false, description: 'Device name/label', location: 'body' },
              { name: 'device_type', type: 'string', required: false, description: 'Device type (PLC, RTU, HMI, etc.)', location: 'body' },
              { name: 'firmware_version', type: 'string', required: false, description: 'Firmware version', location: 'body' },
            ]}
            requestBody={JSON.stringify({ role: "master", manufacturer: "Schneider Electric", model: "M340" }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                id: "aaa-bbb-ccc",
                ip_address: "192.168.1.10",
                mac_address: "00:1a:2b:3c:4d:5e",
                role: "master",
                manufacturer: "Schneider Electric",
                model: "M340",
                updated_at: "2024-06-20T14:00:00Z"
              }
            }, null, 2)}
          />
        </div>
      </div>

      {/* ── SESSIONS ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Upload Sessions</h3>
        <p className="text-sm text-muted-foreground mb-4">Group PCAP file uploads into sessions.</p>
        <div className="space-y-3">
          <EndpointCard
            method="GET"
            path="/sites/{siteId}/sessions"
            description="List all upload sessions for a site."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: [{
                id: "770e8400-e29b-41d4-a716-446655440002",
                site_id: "550e8400-e29b-41d4-a716-446655440000",
                name: "January 2025 Capture",
                description: "Monthly capture from main switch",
                total_files: 3,
                total_size_bytes: 157286400,
                status: "completed",
                created_at: "2025-01-15T10:30:00Z",
                completed_at: "2025-01-15T11:00:00Z"
              }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="POST"
            path="/sites/{siteId}/sessions"
            description="Create a new upload session."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'name', type: 'string', required: false, description: 'Session name', location: 'body' },
              { name: 'description', type: 'string', required: false, description: 'Session description', location: 'body' },
            ]}
            requestBody={JSON.stringify({ name: "April 2025 Capture", description: "Automated capture from tap" }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                id: "880e8400-e29b-41d4-a716-446655440003",
                site_id: "550e8400-e29b-41d4-a716-446655440000",
                name: "April 2025 Capture",
                description: "Automated capture from tap",
                total_files: 0,
                total_size_bytes: 0,
                status: "in_progress",
                created_at: "2025-04-11T17:00:00Z"
              }
            }, null, 2)}
          />
        </div>
      </div>

      {/* ── FILES ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">PCAP Files</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload PCAP files via presigned URL (3-step flow).</p>
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h4 className="text-sm font-semibold mb-3">Upload Flow</h4>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Request upload URL', desc: 'POST /files → returns presigned S3 URL + file_id' },
                { step: 2, title: 'Upload to S3', desc: 'PUT the binary file directly to the presigned URL' },
                { step: 3, title: 'Confirm upload', desc: 'PATCH /files/{fileId} with status: "completed"' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">{s.step}</div>
                  <div>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Security:</strong> The presigned URL is temporary (1h), single-path, and the AWS Secret Key is never exposed. Only a cryptographic signature is included.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <EndpointCard
            method="GET"
            path="/sites/{siteId}/sessions/{sessionId}/files"
            description="List all files in a session."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'sessionId', type: 'uuid', required: true, description: 'Session ID', location: 'path' },
            ]}
            responseExample={JSON.stringify({
              data: [{
                id: "990e8400-e29b-41d4-a716-446655440004",
                filename: "1712847600_captura.pcap",
                original_filename: "captura.pcap",
                size_bytes: 52428800,
                content_type: "application/octet-stream",
                upload_status: "completed",
                uploaded_at: "2025-04-11T17:00:00Z",
                completed_at: "2025-04-11T17:00:05Z",
                display_order: 1
              }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="POST"
            path="/sites/{siteId}/sessions/{sessionId}/files"
            description="Step 1: Request a presigned URL to upload a PCAP file."
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'sessionId', type: 'uuid', required: true, description: 'Session ID', location: 'path' },
              { name: 'filename', type: 'string', required: true, description: 'Original filename (e.g., captura.pcap)', location: 'body' },
              { name: 'content_type', type: 'string', required: false, description: 'MIME type (default: application/octet-stream)', location: 'body' },
              { name: 'size_bytes', type: 'number', required: false, description: 'File size in bytes', location: 'body' },
            ]}
            requestBody={JSON.stringify({ filename: "captura_2025-04-11.pcap", content_type: "application/octet-stream", size_bytes: 52428800 }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                file_id: "990e8400-e29b-41d4-a716-446655440004",
                upload_url: "https://bucket.s3.us-east-1.amazonaws.com/customers/.../captura.pcap?X-Amz-Algorithm=...&X-Amz-Signature=...",
                s3_key: "customers/site-uuid/sessions/session-uuid/1712847600_captura.pcap",
                expires_in: 3600
              }
            }, null, 2)}
          />

          <EndpointCard
            method="PATCH"
            path="/sites/{siteId}/sessions/{sessionId}/files/{fileId}"
            description='Step 3: Confirm upload completed (after PUT to S3).'
            baseUrl={baseUrl}
            parameters={[
              { name: 'siteId', type: 'uuid', required: true, description: 'Site ID', location: 'path' },
              { name: 'sessionId', type: 'uuid', required: true, description: 'Session ID', location: 'path' },
              { name: 'fileId', type: 'uuid', required: true, description: 'File ID (from Step 1 response)', location: 'path' },
              { name: 'status', type: 'string', required: true, description: '"completed" or "error"', location: 'body' },
              { name: 'error_message', type: 'string', required: false, description: 'Error details (when status is "error")', location: 'body' },
            ]}
            requestBody={JSON.stringify({ status: "completed" }, null, 2)}
            responseExample={JSON.stringify({
              data: {
                id: "990e8400-e29b-41d4-a716-446655440004",
                filename: "1712847600_captura.pcap",
                original_filename: "captura_2025-04-11.pcap",
                size_bytes: 52428800,
                upload_status: "completed",
                completed_at: "2025-04-11T17:00:05Z"
              }
            }, null, 2)}
          />
        </div>
      </div>

      {/* ── CATALOGS ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Catalogs</h3>
        <p className="text-sm text-muted-foreground mb-4">Reference data (manufacturers, models, protocols, site types).</p>
        <div className="space-y-3">
          <EndpointCard
            method="GET"
            path="/manufacturers"
            description="List all registered manufacturers."
            baseUrl={baseUrl}
            responseExample={JSON.stringify({
              data: [{ id: "aaa-111", name: "Schneider Electric", created_at: "2024-01-15T10:30:00Z" }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/equipment-models"
            description="List all equipment models."
            baseUrl={baseUrl}
            responseExample={JSON.stringify({
              data: [{ id: "bbb-222", manufacturer_id: "aaa-111", name: "Modicon M340", description: "PLC", created_at: "2024-01-15T10:30:00Z" }],
              count: 1
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/protocols"
            description="List known OT/ICS protocols."
            baseUrl={baseUrl}
            responseExample={JSON.stringify({
              data: ["Modbus TCP", "Modbus RTU", "DNP3", "IEC 61850", "IEC 60870-5-104", "OPC UA", "MQTT"],
              count: 7
            }, null, 2)}
          />

          <EndpointCard
            method="GET"
            path="/site-types"
            description="List valid site type values."
            baseUrl={baseUrl}
            responseExample={JSON.stringify({
              data: [
                { value: "eolica", label: "Wind Turbine" },
                { value: "fotovoltaica", label: "Solar" },
                { value: "bess", label: "BESS" },
                { value: "subestacao", label: "Substation" },
              ],
              count: 4
            }, null, 2)}
          />
        </div>
      </div>

      {/* Error Codes */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-4">Error Codes</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((err) => (
                  <tr key={err.code} className="border-t">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">{err.code}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{err.description}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{err.example}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
