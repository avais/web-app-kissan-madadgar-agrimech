import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Firm } from '../models/firm.model';
import { PaginatedResponse } from '../models/pagination.model';

@Injectable({
    providedIn: 'root'
})
export class FirmService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/firms`;

    getFirms(page: number = 0, size: number = 10, query?: string): Observable<PaginatedResponse<Firm>> {
        let url = `${this.apiUrl}?page=${page}&size=${size}`;
        if (query) {
            url += `&name=${encodeURIComponent(query)}`;
        }
        return this.http.get<PaginatedResponse<Firm>>(url);
    }

    getFirmById(id: number): Observable<Firm> {
        return this.http.get<Firm>(`${this.apiUrl}/${id}`);
    }

    createFirm(firm: Firm): Observable<Firm> {
        return this.http.post<Firm>(this.apiUrl, firm);
    }

    updateFirm(id: number, firm: Firm): Observable<Firm> {
        return this.http.put<Firm>(`${this.apiUrl}/${id}`, firm);
    }
}
