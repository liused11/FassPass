import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ReservationService } from './services/reservation.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private alertCtrl: AlertController,
    private reservationService: ReservationService
  ) {}

  async ngOnInit() {
    await this.presentUserIdAlert();
  }

  async presentUserIdAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Test Mode: User ID',
      message: 'Enter User UUID for testing. (Using default if empty)',
      backdropDismiss: false,
      inputs: [
        {
          name: 'userId',
          type: 'text',
          placeholder: 'User ID (0000...)',
          value: '00000000-0000-0000-0000-000000000000' 
        },
        {
          name: 'slotId',
          type: 'text',
          placeholder: 'Slot ID (e.g. 1-1-1-1-1)',
          value: '' 
        }
      ],
      buttons: [
        {
          text: 'OK',
          handler: (data) => {
            const uid = data.userId || '00000000-0000-0000-0000-000000000000';
            this.reservationService.setTestUserId(uid);
            
            if (data.slotId) {
                this.reservationService.setTestSlotId(data.slotId);
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
