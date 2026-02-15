import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking, ParkingLot, UserProfile, Vehicle } from '../data/models';
import { SupabaseService } from './supabase.service';
import { ReservationService } from './reservation.service'; // Import ReservationService

@Injectable({
    providedIn: 'root'
})
export class ParkingDataService {

    // Data Sources (BehaviorSubjects hold the current value)
    private parkingLotsSubject = new BehaviorSubject<ParkingLot[]>([]);
    private bookingsSubject = new BehaviorSubject<Booking[]>([]);
    private userProfileSubject = new BehaviorSubject<UserProfile | any>(null); // Initialize with null or empty
    private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);

    // Observables for Components to subscribe to
    parkingLots$ = this.parkingLotsSubject.asObservable();
    bookings$ = this.bookingsSubject.asObservable();
    userProfile$ = this.userProfileSubject.asObservable();
    vehicles$ = this.vehiclesSubject.asObservable();

    constructor(
        private supabaseService: SupabaseService,
        private reservationService: ReservationService
    ) {
        this.loadParkingLots();
        // Subscribe to user ID changes
        this.reservationService.testUserId$.subscribe(userId => {
            if (userId) {
                console.log('[ParkingDataService] User ID Changed:', userId);
                this.loadUserProfile(userId);
                this.loadUserVehicles(userId);
            }
        });
    }

    async loadParkingLots() {
        const { data, error } = await this.supabaseService.client
            .from('buildings')
            .select('*');

        if (error) {
            console.error('Error loading parking lots:', error);
            // Fallback to empty array on error
            if (this.parkingLotsSubject.value.length === 0) {
                 this.parkingLotsSubject.next([]);
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
             this.parkingLotsSubject.next([]);
        }
    }

    async loadUserProfile(userId: string = '00000000-0000-0000-0000-000000000000') {
        console.log('Loading user profile for:', userId);
        const { data, error } = await this.supabaseService.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        console.log('User Profile Data:', data);
        console.log('User Profile Error:', error);

        if (error) {
            console.error('Error loading user profile:', error);
            this.userProfileSubject.next(null);
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
             // Fallback to empty if error
            this.vehiclesSubject.next([]);
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
             // If DB is empty, use empty
             this.vehiclesSubject.next([]);
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

    async addVehicle(vehicle: Partial<Vehicle>) {
        console.log('[ParkingDataService] Adding vehicle:', vehicle);
        
        // Get current user ID
        const userId = this.reservationService.getTestUserId(); 
        
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
             console.warn('[ParkingDataService] Warning: Using test/default User ID.');
        }

        // 1. Calculate Next Rank from DB to avoid collision (length+1 is unsafe if items deleted)
        const { data: maxRankData, error: rankError } = await this.supabaseService.client
            .from('cars')
            .select('rank')
            .eq('user_id', userId)
            .order('rank', { ascending: false })
            .limit(1)
            .maybeSingle();

        let nextRank = 1;
        if (maxRankData) {
            nextRank = (maxRankData.rank || 0) + 1;
        }
        console.log('[ParkingDataService] Calculated Next Rank:', nextRank);

        // 2. Insert new vehicle
        const { data, error } = await this.supabaseService.client
            .from('cars')
            .insert([{
                user_id: userId,
                model: vehicle.model,
                license_plate: vehicle.licensePlate, 
                province: vehicle.province, 
                color: vehicle.color || null, // Add color
                image: vehicle.image,
                is_default: vehicle.isDefault || false,
                status: vehicle.status || 'active',
                rank: nextRank
            }])
            .select()
            .single();

        if (error) {
            console.error('[ParkingDataService] Error adding vehicle:', error);
            // Check for duplicate key error (PGRST110 or 23505)
            if (error.code === '23505') {
                console.error('[ParkingDataService] Duplicate data found (License Plate or Rank).');
            }
            throw error;
        }

        console.log('[ParkingDataService] Vehicle added successfully:', data);

        // 3. Update local state
        if (data) {
             const newVehicle: Vehicle = {
                id: data.id,
                model: data.model,
                licensePlate: data.license_plate,
                province: data.province,
                color: data.color, // Add color
                image: data.image,
                isDefault: data.is_default,
                status: data.status,
                lastUpdate: 'Just now',
                rank: data.rank
            };
            const currentVehicles = this.vehiclesSubject.value;
            this.vehiclesSubject.next([...currentVehicles, newVehicle]);
        }
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
