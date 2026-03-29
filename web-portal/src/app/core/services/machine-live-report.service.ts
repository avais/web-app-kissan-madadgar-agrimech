import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/pagination.model';

export interface MachineLiveReportDto {
    imei: string;
    deviceMobileNumber: string;
    lastRecordTimeStamp: string;
    remainingBattery: number;
    currentLocationAddress: string;
    latitude?: number;
    longitude?: number;
    batteryVoltageMv?: number;
    externalVoltageMv?: number;
    externalBatteryPercentage?: number;
    resolvedAddress?: string;
    farmerName: string;
    cnic: string;
    farmerPhone: string;
    totalHoursFromNow: number;
}

@Injectable({
    providedIn: 'root'
})
export class MachineLiveReportService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/machine-live-report`;

    getLiveReports(page: number = 0, size: number = 10, filters: any = {}): Observable<PaginatedResponse<MachineLiveReportDto>> {
        let params = `?page=${page}&size=${size}`;
        if (filters.imei) params += `&imei=${filters.imei}`;
        if (filters.cnic) params += `&cnic=${filters.cnic}`;
        if (filters.intBatThreshold) params += `&intBatThreshold=${filters.intBatThreshold}`;
        if (filters.extVoltThreshold) params += `&extVoltThreshold=${filters.extVoltThreshold}`;
        return this.http.get<PaginatedResponse<MachineLiveReportDto>>(`${this.apiUrl}${params}`);
    }
}
