import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Booking } from '../../data/models';

@Component({
    selector: 'app-reservation-detail',
    templateUrl: './reservation-detail.component.html',
    standalone: true,
    imports: [IonicModule, CommonModule]
})
export class ReservationDetailComponent implements OnInit, OnDestroy {
    @Input() booking!: Booking;

    internalStatus: string = '';
    statusLabel: string = '';
    circleLabelText: string = '';
    circleMainValue: string = '';
    progressOffset: number = 578;

    private timer: any;

    constructor(private modalCtrl: ModalController) { }

    ngOnInit() {
        this.internalStatus = this.booking.status;
        this.updateStaticData();
        this.startTimer();
    }

    ngOnDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    updateStaticData() {
        switch (this.internalStatus) {
            case 'active':
            case 'checked_in':
                this.statusLabel = 'กำลังจอด';
                this.circleLabelText = 'เวลาที่ผ่านไป';
                break;
            case 'confirmed':
                this.statusLabel = 'จองสำเร็จ รอเข้าจอด';
                this.circleLabelText = 'สามารถเข้าจอดได้ใน';
                break;
            case 'pending':
                this.statusLabel = 'กำลังตรวจสอบรายการ';
                this.circleLabelText = 'รอตรวจสอบ...';
                this.circleMainValue = '--:--:--';
                this.progressOffset = 578;
                break;
            case 'completed':
            case 'checked_out':
                this.statusLabel = 'เสร็จสิ้น';
                this.circleLabelText = 'เวลาจอดรวม';
                this.progressOffset = 0; // เต็มวง
                break;
            case 'cancelled':
                this.statusLabel = 'ยกเลิกแล้ว';
                this.circleLabelText = 'ถูกยกเลิก';
                this.circleMainValue = '---';
                this.progressOffset = 578;
                break;
            default:
                this.statusLabel = this.booking.statusLabel || this.internalStatus;
                this.circleLabelText = 'สถานะ';
                this.circleMainValue = '--:--:--';
                this.progressOffset = 578;
        }
    }

    startTimer() {
        this.updateTime();
        // Only set interval for active or confirmed statuses where time counts
        if (['active', 'checked_in', 'confirmed'].includes(this.internalStatus)) {
            this.timer = setInterval(() => {
                this.updateTime();
            }, 1000);
        }
    }

    updateTime() {
        const now = new Date().getTime();
        const start = new Date(this.booking.bookingTime).getTime();
        const end = new Date(this.booking.endTime).getTime();

        if (this.internalStatus === 'active' || this.internalStatus === 'checked_in') {
            const elapsed = now - start;
            if (elapsed < 0) {
                this.circleMainValue = "00:00:00";
                this.progressOffset = 578;
            } else {
                this.circleMainValue = this.formatTime(elapsed);
                const totalDuration = end > start ? end - start : 24 * 60 * 60 * 1000;
                const percent = Math.min(elapsed / totalDuration, 1);
                this.progressOffset = 578 - (578 * percent);
            }
        } else if (this.internalStatus === 'confirmed') {
            const remaining = start - now;
            if (remaining > 0) {
                this.circleMainValue = this.formatTime(remaining);
            } else {
                this.circleMainValue = "00:00:00";
            }
            this.progressOffset = 578;
        } else if (this.internalStatus === 'completed' || this.internalStatus === 'checked_out') {
            const elapsed = end - start;
            this.circleMainValue = this.formatTime(elapsed > 0 ? elapsed : 0);
            this.progressOffset = 0;
            if (this.timer) clearInterval(this.timer);
        }
    }

    formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
    }

    pad(num: number): string {
        return num < 10 ? '0' + num : num.toString();
    }

    getDotColor(): string {
        switch (this.internalStatus) {
            case 'active':
            case 'checked_in': return 'bg-blue-500';
            case 'confirmed': return 'bg-[#1a73e8]';
            case 'pending': return 'bg-amber-500';
            case 'completed':
            case 'checked_out': return 'bg-green-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    }

    getTextColor(): string {
        switch (this.internalStatus) {
            case 'active':
            case 'checked_in': return 'text-blue-500';
            case 'confirmed': return 'text-[#1a73e8]';
            case 'pending': return 'text-amber-500';
            case 'completed':
            case 'checked_out': return 'text-green-500';
            case 'cancelled': return 'text-red-500';
            default: return 'text-gray-500';
        }
    }

    getCircleColor(): string {
        switch (this.internalStatus) {
            case 'active':
            case 'checked_in': return '#3b82f6';
            case 'confirmed': return '#1a73e8';
            case 'pending': return '#f59e0b';
            case 'completed':
            case 'checked_out': return '#22c55e';
            case 'cancelled': return '#ef4444';
            default: return '#9ca3af';
        }
    }

    getBookingTypeLabel(type: string | undefined): string {
        switch (type) {
            case 'hourly': return 'รายชั่วโมง';
            case 'flat_24h': return 'เหมาจ่าย 24 ชม.';
            case 'monthly_regular': return 'รายเดือน';
            case 'monthly_night': return 'รายเดือน (กลางคืน)';
            default: return 'ทั่วไป';
        }
    }

    getVehicleTypeLabel(type: string | undefined): string {
        switch (type) {
            case 'car': return 'รถยนต์';
            case 'motorcycle': return 'รถจักรยานยนต์';
            case 'ev': return 'รถยนต์ไฟฟ้า (EV)';
            case 'other': return 'อื่นๆ';
            default: return type || 'รถยนต์';
        }
    }

    openMap() {
        if (this.booking.lat && this.booking.lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${this.booking.lat},${this.booking.lng}`;
            window.open(url, '_blank');
        }
    }

    handleCancel() {
        this.modalCtrl.dismiss({ action: 'cancel' }, 'confirm');
    }

    handleCheckout() {
        this.modalCtrl.dismiss({ action: 'checkout' }, 'confirm');
    }

    handleReceipt() {
        this.modalCtrl.dismiss({ action: 'receipt' }, 'confirm');
    }
}
