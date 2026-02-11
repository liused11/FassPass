import { Component, OnInit } from '@angular/core';
import { Booking } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';
import { ReservationService } from '../services/reservation.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  // Dropdown options
  selectedMonth: string = 'all'; // Default to show all for easier demo, or '2025-12'
  selectedCategory: string = 'all';

  // Options for Selectors
  monthOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: '2025-12', label: 'ธันวาคม 2568' },
    { value: '2025-11', label: 'พฤศจิกายน 2568' }
  ];

  categoryOptions = [
    { value: 'all', label: 'รายการทั้งหมด' },
    { value: 'daily', label: 'รายวัน' },
    { value: 'flat24', label: 'เหมาจ่าย 24 ชม.' },
    { value: 'monthly', label: 'รายเดือน' },
    { value: 'monthly_night', label: 'รายเดือน (คืน)' }
  ];

  // Segment for Status
  selectedStatusSegment: string = 'in_progress'; // 'in_progress' | 'completed' | 'cancelled'

  // Arrays for 4 Categories
  latestBookings: Booking[] = [];
  flat24Bookings: Booking[] = [];
  monthlyBookings: Booking[] = [];
  nightlyBookings: Booking[] = [];

  // Mock Data
  allBookings: Booking[] = [];

  // Subscription for Realtime updates
  reservationsSubscription: any;

  constructor(
    private parkingService: ParkingDataService,
    private reservationService: ReservationService
  ) { }

  ngOnInit() {
    // Initial load from service subscription (mock data mostly)
    this.parkingService.bookings$.subscribe(bookings => {
      this.allBookings = bookings;
      this.updateFilter();
    });

    // Subscribe to Test User ID changes to reload data automatically
    this.reservationService.testUserId$.subscribe(async (userId) => {
      if (userId) {
        console.log('Tab2: Test User ID changed to', userId);
        await this.loadRealReservations();

        // Re-subscribe to realtime channel for new user
        if (this.reservationsSubscription) {
          this.reservationsSubscription.unsubscribe();
        }
        this.setupRealtimeSubscription();
      }
    });
  }

  async ionViewWillEnter() {
    await this.loadRealReservations();
    this.setupRealtimeSubscription();
  }

  ionViewWillLeave() {
    if (this.reservationsSubscription) {
      this.reservationsSubscription.unsubscribe();
      this.reservationsSubscription = null;
    }
  }

  setupRealtimeSubscription() {
    if (this.reservationsSubscription) {
      return; // Already subscribed
    }

    this.reservationsSubscription = this.reservationService.subscribeToUserReservations(() => {
      console.log('Tab2: Realtime update triggered reload');
      this.loadRealReservations();
    });
  }

  async loadRealReservations() {
    try {
      const reservations = await this.reservationService.getUserReservationsFromEdge();
      console.log('Real reservations loaded:', reservations);

      if (reservations) {
        // Map DB reservations to Booking model
        const mappedBookings: Booking[] = reservations.map((r: any) => {
          const lot = this.parkingService.getParkingLotById(r.parking_site_id);

          let status: any = 'pending_payment';
          let statusLabel = 'รอชำระเงิน';

          switch (r.status) {
            case 'pending':
              status = 'pending_payment';
              statusLabel = 'รอชำระเงิน';
              break;
            case 'confirmed':
              status = 'confirmed';
              statusLabel = 'จองแล้ว';
              break;
            case 'checked_in':
              status = 'active';
              statusLabel = 'กำลังจอด';
              break;
            case 'checked_out':
              status = 'completed';
              statusLabel = 'เสร็จสิ้น';
              break;
            case 'cancelled':
              status = 'cancelled';
              statusLabel = 'ยกเลิกแล้ว';
              break;
          }

          // Zone & Location Logic
          let zoneLabel = '-';
          let floorLabel = '-';
          let buildingLabel = '-';
          let derivedPlaceName = null;

          if (r.slot_id) {
            const parts = r.slot_id.split('-');
            if (parts.length >= 2) {
              const buildingId = `${parts[0]}-${parts[1]}`;
              const derivedLot = this.parkingService.getParkingLotById(buildingId);
              if (derivedLot) {
                derivedPlaceName = derivedLot.name;
              }
            }

            if (parts.length >= 5) { // Ensure enough parts: building-floor-zone-slot
              // "1-2-1-1-1" -> Building is parts[1] (2)
              buildingLabel = parts[1];

              // "1-1-2-1-1" -> Floor is parts[2] (2)
              floorLabel = parts[2];

              // "1-1-1-2-1" -> Zone is parts[3] (2 -> B)
              if (parts[3] === '1') zoneLabel = 'A';
              else if (parts[3] === '2') zoneLabel = 'B';
            }
          }

          // Use derived name if found, otherwise fallback to existing logic
          let placeName = derivedPlaceName;
          if (!placeName) {
            placeName = lot ? lot.name : (r.parking_site_id || 'Unknown Location');
          }

          return {
            id: r.id,
            placeName: placeName,
            locationDetails: `ตึก ${buildingLabel} ชั้น ${floorLabel} | โซน ${zoneLabel} | ${r.slot_id || '-'}`,
            bookingTime: new Date(r.start_time),
            endTime: new Date(r.end_time),
            status: status,
            statusLabel: statusLabel,
            price: r.total_amount || 0,
            discountBadge: undefined,
            carBrand: 'TOYOTA', // Placeholder or fetch from vehicle_id if available
            licensePlate: 'กข 1234', // Placeholder
            bookingType: 'daily', // Assume daily for now
            periodLabel: undefined
          } as Booking;
        });

        // Use ONLY real data as requested. If empty, show empty.
        this.allBookings = mappedBookings;
        this.allBookings.sort((a, b) => b.bookingTime.getTime() - a.bookingTime.getTime());

        this.updateFilter();
      }
    } catch (error) {
      console.error('Error loading real reservations:', error);
      // Fallback to mock data if call fails? Or show empty?
      // Current behavior leaves mock data if load fails, which is safer as fallback.
    }
  }

  segmentChanged(event: any) {
    this.selectedStatusSegment = event.detail.value;
    this.updateFilter();
  }

  filterChanged() {
    this.updateFilter();
  }

  updateFilter() {
    let filtered = this.allBookings.filter(b => {
      // 1. Status Filter
      let statusMatch = false;
      if (this.selectedStatusSegment === 'in_progress') {
        statusMatch = ['active', 'confirmed', 'pending_payment'].includes(b.status);
      } else if (this.selectedStatusSegment === 'cancelled') {
        statusMatch = b.status === 'cancelled';
      } else {
        statusMatch = b.status === 'completed';
      }

      // 2. Month Filter
      let monthMatch = true;
      if (this.selectedMonth !== 'all') {
        const d = new Date(b.bookingTime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        monthMatch = key === this.selectedMonth;
      }

      // 3. Category Filter
      let catMatch = true;
      if (this.selectedCategory !== 'all') {
        catMatch = b.bookingType === this.selectedCategory;
      }

      return statusMatch && monthMatch && catMatch;
    });

    // Valid statuses for display logic
    this.latestBookings = filtered.filter(b => b.bookingType === 'daily');
    this.flat24Bookings = filtered.filter(b => b.bookingType === 'flat24');
    this.monthlyBookings = filtered.filter(b => b.bookingType === 'monthly');
    this.nightlyBookings = filtered.filter(b => b.bookingType === 'monthly_night');
  }

  // Helper for Tailwind classes based on status
  getStatusClass(item: Booking): string {
    if (item.status === 'pending_payment') return 'text-[#FFB800]'; // Specific Yellow from image
    if (item.status === 'active') return 'text-[#FFB800]';
    if (item.status === 'confirmed') return 'text-[var(--ion-color-primary)]';
    if (item.status === 'completed') return 'text-green-500';
    return '';
  }
}
