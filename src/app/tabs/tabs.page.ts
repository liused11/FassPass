// src/app/tabs/tabs.page.ts
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
  @ViewChild(IonTabs) tabs!: IonTabs; // ❗️ ใช้ ! เพื่อบอกว่าจะมีค่าแน่นอน

  constructor(private uiEventService: UiEventService) {} // ❗️ Inject Service

  onTab1Click() {
    const selectedTab = this.tabs.getSelected();

    if (selectedTab === 'tab1') {
      // ❗️ ถ้าอยู่ Tab1 อยู่แล้ว -> ให้สลับ Sheet
      this.uiEventService.toggleTab1Sheet();
    } else {
      // ❗️ ถ้าอยู่ Tab อื่น -> ให้ย้ายไป Tab1
      this.tabs.select('tab1');
    }
  }
}