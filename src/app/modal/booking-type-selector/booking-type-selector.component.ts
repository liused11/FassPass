import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
    selector: 'app-booking-type-selector',
    templateUrl: './booking-type-selector.component.html',
    styleUrls: ['./booking-type-selector.component.scss'],
    standalone: false
})
export class BookingTypeSelectorComponent implements OnInit {

    bookingTypes = [
        {
            id: 'daily',
            title: 'รายชั่วโมง (ทั่วไป)',
            desc: 'จองตามระยะเวลาจริง เริ่มต้น 20 บ./ชม.',
            icon: 'time-outline',
            color: 'primary',
            badge: null
        },
        {
            id: 'flat24',
            title: 'เหมาจ่าย 24 ชม.',
            desc: 'จอดได้ยาว 24 ชั่วโมง ราคาพิเศษ',
            icon: 'sync-circle-outline',
            color: 'success',
            badge: 'สุดคุ้ม'
        },
        {
            id: 'monthly',
            title: 'สมาชิกรายเดือน',
            desc: 'จอดได้ตลอด 24 ชม. ไม่จำกัดจำนวนครั้ง',
            icon: 'calendar-number-outline',
            color: 'tertiary',
            badge: null
        },
        {
            id: 'monthly_night',
            title: 'รายเดือน (Night-Only)',
            desc: 'เฉพาะช่วงเวลา 18:00 - 08:00 น.',
            icon: 'moon-outline',
            color: 'warning',
            badge: 'ราคาประหยัด'
        }
    ];

    constructor(private modalCtrl: ModalController) { }

    ngOnInit() { }

    selectType(typeId: string) {
        this.modalCtrl.dismiss({ bookingMode: typeId }, 'confirm');
    }

    close() {
        this.modalCtrl.dismiss(null, 'cancel');
    }

}
