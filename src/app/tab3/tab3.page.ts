import { Component, OnInit } from '@angular/core';
import { SettingItem, UserProfile, Vehicle } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';
import { TAB3_GENERAL_SETTINGS, TAB3_OTHER_SETTINGS } from '../data/mock-data';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  selectedSegment: 'dashboard' | 'list' = 'dashboard';

  userProfile: UserProfile = { name: '', phone: '', avatar: '', role: '' };
  vehicles: Vehicle[] = [];
  generalSettings = TAB3_GENERAL_SETTINGS;
  otherSettings = TAB3_OTHER_SETTINGS;

  constructor(private parkingService: ParkingDataService) { }

  ngOnInit() {
    this.parkingService.userProfile$.subscribe(p => { if (p) this.userProfile = p; });
    this.parkingService.vehicles$.subscribe(v => this.vehicles = v);
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  selectVehicle(vehicleId: number | string) {
    this.parkingService.setDefaultVehicle(vehicleId);
  }

  addVehicle() {
    const nextRank = this.vehicles.length + 1;
    const newVehicle: Vehicle = {
      id: 'temp-' + nextRank, // Temporary ID, service will handle it
      model: 'NEW CAR ' + nextRank,
      licensePlate: '9กก ' + (1000 + nextRank),
      province: 'กรุงเทพฯ',
      image: 'https://img.freepik.com/free-photo/blue-car-speed-motion-stretch-style_53876-126838.jpg',
      isDefault: false,
      status: '',
      lastUpdate: 'เพิ่งเพิ่ม',
      rank: nextRank
    };
    this.parkingService.addVehicle(newVehicle);
  }

  getLicensePlateParts(plate: string): string[] {
    return plate ? plate.split(' ') : ['', ''];
  }
}



