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
    category?: 'parking' | 'building'; 
    zone?: 'north' | 'south'; 
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
    
    lat?: number;
    lng?: number;

    status: 'available' | 'full' | 'closed' | 'low';
    isBookmarked: boolean;
    distance: number;
    distanceColor?: string; 
    hours: string;
    hasEVCharger: boolean;
    userTypes: string;
    price: number;
    priceUnit: string;
    supportedTypes: string[];
    schedule?: ScheduleItem[];
    images?: string[];
    note?: string; 
    promotion?: string; 
    description?: string; 

    
    displayStatusText?: string;
    displayAvailable?: string | number;
    displaySupportedTypes?: string;
}

export interface Booking {
    id: string;
    placeName: string;
    locationDetails: string; 
    bookingTime: Date;
    endTime: Date;
    status: 'pending' | 'pending_payment' | 'pending_invite' | 'confirmed' | 'completed' | 'cancelled' | 'active' | 'checked_in' | 'checked_out' | 'checked_in_pending_payment'; 
    statusLabel?: string; 
    price: number;
    discountBadge?: string; 
    carBrand: string;     
    licensePlate: string; 
    bookingType: 'hourly' | 'monthly_regular' | 'flat_24h' | 'daily' | 'monthly' | 'flat24'; 
    periodLabel?: string; 
    timeDetailLabel?: string; 

    
    itemKind?: 'reservation' | 'access_pass';
    passBuildingId?: string;
    passDoorIds?: string[];
    passDoorCount?: number;
    passExpiresAt?: Date | null;
    passRoomPreview?: string;

    
    building?: string;
    floor?: string;
    zone?: string;
    slot?: string;
    vehicleType?: string;
    carId?: string;
    dateLabel?: string;
    reservedAt?: Date;
    
    lat?: number;
    lng?: number;

    isInvite?: boolean;
    inviteCode?: string;
}

export type UserRole = 'User' | 'Host' | 'Visitor' | 'Admin';

export interface UserProfile {
    id?: string;
    name: string;
    phone: string;
    avatar: string;
    role: UserRole;
    role_level?: number; 
    lineId?: string;
    email?: string;
}

export interface Vehicle {
    id: number | string;
    model: string;
    licensePlate: string;
    province: string;
    image: string;
    isDefault: boolean;
    status: string;
    lastUpdate: string;
    color?: string; 
    type?: string;  
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
    role_prices?: { [key: string]: number };
}

export interface Asset {
    id: string;
    name: string;
    type: string;
    floor_number: number;
}

export interface RolePermission {
    role: UserRole;
}
