import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';
import { ReservationService } from '../../services/reservation.service';

@Component({
  selector: 'app-register-code-modal',
  templateUrl: './register-code-modal.component.html',
  styleUrls: ['./register-code-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RegisterCodeModalComponent {
  inviteCode: string = '';
  isLoading = false;
  errorMessage: string = '';

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService,
    private reservationService: ReservationService,
    private toastCtrl: ToastController
  ) {}

  dismiss() { this.modalCtrl.dismiss(); }

  async submitCode() {
    if (this.inviteCode.length < 6) return;
    this.isLoading = true;
    this.errorMessage = '';

    const visitorId = this.reservationService.getCurrentProfileId();

    try {
      const { data, error } = await this.supabase.client.rpc('claim_invite_code', {
        p_code: this.inviteCode,
        p_visitor_id: visitorId
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว');

      const toast = await this.toastCtrl.create({
        message: 'ได้รับบัตรผ่านเข้าอาคารเรียบร้อยแล้ว!',
        duration: 3000,
        color: 'success'
      });
      toast.present();

      this.modalCtrl.dismiss({ code: this.inviteCode }, 'confirm');
    } catch (err: any) {
      this.errorMessage = err.message || 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว';
    } finally {
      this.isLoading = false;
    }
  }
}
