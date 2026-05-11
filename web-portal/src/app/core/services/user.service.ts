import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User } from '../models/user.model';
import { PaginatedResponse } from '../models/pagination.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/users`;

    getUsers(page: number = 0, size: number = 10, search?: string, sort: string = 'id,desc', roles: number[] = [], userType?: string): Observable<PaginatedResponse<User>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', sort);

        if (search) {
            params = params.set('search', search);
        }

        roles.forEach(roleId => {
            params = params.append('roleIds', roleId.toString());
        });

        if (userType) {
            params = params.set('userType', userType);
        }

        return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params });
    }

    getConveners(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/conveners`);
    }

    getUserById(id: number): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/${id}`);
    }

    createUser(user: User): Observable<User> {
        return this.http.post<User>(this.apiUrl, user);
    }

    updateUser(id: number, user: User): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/${id}`, user);
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getConvenerByFirm(firmId: number): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/convener/firm/${firmId}`);
    }
}
