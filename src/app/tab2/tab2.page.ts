import { Component, OnInit } from '@angular/core';
import { Booking } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';
import { ReservationService } from '../services/reservation.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
  // Removed toggleSection from Component metadata as it belongs to the class
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
    { value: 'hourly', label: 'รายชั่วโมง' },
    { value: 'flat_24h', label: 'เหมาจ่าย 24 ชม.' },
    { value: 'monthly_regular', label: 'รายเดือน' },
    { value: 'monthly_night', label: 'รายเดือน (คืน)' }
  ];

  // Segment for Status
  selectedStatusSegment: string = 'in_progress'; // 'in_progress' | 'completed' | 'cancelled'

  // Arrays for 4 Categories
  hourlyBookings: Booking[] = [];      // Was latestBookings/daily
  flat24Bookings: Booking[] = [];
  monthlyBookings: Booking[] = [];      // monthly_regular
  nightlyBookings: Booking[] = [];      // monthly_night

  // Expanded states for sections
  expandedSections: any = {
    hourly: false,
    flat_24h: false,
    monthly_regular: false,
    monthly_night: false
  };

  // Mock Data
  allBookings: Booking[] = [];

  // Subscription for Realtime updates
  reservationsSubscription: any;

  // Loading State
  isLoading: boolean = false;

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

  async loadRealReservations(event?: any) {
    try {
      if (!event) {
        this.isLoading = true;
      }
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

          // Map booking_type from DB to model
          // DB types: hourly, flat_24h, monthly_regular, monthly_night
          // Fallback to 'hourly' if undefined
          const bookingType = r.booking_type || 'hourly';

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
            carBrand: 'TOYOTA', // Placeholder
            licensePlate: 'กข 1234', // Placeholder
            bookingType: bookingType,
            periodLabel: undefined,

            // New fields for cleaner UI
            building: buildingLabel,
            floor: floorLabel,
            zone: zoneLabel,
            slot: r.slot_id || '-'
          } as Booking;
        });

        // Use ONLY real data as requested. If empty, show empty.
        this.allBookings = mappedBookings;
        this.allBookings.sort((a, b) => b.bookingTime.getTime() - a.bookingTime.getTime());

        this.updateFilter();
      }
    } catch (error) {
      console.error('Error loading real reservations:', error);
    } finally {
      this.isLoading = false;
      if (event) {
        event.target.complete();
      }
    }
  }

  // Pull to Refresh
  doRefresh(event: any) {
    this.loadRealReservations(event);
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
        catMatch = b.bookingType === (this.selectedCategory as any);
      }

      return statusMatch && monthMatch && catMatch;
    });

    // Valid statuses for display logic
    // Using new DB types: hourly, flat_24h, monthly_regular, monthly_night
    this.hourlyBookings = filtered.filter(b => b.bookingType === 'hourly');
    this.flat24Bookings = filtered.filter(b => b.bookingType === 'flat_24h');
    this.monthlyBookings = filtered.filter(b => b.bookingType === 'monthly_regular');
    this.nightlyBookings = filtered.filter(b => b.bookingType === 'monthly_night');
  }

  // Helper for Tailwind classes based on status
  getStatusClass(item: Booking): string {
    if (item.status === 'pending_payment') return 'text-[#FFB800]';
    if (item.status === 'active') return 'text-[#FFB800]';
    if (item.status === 'confirmed') return 'text-[var(--ion-color-primary)]';
    if (item.status === 'completed') return 'text-green-500';
    if (item.status === 'cancelled') return 'text-red-500';
    return '';
  }

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }
}
