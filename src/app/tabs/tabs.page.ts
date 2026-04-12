
import { Component, ViewChild } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { UiEventService } from '../services/ui-event';


@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  @ViewChild(IonTabs) tabs!: IonTabs; 

  constructor(private uiEventService: UiEventService) {} 

  onTab1Click() {
    const selectedTab = this.tabs.getSelected();

    if (selectedTab === 'tab1') {
      
      this.uiEventService.toggleTab1Sheet();
    } else {
      
      this.tabs.select('tab1');
    }
  }
}