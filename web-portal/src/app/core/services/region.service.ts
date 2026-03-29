import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Region {
    id?: number;
    name: string;
    nameUrdu: string;
    code: string;
    active: boolean;
    divisionsCount?: number;
    districtsCount?: number;
    markazCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class RegionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/regions`;

    getRegions(): Observable<Region[]> {
        return this.http.get<Region[]>(this.apiUrl);
    }

    createRegion(region: Region): Observable<Region> {
        return this.http.post<Region>(this.apiUrl, region);
    }

    updateRegion(id: number, region: Region): Observable<Region> {
        return this.http.put<Region>(`${this.apiUrl}/${id}`, region);
    }

    deleteRegion(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
