import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ParkingLot } from '../data/models'; 

@Injectable({
  providedIn: 'root'
})
export class ParkingService {

  constructor(private supabase: SupabaseService) { }

  
  getSiteBuildings(siteId: string, lat: number = 0, lng: number = 0, profileId: string | null = null): Observable<ParkingLot[]> {
    return from((async () => {
      
      const response = await this.supabase.client.functions.invoke('get-parking-lots', {
        body: {
          site_id: siteId,
          lat: lat,
          lng: lng,
          user_id: profileId
        }
      });

      if (response.error) {
        throw response.error;
      }

      let lots = response.data as ParkingLot[];

      
      
      
      if (profileId) {
        try {
          const { data: profile } = await this.supabase.client
            .from('profiles')
            .select('role')
            .eq('id', profileId)
            .single();

          if (profile && profile.role) {
            const roleStr = String(profile.role).toLowerCase();

            lots = lots.map(lot => {
              const roleKeyMap: { [key: string]: string } = {
                'user': 'User',
                'host': 'Host',
                'visitor': 'Visitor'
              };
              const exactRoleKey = roleKeyMap[roleStr] || 'Visitor';
              
              
              const rolePrices = (lot as any).role_prices;
              if (rolePrices && rolePrices[exactRoleKey] !== undefined) {
                 lot.price = rolePrices[exactRoleKey];
              }

              if (lot.price === 0) {
                 lot.priceUnit = 'จอดฟรี';
              } else {
                 lot.priceUnit = 'บาท/ชม.';
              }
              return lot;
            });
          }
        } catch (e) {
          console.error('Failed to override price client-side', e);
        }
      }

      return lots;
    })()).pipe(
      catchError(err => {
        console.error('Available Edge Function Call Failed:', err);
        return of([]);
      })
    );
  }

  
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
        return response.data || []; 
      }),
      catchError(err => {
        console.error('Availability RPC Call Failed:', err);
        return of([]);
      })
    );
  }

  
  getBuildingTimeSlots(
    buildingId: string,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 60,
    vehicleType: string = 'car',
    durationMinutes: number | null = null 
  ): Observable<any[]> {
    const rpcName = 'get_building_slots_availability';
    const params = {
      p_building_id: buildingId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
      p_interval_minutes: intervalMinutes,
      p_vehicle_type: vehicleType,
      p_duration_minutes: durationMinutes
    };

    console.log(`[ParkingService] Calling RPC: ${rpcName}`, params);

    return from(
      this.supabase.client.rpc(rpcName, params)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error(`[ParkingService] RPC Error:`, response.error);
          throw response.error;
        }
        console.log(`[ParkingService] RPC Success. Data length:`, response.data?.length);
        return response.data || [];
      }),
      catchError(err => {
        console.error('Time Slots RPC Call Failed:', err);
        return of([]);
      })
    );
  }

  
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
        return response.data; 
      }),
      catchError(err => {
        console.error('Find Slot RPC Call Failed:', err);
        return of(null);
      })
    );
  }
  get supabaseClient() {
    return this.supabase.client;
  }
}
