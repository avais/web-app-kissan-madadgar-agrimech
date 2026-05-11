import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = `${environment.apiUrl}/api/auth`;

    private _isLoggedIn = signal<boolean>(false);
    isLoggedIn = this._isLoggedIn.asReadonly();

    private _currentUser = signal<{ name: string, role: string } | null>(null);
    currentUser = this._currentUser.asReadonly();

    constructor() {
        const token = localStorage.getItem('clean_air_token');
        if (token) {
            this._isLoggedIn.set(true);
            const name = localStorage.getItem('user_name');
            const role = localStorage.getItem('user_role');
            if (name && role) {
                this._currentUser.set({ name, role });
            }
        }
    }

    getCaptcha(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/captcha/generate`);
    }

    resetPassword(body: { email: string; captchaId: string; captchaValue: string }): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, body);
    }

    login(credentials: { email: string, password: string, captchaId: string, captchaValue: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                if (response.token) {
                    this._isLoggedIn.set(true);
                    localStorage.setItem('clean_air_token', response.token);
                    if (response.features) {
                        localStorage.setItem('user_features', JSON.stringify(response.features));
                    }

                    const name = response.username || 'User';
                    const role = response.roles && response.roles.length > 0 
                        ? (response.roles.find((r: string) => r.startsWith('ROLE_')) || response.roles[0]) 
                        : 'Member';

                    localStorage.setItem('user_name', name);
                    localStorage.setItem('user_role', role);
                    this._currentUser.set({ name, role });

                    // Navigation logic: Go to Farmer Applications
                    let targetRoute = '/portal/applications';
                    const roleUpper = role.toUpperCase();
                    const isAnySuperAdmin = roleUpper.includes('SUPER_ADMIN') || (roleUpper.includes('SUPER') && roleUpper.includes('ADMIN')) || roleUpper.includes('ADMIN_DG_OFFICE') || roleUpper.includes('NESPAK');
                    
                    if (response.features && response.features.length > 0 && !isAnySuperAdmin) {
                        const hasApps = response.features.some((f: any) => f.route === '/portal/applications' || (f.subFeatures && f.subFeatures.some((s: any) => s.route === '/portal/applications')));
                        if (!hasApps) {
                            // Find first available sub-feature route
                            for (const f of response.features) {
                                if (f.route && f.route !== '#') {
                                    targetRoute = f.route;
                                    break;
                                }
                                if (f.subFeatures) {
                                    const sub = f.subFeatures.find((s: any) => s.route && s.route !== '#');
                                    if (sub) {
                                        targetRoute = sub.route;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    this.router.navigate([targetRoute]);
                }
            })
        );
    }

    logout() {
        this._isLoggedIn.set(false);
        this._currentUser.set(null);
        localStorage.clear();
        this.router.navigate(['/login']);
    }

    hasFeature(route: string): boolean {
        const featuresJson = localStorage.getItem('user_features');
        if (!featuresJson) return false;
        try {
            const features = JSON.parse(featuresJson);
            const check = (list: any[]): boolean => {
                for (const f of list) {
                    if (f.route === route) return true;
                    if (f.subFeatures && check(f.subFeatures)) return true;
                }
                return false;
            };
            return check(features);
        } catch (e) {
            return false;
        }
    }
}
