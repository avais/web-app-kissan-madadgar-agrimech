import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Role, Feature } from '../models/role.model';
export type { Role, Feature };

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/roles`;

    getRoles(): Observable<Role[]> {
        return this.http.get<Role[]>(this.apiUrl);
    }

    getRoleById(id: number): Observable<Role> {
        return this.http.get<Role>(`${this.apiUrl}/${id}`);
    }

    createRole(role: Role): Observable<Role> {
        return this.http.post<Role>(this.apiUrl, role);
    }

    updateRole(id: number, role: Role): Observable<Role> {
        return this.http.put<Role>(`${this.apiUrl}/${id}`, role);
    }

    deleteRole(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
