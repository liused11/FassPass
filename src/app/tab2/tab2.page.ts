import { Component, OnInit } from '@angular/core';
import { BuildingData } from '../data/models';
import { BuildingDataService } from '../services/building-data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  buildingData: BuildingData | null = null;
  selectedFloor: number | null = null;
  selectedFloorData: any = null;

  constructor(private buildingService: BuildingDataService) { }

  ngOnInit() {
    // ใช้ ID อะไรก็ได้เพื่อดึง Fallback หรือ API
    this.buildingService.getBuilding('school-building-01').subscribe(data => {
      this.buildingData = data;
    });
  }

  onFloorSelected(floorNumber: number) {
    if (!this.buildingData) return;

    // หาข้อมูลชั้นจาก floors array
    // สมมติว่า floors เก็บข้อมูลเรียงตามชั้น หรือมี field floor
    const floor = this.buildingData.floors.find(f => f.floor === floorNumber);
    if (floor) {
      this.selectedFloor = floorNumber;
      this.selectedFloorData = floor;
    }
  }

  onBackToBuilding() {
    this.selectedFloor = null;
    this.selectedFloorData = null;
  }
}
