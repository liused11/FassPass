import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ParkingLot } from '../data/models'; // Import existing model

@Injectable({
  providedIn: 'root'
})
export class ParkingService {

  constructor(private supabase: SupabaseService) { }

  /**
   * Fetches buildings for a specific site using Supabase RPC.
   * @param siteId The ID of the site (e.g., '1-1')
   * @param lat User's current latitude
   * @param lng User's current longitude
   * @param userId Optional User ID for bookmark status
   */
  getSiteBuildings(siteId: string, lat: number = 0, lng: number = 0, userId: string | null = null): Observable<ParkingLot[]> {
    const rpcName = 'get_site_buildings';
    const params = {
        p_site_id: siteId,
        p_lat: lat,
        p_lng: lng,
        p_user_id: userId
    };

    return from(
      this.supabase.client
        .rpc(rpcName, params)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ParkingLot[];
      }),
      catchError(err => {
        console.error('Available RPC Call Failed:', err);
        return of([]); 
      })
    );
  }

  /**
   * Fetches availability for a building within a specific time range.
   */
  getAvailability(buildingId: string, startTime: Date, endTime: Date, vehicleType: string = 'car'): Observable<any[]> {
    const rpcName = 'get_building_availability';
    const params = {
      p_building_id: buildingId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
      p_vehicle_type: vehicleType
    };

    return from(
      this.supabase.client.rpc(rpcName, params)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || []; // Return raw data (Floor/Zone structure)
      }),
      catchError(err => {
        console.error('Availability RPC Call Failed:', err);
        return of([]);
      })
    );
  }

  /**
   * Fetches time slot availability for a building.
   */
  getBuildingTimeSlots(
    buildingId: string, 
    startTime: Date, 
    endTime: Date, 
    intervalMinutes: number = 60, 
    vehicleType: string = 'car'
  ): Observable<any[]> {
    const rpcName = 'get_building_slots_availability';
    const params = {
      p_building_id: buildingId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
      p_interval_minutes: intervalMinutes,
      p_vehicle_type: vehicleType
    };

    return from(
      this.supabase.client.rpc(rpcName, params)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError(err => {
        console.error('Time Slots RPC Call Failed:', err);
        return of([]);
      })
    );
  }

  /**
   * Finds the best available slot ID in a given zone and time range.
   */
  findBestAvailableSlot(zoneId: string, startTime: Date, endTime: Date): Observable<any> {
    const rpcName = 'find_best_available_slot';
    const params = {
      p_zone_id: zoneId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString()
    };

    return from(
      this.supabase.client.rpc(rpcName, params)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data; // { slot_id: '...', slot_name: '...' } or null
      }),
      catchError(err => {
        console.error('Find Slot RPC Call Failed:', err);
        return of(null);
      })
    );
  }
}
