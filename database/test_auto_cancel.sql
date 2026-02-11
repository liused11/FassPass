-- ================================================
-- TEST: Auto-Cancel Expired Pending Reservations
-- ================================================
-- Purpose: Test the auto-cancellation functionality with real data structure
-- Usage: Run this in Supabase SQL Editor

-- ================================================
-- SETUP: Ensure test data exists
-- ================================================

-- Note: This script assumes your database already has:
-- - parking_sites
-- - buildings  
-- - floors
-- - zones
-- - slots
-- If not, you'll need to create them first or adjust the IDs below

-- ================================================
-- TEST 1: Basic Functionality - 20 Minutes Expired
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 1: Basic Functionality (20 minutes expired) ===';
END $$;

-- Create a test reservation that's 20 minutes past start_time
INSERT INTO public.reservations (
    id,
    user_id,
    parking_site_id,
    floor_id,
    slot_id,
    status,
    start_time,
    end_time,
    vehicle_type
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Test user ID
    -- Use existing IDs from your database, or generic format:
    (SELECT id FROM parking_sites LIMIT 1),  -- Get first site
    (SELECT id FROM floors LIMIT 1),         -- Get first floor
    (SELECT id FROM slots LIMIT 1),          -- Get first slot
    'pending'::public.reservation_status,
    NOW() - INTERVAL '20 minutes',  -- Start time was 20 minutes ago
    NOW() + INTERVAL '1 hour',      -- End time is 1 hour from now
    'car'::public.vehicle_type
) ON CONFLICT (id) DO UPDATE SET
    status = 'pending'::public.reservation_status,
    start_time = NOW() - INTERVAL '20 minutes',
    end_time = NOW() + INTERVAL '1 hour';

-- Verify the reservation exists
DO $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.reservations WHERE id = '11111111-1111-1111-1111-111111111111';
    RAISE NOTICE 'Before auto-cancel: Reservation status = %', v_status;
END $$;

-- Run the auto-cancel function
SELECT auto_cancel_expired_pending_reservations() as test1_cancelled_count;

-- Verify the reservation is now cancelled
DO $$
DECLARE
    v_status text;
    v_updated_at timestamptz;
BEGIN
    SELECT status, updated_at INTO v_status, v_updated_at 
    FROM public.reservations 
    WHERE id = '11111111-1111-1111-1111-111111111111';
    
    RAISE NOTICE 'After auto-cancel: Reservation status = %, updated_at = %', v_status, v_updated_at;
    
    IF v_status = 'cancelled' THEN
        RAISE NOTICE '✓ TEST 1 PASSED: Reservation was cancelled';
    ELSE
        RAISE WARNING '✗ TEST 1 FAILED: Reservation status is still %', v_status;
    END IF;
END $$;

-- Check audit log
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reservations_history
    WHERE reservation_id = '11111111-1111-1111-1111-111111111111'
    AND description LIKE '%Auto-cancelled%';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Audit log created: % entries', v_count;
    ELSE
        RAISE WARNING '✗ No audit log found';
    END IF;
END $$;

-- ================================================
-- TEST 2: Boundary Test - 14 Minutes (Should NOT Cancel)
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 2: Boundary Test (14 minutes - should NOT cancel) ===';
END $$;

INSERT INTO public.reservations (
    id,
    user_id,
    parking_site_id,
    floor_id,
    slot_id,
    status,
    start_time,
    end_time,
    vehicle_type
) VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM parking_sites LIMIT 1),
    (SELECT id FROM floors LIMIT 1 OFFSET 0),
    (SELECT id FROM slots LIMIT 1 OFFSET 1),  -- Use different slot
    'pending'::public.reservation_status,
    NOW() - INTERVAL '14 minutes',  -- Only 14 minutes ago
    NOW() + INTERVAL '1 hour',
    'car'::public.vehicle_type
) ON CONFLICT (id) DO UPDATE SET
    status = 'pending'::public.reservation_status,
    start_time = NOW() - INTERVAL '14 minutes',
    end_time = NOW() + INTERVAL '1 hour';

-- Run auto-cancel
SELECT auto_cancel_expired_pending_reservations() as test2_should_be_zero;

-- Verify still pending
DO $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.reservations WHERE id = '22222222-2222-2222-2222-222222222222';
    
    IF v_status = 'pending' THEN
        RAISE NOTICE '✓ TEST 2 PASSED: 14-minute reservation still pending';
    ELSE
        RAISE WARNING '✗ TEST 2 FAILED: Reservation was incorrectly cancelled (status: %)', v_status;
    END IF;
END $$;

