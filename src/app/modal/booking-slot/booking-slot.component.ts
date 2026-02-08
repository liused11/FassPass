import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CheckBookingComponent } from '../check-booking/check-booking.component';

interface ParkingSlot {
  id: string;
  label: string;
  status: 'available' | 'booked' | 'selected';
  type?: string;
  floor: string;
  zone: string;
}

interface ZoneGroup {
  name: string;
  slots: ParkingSlot[];
  available: number;
  total: number;
  description?: string;
}

@Component({
  selector: 'app-booking-slot',
  templateUrl: './booking-slot.component.html',
  styleUrls: ['./booking-slot.component.scss'],
  standalone: false,
})
export class BookingSlotComponent implements OnInit {
  @Input() data: any;

  siteName: string = '';
  timeString: string = '';

  floors: string[] = ['Floor 1', 'Floor 2', 'Floor 3'];
  zones: string[] = [];

  selectedFloor: string = 'Floor 1';

  // เก็บรายการโซนที่เลือก (Multiple Choice)
  selectedZones: string[] = [];

  allowedZones: string[] = [];

  zonesMap: { [key: string]: string[] } = {
    'Floor 1': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 2': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
    'Floor 3': ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
  };

  allSlots: ParkingSlot[] = [];
  zoneGroups: ZoneGroup[] = [];
  selectedSlot: ParkingSlot | null = null;

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    if (this.data) {
      this.siteName = this.data.siteName || 'Unknown Site';
      if (this.data.startSlot && this.data.endSlot) {
        this.timeString = `${this.data.startSlot.timeText} - ${this.data.endSlot.timeText}`;
      }

      if (this.data.selectedFloors && this.data.selectedFloors !== 'any') {
        const floorsInput = Array.isArray(this.data.selectedFloors)
          ? this.data.selectedFloors
          : (typeof this.data.selectedFloors === 'string' ? this.data.selectedFloors.split(',') : []);

        if (floorsInput.length > 0) {
          this.floors = [...floorsInput];
        }
      }

      if (this.data.selectedZones && this.data.selectedZones !== 'any') {
        const zonesInput = Array.isArray(this.data.selectedZones)
          ? this.data.selectedZones
          : (typeof this.data.selectedZones === 'string' ? this.data.selectedZones.split(',') : []);

        if (zonesInput.length > 0) {
          this.allowedZones = [...zonesInput];
        }
      }

      if (this.data.selectedFloor && this.floors.includes(this.data.selectedFloor)) {
        this.selectedFloor = this.data.selectedFloor;
      } else if (this.floors.length > 0) {
        this.selectedFloor = this.floors[0];
      }

      this.updateZones();

      // ✅ Default: ถ้าไม่ได้ระบุโซนมา หรือระบุมาไม่ครบ ให้เลือกทั้งหมด (Select All) ตั้งแต่แรก
      if (this.data.selectedZone && this.zones.includes(this.data.selectedZone)) {
        // กรณีระบุโซนเจาะจงมา (เช่น กดแก้ไขจากหน้าสรุป)
        this.selectedZones = [this.data.selectedZone];
      } else {
        // กรณีปกติ: เลือกทั้งหมด
        this.selectAllZones();
      }
    }

