import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BookingRequest {
    applicationId: number;
    implementId: number;
    cdrNo: string;
    cdrBankName: string;
    cdrAmount: number;
    remarks: string;
    cdrFilePath?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BookingService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/bookings`;

    searchByCnic(cnic: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/search?cnic=${cnic}`);
    }

    getMyBookings(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/mine`);
    }

    processBooking(request: BookingRequest): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/process`, request);
    }
}
