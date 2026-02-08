import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ParkingLot, Booking } from '../../data/models';
import { ParkingDataService } from '../../services/parking-data.service';
import { PARKING_DETAIL_MOCK_SITES } from '../../data/mock-data';
import { CheckBookingComponent } from '../check-booking/check-booking.component';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { BookingSuccessModalComponent } from '../booking-success-modal/booking-success-modal.component';
import { ReservationService } from '../../services/reservation.service';
import { ParkingService } from '../../services/parking.service';

// --- Interfaces copied from ParkingReservations ---
interface DaySection {
  date: Date;
  dateLabel: string; // Full label for backup
  dayName: string;   // e.g. "Thu"
  dateNumber: string; // e.g. "15"
  timeLabel: string;
  slots: TimeSlot[];
  available: number;
  capacity: number;
}

interface TimeSlot {
  id: string;
  timeText: string;
  dateTime: Date;
  isAvailable: boolean;
  isSelected: boolean;
  isInRange: boolean;
  remaining: number;
  duration?: number;
}

interface ZoneData {
  id: string;
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
}

interface FloorData {
  id: string;
  name: string;
  zones: ZoneData[];
  totalAvailable: number;
  capacity: number;
}

interface DailySchedule {
  dayName: string;
  timeRange: string;
  isToday: boolean;
}

interface AggregatedZone {
  name: string;
  available: number;
  capacity: number;
  status: 'available' | 'full';
  floorIds: string[];
  ids: string[];
}

@Component({
  selector: 'app-parking-detail',
  templateUrl: './parking-detail.component.html',
  styleUrls: ['./parking-detail.component.scss'],
  standalone: false
})
export class ParkingDetailComponent implements OnInit {

  @Input() lot!: ParkingLot;
  @Input() initialType: string = 'normal';
  @Input() bookingMode: 'daily' | 'monthly' | 'flat24' | 'monthly_night' = 'daily';

  mockSites: ParkingLot[] = [];
  weeklySchedule: DailySchedule[] = [];
  isOpenNow = false;

  selectedType = 'normal';

  // --- Time Selection State ---
  slotInterval: number = 60; // -1 = Full Day, -2 = Half Day
  displayDays: DaySection[] = [];
  selectedDateIndex: number = 0; // NEW: Track selected date
  currentMonthLabel: string = ''; // NEW: Month Year Label (e.g. January 2026)
  currentDisplayedDate: Date = new Date(); // NEW: For Month Navigation

  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;

  // --- Floor & Zone Data ---
  floorData: FloorData[] = [];

  // Selection State (Multiple Floors)
  selectedFloorIds: string[] = [];

  // Selection State (Multiple Zones - actual IDs)
  selectedZoneIds: string[] = [];

  // Aggregated Zones for Display
  displayZones: AggregatedZone[] = [];

  currentImageIndex = 0;
  isSpecificSlot: boolean = true; // Default to true per user intent (selecting zones)
  crossDayCount: number = 1;
  minDate: string = new Date().toISOString(); // Validator
  isBooking: boolean = false; // Loading state for booking process

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private parkingDataService: ParkingDataService, // Old Mock
    private parkingApiService: ParkingService, // New RPC Service
    private reservationService: ReservationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.mockSites = PARKING_DETAIL_MOCK_SITES;

    if (this.initialType && this.lot.supportedTypes.includes(this.initialType)) {
      this.selectedType = this.initialType;
    } else if (this.lot.supportedTypes.length > 0) {
      this.selectedType = this.lot.supportedTypes[0];
    }

    this.checkOpenStatus();
    this.generateWeeklySchedule();