    this.generateSlots();
    this.filterSlots();
  }

  updateZones() {
    const allZonesForFloor = this.zonesMap[this.selectedFloor] || ['Zone A', 'Zone B'];

    let filteredZones = [];
    if (this.allowedZones.length > 0) {
      filteredZones = allZonesForFloor.filter(z => this.allowedZones.includes(z));
    } else {
      filteredZones = allZonesForFloor;
    }

    this.zones = [...filteredZones];

    // ✅ เมื่อเปลี่ยนชั้น ให้ Reset เป็นเลือกทั้งหมดของชั้นนั้นๆ ทันที
    this.selectedZones = [...this.zones];
  }

  getZoneDistanceInfo(zoneName: string): string {
    const zone = zoneName.replace('Zone ', '').trim();
    if (zone === 'A') return 'ใกล้ทางเข้าที่สุด';
    if (zone === 'B') return 'ใกล้ทางเข้า';
    if (zone === 'C') return 'ระยะเดินปานกลาง';
    if (zone === 'D') return 'ระยะเดินไกล';
    if (zone === 'E') return 'ไกลที่สุด';
    return '';
  }

  generateSlots() {
    this.allSlots = [];
    Object.keys(this.zonesMap).forEach(floor => {
      const floorZones = this.zonesMap[floor];
      floorZones.forEach(zone => {
        const totalSlotsPerZone = 12;
        for (let i = 1; i <= totalSlotsPerZone; i++) {
          // Deterministic pattern: Every 3rd slot is booked (indexes 3, 6, 9, 12, etc.)
          const isBooked = (i % 3 === 0);
          this.allSlots.push({
            id: `${floor}-${zone}-${i}`,
            label: `${zone.replace('Zone ', '')}${i.toString().padStart(2, '0')}`,
            status: isBooked ? 'booked' : 'available',
            floor: floor,
            zone: zone,
          });
        }
      });
    });
  }

  filterSlots() {
    this.zoneGroups = [];

    this.zones.forEach(zoneName => {
      // กรองแสดงเฉพาะโซนที่ถูกเลือก
      if (!this.selectedZones.includes(zoneName)) return;

      const slotsInZone = this.allSlots.filter(s => s.floor === this.selectedFloor && s.zone === zoneName);

      slotsInZone.forEach(s => {
        if (this.selectedSlot && s.id === this.selectedSlot.id) {
          s.status = 'selected';
        } else if (s.status === 'selected') {
          s.status = 'available';
        }
      });

      const availableCount = slotsInZone.filter(s => s.status === 'available' || s.status === 'selected').length;

      this.zoneGroups.push({
        name: zoneName,
        slots: slotsInZone,
        available: availableCount,
        total: slotsInZone.length,
        description: this.getZoneDistanceInfo(zoneName)
      });
    });
  }

  selectFloor(floor: string) {
    this.selectedFloor = floor;
    this.updateZones();
    this.filterSlots();
  }

  toggleZone(zone: string) {
    const idx = this.selectedZones.indexOf(zone);
    if (idx > -1) {
      this.selectedZones.splice(idx, 1);
    } else {
      this.selectedZones.push(zone);
    }
    this.filterSlots();
  }

  selectAllZones() {
    this.selectedZones = [...this.zones];
    this.filterSlots();
  }

  clearFilter() {
    this.selectedZones = [];
    this.filterSlots();
  }

  isAllZonesSelected(): boolean {
    return this.zones.length > 0 && this.selectedZones.length === this.zones.length;
  }

  isZoneSelected(zone: string): boolean {
    return this.selectedZones.includes(zone);
  }

  onSelectSlot(slot: ParkingSlot) {
    if (slot.status === 'booked') return;

    if (this.selectedSlot && this.selectedSlot.id !== slot.id) {
      const oldSlot = this.allSlots.find(s => s.id === this.selectedSlot?.id);
      if (oldSlot) oldSlot.status = 'available';
    }

    this.selectedSlot = slot;
    const newSlot = this.allSlots.find(s => s.id === slot.id);
    if (newSlot) newSlot.status = 'selected';

    this.filterSlots();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async confirmSelection() {
    if (!this.selectedSlot) return;

    const nextData = {
      ...this.data,
      selectedFloor: this.selectedFloor,
      selectedZone: this.selectedSlot.zone,
      selectedSlotId: this.selectedSlot.label,
      isSpecificSlot: true
    };

    // Return data to parent (ParkingReservations) instead of opening CheckBooking here
    this.modalCtrl.dismiss(nextData, 'selected');
  }
}