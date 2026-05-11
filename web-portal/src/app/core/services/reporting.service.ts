import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DistrictReport {
  srNo?: number; // Added locally for display
  district: string;
  booked: number;
  qicDone: number;
  dicDone: number;
  billsPending: number;
  superSeederBillsPending: number;
}

export interface FirmReport {
  firmName: string;
  booked: number;
  qicDone: number;
  dicDone: number;
  billsSubmitted: number;
  ssBillsSubmitted: number;
  billsCleared: number;
  ssBillsCleared: number;
}

export interface RegionalReport {
  firmName: string;
  district: string;
  booked: number;
  qicDone: number;
  dicDone: number;
  billsSubmitted: number;
  ssBillsSubmitted: number;
  billsCleared: number;
  ssBillsCleared: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/reporting`;

  getDistrictWiseReport(): Observable<DistrictReport[]> {
    return this.http.get<DistrictReport[]>(`${this.apiUrl}/district-wise`);
  }

  getFirmWiseReport(): Observable<FirmReport[]> {
    return this.http.get<FirmReport[]>(`${this.apiUrl}/firm-wise`);
  }

  getRegionalWiseReport(): Observable<RegionalReport[]> {
    return this.http.get<RegionalReport[]>(`${this.apiUrl}/regional-wise`);
  }
}
