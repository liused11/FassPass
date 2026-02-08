import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking, ParkingLot, UserProfile, Vehicle } from '../data/models';
import { TAB1_PARKING_LOTS, TAB2_BOOKINGS, TAB3_USER_PROFILE, TAB3_VEHICLES } from '../data/mock-data';

@Injectable({
    providedIn: 'root'
})
export class ParkingDataService {

    // Data Sources (BehaviorSubjects hold the current value)
    private parkingLotsSubject = new BehaviorSubject<ParkingLot[]>(TAB1_PARKING_LOTS);
    private bookingsSubject = new BehaviorSubject<Booking[]>([]);
    private userProfileSubject = new BehaviorSubject<UserProfile>(TAB3_USER_PROFILE);
    private vehiclesSubject = new BehaviorSubject<Vehicle[]>(TAB3_VEHICLES);

    // Observables for Components to subscribe to
    parkingLots$ = this.parkingLotsSubject.asObservable();
    bookings$ = this.bookingsSubject.asObservable();
    userProfile$ = this.userProfileSubject.asObservable();
    vehicles$ = this.vehiclesSubject.asObservable();

    constructor() { }

    // --- Booking Management ---

    getBookingById(id: string): Booking | undefined {
        return this.bookingsSubject.value.find(b => b.id === id);
    }

    addBooking(booking: Booking) {
        const currentBookings = this.bookingsSubject.value;
        // Prepend new booking to show it at the top
        const updatedBookings = [booking, ...currentBookings];
        this.bookingsSubject.next(updatedBookings);
    }

    cancelBooking(id: string) {
        const currentBookings = this.bookingsSubject.value;
        const updatedBookings = currentBookings.map(b => {
            if (b.id === id) {
                return { ...b, status: 'cancelled' as const, statusLabel: 'ยกเลิกแล้ว' };
            }
            return b;
        });
        this.bookingsSubject.next(updatedBookings);
    }

    // --- Vehicle Management ---

    addVehicle(vehicle: Vehicle) {
        const currentVehicles = this.vehiclesSubject.value;
        const newId = Math.max(...currentVehicles.map(v => v.id), 0) + 1;
        const newVehicle = { ...vehicle, id: newId };
        this.vehiclesSubject.next([...currentVehicles, newVehicle]);
    }

    updateVehicle(updatedVehicle: Vehicle) {
        const currentVehicles = this.vehiclesSubject.value;
        const updated = currentVehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
        this.vehiclesSubject.next(updated);
    }

    setDefaultVehicle(id: number) {
        const currentVehicles = this.vehiclesSubject.value;
        const updated = currentVehicles.map(v => ({
            ...v,
            isDefault: v.id === id,
            status: v.id === id ? 'พร้อมใช้งาน' : ''
        }));
        this.vehiclesSubject.next(updated);
    }

    deleteVehicle(id: number) {
        const currentVehicles = this.vehiclesSubject.value.filter(v => v.id !== id);
        this.vehiclesSubject.next(currentVehicles);
    }

    // --- Parking Lot Management ---

    getParkingLotById(id: string): ParkingLot | undefined {
        return this.parkingLotsSubject.value.find(p => p.id === id);
    }

    // --- Profile Management ---

    updateProfile(profile: UserProfile) {
        this.userProfileSubject.next(profile);
    }
}
