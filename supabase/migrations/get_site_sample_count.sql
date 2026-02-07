-- Function to get sample count from first variable
-- All variables in a site have the same sample count (loaded together)
-- So we just need to count samples for the first variable we find

CREATE OR REPLACE FUNCTION public.get_site_sample_count(p_site_identifier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_sample_count INTEGER;
BEGIN
  -- Get the first variable's characteristics
  WITH primeira_linha AS (
    SELECT 
      "SourceIp",
      "DestinationIp",
      "Address",
      "FC",
      "unid_Id"
    FROM public.learning_samples
    WHERE "Identifier" = p_site_identifier
      AND "SourceIp" IS NOT NULL
      AND "Address" IS NOT NULL
    ORDER BY time ASC
    LIMIT 1
  )
  -- Count how many times this variable appears
  SELECT COUNT(*)::INTEGER INTO v_sample_count
  FROM public.learning_samples ls
  CROSS JOIN primeira_linha pl
  WHERE ls."Identifier" = p_site_identifier
    AND ls."SourceIp" = pl."SourceIp"
    AND ls."DestinationIp" = pl."DestinationIp"
    AND ls."Address" = pl."Address"
    AND ls."FC" = pl."FC"
    AND COALESCE(ls."unid_Id", 0) = COALESCE(pl."unid_Id", 0);
  
  RETURN COALESCE(v_sample_count, 0);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_site_sample_count(text) TO authenticated;

COMMENT ON FUNCTION public.get_site_sample_count IS 
'Returns the sample count for a site by counting samples from the first variable. 
Since all variables are loaded together, they all have the same sample count.';