import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Division {
    id?: number;
    name: string;
    nameUrdu: string;
    code: string;
    active: boolean;
    regionId: number;
    regionName?: string;
    districtsCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class DivisionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/divisions`;

    getDivisions(): Observable<Division[]> {
        return this.http.get<Division[]>(this.apiUrl);
    }

    getDivisionsByRegion(regionId: number): Observable<Division[]> {
        return this.http.get<Division[]>(`${this.apiUrl}/region/${regionId}`);
    }

    createDivision(division: Division): Observable<Division> {
        return this.http.post<Division>(this.apiUrl, division);
    }

    updateDivision(id: number, division: Division): Observable<Division> {
        return this.http.put<Division>(`${this.apiUrl}/${id}`, division);
    }

    deleteDivision(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
