import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { CheckBookingComponent } from '../check-booking/check-booking.component';
import { ParkingDataService } from '../../services/parking-data.service';
import { Booking } from '../../data/models';

interface DaySection {
  date: Date;
  dateLabel: string;
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
  duration?: number; // ✅ เพิ่ม property เพื่อเก็บระยะเวลาของ slot นี้ (ใช้สำหรับแบบครึ่งวัน/เต็มวัน)
}

@Component({
  selector: 'app-parking-reservations',
  templateUrl: './parking-reservations.component.html',
  styleUrls: ['./parking-reservations.component.scss'],
  standalone: false,
})
export class ParkingReservationsComponent implements OnInit {

  @Input() lot: any;
  @Input() preSelectedType: string = 'normal';
  @Input() preSelectedFloor: string = '';
  @Input() preSelectedZone: string = '';

  mockSites = [
    { id: 'lib_complex', name: 'อาคารหอสมุด (Library)' },
    { id: 'ev_station_1', name: 'สถานีชาร์จ EV (ตึก S11)' },
    { id: 'moto_dorm', name: 'โรงจอดมอไซค์ หอพักชาย' },
    { id: 'eng_building', name: 'ตึกวิศวกรรมศาสตร์' }
  ];
  currentSiteName: string = '';
  isSpecificSlot: boolean = false;
  isCrossDay: boolean = false; // ✅ New state for Cross Day toggle

  selectedType: string = 'normal';
  selectedTypeText = 'รถทั่วไป';

  selectedFloorIds: string[] = [];
  selectedZoneNames: string[] = [];

