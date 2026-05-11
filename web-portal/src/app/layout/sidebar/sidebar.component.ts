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
  placement: number;
  isParent?: boolean;
  subFeatures?: NavFeature[];
  isOpen?: boolean; // UI state
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
            <!-- Case 1: Item has sub-features (Dropdown) -->
            <ng-container *ngIf="nav.subFeatures && nav.subFeatures.length > 0; else singleLink">
                <div class="nav-group" [class.is-open]="nav.isOpen">
                    <button class="nav-link dropdown-toggle" (click)="toggleSubMenu(nav)">
                        <mat-icon>{{nav.icon || 'star'}}</mat-icon>
                        <span class="flex-1">{{nav.name}}</span>
                        <mat-icon class="arrow">{{nav.isOpen ? 'expand_less' : 'expand_more'}}</mat-icon>
                    </button>
                    <div class="sub-nav" *ngIf="nav.isOpen">
                        <ng-container *ngFor="let sub of nav.subFeatures">
                            <a *ngIf="sub.showInSideNav && sub.active" 
                               [routerLink]="sub.route" 
                               routerLinkActive="active" 
                               class="nav-link sub-link">
                                <mat-icon class="sub-dot">fiber_manual_record</mat-icon>
                                <span>{{sub.name}}</span>
                            </a>
                        </ng-container>
                    </div>
                </div>
            </ng-container>

            <!-- Case 2: Single Link -->
            <ng-template #singleLink>
                <a *ngIf="nav.showInSideNav && nav.active" 
                   [routerLink]="nav.route" 
                   routerLinkActive="active" 
                   class="nav-link">
                  <mat-icon>{{nav.icon || 'star'}}</mat-icon>
                  <span>{{nav.name}}</span>
                </a>
            </ng-template>
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
    .flex-1 { flex: 1; }
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
      padding: 0 12px;
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
      padding: 12px 14px;
      text-decoration: none;
      color: #64748b;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 600;
      font-size: 14px;
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;

      mat-icon { font-size: 20px; width: 20px; height: 20px; transition: all 0.3s; }
      .arrow { font-size: 18px; width: 18px; height: 18px; color: #cbd5e1; }
      
      &:hover {
        background: #f8fafc;
        color: #10b981;
        .arrow { color: #10b981; }
      }
      &.active {
        background: #10b98110;
        color: #10b981;
        position: relative;
        font-weight: 700;
      }
    }
    .sub-nav {
        margin-top: 2px;
        padding-left: 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-left: 1px solid #f1f5f9;
        margin-left: 24px;
    }
    .sub-link {
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 500;
        .sub-dot { font-size: 6px; width: 6px; height: 6px; color: #cbd5e1; margin-right: 4px; }
        &.active {
            .sub-dot { color: #10b981; }
            background: transparent;
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

  toggleSubMenu(nav: NavFeature) {
    nav.isOpen = !nav.isOpen;
  }

  private loadNavFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures: any[] = JSON.parse(featuresStr);
        
        // Build hierarchy logic
        const rootItems: NavFeature[] = [];
        const featureMap = new Map<number, NavFeature>();

        // Step 1: Create Map
        allFeatures.forEach(f => {
            featureMap.set(f.id, { ...f, subFeatures: f.subFeatures || [], isOpen: false });
        });

        // Step 2: Assemble Tree
        allFeatures.forEach(f => {
            const item = featureMap.get(f.id)!;
            // If it has a parent and the parent exists in the map, don't put it in root level
            // Note: We need to know who is a parent. 
            // In our structure, "Main Navigation" is a parent level 1.
            // Dashboard is a child of Main Navigation.
            // Strategic Reporting Hub is a child of Main Navigation.
            
            const hasParent = allFeatures.some(p => p.subFeatures && p.subFeatures.some((s: any) => s.id === f.id));
            // Actually, if the JSON is already nested, let's just pick the top level parents from the response.
            // Looking at FeatureDTO, it is nested.
        });

        // Step 1: Identify root-level parents (those without a parent)
        const rootParents = allFeatures
            .filter(f => !allFeatures.some(p => p.subFeatures && p.subFeatures.some((s: any) => s.id === f.id)))
            .filter(f => f.showInSideNav && f.active && f.name !== 'Edit Farmer Application' && f.name !== 'Farmer Application Updation');

        // Step 2: Sort and display all root parents with their children
        const sortedRoots = rootParents.sort((a, b) => (a.placement || 0) - (b.placement || 0));
        this.dynamicNavLinks.set(sortedRoots);

      } catch (e) {
        console.error('Error parsing user features', e);
      }
    }
  }
}
