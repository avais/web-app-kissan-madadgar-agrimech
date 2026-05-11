export interface User {
    id?: number;
    username: string;
    password?: string;
    roleIds: number[];
    roleNames?: string[];
    firmId?: number;
    firmName?: string;
    userType?: 'USER' | 'FIRM';
    markazId?: number;
    markazName?: string;
    districtId?: number;
    districtName?: string;
    divisionId?: number;
    divisionName?: string;
    regionId?: number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    designation?: string;
    active?: boolean;
    projectTypeIds?: number[];
    assignedDistrictIds?: number[];
    assignedDistrictNames?: string[];
}


