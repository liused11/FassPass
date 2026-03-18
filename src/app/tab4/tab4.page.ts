import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BuildingData } from '../data/models';
import { BuildingDataService } from '../services/building-data.service';
import { AccessControlService } from '../services/access-control.service';
import { FloorplanInteractionService } from '../services/floorplan/floorplan-interaction.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {

  buildingData: BuildingData | null = null;
  selectedFloor: number | null = null;
  selectedFloorData: any = null;

  constructor(
    private buildingService: BuildingDataService,
    private route: ActivatedRoute,
    private accessControl: AccessControlService,
    private interaction: FloorplanInteractionService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const bId = params['buildingId'] || 'school-building-01'; // Default Fallback
      const floorParam = params['floor'];

      // Auto-select floor if provided via queryParams
      if (floorParam) {
        this.selectedFloor = parseInt(floorParam, 10);
      } else {
        this.selectedFloor = null;
        this.selectedFloorData = null;
      }

      this.loadBuilding(bId);
      this.loadDoorPermissions();
    });
  }

  async loadDoorPermissions() {
    const accessibleDoors = await this.accessControl.getAccessibleDoors();
    this.interaction.setPermissionList(accessibleDoors);
  }

  loadBuilding(id: string) {
    this.buildingService.getBuilding(id).subscribe(data => {
      this.buildingData = data;

      // If a floor was pre-selected from navigation
      if (this.selectedFloor !== null) {
        this.onFloorSelected(this.selectedFloor);
      }
    });
  }

  onFloorSelected(floorNumber: number | string) {
    if (!this.buildingData) return;

    // หาข้อมูลชั้นจาก floors array
    // Convert both to Number to ensure they match safely
    const numFloor = Number(floorNumber);
    const floor = this.buildingData.floors.find(f => Number(f.floor) === numFloor);

    if (floor) {
      this.selectedFloor = numFloor;
      this.selectedFloorData = floor;
    } else {
      console.warn(`Floor ${floorNumber} not found in building data.`, this.buildingData.floors);
    }
  }

  onBackToBuilding() {
    this.selectedFloor = null;
    this.selectedFloorData = null;
  }
}
