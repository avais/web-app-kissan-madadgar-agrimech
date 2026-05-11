import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/pagination.model';

export interface MachineLiveReportDto {
    imei: string;
    batchNumber?: number;
    deviceMobileNumber: string;
    lastRecordTimeStamp: string;
    /** ISO datetime when the API server stored this log row (gps_logs.insertion_date). */
    insertionDate?: string | null;
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
    firmName?: string;
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
        const imeiQ = (filters.imei ?? '').toString().trim();
        if (imeiQ) params += `&imei=${encodeURIComponent(imeiQ)}`;
        const cnicQ = (filters.cnic ?? '').toString().trim();
        if (cnicQ) params += `&cnic=${encodeURIComponent(cnicQ)}`;
        const phoneQ = (filters.farmerPhone ?? '').toString().trim();
        if (phoneQ) params += `&farmerPhone=${encodeURIComponent(phoneQ)}`;
        const firmQ = (filters.firmName ?? '').toString().trim();
        if (firmQ) params += `&firmName=${encodeURIComponent(firmQ)}`;
        if (filters.batchNumber != null) {
            params += `&batchNumber=${encodeURIComponent(String(filters.batchNumber))}`;
        }
        if (filters.intBatThreshold) params += `&intBatThreshold=${filters.intBatThreshold}`;
        if (filters.extVoltThreshold) params += `&extVoltThreshold=${filters.extVoltThreshold}`;
        const modes: string[] = filters.reportSourceModes?.length ? filters.reportSourceModes : ['GPS'];
        for (const m of modes) {
            params += `&reportSourceModes=${encodeURIComponent(m)}`;
        }
        if (filters.sortBy && filters.sortBy !== 'DEFAULT') {
            params += `&sortBy=${encodeURIComponent(filters.sortBy)}`;
            params += `&sortDirection=${encodeURIComponent(filters.sortDirection ?? 'DESC')}`;
        }
        if (filters.gpsTimestampFrom) {
            params += `&gpsTimestampFrom=${encodeURIComponent(filters.gpsTimestampFrom)}`;
        }
        if (filters.gpsTimestampTo) {
            params += `&gpsTimestampTo=${encodeURIComponent(filters.gpsTimestampTo)}`;
        }
        if (filters.serverInsertionFrom) {
            params += `&serverInsertionFrom=${encodeURIComponent(filters.serverInsertionFrom)}`;
        }
        if (filters.serverInsertionTo) {
            params += `&serverInsertionTo=${encodeURIComponent(filters.serverInsertionTo)}`;
        }
        if (filters.timeframeHours != null) {
            params += `&timeframeHours=${filters.timeframeHours}`;
        }
        return this.http.get<PaginatedResponse<MachineLiveReportDto>>(`${this.apiUrl}${params}`);
    }
}
