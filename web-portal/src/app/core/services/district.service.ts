import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface District {
    id?: number;
    name: string;
    nameUrdu: string;
    code: string;
    latitude?: number;
    longitude?: number;
    active: boolean;
    divisionId: number;
    divisionName?: string;
    markazCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class DistrictService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/districts`;

    getDistricts(): Observable<District[]> {
        return this.http.get<District[]>(this.apiUrl);
    }

    getDistrictsByDivision(divisionId: number): Observable<District[]> {
        return this.http.get<District[]>(`${this.apiUrl}/division/${divisionId}`);
    }

    createDistrict(district: District): Observable<District> {
        return this.http.post<District>(this.apiUrl, district);
    }

    updateDistrict(id: number, district: District): Observable<District> {
        return this.http.put<District>(`${this.apiUrl}/${id}`, district);
    }

    deleteDistrict(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
