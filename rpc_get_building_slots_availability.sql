-- Deploy Script for get_building_slots_availability
-- Run this script in your Supabase SQL Editor

-- 1. Drop conflicting versions (UUID vs TEXT) to avoid ambiguity
DROP FUNCTION IF EXISTS get_building_slots_availability(uuid, timestamp with time zone, timestamp with time zone, integer, text);
DROP FUNCTION IF EXISTS get_building_slots_availability(text, timestamp with time zone, timestamp with time zone, integer, text);

-- 2. Create the Function (TEXT version)
CREATE OR REPLACE FUNCTION get_building_slots_availability(
  p_building_id TEXT,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_interval_minutes INT,
  p_vehicle_type TEXT
)
RETURNS TABLE (
  slot_time TIMESTAMP WITH TIME ZONE,
  total_capacity BIGINT,
  reserved_count BIGINT,
  available_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_code INT;
BEGIN
  -- Map text input to integer code
  IF p_vehicle_type = 'motorcycle' THEN v_vehicle_code := 0;
  ELSIF p_vehicle_type = 'ev' THEN v_vehicle_code := 2;
  ELSE v_vehicle_code := 1; -- default 'car'
  END IF;

  -- Force start time to beginning of the hour to ensure clean slots (e.g., 00:00, 01:00)
  p_start_time := date_trunc('hour', p_start_time);

  RETURN QUERY
  WITH 
  -- Generate Time Series
  time_series AS (
    SELECT generate_series(p_start_time, p_end_time, (p_interval_minutes || ' minutes')::INTERVAL) AS t_start
  ),
  
  -- Calculate Total Capacity for Vehicle Type
  building_capacity AS (
    SELECT 
      COUNT(s.id) AS total_slots
    FROM slots s
    JOIN floors f ON s.floor_id = f.id
    WHERE f.building_id = p_building_id
    AND (
      p_vehicle_type IS NULL 
      OR s.vehicle_type_code = v_vehicle_code 
      OR (p_vehicle_type = 'car' AND s.vehicle_type_code IS NULL)
    )
  ),
  
  -- Count Overlapping Reservations per Time Slot
  slot_reservations AS (
    SELECT 
      ts.t_start,
      COUNT(r.id) AS reserved_qty
    FROM time_series ts
    LEFT JOIN (
      SELECT r.start_time, r.end_time, r.id
      FROM reservations r
      JOIN slots s ON r.slot_id = s.id
      JOIN floors f ON s.floor_id = f.id
      WHERE f.building_id = p_building_id
      AND (
          p_vehicle_type IS NULL 
          OR s.vehicle_type_code = v_vehicle_code
          OR (p_vehicle_type = 'car' AND s.vehicle_type_code IS NULL)
      )
      AND r.status IN ('pending', 'checked_in', 'confirmed', 'pending_payment', 'active')
    ) r_filtered ON 
      (r_filtered.start_time < (ts.t_start + (p_interval_minutes || ' minutes')::INTERVAL)
      AND r_filtered.end_time > ts.t_start)
    GROUP BY ts.t_start
  )
  
  -- Final Result
  SELECT 
    ts.t_start,
    COALESCE(bc.total_slots, 0) as total_capacity,
    COALESCE(sr.reserved_qty, 0) as reserved_count,
    GREATEST(0, COALESCE(bc.total_slots, 0) - COALESCE(sr.reserved_qty, 0)) as available_count
  FROM time_series ts
  CROSS JOIN building_capacity bc
  LEFT JOIN slot_reservations sr ON ts.t_start = sr.t_start;

END;
$$;

-- 3. Grant Permissions (Required for API Access)
GRANT EXECUTE ON FUNCTION get_building_slots_availability(text, timestamp with time zone, timestamp with time zone, integer, text) TO anon, authenticated, service_role;

-- 4. Verification Query (Optional - Run separately)
-- SELECT * FROM get_building_slots_availability('1-1', NOW(), NOW() + interval '4 hours', 60, 'car');
