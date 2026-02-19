
import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ParkingLot } from '../../data/models';
import { ParkingDataService } from '../../services/parking-data.service';
// Remove unused service import if not needed, or keep for future
import { BottomSheetService } from '../../services/bottom-sheet.service';
import { addIcons } from 'ionicons';
import {
    closeOutline, locationOutline, peopleOutline, cubeOutline, timeOutline,
    chevronDownOutline, keyOutline, personOutline, calendarNumberOutline,
    caretDownOutline, chevronBackOutline, chevronForwardOutline, swapHorizontalOutline,
    checkmarkOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-building-detail',
    templateUrl: './building-detail.component.html',
    styleUrls: ['./building-detail.component.scss'],
    standalone: false
})
export class BuildingDetailComponent implements OnInit {

    @Input() lot!: ParkingLot;

    // --- Mock Data for UI ---
    availableSites: ParkingLot[] = [];

    // --- Filter States ---
    selectedPassType: string = '1-day'; // '1-day', 'visitor', 'monthly'
    selectedUserRole: string = 'user'; // 'user', 'admin', 'staff'
    selectedDuration: number = 60; // Minutes
    selectedBookingDays: number = 1;

    // --- Calendar State ---
    currentDisplayedDate: Date = new Date();
    currentMonthLabel: string = '';
    displayDays: any[] = [];
    selectedDateIndex: number = 0;

    constructor(
        private modalCtrl: ModalController,
        private router: Router,
        private parkingService: ParkingDataService
    ) {
        addIcons({
            closeOutline, locationOutline, peopleOutline, cubeOutline, timeOutline,
            chevronDownOutline, keyOutline, personOutline, calendarNumberOutline,
            caretDownOutline, chevronBackOutline, chevronForwardOutline, swapHorizontalOutline,
            checkmarkOutline
        });
    }

    ngOnInit() {
        this.generateCalendar();
        this.parkingService.parkingLots$.subscribe(lots => {
            if (lots && lots.length > 0) {
                // Filter out current lot if needed, or just show all
                this.availableSites = lots;
            }
        });
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    view3DFloorPlan() {
        this.modalCtrl.dismiss().then(() => {
            this.router.navigate(['/tabs/tab4'], { queryParams: { buildingId: this.lot.id } });
        });
    }

    checkRights() {
        // Logic to check booking rights
        console.log('Checking rights...');
    }

    // --- Helper Methods ---
    getFloorName(f: any): string {
        if (typeof f === 'string') return f;
        return f.name || '';
    }

    get floors(): any[] {
        return this.lot?.floors || [];
    }

    // --- UI Logic Methods ---

    selectSite(s: ParkingLot) {
        console.log('Selected site:', s);
        // Update the current lot with selected site info
        this.lot = s;

        // Dismiss popover
        const popover = document.querySelector('ion-popover.menu-popover') as any;
        if (popover && popover.dismiss) popover.dismiss();
    }

    selectPassType(type: string) {
        this.selectedPassType = type;
        const popover = document.querySelector('ion-popover.pass-type-popover') as any;
        if (popover) popover.dismiss();
    }

    selectUserRole(role: string) {
        this.selectedUserRole = role;
        const popover = document.querySelector('ion-popover.role-popover') as any;
        if (popover) popover.dismiss();
    }

    selectDuration(minutes: number) {
        this.selectedDuration = minutes;
        const popover = document.querySelector('ion-popover.duration-popover') as any;
        if (popover) popover.dismiss();
    }

    selectBookingDays(days: number) {
        this.selectedBookingDays = days;
        const popover = document.querySelector('ion-popover.days-popover') as any;
        if (popover) popover.dismiss();
    }

    // --- Calendar Logic ---
    generateCalendar() {
        this.displayDays = [];
        const baseDate = new Date(); // Start from today
        const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

        this.currentMonthLabel = `${thaiMonths[baseDate.getMonth()]} ${baseDate.getFullYear() + 543}`;

        for (let i = 0; i < 14; i++) { // Generate 2 weeks
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);

            this.displayDays.push({
                date: d,
                dayName: thaiDays[d.getDay()],
                dateNumber: d.getDate(),
                isSelected: i === 0
            });
        }
    }

    selectDate(index: number) {
        this.selectedDateIndex = index;
    }

    changeMonth(offset: number) {
        // Mock method if needed strictly for month navigation, 
        // but horizontal scroll usually suffices for short term.
        console.log('Change month', offset);
    }
}
