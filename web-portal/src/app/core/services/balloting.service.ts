import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponse } from './farmer-application.service';

export interface BallotingRecord {
    id?: number;
    ballotingYear: string;
    category: string;
    totalBeneficiaries: number;
    description?: string;
    status: string;
    createdBy?: string;
    createdAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BallotingService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/balloting`;

    create(payload: BallotingRecord): Observable<BallotingRecord> {
        return this.http.post<BallotingRecord>(this.apiUrl, payload);
    }

    getById(id: number): Observable<BallotingRecord> {
        return this.http.get<BallotingRecord>(`${this.apiUrl}/${id}`);
    }

    list(search?: string, page: number = 0, size: number = 10): Observable<PagedResponse<BallotingRecord>> {
        let params = new HttpParams();
        if (search) params = params.set('search', search);
        params = params.set('page', page.toString());
        params = params.set('size', size.toString());
        return this.http.get<PagedResponse<BallotingRecord>>(this.apiUrl, { params });
    }
}
