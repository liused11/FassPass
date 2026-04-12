import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';


export type SheetMode = 'building-list' | 'access-list' | 'building-detail' | 'hidden' | 'location-detail' | 'room-detail';

export type ExpansionState = 'peek' | 'partial' | 'default' | 'expanded';


export interface SheetData {
  mode: SheetMode;
  data?: any; 
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BottomSheetService {
  
  private sheetStateSubject = new BehaviorSubject<SheetData>({ mode: 'hidden' });
  public sheetState$ = this.sheetStateSubject.asObservable();

  
  private expansionStateSubject = new BehaviorSubject<ExpansionState>('default');
  public expansionState$ = this.expansionStateSubject.asObservable();

  
  private actionSubject = new Subject<{ action: string, payload?: any }>();
  public action$ = this.actionSubject.asObservable();

  

  
  open(mode: SheetMode, data?: any, title?: string, initialState: ExpansionState = 'default') {
    this.sheetStateSubject.next({ mode, data, title });
    this.expansionStateSubject.next(initialState);
  }

  
  close() {
    this.sheetStateSubject.next({ mode: 'hidden' });
  }

  
  setExpansionState(state: ExpansionState) {
    if (this.expansionStateSubject.getValue() === state) {
      return;
    }
    this.expansionStateSubject.next(state);
  }

  
  getCurrentExpansionState(): ExpansionState {
    return this.expansionStateSubject.getValue();
  }

  
  showBuildingList(buildings: any[]) {
    this.open('building-list', buildings, 'สถานที่ใกล้เคียง');
  }

  
  showAccessList(rooms: any[], initialState: ExpansionState = 'peek') {
    this.open('access-list', rooms, 'พื้นที่ที่เข้าถึงได้', initialState);
  }

  
  showLocationDetail(locationData: any) {
    this.open('location-detail', locationData, undefined, 'peek');
  }

  
  showRoomDetail(roomData: any) {
    
    this.open('room-detail', roomData, roomData.name || 'รายละเอียดห้อง', 'partial');
  }

  
  goBackToAccessList(previousData: any) {
    this.open('access-list', previousData, 'พื้นที่ที่เข้าถึงได้', 'default');
  }

  
  triggerAction(action: string, payload?: any) {
    this.actionSubject.next({ action, payload });
  }
}