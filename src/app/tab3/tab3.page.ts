import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SettingItem, UserProfile, Vehicle } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';
import { GENERAL_SETTINGS, OTHER_SETTINGS } from '../data/app-settings';
import { AddVehicleModalComponent } from '../modal/add-vehicle/add-vehicle-modal.component';

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
  generalSettings = GENERAL_SETTINGS;
  otherSettings = OTHER_SETTINGS;

  constructor(
    private parkingService: ParkingDataService,
    private modalCtrl: ModalController
  ) { }

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

  async addVehicle() {
    const modal = await this.modalCtrl.create({
      component: AddVehicleModalComponent,
      breakpoints: [0, 0.85, 1],
      initialBreakpoint: 0.85,
      cssClass: 'add-vehicle-modal'
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    if (role === 'confirm' && data) {
      // Assign ID and Rank here or in service (Service handles ID mostly but let's be safe)
      const newVehicle: Vehicle = {
        ...data,
        id: 'temp-' + new Date().getTime(),
        rank: this.vehicles.length + 1
      };
      
      this.parkingService.addVehicle(newVehicle);
    }
  }

  getLicensePlateParts(plate: string): string[] {
    return plate ? plate.split(' ') : ['', ''];
  }
}



