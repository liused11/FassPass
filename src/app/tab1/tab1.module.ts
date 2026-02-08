import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { Tab1PageRoutingModule } from './tab1-routing.module';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';
import { ParkingReservationsComponent } from '../modal/parking-reservations/parking-reservations.component';
import { CheckBookingComponent } from '../modal/check-booking/check-booking.component';
import { BookingSlotComponent } from '../modal/booking-slot/booking-slot.component';
import { BookingSuccessModalComponent } from '../modal/booking-success-modal/booking-success-modal.component';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    Tab1PageRoutingModule,
    
  ],
  declarations: [Tab1Page , ParkingDetailComponent , ParkingReservationsComponent ,CheckBookingComponent ,BookingSlotComponent , BookingSuccessModalComponent]
})
export class Tab1PageModule {}