import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';

export interface ApplicationHistoryPayload {
    id: number;
    status: string;
    action: string;
    remarks: string;
    performedBy: string;
    performedByFullName?: string;
    performedByPhone?: string;
    timestamp: string;
    attachmentPath?: string;
}

export interface FarmerApplicationPayload {
    id?: number;
    applicationNumber?: string;
    farmerName: string;
    fatherName: string;
    contactNumber: string;
    cnic: string;
    address?: string;
    regionId: number;
    regionName?: string;
    divisionId: number;
    divisionName?: string;
    districtId: number;
    districtName?: string;
    markazId: number;
    markazName?: string;
    /** Region -> Division -> District -> Tehsil (markaz); from API when present. */
    locationBreadcrumb?: string;
    implementId: number;
    implementName?: string;
    totalCostPrice?: number;
    governmentShare?: number;
    farmerShare?: number;
    subsidyPercentage?: number;
    yearOfApplication: string;
    projectTypeId?: number | null;
    projectTypeName?: string;
    landArea: number;

    landUnit: string;
    tractorHP: string;
    tractorModel: string;
    allotmentNumber?: string;
    allotmentCategory?: string;
    allotmentQuotaNumber?: number;
    allotmentDate?: string;
    bookedByFirmId?: number;
    bookedByFirmName?: string;
    status: string;
    localDecision?: string;
    createdAt?: string;
    updatedAt?: string;
    trackerImei?: string;
    trackerBatchNumber?: number;
    qicRemarks?: string;
    trackerPictorialEvidence?: string;
    qicReportPictorialEvidence?: string;
    uniqueImplementId?: string;
    trackerVerified?: boolean;
    trackerVerifiedAt?: string;
    history?: ApplicationHistoryPayload[];
    farmerCnicFront?: string;
    farmerCnicBack?: string;
    allotmentLetterPath?: string;
    dicReportPath?: string;
    signedDicReportPath?: string;
    esScreeningReportPath?: string;
    signedEsScreeningReportPath?: string;
    subsidyReleaseProofPath?: string;
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CnicExistsResponse {
    exists: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class FarmerApplicationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/farmer-applications`;

    register(payload: FarmerApplicationPayload): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, payload);
    }

    checkCnicExists(cnic: string): Observable<CnicExistsResponse> {
        const params = new HttpParams().set('cnic', cnic);
        return this.http.get<CnicExistsResponse>(`${this.apiUrl}/exists-by-cnic`, { params });
    }

    getById(id: number): Observable<FarmerApplicationPayload> {
        return this.http.get<FarmerApplicationPayload>(`${this.apiUrl}/${id}`);
    }

    update(id: number, payload: Partial<FarmerApplicationPayload>): Observable<FarmerApplicationPayload> {
        return this.http.put<FarmerApplicationPayload>(`${this.apiUrl}/${id}`, payload);
    }

    ballot(id: number, category: string, ballotingDate: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/ballot`, { category, ballotingDate });
    }

    allot(id: number, allotmentNumber: string, category: string, quotaNumber: number, date: string, allotmentLetterPath?: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/allot`, {
            allotmentNumber, category, quotaNumber: quotaNumber.toString(), allotmentDate: date, allotmentLetterPath
        });
    }

    // List applications with pagination and filters
    list(
        search?: string,
        status?: string | string[],
        divisionId?: number,
        districtId?: number,
        page: number = 0,
        size: number = 10,
        sort: string = 'updatedAt,desc',
        regionIds?: number[],
        divisionIds?: number[],
        districtIds?: number[],
        firmIds?: number[]
    ): Observable<PagedResponse<FarmerApplicationPayload>> {
        let params = new HttpParams();
        if (search) params = params.set('search', search);

        if (status) {
            if (Array.isArray(status)) {
                status.forEach(s => params = params.append('statuses', s));
            } else if (status !== 'all') {
                params = params.set('statuses', status);
            }
        }

        if (divisionId) params = params.set('divisionId', divisionId.toString());
        if (districtId) params = params.set('districtId', districtId.toString());
        if (regionIds?.length) regionIds.forEach(id => params = params.append('regionIds', id.toString()));
        if (divisionIds?.length) divisionIds.forEach(id => params = params.append('divisionIds', id.toString()));
        if (districtIds?.length) districtIds.forEach(id => params = params.append('districtIds', id.toString()));
        if (firmIds?.length) firmIds.forEach(id => params = params.append('firmIds', id.toString()));

        params = params.set('page', page.toString());
        params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);
        return this.http.get<PagedResponse<FarmerApplicationPayload>>(this.apiUrl, { params });
    }

    getSummaryCounts(regionIds?: number[], divisionIds?: number[], districtIds?: number[], firmIds?: number[]): Observable<any> {
        let params = new HttpParams();
        if (regionIds?.length) regionIds.forEach(id => params = params.append('regionIds', id.toString()));
        if (divisionIds?.length) divisionIds.forEach(id => params = params.append('divisionIds', id.toString()));
        if (districtIds?.length) districtIds.forEach(id => params = params.append('districtIds', id.toString()));
        if (firmIds?.length) firmIds.forEach(id => params = params.append('firmIds', id.toString()));
        return this.http.get(`${this.apiUrl}/summary-counts`, { params });
    }

    private cachedInspections$: Observable<any[]> | null = null;
    private lastFilterKey: string = '';
    private cachedDetails$: Observable<any[]> | null = null;
    private lastDetailsKey: string = '';

    private cachedDashboard$: Observable<any> | null = null;
    private lastDashboardKey: string = '';

    getQualityInspectionDashboard(divisionId?: number, districtId?: number, firmId?: number, forceRefresh: boolean = false): Observable<any> {
        const currentFilterKey = `${divisionId}-${districtId}-${firmId}-dashboard`;

        if (forceRefresh || !this.cachedDashboard$ || this.lastDashboardKey !== currentFilterKey) {
            let params = new HttpParams();
            if (divisionId) params = params.set('divisionId', divisionId.toString());
            if (districtId) params = params.set('districtId', districtId.toString());
            if (firmId) params = params.set('firmId', firmId.toString());

            this.lastDashboardKey = currentFilterKey;
            this.cachedDashboard$ = this.http.get<any>(`${this.apiUrl}/quality-inspections/dashboard`, { params })
                .pipe(shareReplay(1));
        }
        return this.cachedDashboard$ || new Observable<any>();
    }

    getQualityInspections(divisionId?: number, districtId?: number, firmId?: number, forceRefresh: boolean = false): Observable<any[]> {
        const currentFilterKey = `${divisionId}-${districtId}-${firmId}`;

        if (forceRefresh || !this.cachedInspections$ || this.lastFilterKey !== currentFilterKey) {
            let params = new HttpParams();
            if (divisionId) params = params.set('divisionId', divisionId.toString());
            if (districtId) params = params.set('districtId', districtId.toString());
            if (firmId) params = params.set('firmId', firmId.toString());

            this.lastFilterKey = currentFilterKey;
            this.cachedInspections$ = this.http.get<any[]>(`${this.apiUrl}/quality-inspections`, { params })
                .pipe(shareReplay(1));
        }
        return this.cachedInspections$ || new Observable<any[]>();
    }

    clearCache() {
        this.cachedInspections$ = null;
        this.lastFilterKey = '';
        this.cachedDetails$ = null;
        this.lastDetailsKey = '';
        this.cachedDashboard$ = null;
        this.lastDashboardKey = '';
    }

    getInspectionDetails(districtId: number, firmId: number, forceRefresh: boolean = false): Observable<any[]> {
        const key = `${districtId}-${firmId}`;
        if (forceRefresh || !this.cachedDetails$ || this.lastDetailsKey !== key) {
            this.lastDetailsKey = key;
            this.cachedDetails$ = this.http.get<any[]>(`${this.apiUrl}/quality-inspections/details`, {
                params: { districtId: districtId.toString(), firmId: firmId.toString() }
            }).pipe(shareReplay(1));
        }
        return this.cachedDetails$;
    }

    uploadFile(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${environment.apiUrl}/api/files/upload`, formData);
    }

    submitQualityInspection(payload: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/api/quality-inspections/submit`, payload).pipe(
            tap(() => this.clearCache())
        );
    }

    getCalibrationData(applicationId: number, imei: string): Observable<any> {
        return this.http.get(`${environment.apiUrl}/api/quality-inspections/calibration-data`, {
            params: { applicationId: applicationId.toString(), imei }
        });
    }

    requestQualityInspection(applicationId: number, imei: string): Observable<any> {
        return this.http.post(`${environment.apiUrl}/api/quality-inspections/request`, {}, {
            params: { applicationId: applicationId.toString(), imei }
        }).pipe(
            tap(() => this.clearCache())
        );
    }

    updateTrackerImei(id: number, imei: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${id}/tracker-imei`, { imei }).pipe(
            tap(() => this.clearCache())
        );
    }

    requestBulkQualityInspection(applicationIds: number[]): Observable<any> {
        return this.http.post(`${environment.apiUrl}/api/quality-inspections/bulk-request`, { applicationIds }).pipe(
            tap(() => this.clearCache())
        );
    }

    verifyTracker(applicationId: number): Observable<any> {
        return this.http.post(`${environment.apiUrl}/api/quality-inspections/verify-tracker`, {}, {
            params: { applicationId: applicationId.toString() }
        });
    }

    getConcernConvener(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}/concern-convener`);
    }

    startDicInspection(id: number, dicReportPath: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/start-dic`, { dicReportPath });
    }

    approveDic(id: number, signedDicReportPath: string, signedEsScreeningReportPath: string, remarks?: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/approve-dic`, { signedDicReportPath, signedEsScreeningReportPath, remarks });
    }

    rejectDic(id: number, remarks: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/reject-dic`, { remarks });
    }

    deferDic(id: number, remarks: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/defer-dic`, { remarks });
    }

    updateFarmerCnic(id: number, farmerCnicFront: string, farmerCnicBack: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/farmer-cnic`, { farmerCnicFront, farmerCnicBack });
    }

    getDicApprovedCount(): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/dic-approved-count`);
    }

    releaseSubsidy(id: number, remarks?: string, proofPath?: string | null, releaseDate?: string): Observable<FarmerApplicationPayload> {
        return this.http.post<FarmerApplicationPayload>(`${this.apiUrl}/${id}/release-subsidy`, { remarks, proofPath, releaseDate });
    }

    requestFarmerShareRelease(): Observable<{message: string, reportUrl: string}> {
        return this.http.post<{message: string, reportUrl: string}>(`${this.apiUrl}/request-farmer-share`, {});
    }

    getDownloadUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${environment.apiUrl}${path}`;
    }

    downloadFileBlob(url: string): Observable<Blob> {
        return this.http.get(url, { responseType: 'blob' });
    }
}
