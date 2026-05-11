import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  targetUrl?: string;
  createdAt: string;
  isRead: boolean;
  triggeredByName?: string;
  triggeredByPhone?: string;
}

export interface PaginatedNotifications {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  unreadCount = signal<number>(0);
  notifications = signal<Notification[]>([]);

  constructor() {
    this.refreshUnreadCount();
  }

  getNotifications(page: number = 0, size: number = 10, search?: string, type?: string): Observable<PaginatedNotifications> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) params = params.set('search', search);
    if (type && type !== 'ALL') params = params.set('type', type);
    
    return this.http.get<PaginatedNotifications>(this.apiUrl, { params }).pipe(
      tap(res => {
        if (page === 0) {
            this.notifications.set(res.content);
        } else {
            // Avoid duplicates if loading same page or something
            this.notifications.update(current => {
                const newIds = new Set(res.content.map(n => n.id));
                const filtered = current.filter(n => !newIds.has(n.id));
                return [...filtered, ...res.content];
            });
        }
      })
    );
  }

  refreshUnreadCount() {
    this.http.get<number>(`${this.apiUrl}/unread-count`).subscribe(count => {
      this.unreadCount.set(count);
    });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update(list => 
          list.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        this.refreshUnreadCount();
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      })
    );
  }
}
