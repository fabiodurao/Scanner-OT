-- Fix the function to use the CORRECT column names (CamelCase)
CREATE OR REPLACE FUNCTION public.get_variables_ready_for_analysis(p_site_identifier text, p_min_samples integer DEFAULT 50)
RETURNS TABLE(
  source_ip text, 
  destination_ip text, 
  address bigint, 
  function_code bigint, 
  unit_id bigint, 
  sample_count bigint, 
  first_seen timestamp with time zone, 
  last_seen timestamp with time zone, 
  protocols text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ls."SourceIp" as source_ip,           -- ✅ Usando CamelCase
    ls."DestinationIp" as destination_ip, -- ✅ Usando CamelCase
    ls."Address" as address,              -- ✅ Usando CamelCase
    ls."FC" as function_code,             -- ✅ Usando CamelCase
    ls."unid_Id" as unit_id,              -- ✅ Usando CamelCase
    COUNT(*) as sample_count,
    MIN(ls.time) as first_seen,
    MAX(ls.time) as last_seen,
    ARRAY_AGG(DISTINCT ls."Protocol") FILTER (WHERE ls."Protocol" IS NOT NULL) as protocols
  FROM public.learning_samples ls
  WHERE ls."Identifier" = p_site_identifier  -- ✅ Usando CamelCase
    AND ls."SourceIp" IS NOT NULL            -- ✅ Usando CamelCase
    AND ls."Address" IS NOT NULL             -- ✅ Usando CamelCase
  GROUP BY ls."SourceIp", ls."DestinationIp", ls."Address", ls."FC", ls."unid_Id"
  HAVING COUNT(*) >= p_min_samples
  ORDER BY ls."SourceIp", ls."Address";
END;
$function$;

-- Test the function
SELECT * FROM get_variables_ready_for_analysis('019b2cb0-9617-7952-b2eb-e6002a039ed9', 50);