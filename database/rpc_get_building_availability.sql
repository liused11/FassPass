CREATE OR REPLACE FUNCTION get_building_availability(
  p_building_id TEXT,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_vehicle_type TEXT DEFAULT 'car'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_results jsonb;
  v_vehicle_code INT;
BEGIN
  -- 1. Standardize Vehicle Code Mapping
  IF p_vehicle_type = 'motorcycle' THEN v_vehicle_code := 0;
  ELSIF p_vehicle_type = 'ev' THEN v_vehicle_code := 2;
  ELSE v_vehicle_code := 1; -- default 'car'
  END IF;

  SELECT jsonb_agg(
      jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'capacity', COALESCE(floor_stats.total_capacity, 0),
          'totalAvailable', COALESCE(floor_stats.total_available, 0),
          'zones', COALESCE(floor_stats.zones_data, '[]'::jsonb)
      )
  ) INTO v_results
  FROM floors f
  JOIN buildings b ON f.building_id = b.id
  LEFT JOIN LATERAL (
      SELECT 
          SUM(z_stats.capacity) as total_capacity,
          SUM(z_stats.available) as total_available,
          jsonb_agg(
              jsonb_build_object(
                  'id', z_stats.zone_id,
                  'name', z_stats.zone_name,
                  'capacity', z_stats.capacity,
                  'available', z_stats.available,
                  'status', CASE WHEN z_stats.available > 0 THEN 'available' ELSE 'full' END
              ) ORDER BY z_stats.zone_name
          ) as zones_data
      FROM (
          SELECT 
              z.id as zone_id,
              z.name as zone_name,
              COUNT(s.id) as capacity,
              (
                  COUNT(s.id) - 
                  COUNT(
                      CASE WHEN EXISTS (
                          SELECT 1 FROM reservations r
                          WHERE r.slot_id = s.id
                          -- 2. Status Check: Must include active/confirmed
                          AND r.status IN ('pending', 'checked_in', 'confirmed', 'pending_payment', 'active')
                          -- 3. Overlap Check: [Start, End) overlap
                          AND r.start_time < p_end_time 
                          AND r.end_time > p_start_time
                      ) THEN 1 END
                  )
              ) as available
          FROM zones z
          JOIN slots s ON s.zone_id = z.id
          WHERE z.floor_id = f.id
          AND s.status = 'available' -- Only count currently functioning slots
          -- 4. Vehicle Type Filter
          AND (
             s.vehicle_type_code = v_vehicle_code 
             OR (p_vehicle_type = 'car' AND s.vehicle_type_code IS NULL)
          )
          GROUP BY z.id, z.name
      ) z_stats
  ) floor_stats ON true
  WHERE b.id = p_building_id;

  RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_building_availability(text, timestamp with time zone, timestamp with time zone, text) TO anon, authenticated, service_role;
