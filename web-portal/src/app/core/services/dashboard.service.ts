import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeoCluster {
    regionId: number;
    regionName: string;
    divisionId: number;
    divisionName: string;
    districtId: number;
    districtName: string;
    latitude: number;
    longitude: number;
    totalMachines: number;
    liveMachines: number;
    offlineMachines: number;
}

export interface DashboardStats {
    totalTrackedMachines: number;
    liveMachines: number;
    offlineMachines: number;
    geoClusters: GeoCluster[];
}

export interface TrackerMapPoint {
    imei: string;
    farmerName: string;
    farmerCnic: string;
    latitude: number;
    longitude: number;
    lastTimestamp: string;
    isLive: boolean;
    minutesAgo: number;
    speed: number;
    implementName: string;
    applicationNumber: string;
    districtName: string;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/dashboard`;

    getStats(regionId?: number, divisionId?: number, districtId?: number): Observable<DashboardStats> {
        let params = new HttpParams();
        if (regionId) params = params.set('regionId', regionId.toString());
        if (divisionId) params = params.set('divisionId', divisionId.toString());
        if (districtId) params = params.set('districtId', districtId.toString());
        return this.http.get<DashboardStats>(`${this.apiUrl}/stats`, { params });
    }

    getMapPoints(regionId?: number, divisionId?: number, districtId?: number): Observable<TrackerMapPoint[]> {
        let params = new HttpParams();
        if (regionId) params = params.set('regionId', regionId.toString());
        if (divisionId) params = params.set('divisionId', divisionId.toString());
        if (districtId) params = params.set('districtId', districtId.toString());
        return this.http.get<TrackerMapPoint[]>(`${this.apiUrl}/map-points`, { params });
    }
}
