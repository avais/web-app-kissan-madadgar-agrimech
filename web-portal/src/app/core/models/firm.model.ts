export interface Firm {
    id?: number;
    name: string;
    address: string;
    email: string;
    phone?: string;
    active: boolean;
    markazId?: number;
    markazName?: string;
    districtName?: string;
    divisionName?: string;
    interestedDistrictIds: number[];
    interestedImplementIds: number[];
    createNewUser?: boolean;
    hasUser?: boolean;
    totalBookings?: number;
    totalActiveBookings?: number;
    convenerId?: number;
    convenerName?: string;
}