    // Generate Time Slots initially
    this.generateTimeSlots();
  }

  // --- Date Selection ---
  selectDate(index: number) {
    this.selectedDateIndex = index;
    // this.updateMonthLabel(); // Removed: specific to slot gen now
    this.updateSelectionUI();
  }

  // --- Month Navigation ---
  changeMonth(offset: number) {
    const newDate = new Date(this.currentDisplayedDate);
    newDate.setMonth(newDate.getMonth() + offset);

    // Prevent going back before current month
    const today = new Date();
    if (offset < 0 && newDate.getMonth() < today.getMonth() && newDate.getFullYear() <= today.getFullYear()) {
      // Don't go back further than current month 
      // Although ion-datetime handles [min], manual nav needs check
      // Actually simpler: just don't disable if same month
    }
    this.currentDisplayedDate = newDate;

    // Reset selection when changing month in Monthly mode? Maybe yes.
    // this.resetTimeSelection(); // Optional: Keep it or clear it. 
    this.generateTimeSlots();
  }

  get isPrevMonthDisabled(): boolean {
    const today = new Date();
    // Compare Year & Month
    return this.currentDisplayedDate.getFullYear() <= today.getFullYear() &&
      this.currentDisplayedDate.getMonth() <= today.getMonth();
  }

  updateMonthLabel() {
    // Label is now set in generateTimeSlots for Monthly, or dynamic for Daily
    if (this.bookingMode === 'daily' || this.bookingMode === 'flat24') {
      if (this.displayDays.length > 0 && this.displayDays[this.selectedDateIndex]) {
        const date = this.displayDays[this.selectedDateIndex].date;
        const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        this.currentMonthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
      }
    }
  }

  // --- Time Selection Logic ---

  selectInterval(minutes: number) {
    this.slotInterval = minutes;
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.interval-popover') as any;
    if (popover) popover.dismiss();
  }



  selectCrossDayCount(count: number) {
    this.crossDayCount = count;
    this.resetTimeSelection();
    // Dismiss popover
    const popover = document.querySelector('ion-popover.cross-day-popover') as any;
    if (popover) popover.dismiss();

    // Auto-scroll logic similar to before
    if (this.crossDayCount > 1) {
      setTimeout(() => {
        const el = document.getElementById('month-section-header');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  get dayIndices(): number[] {
    // Returns [0], [0,1], [0,1,2] etc based on crossDayCount
    // But relative to selectedDateIndex. 
    // Wait, the original logic was: let dayIndex of (isCrossDay ? [selectedDateIndex, selectedDateIndex + 1] : [selectedDateIndex])
    // So we should generate indices starting from selectedDateIndex
    return Array.from({ length: this.crossDayCount }, (_, i) => this.selectedDateIndex + i);
  }

  resetTimeSelection(fullReset: boolean = true) {
    this.startSlot = null;
    this.endSlot = null;
    if (fullReset) {
      this.selectedDateIndex = 0;
      // Do NOT reset currentDisplayedDate here, keep invisible state
    }
    this.floorData = [];
    this.selectedFloorIds = [];
    this.selectedZoneIds = [];
    this.displayZones = [];
    this.updateSelectionUI();
  }

  generateTimeSlots() {
    this.displayDays = [];
    // Use currentDisplayedDate for Monthly, today for others (unless we want navigable daily?) 
    // Usually Daily starts from Today.
    const baseDate = (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') ? this.currentDisplayedDate : new Date();

    // Thai Days (Full Names)
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') {
      // --- MONTHLY MODE: REAL CALENDAR VIEW ---
      this.currentMonthLabel = `${thaiMonths[baseDate.getMonth()]} ${baseDate.getFullYear() + 543}`;

      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Calculate padding (0=Sun, 6=Sat)
      const startDay = firstDay.getDay();

      // Add Emtpy Slots for Padding
      for (let i = 0; i < startDay; i++) {
        this.displayDays.push({
          date: new Date(year, month, 0), // Dummy
          dateLabel: '',
          dayName: '',
          dateNumber: '',
          timeLabel: 'padding',
          slots: [], // Empty slots = Padding
          available: 0,
          capacity: 0
        });
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const targetDate = new Date(year, month, i);
        const dayIndex = targetDate.getDay();
        const dailyCapacity = this.getCurrentCapacity();

        // Check if Past Date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = targetDate < today;

        // Deterministic: Use date and capacity to determine available count
        // Pattern: Even days have 80% availability, Odd days have 40%
        // Deterministic: Always show full availability as requested
        let dailyAvailable = dailyCapacity;
        if (isPast) dailyAvailable = 0; // Past dates unavailable

        const timeStr = this.bookingMode === 'monthly' ? 'เริ่มสัญญา' : 'เริ่ม 18:00';

        const slots: TimeSlot[] = [{
          id: `${targetDate.toISOString()}-MONTHLY`,
          timeText: timeStr,
          dateTime: new Date(targetDate),
          isAvailable: !isPast, // Disable logic
          remaining: dailyAvailable,
          isSelected: false,
          isInRange: false,
          duration: 0
        }];

        this.displayDays.push({
          date: targetDate,
          dateLabel: `${i}`,
          dayName: thaiDays[dayIndex],
          dateNumber: i.toString(),
          timeLabel: 'ว่าง',
          slots: slots,
          available: dailyAvailable,
          capacity: dailyCapacity
        });
      }

    } else {
      // --- DAILY / HOURLY / 24H MODE ---
      // Use Today for these modes
      const today = new Date();

      for (let i = 0; i < 5; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);

        const dayIndex = targetDate.getDay();
        const dayName = thaiDays[dayIndex];
        const dateNumber = targetDate.getDate().toString();
        const dateLabel = `${dayName} ${dateNumber}`;

        // Mock capacity/availability
        const dailyCapacity = this.getCurrentCapacity();
        let dailyAvailable = 0;
        // Deterministic: 
        if (i === 0) {
          dailyAvailable = Math.min(this.getCurrentAvailable(), dailyCapacity);
        } else {
          // Deterministic: Always show full availability as requested
          dailyAvailable = dailyCapacity;
        }

        let startH = 8, startM = 0;
        let endH = 20, endM = 0;
        let isOpen = true;
        let timeLabel = '08:00 - 20:00';

        if (this.lot.schedule && this.lot.schedule.length > 0) {
          // Mock
        }

        const slots: TimeSlot[] = [];
        const startTime = new Date(targetDate);
        startTime.setHours(startH, startM, 0, 0);
        const closingTime = new Date(targetDate);
        closingTime.setHours(endH, endM, 0, 0);

        const totalOpenMinutes = Math.floor((closingTime.getTime() - startTime.getTime()) / 60000);

        if (!isOpen) {
          // ... 
        } else {

          // --- ADAPTED LOGIC FOR BOOKING MODES ---
          // --- ADAPTED LOGIC FOR BOOKING MODES ---
          // NOTE: flat24 moved to loop logic below to allow start time selection

          if (this.slotInterval === -1) {
            // Full Day
            const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
            const isPast = startTime < new Date();
            let remaining = 0;
            if (!isPast) remaining = Math.floor(Math.random() * dailyCapacity) + 1;

            slots.push({
              id: `${targetDate.toISOString()}-FULL`,
              timeText: timeStr,
              dateTime: new Date(startTime),
              isAvailable: remaining > 0,
              remaining: remaining,
              isSelected: false,
              isInRange: false,
              duration: totalOpenMinutes
            });
          } else if (this.slotInterval === -2) {
            // Half Day logic...
            const halfDuration = Math.floor(totalOpenMinutes / 2);
            const slot1Time = new Date(startTime);
            this.createSingleSlot(slots, targetDate, slot1Time, dailyCapacity, halfDuration);
            const slot2Time = new Date(startTime.getTime() + halfDuration * 60000);
            if (slot2Time < closingTime) {
              this.createSingleSlot(slots, targetDate, slot2Time, dailyCapacity, halfDuration);
            }
          } else {
            // Interval (Standard OR Flat24)
            // If Flat24, we use interval for start times, but duration is 24h (1440 min)
            // And maybe we want to show "10:00 (+1 day)" label style in createSingleSlot?

            let currentBtnTime = new Date(startTime);
            while (currentBtnTime < closingTime) {
              // Valid Start Time
              let duration = this.slotInterval;
              if (this.bookingMode === 'flat24') {
                duration = 1440; // 24 Hours fixed
              }

              this.createSingleSlot(slots, targetDate, currentBtnTime, dailyCapacity, duration);
              currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
            }
          }
        }

        this.displayDays.push({
          date: targetDate,
          dateLabel: dateLabel,
          dayName: dayName,
          dateNumber: dateNumber,
          timeLabel: isOpen ? timeLabel : 'ปิดบริการ',
          slots: slots,
          available: dailyAvailable,
          capacity: dailyCapacity
        });
      }
      this.updateMonthLabel(); // Only for daily modes
    }
    
    // Fetch real availability for the generated slots
    this.fetchTimeSlotAvailability();

    this.updateSelectionUI();
  }

  // --- Date Picker Handler ---
  onMonthSelected(event: any) {
    const val = event.detail.value;
    if (val) {
      this.currentDisplayedDate = new Date(val);
      this.generateTimeSlots();
      // Dismiss popover programmatically if needed, or let backdrop handle it
      const popover = document.querySelector('ion-popover.date-picker-popover') as any;
      if (popover) popover.dismiss();
    }
  }

  createSingleSlot(slots: TimeSlot[], targetDate: Date, timeObj: Date, capacity: number, duration: number) {
    const startH = timeObj.getHours();
    const startM = timeObj.getMinutes();
    const endTime = new Date(timeObj.getTime() + duration * 60000);
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    let timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;

    // Custom label for Flat 24
    if (this.bookingMode === 'flat24') {
      timeStr = `${this.pad(startH)}:${this.pad(startM)} (24 ชม.)`;
    }

    const isPast = timeObj < new Date();
    // Default to 0, will be updated by fetchTimeSlotAvailability
    let remaining = isPast ? 0 : capacity; 

    slots.push({
      id: `${targetDate.toISOString()}-${timeStr}`,
      timeText: timeStr,
      dateTime: new Date(timeObj),
      isAvailable: !isPast, // Optimistic, will update
      remaining: remaining,
      isSelected: false,
      isInRange: false,
      duration: duration
    });
  }

  fetchTimeSlotAvailability() {
    if (!this.lot || !this.parkingApiService) return;

    const startDate = new Date(this.displayDays[0].date);
    const lastDay = this.displayDays[this.displayDays.length - 1].date;
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + 1); // Cover the full last day

    // Determine interval from booking mode
    let interval = this.slotInterval;
    if (this.bookingMode === 'flat24') interval = 60; // Fetch hourly for flat24 too? Or larger?
    if (interval <= 0) interval = 60; // Default fallback

    const buildingId = this.lot.id; // Correct ID usage?
    // Check if selectedLot.id is actually the building ID or site ID?
    // In getSiteBuildings, likely building.id.
    
    // Convert vehicle type? The component might calculate this.
    const vehicleType = 'car'; // Use a real value if stored in component

    this.parkingApiService.getBuildingTimeSlots(buildingId, startDate, endDate, interval, vehicleType)
      .subscribe(data => {
        // Map data to slots
        // data: { slot_time: string, available_count: number, ... }[]
        
        // Create a lookup map for speed
        const availabilityMap = new Map<string, number>();
        data.forEach(row => {
          // Normalize time string to match slot.dateTime.toISOString() or similar comparison
          // User updated RPC to return 't_start' and aligned times
          const timeVal = row.t_start || row.slot_time; 
          if (timeVal) {
            const t = new Date(timeVal).getTime();
            availabilityMap.set(t.toString(), row.available_count);
          }
        });

        // Update slots
        this.displayDays.forEach(day => {
          day.slots.forEach(slot => {
            const t = slot.dateTime.getTime().toString();
            if (availabilityMap.has(t)) {
              slot.remaining = availabilityMap.get(t) || 0;
              slot.isAvailable = slot.remaining > 0 && slot.dateTime > new Date();
            }
          });
        });
      });
  }

  onSlotClick(slot: TimeSlot, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!slot.isAvailable) return;

    // --- REFINED SELECTION LOGIC ---
    if (this.bookingMode === 'daily') {
      // Range Selection for Daily
      // Case 0: No Selection -> Start New
      if (!this.startSlot || !this.endSlot) {
        this.startSlot = slot;
        this.endSlot = slot;
      }
      // Case 1: Single Slot Selected (Start == End)
      else if (this.startSlot.id === this.endSlot.id) {
        if (slot.id === this.startSlot.id) {
          // Clicked same slot -> Deselect (Reset)
          this.resetTimeSelection(false);
          return;
        } else {
          // Clicked different slot -> Form Range
          if (slot.dateTime.getTime() < this.startSlot.dateTime.getTime()) {
            // Clicked before -> Range is [Clicked, Start]
            const oldStart = this.startSlot;
            this.startSlot = slot;
            this.endSlot = oldStart;
          } else {
            // Clicked after -> Range is [Start, Clicked]
            this.endSlot = slot;
          }
        }
      }
      // Case 2: Range Selected (Start != End)
      else {
        // If clicked Start or End -> Reset (User Request)
        if (slot.id === this.startSlot.id || slot.id === this.endSlot.id) {
          this.resetTimeSelection(false);
          return;
        }
        else {
          // Clicked a new 3rd slot -> Start New Single Selection
          this.startSlot = slot;
          this.endSlot = slot;
        }
      }
    } else {
      // SINGLE SELECTION for Monthly, MonthlyNight, Flat24
      // Just click to select
      this.startSlot = slot;
      this.endSlot = slot; // Physically same slot, logic handles duration later
    }

    this.updateSelectionUI();

    // Generate Floor/Zone data if we have a valid range
    if (this.startSlot && this.endSlot) {
      this.loadAvailability();

      // Auto-Scroll to Location Section
      setTimeout(() => {
        const el = document.getElementById('location-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      this.floorData = [];
    }
  }



  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        // Safe check for nulls
        const isStart = !!this.startSlot && s.id === this.startSlot.id;
        const isEnd = !!this.endSlot && s.id === this.endSlot.id;
        s.isSelected = isStart || isEnd;

        if (this.startSlot && this.endSlot) {
          // Check range using raw time values
          s.isInRange = s.dateTime.getTime() > this.startSlot.dateTime.getTime() &&
            s.dateTime.getTime() < this.endSlot.dateTime.getTime();

          // Explicitly exclude start/end from in-range visual (they have their own Selected style)
          if (s.id === this.startSlot.id || s.id === this.endSlot.id) {
            s.isInRange = false;
          }
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  // --- Mock Data Generation ---

  // --- Real Data Generation ---
  loadAvailability() {
    // --- REAL DATA INTEGRATION ---
    if (!this.startSlot || !this.endSlot) return;

    // Loading State? (Optional interaction improvement)
    this.floorData = []; 

    // Calculate accurate End Time (EndSlot Start + Duration)
    const endTime = new Date(this.endSlot.dateTime.getTime() + (this.endSlot.duration || 60) * 60000);

    this.parkingApiService.getAvailability(
      this.lot.id, 
      this.startSlot.dateTime, 
      endTime, 
      this.selectedType // 'normal'/'car', 'ev', 'motorcycle' passed here
    ).subscribe({
      next: (data) => {
        console.log('Real Availability Data:', data);
        this.floorData = data; // API matches structure roughly

        // Default Select First Floor
        if (this.floorData.length > 0) {
          // If previous selection exists and is valid, keep it?
          // For now, simpler to reset to first floor on new fetch
          this.selectedFloorIds = [this.floorData[0].id];
          this.updateDisplayZones();
          this.clearAllZones();
        }
      },
      error: (err) => {
         console.error('Error loading detailed availability', err);
         // Fallback or Toast?
      }
    });
  }

  // --- Floor Selection (Single) ---
  toggleFloor(floor: FloorData) {
    // Single Selection Mode: Always replace
    if (this.isFloorSelected(floor.id)) {
      // Optional: Allow deselecting if clicking the same one? 
      // User said "Select only one", implies radio behavior usually. 
      // But let's allow deselecting to be safe, or just keep it selected.
      // Let's allow deselecting for now.
      this.selectedFloorIds = [];
    } else {
      this.selectedFloorIds = [floor.id];
    }
    this.updateDisplayZones();
    this.clearAllZones();
  }

  selectAllFloors() {
    // Removed feature
  }

  clearAllFloors() {
    this.selectedFloorIds = [];
    this.updateDisplayZones();
    this.clearAllZones();
  }

  isFloorSelected(floorId: string): boolean {
    return this.selectedFloorIds.includes(floorId);
  }

  isAllFloorsSelected(): boolean {
    return false; // Feature removed
  }

  // --- Zone Aggregation Logic ---
  updateDisplayZones() {
    const aggMap = new Map<string, AggregatedZone>();

    this.selectedFloorIds.forEach(fid => {
      const floor = this.floorData.find(f => f.id === fid);
      if (floor) {
        floor.zones.forEach(z => {
          if (!aggMap.has(z.name)) {
            aggMap.set(z.name, {
              name: z.name,
              available: 0,
              capacity: 0,
              status: 'full',
              floorIds: [],
              ids: []
            });
          }
          const agg = aggMap.get(z.name)!;
          agg.available += z.available;
          agg.capacity += z.capacity;
          agg.floorIds.push(fid);
          agg.ids.push(z.id);

          if (agg.available > 0) agg.status = 'available';
        });
      }
    });

    this.displayZones = Array.from(aggMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- Zone Selection (Single) ---
  toggleZone(aggZone: AggregatedZone) {
    const isSelected = this.isZoneSelected(aggZone.name);

    if (isSelected) {
      this.selectedZoneIds = [];
    } else {
      // Single Selection: Replace all
      this.selectedZoneIds = [...aggZone.ids];
    }
  }

  isZoneSelected(aggZoneName: string): boolean {
    const aggZone = this.displayZones.find(z => z.name === aggZoneName);
    if (!aggZone) return false;
    return aggZone.ids.length > 0 && aggZone.ids.every(id => this.selectedZoneIds.includes(id));
  }

  selectAllZones() {
    // Removed
  }

  clearAllZones() {
    this.selectedZoneIds = [];
  }

  isAllZonesSelected(): boolean {
    return false;
  }

  get selectedZonesCount(): number {
    return this.displayZones.filter(z => this.isZoneSelected(z.name)).length;
  }

  // --- General ---
  selectSite(site: ParkingLot) {
    this.lot = site;
    if (this.lot.supportedTypes.length > 0 && !this.lot.supportedTypes.includes(this.selectedType)) {
      this.selectedType = this.lot.supportedTypes[0];
    }
    this.checkOpenStatus();
    this.generateWeeklySchedule();
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if (popover) popover.dismiss();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.resetTimeSelection();
    this.generateTimeSlots();
    const popover = document.querySelector('ion-popover.detail-popover') as any;
    if (popover) popover.dismiss();
  }

  async selectBookingMode(mode: 'daily' | 'monthly' | 'flat24' | 'monthly_night') {
    // 1. Dismiss any open popovers immediately
    const popovers = document.querySelectorAll('ion-popover');
    if (popovers.length > 0) {
      await Promise.all(Array.from(popovers).map((p: any) => p.dismiss()));
    }

    // 2. Update Mode
    this.bookingMode = mode;
    this.crossDayCount = 1;
    this.displayDays = []; // Clear immediately to prevent stale UI

    // 3. Reset State Forcefully
    this.resetTimeSelection(true);

    // Set default interval based on mode to prevent stale state
    if (this.bookingMode === 'daily' || this.bookingMode === 'flat24') {
      this.slotInterval = 60; // Default 1 hour
    } else {
      this.slotInterval = -1; // Full/fixed for other modes usually
    }

    // 4. Force Regenerate with Delay to ensure UI cleans up
    setTimeout(() => {
      this.generateTimeSlots();
      this.updateSelectionUI();
    }, 50); // Small delay to allow DOM to react to mode change
  }

  // --- Single Line Summary ---
  // --- Single Line Summary ---
  get singleLineSummary(): string {
    if (!this.startSlot || !this.endSlot) return '';

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const sDate = this.startSlot.dateTime;

    // --- ADAPTED SUMMARY FOR MODES ---
    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') {
      // Monthly: Show Start - End Date same as Logic
      // Logic: Start -> Start + 1 Month
      const eDate = new Date(sDate);
      eDate.setMonth(sDate.getMonth() + 1);

      const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`; // Short Year?
      // User Example: "11 ม.ค. - 11 ก.พ."
      // If Cross Year? "11 ธ.ค. - 11 ม.ค."
      const eDateStr = `${eDate.getDate()} ${thaiMonths[eDate.getMonth()]}`;

      return `ใช้งานได้ ${sDateStr} - ${eDateStr} (${this.getModeLabel()})`;
    }

    if (this.bookingMode === 'flat24') {
      const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`;
      const sTimeStr = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())}`;
      return `เริ่ม ${sDateStr} ${sTimeStr} (+24 ชม.) | ${this.getModeLabel()}`;
    }

    const sDateStr = `${sDate.getDate()} ${thaiMonths[sDate.getMonth()]}`;
    const sTimeStr = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())}`;

    const eSlotVal = this.endSlot;
    const duration = eSlotVal.duration || this.slotInterval || 60;
    const eDate = new Date(eSlotVal.dateTime.getTime() + duration * 60000);

    let datePart = '';

    if (sDate.getDate() !== eDate.getDate()) {
      // Cross Day: "13 ม.ค. 19:00 - 14 ม.ค. 08:00"
      const eDateStr = `${eDate.getDate()} ${thaiMonths[eDate.getMonth()]}`;
      const eTimeStr = `${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;
      datePart = `${sDateStr} ${sTimeStr} - ${eDateStr} ${eTimeStr}`;
    } else {
      // Single Day: "13 ม.ค. 19:00 - 20:00"
      const eTimeStr = `${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;
      datePart = `${sDateStr} ${sTimeStr} - ${eTimeStr}`;
    }

    // Location Part
    if (this.selectedFloorIds.length === 0) return datePart;

    const fNames = this.floorData.filter(f => this.selectedFloorIds.includes(f.id)).map(f => f.name.replace('Floor', 'F').replace(' ', '')).join(', ');
    let zNames = '';
    if (this.selectedZonesCount > 0) {
      zNames = this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name.replace('Zone ', '')).join(', ');
    } else {
      zNames = '-';
    }

    return `${datePart} | ชั้น ${fNames} Zone ${zNames}`;
  }

  getModeLabel(): string {
    switch (this.bookingMode) {
      case 'monthly': return 'รายเดือน';
      case 'monthly_night': return 'รายเดือน Night';
      case 'flat24': return 'เหมา 24 ชม.';
      default: return 'รายชั่วโมง';
    }
  }

  get locationSummary(): string {
    if (this.selectedFloorIds.length === 0) return '';

    const fNames = this.floorData.filter(f => this.selectedFloorIds.includes(f.id)).map(f => f.name.replace('Floor', 'F').replace(' ', '')).join(', ');

    let zNames = '';
    if (this.selectedZonesCount > 0) {
      zNames = this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name.replace('Zone ', '')).join(', ');
    } else {
      zNames = '-';
    }
    return `ชั้น ${fNames} | Zone ${zNames}`;
  }

  async Reservations() {
    if (!this.startSlot || !this.endSlot) {
      this.presentToast('กรุณาเลือกเวลา');
      return;
    }

    // Validate Zone Selection
    if (this.selectedZoneIds.length === 0) {
      this.presentToast('กรุณาเลือกโซน');
      return;
    }

    // --- LOGIC FOR BOOKING MODES ---
    let finalStart = new Date(this.startSlot.dateTime);
    let finalEnd = new Date(this.endSlot.dateTime);

    if (this.bookingMode === 'monthly') {
      finalEnd = new Date(finalStart);
      finalEnd.setMonth(finalStart.getMonth() + 1);
      finalStart.setHours(0, 0, 0, 0);
      finalEnd.setHours(23, 59, 59, 999);
    }
    else if (this.bookingMode === 'monthly_night') {
      finalStart.setHours(18, 0, 0, 0);
      finalEnd = new Date(finalStart);
      finalEnd.setMonth(finalStart.getMonth() + 1);
      finalEnd.setHours(8, 0, 0, 0);
    }
    else if (this.bookingMode === 'flat24') {
      finalEnd = new Date(finalStart.getTime() + (24 * 60 * 60 * 1000));
    } else {
        if (finalEnd.getTime() <= finalStart.getTime()) {
             finalEnd = new Date(finalStart.getTime() + (60 * 60 * 1000));
        }
    }

    let data: any = {
      siteId: this.lot.id.split('-')[0], 
      siteName: this.lot.name,
      selectedType: this.selectedType,
      selectedFloors: this.selectedFloorIds,
      selectedZones: this.displayZones.filter(z => this.isZoneSelected(z.name)).map(z => z.name),
      selectedZoneIds: this.selectedZoneIds,
      startSlot: { ...this.startSlot, dateTime: finalStart },
      endSlot: { ...this.endSlot, dateTime: finalEnd },
      isSpecificSlot: true,
      isRandomSystem: false,
      bookingMode: this.bookingMode,
      price: this.calculatePrice(finalStart, finalEnd)
    };

    try {
      const modal = await this.modalCtrl.create({
        component: CheckBookingComponent,
        componentProps: {
          data: { ...data }
        },
        initialBreakpoint: 1,
        breakpoints: [0, 0.5, 1],
        backdropDismiss: true,
        cssClass: 'detail-sheet-modal',
      });
      await modal.present();

      const { data: result, role } = await modal.onDidDismiss();
      if (role === 'confirm' && result && result.confirmed) {
        // Show loading indicator
        const loading = await this.loadingCtrl.create({
          message: 'กำลังดำเนินการจอง...',
          spinner: 'crescent',
          cssClass: 'custom-loading'
        });
        await loading.present();
        this.isBooking = true;

        const bookingData = result.data;
        const newBooking: Booking = {
          id: 'BK-' + new Date().getTime(),
          placeName: bookingData.siteName,
          locationDetails: `ชั้น ${bookingData.selectedFloors[0]} | โซน ${bookingData.selectedZones[0]} | ${bookingData.selectedSlotId}`,
          bookingTime: bookingData.startSlot.dateTime,
          endTime: bookingData.endSlot.dateTime,
          status: bookingData.status,
          price: bookingData.price || bookingData.totalPrice,
          carBrand: 'TOYOTA YARIS',
          licensePlate: '1กข 1234',
          bookingType: bookingData.bookingMode || 'daily',
        };

        this.parkingDataService.addBooking(newBooking);
        
        try {
            await this.reservationService.createReservation(
                newBooking,
                this.reservationService.getTestUserId(),
                bookingData.siteId,
                bookingData.selectedFloors[0],
                bookingData.selectedSlotId
            );
            
            // Hide loading
            await loading.dismiss();
            this.isBooking = false;

            // Show success modal with complete data
            const successData = {
              ...newBooking,
              selectedSlotId: bookingData.selectedSlotId,
              selectedFloors: bookingData.selectedFloors,
              selectedZones: bookingData.selectedZones,
              siteName: bookingData.siteName,
              startSlot: bookingData.startSlot,
              endSlot: bookingData.endSlot
            };
            await this.showSuccessModal(successData);

        } catch (e: any) {
            // Hide loading
            await loading.dismiss();
            this.isBooking = false;
            
            console.error('Reservation Failed', e);
            
            // Show detailed error
            await this.showErrorAlert(e);
        }
      }

    } catch (err) {
      console.error('Error showing booking modal', err);
      this.isBooking = false;
    }
  }

  calculatePrice(start: Date, end: Date): number {
    // Mock Pricing Logic
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (this.bookingMode === 'monthly' || this.bookingMode === 'monthly_night') return 1500;
    if (this.bookingMode === 'flat24') return 200;
    return hours * 20; // 20 THB/hr
  }

  // Helpers
  onImageScroll(event: any) {
    const scrollLeft = event.target.scrollLeft;
    const width = event.target.offsetWidth;
    this.currentImageIndex = Math.round(scrollLeft / width);
  }

  pad(num: number): string { return num < 10 ? '0' + num : num.toString(); }
  dismiss() { this.modalCtrl.dismiss(); }
  checkOpenStatus() { this.isOpenNow = this.lot.status === 'available' || this.lot.status === 'low'; }
  getCurrentCapacity(): number { return (this.lot.capacity as any)[this.selectedType] || 0; }
  getCurrentAvailable(): number { return (this.lot.available as any)[this.selectedType] || 0; }
  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'รถทั่วไป';
      case 'ev': return 'รถ EV';
      case 'motorcycle': return 'มอเตอร์ไซค์';
      default: return type;
    }
  }

  generateWeeklySchedule() {
    const today = new Date().getDay();
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    this.weeklySchedule = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7;
      this.weeklySchedule.push({
        dayName: dayNames[dayIndex],
        timeRange: '08:00 - 20:00',
        isToday: i === 0
      });
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'danger', position: 'top',
    });
    toast.present();
  }

  async showSuccessModal(bookingData: any) {
    const modal = await this.modalCtrl.create({
      component: BookingSuccessModalComponent,
      componentProps: {
        bookingData: bookingData
      },
      backdropDismiss: true,
      cssClass: 'success-modal'
    });
    await modal.present();
  }

  async showErrorAlert(error: any) {
    let errorTitle = 'เกิดข้อผิดพลาด';
    let errorMessage = 'ไม่สามารถดำเนินการจองได้ กรุณาลองใหม่อีกครั้ง';
    let errorButtons: any[] = ['ตกลง'];

    // Determine error type and customize message
    if (error.message && error.message.includes('already booked')) {
      errorTitle = 'ช่องจอดเต็มแล้ว';
      errorMessage = 'ขออภัย ช่องจอดนี้เพิ่งมีผู้จองไปแล้ว กรุณาเลือกช่องจอดอื่นหรือเวลาอื่น';
      errorButtons = [
        {
          text: 'เลือกใหม่',
          role: 'cancel'
        }
      ];
    } else if (error.code === '23P01' || error.message?.includes('Double Booking')) {
      errorTitle = 'มีการจองซ้ำ';
      errorMessage = 'มีการจองช่องนี้ในเวลาที่ทับซ้อนกันแล้ว กรุณาเลือกช่องใหม่';
    } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.status === 0) {
      errorTitle = 'ไม่สามารถเชื่อมต่อได้';
      errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง';
      errorButtons = [
        {
          text: 'ยกเลิก',
          role: 'cancel'
        }
      ];
    } else if (error.message) {
      errorMessage = error.message;
    }

    const alert = await this.alertCtrl.create({
      header: errorTitle,
      message: errorMessage,
      buttons: errorButtons,
      cssClass: 'error-alert'
    });

    await alert.present();
  }
}