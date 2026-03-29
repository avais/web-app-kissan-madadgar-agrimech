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

  getNotifications(page: number = 0, size: number = 10): Observable<PaginatedNotifications> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PaginatedNotifications>(this.apiUrl, { params }).pipe(
      tap(res => {
        if (page === 0) {
            this.notifications.set(res.content);
        } else {
            this.notifications.update(current => [...current, ...res.content]);
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
