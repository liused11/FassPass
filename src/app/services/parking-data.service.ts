import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking, ParkingLot, UserProfile, Vehicle } from '../data/models';
import { TAB1_PARKING_LOTS, TAB2_BOOKINGS, TAB3_USER_PROFILE, TAB3_VEHICLES } from '../data/mock-data';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class ParkingDataService {

    // Data Sources (BehaviorSubjects hold the current value)
    private parkingLotsSubject = new BehaviorSubject<ParkingLot[]>([]);
    private bookingsSubject = new BehaviorSubject<Booking[]>([]);
    private userProfileSubject = new BehaviorSubject<UserProfile | any>(null); // Initialize with null or empty
    private vehiclesSubject = new BehaviorSubject<Vehicle[]>(TAB3_VEHICLES);

    // Observables for Components to subscribe to
    parkingLots$ = this.parkingLotsSubject.asObservable();
    bookings$ = this.bookingsSubject.asObservable();
    userProfile$ = this.userProfileSubject.asObservable();
    vehicles$ = this.vehiclesSubject.asObservable();

    constructor(private supabaseService: SupabaseService) {
        this.loadParkingLots();
        this.loadUserProfile(); // Load User Profile on init
        this.loadUserVehicles(); // Load User Vehicles on init
    }

    async loadParkingLots() {
        const { data, error } = await this.supabaseService.client
            .from('buildings')
            .select('*');

        if (error) {
            console.error('Error loading parking lots:', error);
            // Fallback to mock data on error? Or just leave empty?
            // For now, let's fallback to mock data if DB fails or is empty to avoid broken UI during transition
            if (this.parkingLotsSubject.value.length === 0) {
                 this.parkingLotsSubject.next(TAB1_PARKING_LOTS);
            }
            return;
        }

        if (data && data.length > 0) {
            const parkingLots: ParkingLot[] = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category || 'parking',
                zone: item.zone,
                capacity: {
                    normal: item.capacity_normal || 0,
                    ev: item.capacity_ev || 0,
                    motorcycle: item.capacity_motorcycle || 0
                },
                available: {
                    normal: item.available_normal || 0,
                    ev: item.available_ev || 0,
                    motorcycle: item.available_motorcycle || 0
                },
                floors: item.floors || [],
                mapX: item.map_x || 0,
                mapY: item.map_y || 0,
                lat: item.lat || 0,
                lng: item.lng || 0,
                status: item.status || 'available',
                isBookmarked: false,
                distance: 0,
                hours: item.hours || '08:00 - 20:00',
                hasEVCharger: item.has_ev_charger || false,
                userTypes: item.user_types || 'General',
                price: item.price || 0,
                priceUnit: item.price_unit || 'บาท/ชม.',
                supportedTypes: item.supported_types || ['normal'],
                schedule: item.schedule || [],
                images: item.images || ['assets/images/parking/default.png']
            }));
            this.parkingLotsSubject.next(parkingLots);
        } else {
             // If DB is empty, use Mock for now so UI doesn't look broken
             this.parkingLotsSubject.next(TAB1_PARKING_LOTS);
        }
    }

    async loadUserProfile(userId: string = '00000000-0000-0000-0000-000000000000') {
        const { data, error } = await this.supabaseService.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error loading user profile:', error);
            // Fallback to mock data if not found logic could go here, but let's try to stick to real data
            this.userProfileSubject.next(TAB3_USER_PROFILE); // Fallback for safety
            return;
        }

        if (data) {
            const profile: UserProfile = {
                name: data.name,
                phone: data.phone,
                avatar: data.avatar,
                role: data.role,
                lineId: data.line_id,
                email: data.email
            };
            this.userProfileSubject.next(profile);
        }
    }

    async loadUserVehicles(userId: string = '00000000-0000-0000-0000-000000000000') {
        const { data, error } = await this.supabaseService.client
            .from('cars')
            .select('*')
            .eq('user_id', userId)
            .order('rank', { ascending: true }); // Order by rank

        if (error) {
            console.error('Error loading user vehicles:', error);
             // Fallback to mock data if error
            this.vehiclesSubject.next(TAB3_VEHICLES);
            return;
        }

        if (data && data.length > 0) {
            const vehicles: Vehicle[] = data.map((item: any) => ({
                id: item.id,
                model: item.model,
                licensePlate: item.license_plate,
                province: item.province,
                image: item.image,
                isDefault: item.is_default,
                status: item.status,
                lastUpdate: '', // DB doesn't have formatted date string, leave empty or format updated_at
                rank: item.rank
            }));
            this.vehiclesSubject.next(vehicles);
        } else {
             // If DB is empty, use Mock for now
             this.vehiclesSubject.next(TAB3_VEHICLES);
        }
    }

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
        // Generate a temporary ID (if using real DB, this should ideally be handled by backend return)
        // For now, generate a random string to avoid collision with UUIDs
        const newId = 'temp-' + Math.random().toString(36).substr(2, 9);
        const newVehicle = { ...vehicle, id: newId };
        this.vehiclesSubject.next([...currentVehicles, newVehicle]);
    }

    updateVehicle(updatedVehicle: Vehicle) {
        const currentVehicles = this.vehiclesSubject.value;
        const updated = currentVehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
        this.vehiclesSubject.next(updated);
    }

    setDefaultVehicle(id: number | string) {
        const currentVehicles = this.vehiclesSubject.value;
        const updated = currentVehicles.map(v => ({
            ...v,
            isDefault: v.id === id,
            status: v.id === id ? 'พร้อมใช้งาน' : ''
        }));
        this.vehiclesSubject.next(updated);
        // Ideally, we should also update this in the backend
    }

    deleteVehicle(id: number | string) {
        const currentVehicles = this.vehiclesSubject.value.filter(v => v.id !== id);
        this.vehiclesSubject.next(currentVehicles);
        // Ideally, we should also delete from backend
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