-- ================================================
-- TEST 3: Boundary Test - 16 Minutes (SHOULD Cancel)
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 3: Boundary Test (16 minutes - SHOULD cancel) ===';
END $$;

INSERT INTO public.reservations (
    id,
    user_id,
    parking_site_id,
    floor_id,
    slot_id,
    status,
    start_time,
    end_time,
    vehicle_type
) VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM parking_sites LIMIT 1),
    (SELECT id FROM floors LIMIT 1 OFFSET 0),
    (SELECT id FROM slots LIMIT 1 OFFSET 2),  -- Use different slot
    'pending'::public.reservation_status,
    NOW() - INTERVAL '16 minutes',  -- 16 minutes ago
    NOW() + INTERVAL '1 hour',
    'car'::public.vehicle_type
) ON CONFLICT (id) DO UPDATE SET
    status = 'pending'::public.reservation_status,
    start_time = NOW() - INTERVAL '16 minutes',
    end_time = NOW() + INTERVAL '1 hour';

-- Run auto-cancel
SELECT auto_cancel_expired_pending_reservations() as test3_should_be_one;

-- Verify cancelled
DO $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.reservations WHERE id = '33333333-3333-3333-3333-333333333333';
    
    IF v_status = 'cancelled' THEN
        RAISE NOTICE '✓ TEST 3 PASSED: 16-minute reservation was cancelled';
    ELSE
        RAISE WARNING '✗ TEST 3 FAILED: Reservation was not cancelled (status: %)', v_status;
    END IF;
END $$;

-- ================================================
-- TEST 4: Status Filter Test
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 4: Status Filter (non-pending should be ignored) ===';
END $$;

-- Create expired reservations with different statuses
INSERT INTO public.reservations (
    id,
    user_id,
    parking_site_id,
    floor_id,
    slot_id,
    status,
    start_time,
    end_time,
    vehicle_type
) VALUES 
    (
        '44444444-4444-4444-4444-444444444444'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        (SELECT id FROM parking_sites LIMIT 1),
        (SELECT id FROM floors LIMIT 1),
        (SELECT id FROM slots LIMIT 1 OFFSET 3),
        'confirmed'::public.reservation_status,  -- Not pending
        NOW() - INTERVAL '20 minutes',
        NOW() + INTERVAL '1 hour',
        'car'::public.vehicle_type
    ),
    (
        '55555555-5555-5555-5555-555555555555'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        (SELECT id FROM parking_sites LIMIT 1),
        (SELECT id FROM floors LIMIT 1),
        (SELECT id FROM slots LIMIT 1 OFFSET 4),
        'checked_in'::public.reservation_status,  -- Not pending
        NOW() - INTERVAL '20 minutes',
        NOW() + INTERVAL '1 hour',
        'car'::public.vehicle_type
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

-- Run auto-cancel
SELECT auto_cancel_expired_pending_reservations() as test4_should_ignore_non_pending;

-- Verify they remain in their original status
DO $$
DECLARE
    v_status1 text;
    v_status2 text;
BEGIN
    SELECT status INTO v_status1 FROM public.reservations WHERE id = '44444444-4444-4444-4444-444444444444';
    SELECT status INTO v_status2 FROM public.reservations WHERE id = '55555555-5555-5555-5555-555555555555';
    
    IF v_status1 = 'confirmed' AND v_status2 = 'checked_in' THEN
        RAISE NOTICE '✓ TEST 4 PASSED: Non-pending reservations were ignored';
    ELSE
        RAISE WARNING '✗ TEST 4 FAILED: Status changed to %, %', v_status1, v_status2;
    END IF;
END $$;

-- ================================================
-- VIEW ALL TEST RESULTS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SUMMARY OF ALL TEST RESERVATIONS ===';
END $$;

SELECT 
    id,
    status,
    start_time,
    NOW() - start_time as time_since_start,
    updated_at
FROM public.reservations
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
)
ORDER BY id;

-- View audit logs
SELECT 
    reservation_id,
    timestamp,
    description,
    details->>'auto_cancel_reason' as cancel_reason
FROM public.reservations_history
WHERE reservation_id IN (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333'
)
ORDER BY timestamp DESC;

-- ================================================
-- CLEANUP (Optional - comment out to keep test data)
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CLEANUP ===';
END $$;

-- Remove test data
DELETE FROM public.reservations_history 
WHERE reservation_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

DELETE FROM public.reservations 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

DO $$
BEGIN
    RAISE NOTICE '✓ Test data cleaned up';
    RAISE NOTICE '';
    RAISE NOTICE '=== ALL TESTS COMPLETED ===';
END $$;
