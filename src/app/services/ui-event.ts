import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiEventService {

  private toggleTab1SheetSubject = new Subject<void>();
  toggleTab1Sheet$ = this.toggleTab1SheetSubject.asObservable();

  constructor() { }

  // ฟังก์ชันนี้จะถูกเรียกจาก tabs.page.ts
  toggleTab1Sheet() {
    this.toggleTab1SheetSubject.next();
  }
}