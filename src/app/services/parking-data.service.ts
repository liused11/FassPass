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
            .eq('user_id', userId);

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
                lastUpdate: this.formatThaiDateTime(item.updated_at || item.created_at) // Use real DB time
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
        const currentVehicles = this.vehiclesSubject.value;

        // Ensure user is loaded
        const userId = this.reservationService.getTestUserId();

        // Pass the user_id directly if missing, just in case
        const payload = {
            ...vehicle,
            user_id: userId
        };

        try {
            // Call the Edge Function instead of doing client-side insert
            const { data, error } = await this.supabaseService.client.functions.invoke('add-vehicle', {
                body: { vehicle: payload },
            });

            if (error) {
                console.error('[ParkingDataService] Edge function returned error:', error);
                const functionError: any = error;
                if (functionError.context && typeof functionError.context.json === 'function') {
                    const errorBody = await functionError.context.json().catch(() => ({}));
                    console.error('[ParkingDataService] Edge function error body:', errorBody);
                    throw new Error(errorBody.error || error.message);
                }
                throw error;
            }

            // The edge function returns the inserted row
            const newCarRecord = data;

            // Map back to frontend Vehicle model
            const newVehicle: Vehicle = {
                id: newCarRecord.id,
                model: newCarRecord.model,
                licensePlate: newCarRecord.license_plate,
                province: newCarRecord.province,
                color: newCarRecord.color,
                image: newCarRecord.image,
                isDefault: newCarRecord.is_default,
                status: newCarRecord.status || 'active',
                lastUpdate: this.formatThaiDateTime(newCarRecord.created_at) // Or updated_at
            };

            const updated = [...currentVehicles, newVehicle];
            this.vehiclesSubject.next(updated);

            return newVehicle;

        } catch (error) {
            console.error('[ParkingDataService] Error calling add-vehicle fn:', error);
            throw error;
        }
    }

    async updateVehicle(updatedVehicle: Vehicle) {
        console.log('[ParkingDataService] Updating vehicle back to DB:', updatedVehicle);

        const updateData = {
            model: updatedVehicle.model,
            license_plate: updatedVehicle.licensePlate,
            province: updatedVehicle.province,
            color: updatedVehicle.color,
            image: updatedVehicle.image,
            is_default: updatedVehicle.isDefault,
            // status removed - not in DB
            updated_at: new Date().toISOString() // Set current time for updated_at
        };

        const { data, error } = await this.supabaseService.client
            .from('cars')
            .update(updateData)
            .eq('id', updatedVehicle.id)
            .select()
            .single();

        if (error) {
            console.error('[ParkingDataService] Error updating vehicle:', error);
            throw error;
        }

        console.log('[ParkingDataService] Vehicle updated successfully in DB:', data);

        // Update successful, reflect the new time locally
        if (data) {
            const currentVehicles = this.vehiclesSubject.value;
            const updated = currentVehicles.map(v => {
                if (v.id === updatedVehicle.id) {
                    return {
                        ...updatedVehicle,
                        lastUpdate: this.formatThaiDateTime(data.updated_at)
                    };
                }
                return v;
            });
            this.vehiclesSubject.next(updated);
        }
    }

    async setDefaultVehicle(id: number | string) {
        // 1. Update local state immediately for fast UI response
        const currentVehicles = this.vehiclesSubject.value;
        const updated = currentVehicles.map(v => ({
            ...v,
            isDefault: v.id === id
        }));
        this.vehiclesSubject.next(updated);

        // 2. Persist to Backend
        try {
            const userId = this.reservationService.getTestUserId();

            // Set all vehicles for this user to is_default = false
            await this.supabaseService.client
                .from('cars')
                .update({ is_default: false })
                .eq('user_id', userId);

            // Set the selected vehicle to is_default = true
            const { error: setTrueError } = await this.supabaseService.client
                .from('cars')
                .update({ is_default: true, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (setTrueError) throw setTrueError;

            console.log(`[ParkingDataService] Vehicle ${id} set to default successfully in DB.`);

        } catch (error) {
            console.error('[ParkingDataService] Error setting default vehicle to DB:', error);
            // Revert on failure
            const reverted = currentVehicles.map(v => ({
                ...v,
                isDefault: v.id === id ? false : v.isDefault
            }));
            this.vehiclesSubject.next(reverted);
            throw error;
        }
    }

    async deleteVehicle(id: number | string) {
        try {
            const { error } = await this.supabaseService.client
                .from('cars')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('[ParkingDataService] Error deleting vehicle from DB:', error);
                throw error;
            }

            // Update local state after successful DB deletion
            const currentVehicles = this.vehiclesSubject.value.filter(v => v.id !== id);
            this.vehiclesSubject.next(currentVehicles);

            console.log(`[ParkingDataService] Vehicle ${id} deleted successfully.`);
        } catch (error) {
            console.error('[ParkingDataService] Failed to delete vehicle:', error);
            throw error;
        }
    }

    // --- Parking Lot Management ---

    getParkingLotById(id: string): ParkingLot | undefined {
        return this.parkingLotsSubject.value.find(p => p.id === id);
    }

    // --- Profile Management ---

    updateProfile(profile: UserProfile) {
        this.userProfileSubject.next(profile);
    }

    // --- Helper Methods ---
    private formatThaiDateTime(isoString: string | null | undefined): string {
        if (!isoString) return 'ไม่ทราบเวลา';

        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'ไม่ทราบเวลา';

        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist Era
        let hours = date.getHours().toString();
        let minutes = date.getMinutes().toString();

        // Pad single digit
        if (hours.length < 2) hours = '0' + hours;
        if (minutes.length < 2) minutes = '0' + minutes;

        return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    }
}
