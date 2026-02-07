-- Drop existing trigger
DROP TRIGGER IF EXISTS sync_discovered_variables_case_trigger ON discovered_variables;

-- Fix the sync function for discovered_variables (this one is working)
-- No changes needed here

-- Now fix learning_samples - create a NEW trigger
CREATE OR REPLACE FUNCTION sync_learning_samples_case()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync from lowercase to CamelCase when lowercase is updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Copy lowercase → CamelCase
    NEW."Identifier" := NEW."Identifier"; -- Already correct
    NEW."SourceIp" := NEW.source_ip;
    NEW."DestinationIp" := NEW.destination_ip;
    NEW."Address" := NEW.address;
    NEW."FC" := NEW.function_code;
    NEW."unid_Id" := NEW.unit_id;
    NEW."SourceMac" := NEW.source_mac;
    NEW."DestinationMac" := NEW.destination_mac;
    NEW."SourcePort" := NEW.source_port;
    NEW."DestinationPort" := NEW.destination_port;
    NEW."Protocol" := NEW.protocol;
    
    -- Also sync from CamelCase to lowercase (for n8n writes)
    IF NEW."SourceIp" IS NOT NULL AND NEW.source_ip IS NULL THEN
      NEW.source_ip := NEW."SourceIp";
    END IF;
    IF NEW."DestinationIp" IS NOT NULL AND NEW.destination_ip IS NULL THEN
      NEW.destination_ip := NEW."DestinationIp";
    END IF;
    IF NEW."Address" IS NOT NULL AND NEW.address IS NULL THEN
      NEW.address := NEW."Address";
    END IF;
    IF NEW."FC" IS NOT NULL AND NEW.function_code IS NULL THEN
      NEW.function_code := NEW."FC";
    END IF;
    IF NEW."unid_Id" IS NOT NULL AND NEW.unit_id IS NULL THEN
      NEW.unit_id := NEW."unid_Id";
    END IF;
    IF NEW."SourceMac" IS NOT NULL AND NEW.source_mac IS NULL THEN
      NEW.source_mac := NEW."SourceMac";
    END IF;
    IF NEW."DestinationMac" IS NOT NULL AND NEW.destination_mac IS NULL THEN
      NEW.destination_mac := NEW."DestinationMac";
    END IF;
    IF NEW."SourcePort" IS NOT NULL AND NEW.source_port IS NULL THEN
      NEW.source_port := NEW."SourcePort";
    END IF;
    IF NEW."DestinationPort" IS NOT NULL AND NEW.destination_port IS NULL THEN
      NEW.destination_port := NEW."DestinationPort";
    END IF;
    IF NEW."Protocol" IS NOT NULL AND NEW.protocol IS NULL THEN
      NEW.protocol := NEW."Protocol";
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for learning_samples
DROP TRIGGER IF EXISTS sync_learning_samples_case_trigger ON learning_samples;

CREATE TRIGGER sync_learning_samples_case_trigger
BEFORE INSERT OR UPDATE ON learning_samples
FOR EACH ROW
EXECUTE FUNCTION sync_learning_samples_case();

-- Now populate existing data (copy lowercase → CamelCase)
-- This will take a while for 67K rows, but it's necessary
UPDATE learning_samples
SET
  "SourceIp" = source_ip,
  "DestinationIp" = destination_ip,
  "Address" = address,
  "FC" = function_code,
  "unid_Id" = unit_id,
  "SourceMac" = source_mac,
  "DestinationMac" = destination_mac,
  "SourcePort" = source_port,
  "DestinationPort" = destination_port,
  "Protocol" = protocol
WHERE 
  "SourceIp" IS NULL 
  OR "Address" IS NULL
  OR "FC" IS NULL;

-- Verify the update worked
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM learning_samples
  WHERE "SourceIp" IS NOT NULL AND "Address" IS NOT NULL;
  
  RAISE NOTICE 'Updated % rows with CamelCase data', v_count;
END $$;