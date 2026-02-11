CREATE OR REPLACE FUNCTION "public"."find_best_available_slot"("p_zone_id" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_slot_id TEXT;
  v_slot_name TEXT;
BEGIN
  SELECT s.id, s.name INTO v_slot_id, v_slot_name
  FROM slots s
  WHERE s.zone_id = p_zone_id
  AND s.status = 'available'
  AND NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.slot_id = s.id
    AND r.status IN ('pending', 'checked_in', 'confirmed', 'pending_payment', 'active')
    AND r.start_time < p_end_time 
    AND r.end_time > p_start_time
  )
  -- FIX: Sort by length first to handle text-based number sorting (e.g. '2' before '10')
  ORDER BY length(s.id) ASC, s.id ASC 
  LIMIT 1;

  IF v_slot_id IS NOT NULL THEN
    RETURN jsonb_build_object('slot_id', v_slot_id, 'slot_name', v_slot_name);
  ELSE
    RETURN NULL;
  END IF;
END;
$$;
