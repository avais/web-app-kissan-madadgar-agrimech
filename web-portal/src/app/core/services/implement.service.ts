import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Implement } from '../models/implement.model';

@Injectable({
    providedIn: 'root'
})
export class ImplementService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/implements`;

    getAll(): Observable<Implement[]> {
        return this.http.get<Implement[]>(this.apiUrl);
    }

    getById(id: number): Observable<Implement> {
        return this.http.get<Implement>(`${this.apiUrl}/${id}`);
    }

    create(implement: Implement): Observable<Implement> {
        return this.http.post<Implement>(this.apiUrl, implement);
    }

    update(id: number, implement: Implement): Observable<Implement> {
        return this.http.put<Implement>(`${this.apiUrl}/${id}`, implement);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
