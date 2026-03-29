import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Feature } from '../models/role.model';
export type { Feature };

@Injectable({
    providedIn: 'root'
})
export class FeatureService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/features`;

    getFeatures(): Observable<Feature[]> {
        return this.http.get<Feature[]>(this.apiUrl);
    }

    getActiveParentFeatures(): Observable<Feature[]> {
        return this.http.get<Feature[]>(`${this.apiUrl}/active-parents`);
    }

    getFeatureById(id: number): Observable<Feature> {
        return this.http.get<Feature>(`${this.apiUrl}/${id}`);
    }

    createFeature(feature: Feature): Observable<Feature> {
        return this.http.post<Feature>(this.apiUrl, feature);
    }

    deleteFeature(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
