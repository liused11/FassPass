import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

export interface VerifiedUser {
  id: string;
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-invite-visitor-modal',
  templateUrl: './invite-visitor-modal.component.html',
  styleUrls: ['./invite-visitor-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InviteVisitorModalComponent implements OnInit {
  selectedFloor: number | null = null;
  selectedRoom: string = '';
  inviteMethod: 'select' | 'generate' = 'select';
  selectedVisitor: VerifiedUser | null = null;
  generatedCode: string = '';

  verifiedUsers: VerifiedUser[] = [
    { id: 'u1', name: 'สมชาย ใจดี', avatar: 'https://i.pravatar.cc/40?img=1' },
    { id: 'u2', name: 'สมหญิง รักเรียน', avatar: 'https://i.pravatar.cc/40?img=2' },
    { id: 'u3', name: 'มานะ พากเพียร', avatar: 'https://i.pravatar.cc/40?img=3' },
  ];

  floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.generatedCode = 'FP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  confirmInvite() {
    if (!this.selectedFloor) return;

    if (this.inviteMethod === 'select' && !this.selectedVisitor) return;

    const result = {
      floor: this.selectedFloor,
      room: this.selectedRoom,
      method: this.inviteMethod,
      visitor: this.inviteMethod === 'select' ? this.selectedVisitor : null,
      code: this.inviteMethod === 'generate' ? this.generatedCode : null,
    };

    this.modalCtrl.dismiss(result, 'confirm');
  }
}
