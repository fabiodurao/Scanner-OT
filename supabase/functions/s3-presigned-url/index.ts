// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// AWS Signature V4 implementation
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

function encodeURIComponentRFC3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

async function generatePresignedUrl(
  method: string,
  bucket: string,
  key: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const service = "s3";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").substring(0, 15) + "Z";
  const dateStamp = amzDate.substring(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  
  const encodedKey = key.split('/').map(encodeURIComponentRFC3986).join('/');
  
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresIn.toString(),
    "X-Amz-SignedHeaders": "host",
  };
  
  const sortedQueryString = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponentRFC3986(k)}=${encodeURIComponentRFC3986(queryParams[k])}`)
    .join("&");
  
  const canonicalUri = "/" + encodedKey;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  
  const canonicalRequest = [
    method,
    canonicalUri,
    sortedQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  
  console.log("[s3-presigned-url] Canonical Request:\n", canonicalRequest);
  
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");
  
  console.log("[s3-presigned-url] String to Sign:\n", stringToSign);
  
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);
  
  const presignedUrl = `${endpoint}/${encodedKey}?${sortedQueryString}&X-Amz-Signature=${signature}`;
  
  return presignedUrl;
}

serve(async (req: Request) => {
  console.log("[s3-presigned-url] Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[s3-presigned-url] No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("[s3-presigned-url] User verification failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[s3-presigned-url] User verified:", user.id);

    const body = await req.json();
    const { filename, contentType, customerId, sessionId } = body;

    console.log("[s3-presigned-url] Request body:", { filename, contentType, customerId, sessionId });

    if (!filename || !customerId || !sessionId) {
      return new Response(
        JSON.stringify({ error: "filename, customerId, and sessionId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("AWS_S3_BUCKET");
    const region = Deno.env.get("AWS_S3_REGION");

    console.log("[s3-presigned-url] AWS config:", { 
      bucket, 
      region, 
      hasAccessKey: !!accessKeyId, 
      hasSecretKey: !!secretAccessKey 
    });

    if (!accessKeyId || !secretAccessKey || !bucket || !region) {
      console.log("[s3-presigned-url] Missing AWS configuration");
      return new Response(
        JSON.stringify({ error: "AWS configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const s3Key = `customers/${customerId}/sessions/${sessionId}/${timestamp}_${sanitizedFilename}`;

    console.log("[s3-presigned-url] Generating presigned URL for:", s3Key);

    const presignedUrl = await generatePresignedUrl(
      "PUT",
      bucket,
      s3Key,
      region,
      accessKeyId,
      secretAccessKey,
      3600
    );

    console.log("[s3-presigned-url] Presigned URL generated successfully");
    console.log("[s3-presigned-url] URL preview:", presignedUrl.substring(0, 100) + "...");

    return new Response(
      JSON.stringify({
        presignedUrl,
        s3Key,
        bucket,
        region,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[s3-presigned-url] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});