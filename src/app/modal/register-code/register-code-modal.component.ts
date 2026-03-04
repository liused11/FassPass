import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

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

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async submitCode() {
    if (this.inviteCode.length < 6) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // TODO: Call API to verify invite code and issue access pass
      console.log('Submitting invite code:', this.inviteCode);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.modalCtrl.dismiss({ code: this.inviteCode }, 'confirm');
    } catch (err: any) {
      this.errorMessage = err.message || 'รหัสไม่ถูกต้อง กรุณาลองใหม่';
    } finally {
      this.isLoading = false;
    }
  }
}
