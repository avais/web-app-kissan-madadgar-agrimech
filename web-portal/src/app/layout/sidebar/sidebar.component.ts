import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface NavFeature {
  id: number;
  name: string;
  icon: string;
  route: string;
  showInSideNav: boolean;
  active: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="sidebar">
      <div class="logo-section">
        <mat-icon class="logo-icon">eco</mat-icon>
        <div class="logo-text-wrapper">
            <span class="logo-text">PunjabCleanAir</span>
            <span class="logo-subtext">Government of Punjab</span>
        </div>
      </div>

      <nav class="nav-links">

        <div class="nav-divider">GOVERNANCE & OPS</div>

        <!-- Dynamic Feature Links -->
        <ng-container *ngFor="let nav of dynamicNavLinks()">
            <a *ngIf="nav.showInSideNav && nav.active" 
               [routerLink]="nav.route" 
               routerLinkActive="active" 
               class="nav-link">
              <mat-icon>{{nav.icon || 'star'}}</mat-icon>
              <span>{{nav.name}}</span>
            </a>
        </ng-container>
      </nav>

      <div class="sidebar-footer">
        <div class="user-badge">
            <mat-icon>account_circle</mat-icon>
            <div class="user-info">
                <span class="username">Super Admin</span>
                <span class="role">System Governance</span>
            </div>
        </div>
        <button mat-button class="help-btn">
          <mat-icon>help_outline</mat-icon>
          <span>Support Center</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      height: 100vh;
      background: #ffffff;
      border-right: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      box-shadow: 4px 0 24px rgba(0,0,0,0.02);
    }
    .logo-section {
      padding: 32px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #10b981;
      .logo-icon { font-size: 36px; width: 36px; height: 36px; }
      .logo-text-wrapper { display: flex; flex-direction: column; }
      .logo-text { font-size: 22px; font-weight: 900; letter-spacing: -0.8px; color: #1e293b; }
      .logo-subtext { font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 1px; }
    }
    .nav-links {
      flex: 1;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }
    .nav-divider {
        padding: 24px 16px 8px;
        font-size: 11px;
        font-weight: 800;
        color: #94a3b8;
        letter-spacing: 1px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      text-decoration: none;
      color: #64748b;
      border-radius: 14px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 600;
      font-size: 14.5px;
      mat-icon { font-size: 22px; width: 22px; height: 22px; transition: all 0.3s; }
      
      &:hover {
        background: #f8fafc;
        color: #10b981;
        transform: translateX(4px);
      }
      &.active {
        background: #10b98115;
        color: #10b981;
        position: relative;
        &::after {
            content: '';
            position: absolute;
            left: 0;
            top: 12px;
            bottom: 12px;
            width: 4px;
            background: #10b981;
            border-radius: 0 4px 4px 0;
        }
      }
    }
    .sidebar-footer {
      padding: 16px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .user-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        mat-icon { color: #cbd5e1; font-size: 32px; width: 32px; height: 32px; }
        .user-info {
            display: flex;
            flex-direction: column;
            .username { font-size: 14px; font-weight: 700; color: #1e293b; }
            .role { font-size: 12px; color: #94a3b8; font-weight: 500; }
        }
    }
    .help-btn {
      width: 100%;
      text-align: left;
      justify-content: flex-start;
      border-radius: 10px;
      color: #64748b;
      font-weight: 600;
      font-size: 13px;
    }
  `]
})
export class SidebarComponent implements OnInit {
  dynamicNavLinks = signal<NavFeature[]>([]);

  ngOnInit() {
    this.loadNavFeatures();
  }

  private loadNavFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures: NavFeature[] = JSON.parse(featuresStr);
        // Filter features that are meant for side nav and are parents
        const navItems = allFeatures.filter(f => f.showInSideNav && f.active && f.name !== 'Edit Farmer Application' && f.name !== 'Farmer Application Updation');
        this.dynamicNavLinks.set(navItems);
      } catch (e) {
        console.error('Error parsing user features', e);
      }
    }
  }
}
