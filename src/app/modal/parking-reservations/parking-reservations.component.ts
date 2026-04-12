import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { BookingSlotComponent } from '../booking-slot/booking-slot.component';
import { CheckBookingComponent } from '../check-booking/check-booking.component';
import { BookingTypeSelectorComponent } from '../booking-type-selector/booking-type-selector.component';
import { ParkingDataService } from '../../services/parking-data.service';
import { ParkingService } from '../../services/parking.service'; 
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
  duration?: number; 
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

  
  availableSites: any[] = []; 
  currentSiteName: string = '';
  isSpecificSlot: boolean = false;
  isCrossDay: boolean = false; 

  selectedType: string = 'normal';
  selectedTypeText = 'รถทั่วไป';

  selectedFloorIds: string[] = [];
  selectedZoneNames: string[] = [];

  bookingMode: string = 'daily';
  bookingModeText: string = 'รายชั่วโมง (ทั่วไป)';

  slotInterval: number = 60; 

  
  availableFloors: string[] = [];
  availableZones: string[] = [];

  displayDays: DaySection[] = [];
  startSlot: TimeSlot | null = null;
  endSlot: TimeSlot | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private router: Router,
    private parkingService: ParkingDataService,
    private parkingApiService: ParkingService, 
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.currentSiteName = this.lot?.name || 'Unknown';
    this.selectedType = this.preSelectedType;
    this.updateTypeText();

    
    this.parkingService.parkingLots$.subscribe(lots => {
      this.availableSites = lots;
    });

    
    if (this.preSelectedFloor && this.preSelectedFloor !== 'any') {
      this.availableFloors = this.preSelectedFloor.split(',');
    } else {
      
      if (this.lot?.floors && this.lot.floors.length > 0) {
        this.availableFloors = this.lot.floors;
      } else {
        this.availableFloors = []; 
      }
    }

    
    this.selectedFloorIds = [...this.availableFloors];

    
    this.updateAvailableZones();
    
    this.selectedZoneNames = [...this.availableZones];

    this.generateData();
  }

  dismiss() { this.modalCtrl.dismiss(null, 'cancel'); }

  get currentAvailable(): number { return this.lot?.available?.[this.selectedType] || 0; }
  get currentCapacity(): number { return this.lot?.capacity?.[this.selectedType] || 0; }

  
  
  
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

  
  
  
  updateAvailableZones() {
    if (this.preSelectedZone && this.preSelectedZone !== 'any') {
      this.availableZones = this.preSelectedZone.split(',');
    } else {
      
      if (this.lot?.zones && this.lot.zones.length > 0) {
        this.availableZones = this.lot.zones;
      } else {
        this.availableZones = []; 
      }
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

  

  selectSite(site: any) {
    console.log('Switching to site:', site.name, 'ID:', site.id);
    console.log('Site Data:', site);
    console.log('---> Site Changed to:', site.name); 

    this.lot = site; 
    this.currentSiteName = site.name;

    
    this.resetSelection();

    
    if (this.lot?.floors && this.lot.floors.length > 0) {
      this.availableFloors = this.lot.floors;
    } else {
      this.availableFloors = [];
    }
    this.selectedFloorIds = [...this.availableFloors];

    
    this.updateAvailableZones();
    this.selectedZoneNames = [...this.availableZones];

    
    this.generateData();

    
    const popovers = document.querySelectorAll('ion-popover');
    popovers.forEach((p: any) => p.dismiss());

    this.cdr.detectChanges();
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

  async openBookingTypeSelector() {
    const modal = await this.modalCtrl.create({
      component: BookingTypeSelectorComponent,
      cssClass: 'auto-height-modal',
      breakpoints: [0, 0.5, 0.75],
      initialBreakpoint: 0.5,
      backdropDismiss: true
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    if (role === 'confirm' && data) {
      this.bookingMode = data.bookingMode;
      this.updateBookingModeText();
      this.resetSelection();
      this.generateData();

      
      const toast = await this.toastCtrl.create({
        message: `เปลี่ยนรูปแบบเป็น: ${this.bookingModeText}`,
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      toast.present();
    }
  }

  updateBookingModeText() {
    switch (this.bookingMode) {
      case 'daily': this.bookingModeText = 'รายชั่วโมง (ทั่วไป)'; break;
      case 'flat24': this.bookingModeText = 'เหมาจ่าย 24 ชม.'; break;
      case 'monthly': this.bookingModeText = 'สมาชิกรายเดือน'; break;

    }
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

      
      const totalOpenMinutes = Math.floor((closingTime.getTime() - startTime.getTime()) / 60000);

      if (this.slotInterval === -1) {
        
        
        const timeStr = `${this.pad(startTime.getHours())}:${this.pad(startTime.getMinutes())} - ${this.pad(closingTime.getHours())}:${this.pad(closingTime.getMinutes())}`;
        const isPast = startTime < new Date();
        let remaining = 0;
        if (!isPast) {
          remaining = dailyAvailable; 
        }

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
        
        const halfDuration = Math.floor(totalOpenMinutes / 2);

        
        const slot1Time = new Date(startTime);
        this.createSingleSlot(slots, targetDate, slot1Time, dailyCapacity, halfDuration, dailyAvailable);

        
        const slot2Time = new Date(startTime.getTime() + halfDuration * 60000);
        
        if (slot2Time < closingTime) {
          this.createSingleSlot(slots, targetDate, slot2Time, dailyCapacity, halfDuration, dailyAvailable);
        }

      } else {
        
        let currentBtnTime = new Date(startTime);
        while (currentBtnTime < closingTime) {
          
          
          
          
          
          this.createSingleSlot(slots, targetDate, currentBtnTime, dailyCapacity, this.slotInterval, dailyAvailable);
          currentBtnTime.setMinutes(currentBtnTime.getMinutes() + this.slotInterval);
        }
      }

      this.displayDays.push({
        date: targetDate, dateLabel: dateLabel, timeLabel: timeLabel,
        slots: slots, available: dailyAvailable, capacity: dailyCapacity
      });
    }
    this.updateSelectionUI();

    
    this.loadRealtimeAvailability();
  }

  loadRealtimeAvailability() {
    console.log('loadRealtimeAvailability called for lot:', this.lot?.id);
    if (!this.lot?.id || this.displayDays.length === 0) {
      console.warn('Cannot load availability: Missing lot ID or displayDays is empty');
      return;
    }

    const startDate = new Date(this.displayDays[0].date);
    const lastDate = new Date(this.displayDays[this.displayDays.length - 1].date);
    const endDate = new Date(lastDate);
    endDate.setDate(endDate.getDate() + 1); 

    
    let apiInterval = this.slotInterval;

    
    
    if (this.slotInterval < 0) {
      
      const openDay = this.displayDays.find(d => d.slots.length > 0);
      let duration = 720; 
      if (openDay && openDay.slots.length > 0) {
        
        
        
        
        duration = openDay.slots[0].duration || 720;
      }
      apiInterval = duration;
    }

    if (apiInterval <= 0) apiInterval = 60; 

    
    const vehicleType = this.selectedType === 'motorcycle' ? 'motorcycle' : (this.selectedType === 'ev' ? 'ev' : 'car');

    console.log(`Fetching availability for ${this.lot.id} from ${startDate.toISOString()} to ${endDate.toISOString()} with interval ${apiInterval}`);

    this.parkingApiService.getBuildingTimeSlots(
      this.lot.id,
      startDate,
      endDate,
      apiInterval,
      vehicleType
    ).subscribe({
      next: (data) => {
        console.log('Realtime availability data received:', data);
        
        const availabilityMap = new Map<string, number>();

        data.forEach((row: any) => {
          const tStart = row.slot_time || row.t_start;
          if (tStart) {
            
            const d = new Date(tStart);
            d.setSeconds(0, 0);
            availabilityMap.set(d.toISOString(), row.available_count);
          }
        });

        
        this.displayDays.forEach(day => {
          day.slots.forEach(slot => {
            const slotD = new Date(slot.dateTime);
            slotD.setSeconds(0, 0);
            const slotIsoKey = slotD.toISOString();

            if (availabilityMap.has(slotIsoKey)) {
              const realVal = availabilityMap.get(slotIsoKey) || 0;
              slot.remaining = realVal;
              
              slot.isAvailable = realVal > 0 && slot.dateTime > new Date();
            } else {
              
              slot.remaining = 0;
              slot.isAvailable = false;
            }
          });
        });
        console.log('Updated slots with realtime availability.');
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching real availability:', err)
    });
  }

  
  private createSingleSlot(slots: TimeSlot[], targetDate: Date, timeObj: Date, capacity: number, duration: number, availableCount: number = 0) {
    const startH = timeObj.getHours();
    const startM = timeObj.getMinutes();

    
    const endTime = new Date(timeObj.getTime() + duration * 60000); 

    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    const timeStr = `${this.pad(startH)}:${this.pad(startM)} - ${this.pad(endH)}:${this.pad(endM)}`;
    const isPast = timeObj < new Date();
    let remaining = 0;
    if (!isPast) {
      
      remaining = availableCount;
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

    
    let fixedDuration = 0;
    if (this.bookingMode === 'flat24') fixedDuration = 24 * 60; 
    else if (this.bookingMode === 'monthly') fixedDuration = 30 * 24 * 60; 


    
    if (this.slotInterval < 0 || fixedDuration > 0) {
      this.startSlot = slot;

      
      const duration = fixedDuration > 0 ? fixedDuration : (slot.duration || 0); 
      const endTime = new Date(slot.dateTime.getTime() + duration * 60000);

      
      this.endSlot = {
        id: 'auto-end',
        timeText: `${this.pad(endTime.getHours())}:${this.pad(endTime.getMinutes())}`,
        dateTime: endTime,
        isAvailable: true,
        isSelected: true,
        isInRange: false,
        remaining: 0,
        duration: duration 
      };

      this.updateSelectionUI();
      return;
    }

    

    
    
    

    if (!this.startSlot || (this.startSlot && this.endSlot && this.startSlot.id !== this.endSlot.id)) {
      
      this.startSlot = slot;
      this.endSlot = slot; 
    } else {
      
      if (slot.id === this.startSlot.id) {
        
        this.startSlot = null;
        this.endSlot = null;
      } else if (slot.dateTime < this.startSlot.dateTime) {
        
        this.startSlot = slot;
        this.endSlot = slot;
      } else {
        
        if (this.isRangeValid(this.startSlot, slot)) {
          this.endSlot = slot;
        } else {
          this.presentToast('ไม่สามารถเลือกช่วงเวลาที่มีรอบเต็มคั่นอยู่ได้');
          
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
        
        const isStart = !!this.startSlot && s.id === this.startSlot.id;
        const isEnd = !!this.endSlot && s.id === this.endSlot.id;

        s.isSelected = isStart || isEnd;

        if (this.startSlot && this.endSlot) {
          
          s.isInRange = s.dateTime > this.startSlot.dateTime && s.dateTime < this.endSlot.dateTime;

          
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
      isRandomSystem: !this.isSpecificSlot,
      bookingMode: this.bookingMode
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

        
        const { data: slotResult, role } = await modal.onDidDismiss();

        if (role === 'selected' && slotResult) {
          
          await this.openCheckBookingModal(slotResult);
        }
      } else {
        
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
        carBrand: 'TOYOTA YARIS', 
        licensePlate: '1กข 1234', 
        bookingType: (this.bookingMode as any), 
      };
      this.parkingService.addBooking(newBooking);

      await this.modalCtrl.dismiss(result, 'confirm');
      
      this.router.navigate(['/tabs/tab2']);
    }
  }

  findBestRandomSlot(selectedFloors: string[], selectedZones: string[]): { floor: string, zone: string, label: string } | null {
    return null;
  }

  getSelectedTimeRangeText(): string {
    if (!this.startSlot || !this.endSlot) return '';

    
    const startH = this.startSlot.dateTime.getHours();
    const startM = this.startSlot.dateTime.getMinutes();

    
    
    
    const duration = this.endSlot.duration || 60; 

    const endTime = new Date(this.endSlot.dateTime.getTime() + duration * 60000);
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    
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