  slotInterval: number = 60; // ค่า -1 = เต็มวัน, -2 = ครึ่งวัน

  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 2': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 3': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
  };
  availableFloors: string[] = [];
  availableZones: string[] = [];

  displayDays: DaySection[] = [];
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private router: Router,
    private parkingService: ParkingDataService
  ) { }

  ngOnInit() {
    this.currentSiteName = this.lot?.name || 'Unknown';
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    // --- Init Floors ---
    if (this.preSelectedFloor && this.preSelectedFloor !== 'any') {
      this.availableFloors = this.preSelectedFloor.split(',');
    } else {
      if (this.lot?.floors && this.lot.floors.length > 0) {
        this.availableFloors = this.lot.floors;
      } else {
        this.availableFloors = ['Floor 1', 'Floor 2'];
      }
    }
    this.selectedFloorIds = [...this.availableFloors];

    // --- Init Zones ---
    this.updateAvailableZones();
    this.selectedZoneNames = [...this.availableZones];

    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(null, 'cancel'); }

  get currentAvailable(): number { return this.lot?.available?.[this.selectedType] || 0; }
  get currentCapacity(): number { return this.lot?.capacity?.[this.selectedType] || 0; }

  // ------------------------------------------------
  // Floor Logic
  // ------------------------------------------------
  toggleFloor(floor: string) {
    if (this.selectedFloorIds.includes(floor)) {
      this.selectedFloorIds = this.selectedFloorIds.filter(f => f !== floor);
    } else {
      this.selectedFloorIds.push(floor);
    }
    this.resetSelection();
    if (this.selectedFloorIds.length === 0) {
      this.selectedFloorIds.push(floor);
    }
    this.generateData();
  }

  selectAllFloors() {
    this.selectedFloorIds = [...this.availableFloors];
    this.resetSelection();
    this.generateData();
  }

  isFloorSelected(floor: string): boolean {
    return this.selectedFloorIds.includes(floor);
  }

  isAllFloorsSelected(): boolean {
    return this.selectedFloorIds.length === this.availableFloors.length;
  }

  getFloorDisplayText(): string {
    if (this.selectedFloorIds.length === 0) return 'เลือกชั้น';
    return this.selectedFloorIds.map(f => f.replace('Floor ', 'F')).join(', ');
  }

  // ------------------------------------------------
  // Zone Logic
  // ------------------------------------------------
  updateAvailableZones() {
    if (this.preSelectedZone && this.preSelectedZone !== 'any') {
      this.availableZones = this.preSelectedZone.split(',');
    } else {
      this.availableZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    }
  }

  toggleZone(zone: string) {
    if (this.selectedZoneNames.includes(zone)) {
      this.selectedZoneNames = this.selectedZoneNames.filter(z => z !== zone);
    } else {
      this.selectedZoneNames.push(zone);
    }
    this.resetSelection();
    if (this.selectedZoneNames.length === 0) {
      this.selectedZoneNames.push(zone);
    }
    this.generateData();
  }

  selectAllZones() {
    this.selectedZoneNames = [...this.availableZones];
    this.resetSelection();
    this.generateData();
  }

  isZoneSelected(zone: string): boolean {
    return this.selectedZoneNames.includes(zone);
  }

  isAllZonesSelected(): boolean {
    return this.selectedZoneNames.length === this.availableZones.length;
  }

  getZoneDisplayText(): string {
    if (this.selectedZoneNames.length === 0) return 'เลือกโซน';
    return this.selectedZoneNames.map(z => z.replace('Zone ', '')).join(', ');
  }

  // ------------------------------------------------

  selectSite(site: any) {
    this.currentSiteName = site.name;
    this.resetSelection();
    const popover = document.querySelector('ion-popover#site-popover') as any;
    if (popover) popover.dismiss();
  }

  selectType(type: string) {
    this.selectedType = type;
    this.updateTypeText();
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#type-popover') as any;
    if (popover) popover.dismiss();
  }

  selectInterval(minutes: number) {
    this.slotInterval = minutes;
    this.resetSelection();
    this.generateData();
    const popover = document.querySelector('ion-popover#interval-popover') as any;
    if (popover) popover.dismiss();
  }

  toggleCrossDay() {
    this.isCrossDay = !this.isCrossDay;
    this.generateData();
  }

  private updateTypeText() {
    if (this.selectedType === 'normal') this.selectedTypeText = 'รถทั่วไป';
    else if (this.selectedType === 'ev') this.selectedTypeText = 'EV';
    else this.selectedTypeText = 'มอเตอร์ไซค์';
  }

  private parseCronTime(cron: string): { h: number, m: number } {
    const parts = cron.split(' ');
    if (parts.length < 5) return { h: 0, m: 0 };
    return { h: parseInt(parts[1], 10), m: parseInt(parts[0], 10) };
  }

  private checkDayInCron(date: Date, cron: string): boolean {
    const parts = cron.split(' ');
    if (parts.length < 5) return false;
    const dayPart = parts[4];
    const currentDay = date.getDay();
    if (dayPart === '*') return true;
    const days = new Set<number>();
    const groups = dayPart.split(',');
    groups.forEach(g => {
      if (g.includes('-')) {
        const [start, end] = g.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) days.add(i % 7);
        }
      } else {
        days.add(Number(g) % 7);
      }
    });
    return days.has(currentDay);
  }

  generateData() {
    this.displayDays = [];
    const today = new Date();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

    // ✅ If isCrossDay is true, show 2 days (Today + Tomorrow). Otherwise show 1 day (Today).
    const daysToShow = this.isCrossDay ? 2 : 1;

    for (let i = 0; i < daysToShow; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateLabel = `${thaiDays[targetDate.getDay()]} ${targetDate.getDate()}`;

      let dailyCapacity = this.currentCapacity;
      if (this.availableFloors.length > 0) {
        const ratio = this.selectedFloorIds.length / this.availableFloors.length;
        dailyCapacity = Math.ceil(dailyCapacity * ratio);
      }

      let dailyAvailable = 0;
      if (i === 0) {
        dailyAvailable = Math.min(this.currentAvailable, dailyCapacity);
      } else {
        // Deterministic: Even days 90%, Odd days 70%
        // Deterministic: Always 100
        dailyAvailable = dailyCapacity;
      }

      let startH = 0, startM = 0;
      let endH = 23, endM = 59;
      let isOpen = false;
      let timeLabel = 'ปิดบริการ';

      if (this.lot?.schedule && this.lot.schedule.length > 0) {
        const activeSch = this.lot.schedule.find((s: any) => this.checkDayInCron(targetDate, s.cron.open));
        if (activeSch) {
          isOpen = true;
          const openT = this.parseCronTime(activeSch.cron.open);
          const closeT = this.parseCronTime(activeSch.cron.close);
          startH = openT.h; startM = openT.m;
          endH = closeT.h; endM = closeT.m;
          timeLabel = `เปิด ${this.pad(startH)}.${this.pad(startM)} | ปิด ${this.pad(endH)}.${this.pad(endM)}`;
        }
      } else {
        isOpen = true;
        timeLabel = '24 ชั่วโมง';
      }

      if (!isOpen) {
        this.displayDays.push({
          date: targetDate, dateLabel: dateLabel, timeLabel: 'ปิดบริการ',
          slots: [], available: 0, capacity: dailyCapacity
        });
        continue;
      }

      const slots: TimeSlot[] = [];
      const startTime = new Date(targetDate);
      startTime.setHours(startH, startM, 0, 0);
      const closingTime = new Date(targetDate);
      closingTime.setHours(endH, endM, 0, 0);

      // ✅ Logic ใหม่สำหรับ เต็มวัน/ครึ่งวัน
      const totalOpenMinutes = Math.floor((closingTime.getTime() - startTime.getTime()) / 60000);

      if (this.slotInterval === -1) {
        // === เต็มวัน (ตั้งแต่เปิด - ปิด) ===
        // สร้าง Slot เดียว ยาวตลอดวัน
        const timeStr = `${this.pad(startTime.getHours())}:${this.pad(startTime.getMinutes())} - ${this.pad(closingTime.getHours())}:${this.pad(closingTime.getMinutes())}`;
        const isPast = startTime < new Date();
        let remaining = 0;
        if (!isPast) {
          // Deterministic: 100
          remaining = 100;
        }

        slots.push({
          id: `${targetDate.toISOString()}-FULL`,
          timeText: timeStr,
          dateTime: new Date(startTime),
          isAvailable: remaining > 0,
          remaining: remaining,
          isSelected: false,
          isInRange: false,
          duration: totalOpenMinutes // เก็บระยะเวลาทั้งหมด
        });

      } else if (this.slotInterval === -2) {
        // === ครึ่งวัน (หารครึ่งเวลาเปิด) ===
        const halfDuration = Math.floor(totalOpenMinutes / 2);

        // รอบแรก
        const slot1Time = new Date(startTime);
        this.createSingleSlot(slots, targetDate, slot1Time, dailyCapacity, halfDuration);

        // รอบสอง
        const slot2Time = new Date(startTime.getTime() + halfDuration * 60000);
        // เช็คว่าไม่เกินเวลาปิด
        if (slot2Time < closingTime) {
          this.createSingleSlot(slots, targetDate, slot2Time, dailyCapacity, halfDuration);
        }

      } else {
        // === ปกติ (ตาม Interval) ===
        let currentBtnTime = new Date(startTime);
        while (currentBtnTime < closingTime) {
          this.createSingleSlot(slots, targetDate, currentBtnTime, dailyCapacity, this.slotInterval);
          currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
        }
      }

      this.displayDays.push({
        date: targetDate, dateLabel: dateLabel, timeLabel: timeLabel,
        slots: slots, available: dailyAvailable, capacity: dailyCapacity
      });
    }
    this.updateSelectionUI();
  }

  // Helper สำหรับสร้าง Slot ปกติและครึ่งวัน
  private createSingleSlot(slots: TimeSlot[], targetDate: Date, timeObj: Date, capacity: number, duration: number) {
    const startH = timeObj.getHours();
    const startM = timeObj.getMinutes();

    // Calculate end time based on duration
    const endTime = new Date(timeObj.getTime() + duration * 60000); // Ex: 17:00 + 60min = 18:00

    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
    const isPast = timeObj < new Date();
    let remaining = 0;
    if (!isPast) {
      // Deterministic: Always 100
      remaining = 100;
    }
    slots.push({
      id: `${targetDate.toISOString()}-${timeStr}`,
      timeText: timeStr,
      dateTime: new Date(timeObj),
      isAvailable: remaining > 0,
      remaining: remaining,
      isSelected: false,
      isInRange: false,
      duration: duration
    });
  }

  private getAllSlotsFlattened(): TimeSlot[] {
    return this.displayDays.reduce((acc, day) => acc.concat(day.slots), [] as TimeSlot[]);
  }

  isRangeValid(start: TimeSlot, end: TimeSlot): boolean {
    const allSlots = this.getAllSlotsFlattened();
    const startIndex = allSlots.findIndex(s => s.id === start.id);
    const endIndex = allSlots.findIndex(s => s.id === end.id);
    if (startIndex === -1 || endIndex === -1) return false;
    for (let i = startIndex; i <= endIndex; i++) {
      if (!allSlots[i].isAvailable) return false;
    }
    return true;
  }

  onSlotClick(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    // ✅ ถ้าเป็นโหมด เต็มวัน/ครึ่งวัน ให้เลือกอัตโนมัติ (ไม่ต้องจิ้ม 2 ที)
    if (this.slotInterval < 0) {
      this.startSlot = slot;

      // คำนวณเวลาจบจาก duration ที่เราเก็บไว้
      const endTime = new Date(slot.dateTime.getTime() + (slot.duration || 0) * 60000);

      // สร้าง endSlot เทียม เพื่อให้ระบบคำนวณ diff เวลาได้ถูกต้อง
      this.endSlot = {
        id: 'auto-end',
        timeText: `${this.pad(endTime.getHours())}:${this.pad(endTime.getMinutes())}`,
        dateTime: endTime,
        isAvailable: true,
        isSelected: true,
        isInRange: false,
        remaining: 0
      };

      this.updateSelectionUI();
      return;
    }

    // Logic ใหม่: เลือกช่องแรก = เป็นทั้ง Start และ End ทันที
    // ถ้าคลิกอีกช่อง > Start = เป็น End (Range)
    // ถ้าคลิก < Start หรือเดิมมี Range อยู่แล้ว = เริ่มใหม่

    if (!this.startSlot || (this.startSlot && this.endSlot && this.startSlot.id !== this.endSlot.id)) {
      // กรณี: ยังไม่เลือก หรือ เลือก Range ไว้อยู่แล้ว -> เริ่มใหม่ที่ช่องนี้
      this.startSlot = slot;
      this.endSlot = slot; // ✅ Default ให้จบในตัวมันเองเลย
    } else {
      // กรณี: มี Start แล้ว และ Start == End (คือเลือกไว้ช่องเดียว)
      if (slot.id === this.startSlot.id) {
        // คลิกซ้ำช่องเดิม -> ยกเลิกการเลือก
        this.startSlot = null;
        this.endSlot = null;
      } else if (slot.dateTime < this.startSlot.dateTime) {
        // คลิกช่องก่อนหน้า -> เปลี่ยน Start มาที่ช่องนี้ (เริ่มใหม่)
        this.startSlot = slot;
        this.endSlot = slot;
      } else {
        // คลิกช่องถัดไป -> พยายามลาก Range
        if (this.isRangeValid(this.startSlot, slot)) {
          this.endSlot = slot;
        } else {
          this.presentToast('ไม่สามารถเลือกช่วงเวลาที่มีรอบเต็มคั่นอยู่ได้');
          // เริ่มใหม่ที่ช่องนี้แทน
          this.startSlot = slot;
          this.endSlot = slot;
        }
      }
    }

    this.updateSelectionUI();
  }

  updateSelectionUI() {
    this.displayDays.forEach(day => {
      day.slots.forEach(s => {
        // Highlight logic
        const isStart = !!this.startSlot && s.id === this.startSlot.id;
        const isEnd = !!this.endSlot && s.id === this.endSlot.id;

        s.isSelected = isStart || isEnd;

        if (this.startSlot && this.endSlot) {
          // Check Range
          s.isInRange = s.dateTime > this.startSlot.dateTime && s.dateTime < this.endSlot.dateTime;

          // Fix: ถ้า Start == End (ช่องเดียว) ต้องไม่ให้ isInRange ทำงานผิด
          if (this.startSlot.id === this.endSlot.id) {
            s.isInRange = false;
          }
        } else {
          s.isInRange = false;
        }
      });
    });
  }

  resetSelection() { this.startSlot = null; this.endSlot = null; }
  pad(n: number) { return n < 10 ? '0' + n : n; }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2000, color: 'danger', position: 'top',
    });
    toast.present();
  }

  async confirmBooking() {
    if (this.selectedFloorIds.length === 0 || this.selectedZoneNames.length === 0) {
      this.presentToast('กรุณาเลือกอย่างน้อย 1 ชั้นและ 1 โซน');
      return;
    }

    let data: any = {
      siteName: this.currentSiteName,
      selectedType: this.selectedType,
      selectedFloors: this.selectedFloorIds,
      selectedZones: this.selectedZoneNames,
      startSlot: this.startSlot,
      endSlot: this.endSlot,
      isSpecificSlot: this.isSpecificSlot,
      isRandomSystem: !this.isSpecificSlot
    };

    try {
      if (this.isSpecificSlot) {
        const modal = await this.modalCtrl.create({
          component: BookingSlotComponent,
          componentProps: {
            data: {
              ...data,
              selectedFloor: this.selectedFloorIds[0],
              selectedZone: this.selectedZoneNames[0]
            }
          },
          initialBreakpoint: 1,
          breakpoints: [0, 1],
          backdropDismiss: true,
        });
        await modal.present();

        // Wait for selection from BookingSlot
        const { data: slotResult, role } = await modal.onDidDismiss();

        if (role === 'selected' && slotResult) {
          // Proceed to CheckBooking with the selected slot data
          await this.openCheckBookingModal(slotResult);
        }
      } else {
        // Random/Auto mode -> Go straight to CheckBooking
        await this.openCheckBookingModal({ ...data, isSpecificSlot: true });
      }

    } catch (err) {
      console.error('Error showing booking modal', err);
    }
  }

  async openCheckBookingModal(data: any) {
    const modal = await this.modalCtrl.create({
      component: CheckBookingComponent,
      componentProps: {
        data: data
      },
      initialBreakpoint: 1,
      breakpoints: [0, 0.5, 1],
      backdropDismiss: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();
    const { data: result, role } = await modal.onDidDismiss();

    if (role === 'confirm' && result && result.confirmed) {
      const bookingData = result.data;
      const newBooking: Booking = {
        id: 'BK-' + new Date().getTime(),
        placeName: bookingData.siteName,
        locationDetails: `ชั้น ${bookingData.selectedFloors[0]} | โซน ${bookingData.selectedZones[0]}`,
        bookingTime: bookingData.startSlot.dateTime,
        endTime: bookingData.endSlot.dateTime,
        status: bookingData.status,
        statusLabel: bookingData.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอการชำระเงิน',
        price: bookingData.totalPrice,
        carBrand: 'TOYOTA YARIS', // Mock default
        licensePlate: '1กข 1234', // Mock default
        bookingType: 'daily',
      };
      this.parkingService.addBooking(newBooking);

      await this.modalCtrl.dismiss(result, 'confirm');
      // Navigate to Booking List (Tab 2) using Angular Router
      this.router.navigate(['/tabs/tab2']);
    }
  }

  findBestRandomSlot(selectedFloors: string[], selectedZones: string[]): { floor: string, zone: string, label: string } | null {
    return null;
  }

  getSelectedTimeRangeText(): string {
    if (!this.startSlot || !this.endSlot) return '';

    // Start Time (from startSlot)
    const startH = this.startSlot.dateTime.getHours();
    const startM = this.startSlot.dateTime.getMinutes();

    // End Time (from endSlot + duration)
    // Assuming endSlot is the last block selected.
    // If selecting blocks: End Time = EndSlot.StartTime + EndSlot.Duration
    const duration = this.endSlot.duration || 60; // fallback 60 if missing

    const endTime = new Date(this.endSlot.dateTime.getTime() + duration * 60000);
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    // Format: 09:00 - 12:00
    return `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
  }

  getEndTime(): Date | null {
    if (!this.endSlot) return null;
    const duration = this.endSlot.duration || 60;
    return new Date(this.endSlot.dateTime.getTime() + duration * 60000);
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }
}