export interface ScheduleItem {
    days: string[];
    open_time: string;
    close_time: string;
    cron: { open: string; close: string; };
}

export interface ParkingSlotDB {
    slotId: string;
    startTime: string;
    endTime: string;
    displayText: string;
    isAvailable: boolean;
    totalCapacity: number;
    bookedCount: number;
    remainingCount: number;
    timeText: string;
}

export interface ParkingLot {
    id: string;
    name: string;
    category?: 'parking' | 'building'; // New field for location type
    capacity: {
        normal: number;
        ev: number;
        motorcycle: number;
    };
    available: {
        normal: number;
        ev: number;
        motorcycle: number;
    };
    floors?: { id: string; name: string }[] | string[];
    mapX: number;
    mapY: number;
    //  พิกัดสำหรับ Map (Latitude, Longitude)
    lat?: number;
    lng?: number;

    status: 'available' | 'full' | 'closed' | 'low';
    isBookmarked: boolean;
    distance: number;
    hours: string;
    hasEVCharger: boolean;
    userTypes: string;
    price: number;
    priceUnit: string;
    supportedTypes: string[];
    schedule?: ScheduleItem[];
    images?: string[];
    note?: string; // e.g. "รองรับผู้มาติดต่อมหาลัย"
    promotion?: string; // e.g. "จอดฟรี 1 ชม."
}

export interface Booking {
    id: string;
    placeName: string;
    locationDetails: string; // e.g. "ชั้น 1 | โซน B | B04"
    bookingTime: Date;
    endTime: Date;
    status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'active'; // Added 'active' for currently parking
    statusLabel?: string; // Optional override for status text
    price: number;
    discountBadge?: string; // e.g. "ลด 15%"
    carBrand: string;     // ยี่ห้อรถ
    licensePlate: string; // ทะเบียนรถ
    bookingType: 'daily' | 'monthly' | 'flat24' | 'monthly_night'; // Updated types
    periodLabel?: string; // For special textual times like "เหมาจ่าย 24 ชั่วโมง" or "1 ธ.ค. - 31 ธ.ค."
    timeDetailLabel?: string; // For explicit time range text if needed
}

export interface UserProfile {
    name: string;
    phone: string;
    avatar: string;
    role: string;
    lineId?: string;
    email?: string;
}

export interface Vehicle {
    id: number;
    model: string;
    licensePlate: string;
    province: string;
    image: string;
    isDefault: boolean;
    status: string;
    lastUpdate: string;
    rank: number;
}

export interface SettingItem {
    title: string;
    icon: string;
    value?: string;
}

export interface BuildingData {
    buildingId: string;
    buildingName?: string;
    floors: any[];
}

export interface Asset {
    id: string;
    name: string;
    type: string;
    floor_number: number;
}

export interface RolePermission {
    role: string;
}
