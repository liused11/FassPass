import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Tab3Page } from './tab3.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { Tab3PageRoutingModule } from './tab3-routing.module';
import { AddVehicleModalComponent } from '../modal/add-vehicle/add-vehicle-modal.component';
import { EditProfileModalComponent } from '../modal/edit-profile-modal/edit-profile-modal.component';
import { InviteVisitorModalComponent } from '../modal/invite-visitor/invite-visitor-modal.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ExploreContainerComponentModule,
    Tab3PageRoutingModule,
    EditProfileModalComponent,
    InviteVisitorModalComponent
  ],
  declarations: [Tab3Page, AddVehicleModalComponent]
})
export class Tab3PageModule { }

