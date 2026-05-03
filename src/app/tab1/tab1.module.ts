import { IonicModule } from '@ionic/angular';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Tab1Page } from './tab1.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { Tab1PageRoutingModule } from './tab1-routing.module';
import { ParkingDetailComponent } from '../modal/parking-detail/parking-detail.component';
import { ParkingReservationsComponent } from '../modal/parking-reservations/parking-reservations.component';
import { CheckBookingComponent } from '../modal/check-booking/check-booking.component';
import { BookingSlotComponent } from '../modal/booking-slot/booking-slot.component';
import { BookingSuccessModalComponent } from '../modal/booking-success-modal/booking-success-modal.component';
import { RegisterCodeModalComponent } from '../modal/register-code/register-code-modal.component';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    Tab1PageRoutingModule,
    RegisterCodeModalComponent
  ],
  declarations: [Tab1Page, ParkingDetailComponent, ParkingReservationsComponent, CheckBookingComponent, BookingSlotComponent, BookingSuccessModalComponent],
  providers: [DecimalPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class Tab1PageModule { }