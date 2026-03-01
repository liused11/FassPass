import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class BookmarkService {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService); // Assuming there's an authService to get current user, or we can get it from supabase.

    constructor() { }

    /**
     * เพิ่ม Bookmark
     * @param buildingId ID ของสถานที่
     */
    async addBookmark(buildingId: string): Promise<void> {
        try {
            const { data: { user }, error: userError } = await this.supabaseService.client.auth.getUser();
            if (userError || !user) throw new Error('User not authenticated');

            const { error } = await this.supabaseService.client
                .from('user_bookmarks')
                .insert([
                    { user_id: user.id, building_id: buildingId }
                ]);

            if (error) {
                if (error.code === '23505') {
                    // Unique violation (already bookmarked)
                    return;
                }
                throw error;
            }
        } catch (error) {
            console.error('Error adding bookmark:', error);
            throw error;
        }
    }

    /**
     * ลบ Bookmark
     * @param buildingId ID ของสถานที่
     */
    async removeBookmark(buildingId: string): Promise<void> {
        try {
            const { data: { user }, error: userError } = await this.supabaseService.client.auth.getUser();
            if (userError || !user) throw new Error('User not authenticated');

            const { error } = await this.supabaseService.client
                .from('user_bookmarks')
                .delete()
                .match({ user_id: user.id, building_id: buildingId });

            if (error) throw error;
        } catch (error) {
            console.error('Error removing bookmark:', error);
            throw error;
        }
    }

    /**
     * เช็คว่าผู้ใช้ Bookmark สถานที่นี้ไปหรือยัง
     * @param buildingId ID ของสถานที่
     */
    async checkIsBookmarked(buildingId: string): Promise<boolean> {
        try {
            const { data: { user }, error: userError } = await this.supabaseService.client.auth.getUser();
            if (userError || !user) return false;

            const { data, error } = await this.supabaseService.client
                .from('user_bookmarks')
                .select('building_id')
                .match({ user_id: user.id, building_id: buildingId })
                .maybeSingle();

            if (error) throw error;

            return !!data;
        } catch (error) {
            console.error('Error checking bookmark status:', error);
            return false;
        }
    }

    /**
     * ดึงรหัสสถานที่ที่ Bookmark ทั้งหมดของผู้ใช้ (คืนค่าเป็น array ของ buildingId)
     */
    async getBookmarkedBuildingIds(): Promise<string[]> {
        try {
            const { data: { user }, error: userError } = await this.supabaseService.client.auth.getUser();
            if (userError || !user) return [];

            const { data, error } = await this.supabaseService.client
                .from('user_bookmarks')
                .select('building_id')
                .eq('user_id', user.id);

            if (error) throw error;
            return data ? data.map(b => b.building_id) : [];
        } catch (error) {
            console.error('Error fetching bookmarked ids:', error);
            return [];
        }
    }

    /**
     * ดึงรายการสถานที่ทั้งหมดที่ผู้ใช้ Bookmark ไว้ (Join กับตาราง buildings)
     */
    async getSavedPlaces(): Promise<any[]> {
        try {
            const { data: { user }, error: userError } = await this.supabaseService.client.auth.getUser();
            if (userError || !user) throw new Error('User not authenticated');

            // Assuming your table is named 'buildings' and it has fields that we can select.
            const { data, error } = await this.supabaseService.client
                .from('user_bookmarks')
                .select(`
          created_at,
          buildings (*)
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map the data to return only the building objects (with created_at if needed)
            return data ? data.map(item => ({ ...item.buildings, _bookmarked_at: item.created_at })) : [];
        } catch (error) {
            console.error('Error fetching saved places:', error);
            throw error;
        }
    }
}
