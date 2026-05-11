export interface Firm {
    id?: number;
    name: string;
    address: string;
    email: string;
    phone?: string;
    /** National Tax Number (FBR). */
    ntn?: string;
    /** Sales Tax Registration Number. */
    strn?: string;
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
