import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Markaz {
    id?: number;
    name: string;
    nameUrdu: string;
    code: string;
    latitude?: number;
    longitude?: number;
    active: boolean;
    districtId: number;
    districtName?: string;
    boundary?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MarkazService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/markazin`;

    getMarkazin(): Observable<Markaz[]> {
        return this.http.get<Markaz[]>(this.apiUrl);
    }

    getMarkazByDistrict(districtId: number): Observable<Markaz[]> {
        return this.http.get<Markaz[]>(`${this.apiUrl}/district/${districtId}`);
    }

    createMarkaz(markaz: Markaz): Observable<Markaz> {
        return this.http.post<Markaz>(this.apiUrl, markaz);
    }

    updateMarkaz(id: number, markaz: Markaz): Observable<Markaz> {
        return this.http.put<Markaz>(`${this.apiUrl}/${id}`, markaz);
    }

    getMarkazById(id: number): Observable<Markaz> {
        return this.http.get<Markaz>(`${this.apiUrl}/${id}`);
    }

    deleteMarkaz(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
