import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ModalController, Platform, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { UiEventService } from '../services/ui-event';
import { SupabaseService } from '../services/supabase.service';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';
import { BookingTypeSelectorComponent } from '../modal/booking-type-selector/booking-type-selector.component';
import { BuildingDetailComponent } from '../modal/building-detail/building-detail.component';


import * as ngeohash from 'ngeohash';
import { ParkingLot, ScheduleItem } from '../data/models';
import { ParkingDataService } from '../services/parking-data.service';
import { ParkingService } from '../services/parking.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sheetContent') sheetContentEl!: ElementRef<HTMLElement>;

  searchQuery = '';
  selectedTab = 'all';
  selectedLocation: 'parking' | 'building' = 'parking';

  allParkingLots: ParkingLot[] = [];
  visibleParkingLots: ParkingLot[] = [];
  filteredParkingLots: ParkingLot[] = [];

  // --- Map Variables ---
  private map: any;
  private markers: any[] = [];
  private userMarker: any;
  private geoHashBounds: any; // เลเยอร์กรอบสี่เหลี่ยม Geohash
  private userGeoHash: string | null = null;

  // --- Subscription & Animation ---
  private animationFrameId: any;
  private sheetToggleSub!: Subscription;
  private timeCheckSub!: Subscription;

  // --- Bottom Sheet Config ---
  sheetLevel = 1;
  currentSheetHeight = 0;

  canScroll = false;
  isSnapping = true;
  isDragging = false;
  startY = 0;
  startHeight = 0;
  startLevel = 1;

  isModalOpen = false;

  constructor(
    private modalCtrl: ModalController,
    private uiEventService: UiEventService,
    private platform: Platform,
    private alertCtrl: AlertController, // ✅ Inject AlertController
    private parkingDataService: ParkingDataService, // Renamed for clarity
    private parkingApiService: ParkingService, // Inject new RPC Service
    private supabaseService: SupabaseService, // Inject Supabase for Realtime
    private router: Router, // ✅ Inject Router
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }


  ngOnInit() {
    // 1. Fetch Real Data
    this.loadRealData();

    // Subscribe to Refresh Event
    this.uiEventService.refreshParkingData$.subscribe(() => {
      console.log('[Tab1] 🔄 Refresh Event Received. Reloading Data...');
      this.loadRealData();
    });

    this.updateSheetHeightByLevel(this.sheetLevel);

    this.sheetToggleSub = this.uiEventService.toggleTab1Sheet$.subscribe(() => {
      requestAnimationFrame(() => {
        this.toggleSheetState();
      });
    });

    this.timeCheckSub = interval(60000).subscribe(() => {
      this.updateParkingStatuses();
    });

    // Start Realtime Subscription
    this.setupRealtimeSubscription();
  }

  setupRealtimeSubscription() {
    console.log('[Tab1] 🔴 Starting Realtime Subscription...');

    // Create a NEW channel for multiple tables
    const channel = this.supabaseService.client.channel('parking-channel-multi');

    // 1. Listen to Reservations (Bookings change availability)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        console.log('[Tab1] 🔔 Realtime Reservation Update:', payload);
        this.handleRealtimeUpdate();
      })
      // 2. Listen to Parking Lots (Status/Capacity changes by Admin)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lots' }, (payload) => {
        console.log('[Tab1] 🔔 Realtime Parking Lot Update:', payload);
        this.handleRealtimeUpdate();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Tab1] ✅ Realtime Connection Established (Multi-Table)');
        }
      });
  }

  handleRealtimeUpdate() {
    // Add a small delay/debounce to allow DB triggers to finish computing
    setTimeout(() => {
      console.log('[Tab1] 🔄 Refreshing Data due to Realtime Event...');
      this.loadRealData();
    }, 1000); // 1s delay for safety
  }

  loadRealData() {
    console.log('[Tab1] 1. Requesting Real Data API...');
    this.parkingApiService.getSiteBuildings('1')
      .pipe(
        timeout(3000),
        catchError(err => {
          console.error('[Tab1] API Error or Timeout.', err);
          return of([]);
        })
      )
      .subscribe({
        next: (realLots) => {
          if (realLots) {
            console.log('[Tab1] Applying Real Data (Count: ' + realLots.length + ')');
            this.allParkingLots = realLots;
            this.processScheduleData();
            this.updateParkingStatuses();
            this.filterData();

            if (this.filteredParkingLots.length === 0) {
              console.warn('[Tab1] ⚠️ View is empty after API update.');
            }

          } else {
            console.warn('[Tab1] ⚠️ API returned empty/error.');
            this.allParkingLots = [];
            this.filterData();
          }
        },
        error: (err) => {
          console.error('[Tab1] Subscribe Error:', err);
          this.allParkingLots = [];
          this.filterData();
        }
      });
  }

  filterData() {
    let results = this.allParkingLots;

    // 1. Filter by Location Type (Safe & Case-Insensitive)
    results = results.filter(lot => (lot.category || '').toLowerCase() === (this.selectedLocation || '').toLowerCase());

    // 2. Filter by Vehicle Type (Tab) OR Zone
    if (this.selectedTab !== 'all') {
      if (this.selectedLocation === 'parking') {
        results = results.filter((lot) => lot.supportedTypes.includes(this.selectedTab));
      } else {
        // Building -> Filter by Zone
        if (this.selectedTab === 'north') {
          results = results.filter((lot) => lot.zone === 'north');
        } else if (this.selectedTab === 'south') {
          results = results.filter((lot) => lot.zone === 'south');
        }
      }
    }

    if (this.searchQuery.trim() !== '') {
      results = results.filter((lot) =>
        lot.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    this.filteredParkingLots = results;
    this.visibleParkingLots = results;

    this.updateParkingStatuses();
    this.updateMarkers(); // Update Map
  }

  onSearch() { this.filterData(); }
  onTabChange() { this.filterData(); }
  locationChanged(ev: any) {
    this.selectedLocation = ev.detail.value;
    this.selectedTab = 'all'; // Reset tab when location changes
    this.filterData();
  }




  //  ทำงานหลังจากหน้าเว็บโหลดเสร็จ (เพื่อโหลด Map)
  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.initMap();
      this.updateMarkers();

      // ลองขอตำแหน่งทันทีเมื่อเข้าหน้า
      // this.focusOnUser();
    }
  }

  ngOnDestroy() {
    if (this.sheetToggleSub) this.sheetToggleSub.unsubscribe();
    if (this.timeCheckSub) this.timeCheckSub.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  // ----------------------------------------------------------------
  //  MAP LOGIC (Leaflet + Geohash + Error Handling)
  // ----------------------------------------------------------------

  private async initMap() {
    const L = await import('leaflet');

    // ตั้งค่า Default Icon
    const iconUrl = 'assets/icon/favicon.png';
    const DefaultIcon = L.Icon.extend({
      options: {
        iconUrl,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      }
    });
    L.Marker.prototype.options.icon = new DefaultIcon();

    // พิกัดเริ่มต้น (kmUTT)
    const centerLat = 13.651336;
    const centerLng = 100.496472;

    this.map = L.map('map', {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    setTimeout(() => { this.map.invalidateSize(); }, 500);
  }

  private createPinIcon(L: any, color: string) {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" width="40px" height="40px">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;

    return L.divIcon({
      html: svgContent,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  }

  async updateMarkers() {
    if (!this.map) return;
    const L = await import('leaflet');

    // ลบ Marker เก่า
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    // วาด Marker ใหม่
    this.visibleParkingLots.forEach(lot => {
      if (lot.lat && lot.lng) {
        let color = '#6c757d';
        if (lot.status === 'available') color = '#28a745';
        else if (lot.status === 'low') color = '#ffc107';
        else if (lot.status === 'full' || lot.status === 'closed') color = '#dc3545';

        const icon = this.createPinIcon(L, color);

        const marker = L.marker([lot.lat, lot.lng], { icon: icon })
          .addTo(this.map)
          .bindPopup(`<b>${lot.name}</b><br>ว่าง: ${this.getDisplayAvailable(lot)} คัน`);

        marker.on('click', () => {
          this.viewLotDetails(lot);
        });

        this.markers.push(marker);
      }
    });
  }

  // ✅ ฟังก์ชันหาตำแหน่ง + Geohash + Error Alert
  public focusOnUser() {
    if (!navigator.geolocation) {
      this.showLocationError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 1. คำนวณ Geohash (ความละเอียด 7 หลัก)
      this.userGeoHash = ngeohash.encode(lat, lng, 7);

      if (this.map) {
        const L = await import('leaflet');

        this.map.flyTo([lat, lng], 17);

        // 2. วาดจุดตำแหน่งผู้ใช้
        if (!this.userMarker) {
          const userIcon = L.divIcon({
            html: `<div style="width: 15px; height: 15px; background: #4285F4; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
            className: '',
            iconSize: [15, 15]
          });
          this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
        } else {
          this.userMarker.setLatLng([lat, lng]);
        }

        // 3. วาดกรอบสี่เหลี่ยม Geohash (Bounding Box)
        if (this.geoHashBounds) {
          this.map.removeLayer(this.geoHashBounds);
        }

        // Decode เพื่อหาขอบเขตสี่เหลี่ยม
        const boundsArray = ngeohash.decode_bbox(this.userGeoHash);
        const bounds = [[boundsArray[0], boundsArray[1]], [boundsArray[2], boundsArray[3]]];

        // @ts-ignore
        this.geoHashBounds = L.rectangle(bounds, {
          color: '#4285f4',
          weight: 1,
          fillOpacity: 0.1,
          fillColor: '#4285f4'
        }).addTo(this.map);
      }
    }, (err) => {
      //  จัดการ Error ที่นี่ (กรณี User กด Block หรือ GPS ไม่ทำงาน)
      console.error('Error getting location', err);

      let message = 'ไม่สามารถระบุตำแหน่งได้';
      if (err.code === 1) { // PERMISSION_DENIED
        message = 'กรุณาเปิดสิทธิ์การเข้าถึงตำแหน่ง (Location Permission) ที่การตั้งค่าของเบราว์เซอร์หรืออุปกรณ์';
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        message = 'สัญญาณ GPS ขัดข้อง ไม่สามารถระบุตำแหน่งได้';
      } else if (err.code === 3) { // TIMEOUT
        message = 'หมดเวลาในการค้นหาตำแหน่ง ลองใหม่อีกครั้ง';
      }

      this.showLocationError(message);

    }, {
      enableHighAccuracy: true,
      timeout: 10000, // 10 วินาที
      maximumAge: 0
    });
  }

  //  ฟังก์ชันแสดง Alert
  async showLocationError(msg: string) {
    const alert = await this.alertCtrl.create({
      header: 'แจ้งเตือนพิกัด',
      message: msg,
      buttons: ['ตกลง'],
      mode: 'ios'
    });
    await alert.present();
  }

  // ----------------------------------------------------------------
  //  LOGIC การ Filter และ Bottom Sheet 
  // ----------------------------------------------------------------



  // Drag & Drop
  getPixelHeightForLevel(level: number): number {
    const platformHeight = this.platform.height();
    if (level === 0) return 80;
    if (level === 1) return platformHeight * 0.35;
    if (level === 2) return platformHeight * 0.85;
    return 80;
  }

  updateSheetHeightByLevel(level: number) {
    this.currentSheetHeight = this.getPixelHeightForLevel(level);
    this.canScroll = level === 2;
    if (level === 0 && this.sheetContentEl?.nativeElement) {
      this.sheetContentEl.nativeElement.scrollTop = 0;
    }
  }

  startDrag(ev: any) {
    const touch = ev.touches ? ev.touches[0] : ev;
    this.startY = touch.clientY;
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    sheet.classList.remove('snapping');
    this.isSnapping = false;
    this.startHeight = sheet.offsetHeight;
    this.startLevel = this.sheetLevel;
    this.isDragging = false;
    window.addEventListener('mousemove', this.dragMove);
    window.addEventListener('mouseup', this.endDrag);
    window.addEventListener('touchmove', this.dragMove, { passive: false });
    window.addEventListener('touchend', this.endDrag);
  }

  dragMove = (ev: any) => {
    const touch = ev.touches ? ev.touches[0] : ev;
    const currentY = touch.clientY;
    const contentEl = this.sheetContentEl.nativeElement;
    const isAtTop = contentEl.scrollTop <= 0;
    const isMaxLevel = this.sheetLevel === 2;

    if (isMaxLevel && !isAtTop) {
      this.startY = currentY;
      this.startHeight = this.getPixelHeightForLevel(2);
      return;
    }

    const diff = this.startY - currentY;
    if (!this.isDragging && Math.abs(diff) < 5) return;

    if (!isMaxLevel || (isMaxLevel && isAtTop && diff < 0)) {
      if (ev.cancelable) ev.preventDefault();
      this.isDragging = true;
      let newHeight = this.startHeight + diff;
      const maxHeight = this.platform.height() - 40;
      newHeight = Math.max(80, Math.min(newHeight, maxHeight));
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(() => {
        this.currentSheetHeight = newHeight;
      });
    }
  };

  endDrag = (ev: any) => {
    window.removeEventListener('mousemove', this.dragMove);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchmove', this.dragMove);
    window.removeEventListener('touchend', this.endDrag);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.isDragging) {
      const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
      const finalH = sheet.offsetHeight;
      const totalDragged = finalH - this.startHeight;
      const platformHeight = this.platform.height();
      const dragThreshold = platformHeight * 0.15;

      if (Math.abs(totalDragged) < dragThreshold) {
        this.sheetLevel = this.startLevel;
      } else {
        const distLow = Math.abs(finalH - this.getPixelHeightForLevel(0));
        const distMid = Math.abs(finalH - this.getPixelHeightForLevel(1));
        const distHigh = Math.abs(finalH - this.getPixelHeightForLevel(2));
        const minDist = Math.min(distLow, distMid, distHigh);
        if (minDist === distLow) this.sheetLevel = 0;
        else if (minDist === distMid) this.sheetLevel = 1;
        else this.sheetLevel = 2;
      }
      this.snapToCurrentLevel();
    } else {
      this.snapToCurrentLevel();
    }
    setTimeout(() => { this.isDragging = false; }, 100);
  };

  snapToCurrentLevel() {
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      this.isSnapping = true;
      sheet.classList.add('snapping');
      this.updateSheetHeightByLevel(this.sheetLevel);
    }
  }

  toggleSheetState() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isDragging = false;
    const sheet = document.querySelector('.bottom-sheet') as HTMLElement;
    if (sheet) {
      sheet.classList.remove('snapping');
      void sheet.offsetWidth;
      sheet.classList.add('snapping');
      this.isSnapping = true;
    }
    if (this.sheetLevel === 0) {
      this.sheetLevel = 1;
    } else {
      this.sheetLevel = 0;
    }
    this.updateSheetHeightByLevel(this.sheetLevel);
  }

  // Helper Functions
  processScheduleData() {
    this.allParkingLots.forEach(lot => {
      if (lot.schedule && lot.schedule.length > 0) {
        lot.schedule.forEach(sch => this.parseCronToScheduleData(sch));
      }
    });
  }

  updateParkingStatuses() {
    const now = new Date();
    this.allParkingLots.forEach((lot) => {
      if (!lot.schedule || lot.schedule.length === 0) {
        lot.hours = 'เปิด 24 ชั่วโมง';
        return;
      }
      let isOpenNow = false;
      let displayTexts: string[] = [];
      lot.schedule.forEach((sch) => {
        const isActive = this.checkIsScheduleActive(sch, now);
        if (isActive) isOpenNow = true;
        const dayText = this.formatDaysText(sch.days);
        displayTexts.push(`${dayText} ${sch.open_time} - ${sch.close_time}`);
      });
      const hoursText = displayTexts.join(', ');

      const currentAvailable = this.getDisplayAvailable(lot);

      if (!isOpenNow) {
        lot.status = 'closed';
        lot.hours = `ปิด (${hoursText})`;
      } else {
        lot.hours = `เปิดอยู่ (${hoursText})`;
        const totalCap = this.getDisplayCapacity(lot);

        if (currentAvailable <= 0) lot.status = 'full';
        else if (totalCap > 0 && (currentAvailable / totalCap) < 0.1) lot.status = 'low';
        else lot.status = 'available';
      }
    });
  }

  parseCronToScheduleData(sch: ScheduleItem) {
    const openParts = sch.cron.open.split(' ');
    const closeParts = sch.cron.close.split(' ');
    if (openParts.length >= 5 && closeParts.length >= 5) {
      sch.open_time = `${this.pad(openParts[1])}:${this.pad(openParts[0])}`;
      sch.close_time = `${this.pad(closeParts[1])}:${this.pad(closeParts[0])}`;
      sch.days = this.parseCronDays(openParts[4]);
    }
  }

  parseCronDays(dayPart: string): string[] {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysIndex: number[] = [];
    if (dayPart === '*') return [...dayMap];
    if (dayPart.includes('-')) {
      const [start, end] = dayPart.split('-').map(Number);
      let current = start;
      let loopCount = 0;
      while (current !== end && loopCount < 8) {
        daysIndex.push(current % 7);
        current = (current + 1) % 7;
        loopCount++;
      }
      daysIndex.push(end % 7);
    } else if (dayPart.includes(',')) {
      dayPart.split(',').forEach((d) => daysIndex.push(Number(d) % 7));
    } else {
      daysIndex.push(Number(dayPart) % 7);
    }
    return [...new Set(daysIndex.map((i) => dayMap[i]))];
  }

  checkIsScheduleActive(sch: ScheduleItem, now: Date): boolean {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayMap[now.getDay()];
    if (!sch.days.includes(currentDayName)) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = sch.open_time.split(':').map(Number);
    const startMinutes = openH * 60 + openM;
    const [closeH, closeM] = sch.close_time.split(':').map(Number);
    let endMinutes = closeH * 60 + closeM;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  pad(val: string | number): string {
    return val.toString().padStart(2, '0');
  }

  formatDaysText(days: string[]): string {
    const thaiDays: { [key: string]: string } = {
      sunday: 'อา.', monday: 'จ.', tuesday: 'อ.', wednesday: 'พ.',
      thursday: 'พฤ.', friday: 'ศ.', saturday: 'ส.'
    };
    if (days.length === 7) return 'ทุกวัน';
    return days.map(d => thaiDays[d]).join(',');
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'normal': return 'Car';
      case 'ev': return 'EV';
      case 'motorcycle': return 'Motorcycle';
      default: return type;
    }
  }

  async viewLotDetails(lot: ParkingLot) {
    // 0. Check if it's a building -> Open Building Detail Modal
    if (lot.category === 'building') {
      // Open Building Detail Modal
      const modal = await this.modalCtrl.create({
        component: BuildingDetailComponent,
        componentProps: {
          lot: lot
        },
        initialBreakpoint: 1,
        breakpoints: [0, 1],
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'detail-sheet-modal', // Reuse same class if appropriate
      });
      await modal.present();
      return;
    }

    // 1. Show Booking Type Selector First
    this.isModalOpen = true; // Trigger Scale Down

    // Minimize Sheet to lowest level
    this.isSnapping = true;
    this.sheetLevel = 0;
    this.updateSheetHeightByLevel(0);

    const typeModal = await this.modalCtrl.create({
      component: BookingTypeSelectorComponent,
      cssClass: 'auto-height-modal', // You might need to add this class or use 'detail-sheet-modal' if it fits
      initialBreakpoint: 0.65, // Increased to move up
      breakpoints: [0, 0.65, 1],
      showBackdrop: true,
      backdropDismiss: true
    });

    await typeModal.present();

    const { data, role } = await typeModal.onDidDismiss();

    // If user cancelled, stop here
    if (role !== 'confirm' || !data) {
      this.isModalOpen = false; // Reset Scale Up
      return;
    }

    const selectedBookingMode = data.bookingMode; // 'daily', 'monthly', 'flat24', 'monthly_night'

    // 2. Open Parking Detail with Selected Mode
    this.isSnapping = true;
    this.sheetLevel = 0;
    this.updateSheetHeightByLevel(0);

    if (this.map && lot.lat && lot.lng) {
      this.map.flyTo([lot.lat, lot.lng], 18, {
        animate: true,
        duration: 1.0
      });
    }

    const modal = await this.modalCtrl.create({
      component: ParkingDetailComponent,
      componentProps: {
        lot: lot,
        initialType: this.selectedTab === 'all' ? 'normal' : this.selectedTab,
        bookingMode: selectedBookingMode // PASS THE MODE
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      backdropDismiss: true,
      showBackdrop: true,
      cssClass: 'detail-sheet-modal',
    });
    await modal.present();

    // Reset scale when Detail Modal closes? 
    // User said "Tab1 to Booking Type Selection". 
    // But logically, if we go to Detail, we might want to keep it or reset it.
    // Usually, if Detail opens full screen, the background doesn't matter much.
    // But if user closes Booking Modal, we MUST reset.

    const detailRes = await modal.onDidDismiss();
    this.isModalOpen = false; // Reset finally
  }

  getMarkerColor(available: number | null, capacity: number) {
    if (available === null || available === 0) return 'danger';
    if (available / capacity < 0.3) return 'warning';
    return 'success';
  }
  getStatusColor(status: string) {
    switch (status) {
      case 'available': return 'success';
      case 'low': return 'warning';
      case 'full': case 'closed': return 'danger';
      default: return 'medium';
    }
  }
  getStatusText(status: string) {
    switch (status) {
      case 'available': return 'ว่าง';
      case 'low': return 'ใกล้เต็ม';
      case 'full': return 'เต็ม';
      case 'closed': return 'ปิด';
      default: return 'N/A';
    }
  }

  getDisplayCapacity(lot: ParkingLot): number {
    if (this.selectedTab === 'all') {
      return (lot.capacity.normal || 0) + (lot.capacity.ev || 0) + (lot.capacity.motorcycle || 0);
    }
    // @ts-ignore
    return lot.capacity[this.selectedTab] || 0;
  }

  getDisplayAvailable(lot: ParkingLot): number {
    if (this.selectedTab === 'all') {
      return (lot.available.normal || 0) + (lot.available.ev || 0) + (lot.available.motorcycle || 0);
    }
    // @ts-ignore
    return lot.available[this.selectedTab] || 0;
  }

  //  Mock Data พร้อมพิกัด (lat, lng)
  // getMockData(): ParkingLot[] {
  //   return TAB1_PARKING_LOTS;
  // }
}