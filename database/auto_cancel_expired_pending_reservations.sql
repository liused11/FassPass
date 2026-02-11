-- ================================================
-- Auto-Cancel Expired Pending Reservations
-- ================================================
-- Purpose: Automatically cancel reservations that are still 'pending' 
--          15 minutes after their start_time
-- Usage: Call via Edge Function or manually: SELECT auto_cancel_expired_pending_reservations();
-- Returns: Number of cancelled reservations

CREATE OR REPLACE FUNCTION public.auto_cancel_expired_pending_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
    v_cancelled_count INTEGER := 0;
    v_reservation_record RECORD;
BEGIN
    -- Find and update expired pending reservations
    -- A reservation is expired if:
    -- 1. Status is 'pending'
    -- 2. Current time is more than 15 minutes past start_time
    
    FOR v_reservation_record IN
        SELECT 
            id,
            user_id,
            parking_site_id,
            slot_id,
            start_time,
            end_time,
            reserved_at
        FROM public.reservations
        WHERE status = 'pending'
          AND start_time + INTERVAL '15 minutes' < NOW()
        FOR UPDATE -- Lock rows to prevent race conditions
    LOOP
        -- Update status to cancelled
        UPDATE public.reservations
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = v_reservation_record.id;
        
        -- Log to reservations_history for audit trail
        INSERT INTO public.reservations_history (
            reservation_id,
            timestamp,
            description,
            details
        ) VALUES (
            v_reservation_record.id,
            NOW(),
            'Auto-cancelled: Pending reservation expired (15+ minutes past start time)',
            jsonb_build_object(
                'previous_status', 'pending',
                'new_status', 'cancelled',
                'start_time', v_reservation_record.start_time,
                'cancelled_at', NOW(),
                'auto_cancel_reason', 'timeout_15_minutes'
            )
        );
        
        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;
    
    -- Log summary if any cancellations occurred
    IF v_cancelled_count > 0 THEN
        RAISE NOTICE 'Auto-cancelled % expired pending reservation(s)', v_cancelled_count;
    END IF;
    
    RETURN v_cancelled_count;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_pending_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_pending_reservations() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_cancel_expired_pending_reservations() IS 
'Automatically cancels reservations that are still in pending status 15 minutes after their start_time. Returns the count of cancelled reservations. Logs all cancellations to reservations_history table.';
