import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InspectionQICReportPayload {
    id?: number;
    reportNumber?: string;
    signedDocumentPath?: string;
    generatedDocumentPath?: string;
    generatedBillPath?: string;
    generatedAt?: string;
    status?: string;
    generatedByUserName?: string;
    generatedByUserId?: number;
    divisionName?: string;
    districtName?: string;
    firmName?: string;
    applicationIds?: number[];
    applications?: any[];
    decisions?: Record<number, string>;
    deferralReasons?: Record<number, string>;

    // Metadata
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    submittedBy?: string;
    submittedAt?: string;

    // Counts
    totalApps?: number;
    passedCount?: number;
    rejectedCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class InspectionQICReportService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/qic-reports`;

    createReport(payload: InspectionQICReportPayload): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/create`, payload);
    }

    submitReport(id: number, payload: InspectionQICReportPayload): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/submit`, payload);
    }

    getReport(id: number): Observable<InspectionQICReportPayload> {
        return this.http.get<InspectionQICReportPayload>(`${this.apiUrl}/${id}`);
    }

    getReportApplications(id: number, search: string = '', page: number = 0, size: number = 10): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}/applications`, {
            params: {
                search,
                page: page.toString(),
                size: size.toString(),
                sort: 'id,asc'
            }
        });
    }

    getAllReports(search: string = '', page: number = 0, size: number = 10): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/getAll`, {
            params: {
                search,
                page: page.toString(),
                size: size.toString(),
                sort: 'id,desc'
            }
        });
    }

    approveReport(id: number): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/approve`, {});
    }

    rejectReport(id: number, remarks: string = ''): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/reject`, {}, {
            params: { remarks }
        });
    }

    updateApplicationDecision(reportId: number, appId: number, decision: string, reason: string = ''): Observable<any> {
        return this.http.post(`${this.apiUrl}/${reportId}/applications/${appId}/decision`, {}, {
            params: { decision, reason }
        });
    }

    updateSignedDocument(id: number, filePath: string): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/document`, { signedDocumentPath: filePath });
    }

    updateGeneratedDocument(id: number, filePath: string): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/generated-document`, { generatedDocumentPath: filePath });
    }

    updateGeneratedBill(id: number, filePath: string): Observable<InspectionQICReportPayload> {
        return this.http.post<InspectionQICReportPayload>(`${this.apiUrl}/${id}/generated-bill`, { generatedBillPath: filePath });
    }
}
