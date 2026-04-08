import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Validate input
    const body = await req.json();
    const { fileName, fileSize, fileType } = body;

    if (!fileName || typeof fileName !== "string" || fileName.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTypes = [".csv", ".xlsx", ".xls"];
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    if (!allowedTypes.includes(ext)) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${ext}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate S3 key
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `imports/${userId}/${timestamp}_${safeName}`;

    // Get presigned upload URL from S3 gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AWS_S3_API_KEY = Deno.env.get("AWS_S3_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!AWS_S3_API_KEY) throw new Error("AWS_S3_API_KEY not configured");

    const signResponse = await fetch(
      `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": AWS_S3_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: s3Key }),
      }
    );

    if (!signResponse.ok) {
      const errText = await signResponse.text();
      console.error("S3 sign error:", signResponse.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate upload URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url: uploadUrl, expires_in } = await signResponse.json();

    // Create import record in DB
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: importRecord, error: insertError } = await serviceClient
      .from("imports")
      .insert({
        user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType || ext,
        s3_key: s3Key,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        uploadUrl,
        s3Key,
        importId: importRecord.id,
        expiresIn: expires_in,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
