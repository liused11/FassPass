import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab4PageRoutingModule } from './tab4-routing.module';

import { Tab4Page } from './tab4.page';
import { BuildingViewComponent } from '../components/building-view/building-view.component';
import { FloorPlanComponent } from '../components/floor-plan/floor-plan.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab4PageRoutingModule,
    BuildingViewComponent,
    FloorPlanComponent
  ],
  declarations: [Tab4Page]
})
export class Tab4PageModule { }
