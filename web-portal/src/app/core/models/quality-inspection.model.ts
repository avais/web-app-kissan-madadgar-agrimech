export interface FirmInspectionStats {
    firmId: number;
    firmName: string;
    totalApplications: number;
    qicPending: number;
    qicApproved: number;
    applications: FarmerApplication[];
}

export interface DistrictInspectionStats {
    districtId: number;
    districtName: string;
    booked: number;
    pending: number;
    approved: number;
    firms: FirmInspectionStats[];
}

export interface DivisionInspectionStats {
    divisionId: number;
    divisionName: string;
    booked: number;
    pending: number;
    approved: number;
    districts: DistrictInspectionStats[];
}

export interface QualityInspectionDashboard {
    divisions: DivisionInspectionStats[];
    totalBooked: number;
    totalPending: number;
    totalApproved: number;
}

export interface QualityInspectionProcess {
    divisionId: number;
    divisionName: string;
    districtId: number;
    districtName: string;
    firms: FirmInspectionStats[];
}

export interface FarmerApplication {
    id: number;
    applicationNumber: string;
    farmerName: string;
    cnic: string;
    implementName: string;
    status: string;
    districtName: string;
    markazName: string;
    trackerImei?: string;
    uniqueImplementId?: string;
    fatherName?: string;
    contactNumber?: string;
    totalCostPrice?: number;
    governmentShare?: number;
    farmerShare?: number;
}
