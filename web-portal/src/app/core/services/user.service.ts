import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User } from '../models/user.model';
import { PaginatedResponse } from '../models/pagination.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/users`;

    getUsers(): Observable<User[]> {
        return this.http.get<PaginatedResponse<User>>(this.apiUrl).pipe(
            map(response => response.content)
        );
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
