import { environment } from '@env/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../models/project.model';

@Injectable({
    providedIn: 'root'
})
export class ProjectService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/projects`;

    getProjects(): Observable<Project[]> {
        return this.http.get<Project[]>(this.apiUrl);
    }

    getProjectById(id: number): Observable<Project> {
        return this.http.get<Project>(`${this.apiUrl}/${id}`);
    }

    createProject(project: Project): Observable<Project> {
        return this.http.post<Project>(this.apiUrl, project);
    }

    updateProject(id: number, project: Project): Observable<Project> {
        return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
    }

    deleteProject(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
