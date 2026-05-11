import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FileUploadService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/api/files`;

    upload(file: File): Observable<HttpEvent<any>> {
        const formData: FormData = new FormData();
        formData.append('file', file);

        const req = new HttpRequest('POST', `${this.baseUrl}/upload`, formData, {
            reportProgress: true,
            responseType: 'json'
        });

        return this.http.request(req);
    }

    getFiles(): Observable<any> {
        return this.http.get(`${this.baseUrl}/files`);
    }

    download(fileName: string): Observable<Blob> {
        // Strip the prefix if it's already there to prevent doubling up
        const prefix = '/api/files/download/';
        if (fileName.startsWith(prefix)) {
            fileName = fileName.substring(prefix.length);
        }
        
        return this.http.get(`${this.baseUrl}/download/${fileName}`, {
            responseType: 'blob'
        });
    }
}
