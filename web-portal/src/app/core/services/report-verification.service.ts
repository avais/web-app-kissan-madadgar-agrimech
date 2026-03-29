import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { ReportVerificationDto } from '../models/report-verification.dto';

@Injectable({
  providedIn: 'root'
})
export class ReportVerificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/public`;

  verifyQic(reportNumber: string): Observable<ReportVerificationDto> {
    return this.http.get<ReportVerificationDto>(`${this.apiUrl}/verify-qic/${reportNumber}`);
  }

  verifyBill(reportNumber: string): Observable<ReportVerificationDto> {
    return this.http.get<ReportVerificationDto>(`${this.apiUrl}/verify-bill/${reportNumber}`);
  }

  verifyDic(applicationNumber: string): Observable<ReportVerificationDto> {
    return this.http.get<ReportVerificationDto>(`${this.apiUrl}/verify-dic/${applicationNumber}`);
  }
}
