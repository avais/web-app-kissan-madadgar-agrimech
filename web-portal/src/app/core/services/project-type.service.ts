import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjectType {
    id: number;
    name: string;
    description?: string;
    active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectTypeService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/project-types`;

    getProjectTypes(): Observable<ProjectType[]> {
        return this.http.get<ProjectType[]>(this.apiUrl);
    }
}
