import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ParkingService } from '../../services/parking.service';

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

  constructor(
    private modalCtrl: ModalController,
    private parkingService: ParkingService
  ) { }

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
    // this.filterSlots(); // Called inside generateSlots after data load
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

  async generateSlots() {
    this.allSlots = [];

    if (!this.data || !this.data.siteId || !this.data.startSlot || !this.data.endSlot) {
      console.warn('Missing data for slot generation');
      return;
    }

    const buildingId = this.data.siteId;
    const startTime = this.data.startSlot.dateTime;
    const endTime = this.data.endSlot.dateTime;

    console.log(`[BookingSlot] Generating slots for Building: ${buildingId}, Time: ${startTime.toISOString()} - ${endTime.toISOString()}`);

    try {
      const slots = await this.fetchRealSlots(buildingId);
      const occupiedSlotIds = await this.fetchOccupiedSlots(buildingId, startTime, endTime);

      this.allSlots = slots.map((s: any) => ({
        id: s.id,
        label: s.name, // e.g. "A01"
        status: occupiedSlotIds.includes(s.id) ? 'booked' : 'available',
        floor: s.floor_name, // Mapped from DB
        zone: s.zone_name    // Mapped from DB
      }));

      console.log(`[BookingSlot] Generated ${this.allSlots.length} slots from real data`);
      console.log(`[BookingSlot] Occupied Slots: ${occupiedSlotIds.length}`, occupiedSlotIds);

      this.filterSlots();

    } catch (err) {
      console.error('Error generating slots from real data:', err);
    }
  }

  // Helper to get all slots for the building
  async fetchRealSlots(buildingId: string): Promise<any[]> {
    const supabase = this.parkingService.supabaseClient;

    const { data: slotsData, error: slotsError } = await supabase
      .from('slots')
      .select(`
        id, 
        name, 
        zones!inner (name),
        floors!inner (name)
      `)
      .eq('floors.building_id', buildingId);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
      throw slotsError;
    }

    return (slotsData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      zone_name: s.zones?.name || 'Unknown Zone',
      floor_name: s.floors?.name || 'Unknown Floor'
    }));
  }

  async fetchOccupiedSlots(buildingId: string, start: Date, end: Date): Promise<string[]> {
    const supabase = this.parkingService.supabaseClient;

    // Use standard overlap check: (StartA < EndB) and (EndA > StartB)
    const { data, error } = await supabase
      .from('reservations')
      .select('slot_id')
      .in('status', ['pending', 'confirmed', 'checked_in', 'active', 'pending_payment'])
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString());

    if (error) {
      console.error('Error fetching occupied slots:', error);
      throw error;
    }
    return (data || []).map((r: any) => r.slot_id);
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