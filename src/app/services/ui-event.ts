import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiEventService {

  private toggleTab1SheetSubject = new Subject<void>();
  toggleTab1Sheet$ = this.toggleTab1SheetSubject.asObservable();

  private refreshParkingDataSubject = new Subject<void>();
  refreshParkingData$ = this.refreshParkingDataSubject.asObservable();

  constructor() { }

  
  toggleTab1Sheet() {
    this.toggleTab1SheetSubject.next();
  }

  triggerRefreshParkingData() {
    this.refreshParkingDataSubject.next();
  }
}