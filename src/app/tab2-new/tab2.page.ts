import { Component, OnInit } from '@angular/core';
import { Booking } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  
  selectedMonth: string = 'all'; 
  selectedCategory: string = 'all';

  
  monthOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: '2025-12', label: 'ธันวาคม 2568' },
    { value: '2025-11', label: 'พฤศจิกายน 2568' }
  ];

  categoryOptions = [
    { value: 'all', label: 'รายการทั้งหมด' },
    { value: 'daily', label: 'รายวัน' },
    { value: 'flat24', label: 'เหมาจ่าย 24 ชม.' },
    { value: 'monthly', label: 'รายเดือน' },
    { value: 'monthly_night', label: 'รายเดือน (คืน)' }
  ];

  
  selectedStatusSegment: string = 'in_progress'; 

  
  latestBookings: Booking[] = [];
  flat24Bookings: Booking[] = [];
  monthlyBookings: Booking[] = [];
  nightlyBookings: Booking[] = [];

  
  allBookings: Booking[] = [];

  constructor(private parkingService: ParkingDataService) { }

  ngOnInit() {
    this.parkingService.bookings$.subscribe(bookings => {
      this.allBookings = bookings;
      this.updateFilter();
    });
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
      
      let statusMatch = false;
      if (this.selectedStatusSegment === 'in_progress') {
        statusMatch = ['active', 'confirmed', 'pending_payment'].includes(b.status);
      } else if (this.selectedStatusSegment === 'cancelled') {
        statusMatch = b.status === 'cancelled';
      } else {
        statusMatch = b.status === 'completed';
      }

      
      let monthMatch = true;
      if (this.selectedMonth !== 'all') {
        const d = new Date(b.bookingTime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        monthMatch = key === this.selectedMonth;
      }

      
      let catMatch = true;
      if (this.selectedCategory !== 'all') {
        catMatch = b.bookingType === this.selectedCategory;
      }

      return statusMatch && monthMatch && catMatch;
    });

    
    this.latestBookings = filtered.filter(b => b.bookingType === 'daily');
    this.flat24Bookings = filtered.filter(b => b.bookingType === 'flat24');
    this.monthlyBookings = filtered.filter(b => b.bookingType === 'monthly');
    this.nightlyBookings = filtered.filter(b => b.bookingType === 'monthly_night');
  }

  
  getStatusClass(item: Booking): string {
    if (item.status === 'pending_payment') return 'text-[#FFB800]'; 
    if (item.status === 'active') return 'text-[#FFB800]';
    if (item.status === 'confirmed') return 'text-[var(--ion-color-primary)]';
    if (item.status === 'completed') return 'text-green-500';
    return '';
  }
}
