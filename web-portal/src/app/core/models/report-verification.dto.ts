export interface ReportVerificationDto {
    type: 'QIC' | 'BILL' | 'DIC';
    reportNumber?: string;
    generatedAt?: string;
    firmName?: string;
    districtName?: string;
    divisionName?: string;
    status?: string;
    isValid: boolean;
    requiresCnic?: boolean;
    
    // For single app (DIC)
    applicationNumber?: string;
    farmerName?: string;
    farmerCnic?: string;
    implementName?: string;
    uniqueImplementId?: string;

    // For multiple apps (QIC/Bill)
    applications?: any[];
    totalApps?: number;
    passedCount?: number;
    rejectedCount?: number;
}
