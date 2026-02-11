-- ================================================
-- MIGRATION: Auto-Cancel Expired Reservations
-- ================================================
-- Version: 1.0
-- Date: 2026-02-04
-- Description: Add auto-cancellation function for pending reservations
--              that are 15+ minutes past their start_time

-- ================================================
-- STEP 1: Create the auto-cancel function
-- ================================================

CREATE OR REPLACE FUNCTION public.auto_cancel_expired_pending_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cancelled_count INTEGER := 0;
    v_reservation_record RECORD;
BEGIN
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
        FOR UPDATE
    LOOP
        UPDATE public.reservations
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = v_reservation_record.id;
        
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
    
    IF v_cancelled_count > 0 THEN
        RAISE NOTICE 'Auto-cancelled % expired pending reservation(s)', v_cancelled_count;
    END IF;
    
    RETURN v_cancelled_count;
END;
$$;

-- ================================================
-- STEP 2: Grant permissions
-- ================================================

GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_pending_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_pending_reservations() TO service_role;

-- ================================================
-- STEP 3: Add documentation
-- ================================================

COMMENT ON FUNCTION public.auto_cancel_expired_pending_reservations() IS 
'Automatically cancels reservations that are still in pending status 15 minutes after their start_time. Returns the count of cancelled reservations. Logs all cancellations to reservations_history table.';

-- ================================================
-- VERIFICATION
-- ================================================

-- Verify function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'auto_cancel_expired_pending_reservations'
    ) THEN
        RAISE NOTICE '✓ Function auto_cancel_expired_pending_reservations created successfully';
    ELSE
        RAISE EXCEPTION '✗ Function creation failed';
    END IF;
END $$;

-- Test the function (should return 0 if no expired reservations)
SELECT auto_cancel_expired_pending_reservations() as initial_test_result;

RAISE NOTICE 'Migration completed successfully!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Deploy Supabase Edge Function: supabase functions deploy auto-cancel-reservations';
RAISE NOTICE '2. Set up scheduling (GitHub Actions, Vercel Cron, etc.)';
RAISE NOTICE '3. Run test_auto_cancel.sql to verify functionality';
