import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Booking } from '../data/models';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private testUserId: string = '00000000-0000-0000-0000-000000000000';
  private testSlotId: string = '';

  constructor(private supabaseService: SupabaseService) { }

  setTestUserId(id: string) {
    this.testUserId = id;
    console.log('Test User ID set:', this.testUserId);
  }

  getTestUserId(): string {
    return this.testUserId;
  }

  setTestSlotId(id: string) {
    this.testSlotId = id;
    console.log('Test Slot ID set:', this.testSlotId);
  }

  getTestSlotId(): string {
    return this.testSlotId;
  }

  // Check which slots are occupied in a given time range
  async getOccupiedSlotIds(siteId: string, start: Date, end: Date): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('reservations')
      .select('slot_id')
      .eq('parking_site_id', siteId)
      .neq('status', 'cancelled')
      .neq('status', 'checked_out')
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString());

    if (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
    return [...new Set((data || []).map((r: any) => r.slot_id))];
  }

  async createReservation(booking: Booking, userId: string, siteId: string, floorId: string, slotId: string) {
    const { data, error } = await this.supabaseService.client
      .from('reservations')
      .insert({
        user_id: userId,
        parking_site_id: siteId,
        floor_id: floorId,
        slot_id: slotId,
        start_time: booking.bookingTime.toISOString(),
        end_time: booking.endTime.toISOString(),
        status: 'pending',
        vehicle_type: 'car'
      })
      .select()
      .single();

    if (error) {
       if (error.code === '23P01' || error.message.includes('Double Booking')) {
           throw new Error('This slot is already booked. Please choose another.');
       }
       throw error;
    }
    return data;
  }
  async getReservations() {
    const { data, error } = await this.supabaseService.client
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Manually trigger auto-cancellation of expired pending reservations
   * This calls the database function to cancel reservations that are
   * still pending 15+ minutes after their start_time
   * 
   * @returns Promise<number> Number of cancelled reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    const { data, error } = await this.supabaseService.client
      .rpc('auto_cancel_expired_pending_reservations');

    if (error) {
      console.error('Error cleaning up expired reservations:', error);
      throw error;
    }

    console.log(`Cleaned up ${data || 0} expired reservation(s)`);
    return data || 0;
  }
}
