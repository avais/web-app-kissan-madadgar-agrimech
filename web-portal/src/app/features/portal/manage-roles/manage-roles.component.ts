import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RoleService, Role } from '../../../core/services/role.service';
import { FeatureService, Feature } from '../../../core/services/feature.service';
import { finalize } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-manage-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="roles">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Organizing Role Hierarchy</h3>
            <p>Synchronizing permissions and governance protocols...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Manage Roles</h1>
          <p>Define and assign permissions for portal users.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="registerRole()">
          <mat-icon>add</mat-icon> Create New Role
        </button>
      </div>

      <div class="roles-grid" *ngIf="!isLoading()">
        <mat-card class="role-card" *ngFor="let role of roles()">
          <div class="role-header">
            <div class="icon-circle">
              <mat-icon>security</mat-icon>
            </div>
            <div class="role-title">
              <h3>{{role.name}}</h3>
              <div class="role-subtitle">
                <span class="level-badge">{{role.level || 'All Levels'}}</span>
                <span class="user-count">N/A Active Users</span>
              </div>
            </div>
          </div>
          
          <p class="description">Access level and system permissions for {{role.name}}.</p>
          
          <div class="permissions-container">
            <div *ngFor="let group of getGroupedFeatures(role)" class="feature-tile">
              <div class="tile-header">
                <div class="parent-icon" [style.color]="group.parent.color">
                  <mat-icon>{{group.parent.icon || 'folder'}}</mat-icon>
                </div>
                <span class="parent-name">{{group.parent.name}}</span>
              </div>
              <div class="tile-children">
                 <span class="child-chip" *ngFor="let sub of group.children">{{sub.name}}</span>
                 <span class="no-children" *ngIf="group.children.length === 0">Full Access</span>
              </div>
            </div>
            
            <div class="empty-permissions" *ngIf="role.features.length === 0">
              <mat-icon>layers_clear</mat-icon>
              <span>No features assigned</span>
            </div>
          </div>

          <div class="card-actions">
            <div>
              <button mat-button class="manage-btn" (click)="editRole(role)">Manage Permissions</button>
            </div>
            <div class="btn-group">
              <button mat-icon-button class="edit-btn" (click)="editRole(role)" title="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button class="delete-btn" (click)="deleteRole(role)" title="Delete"><mat-icon>delete_outline</mat-icon></button>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="roles().length === 0 && !isLoading()">
        <mat-icon>security</mat-icon>
        <h3>No Roles Defined</h3>
        <p>Start by creating the first administrative or operational role.</p>
        <button mat-stroked-button color="primary" (click)="registerRole()">Create First Role</button>
      </div>
    </div>
  `,
  styles: [`
    .roles { position: relative; display: flex; flex-direction: column; gap: 32px; min-height: 400px; }
    
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 32px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 16px; color: #64748b; margin: 4px 0 0; }
      .add-btn { height: 48px; border-radius: 14px; font-weight: 700; background-color: #4CAF50 !important; }
    }

    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px);
      z-index: 100; display: flex; align-items: center; justify-content: center;
      border-radius: 20px;
      .loader-container {
        display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
        .loader-text {
          h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
          p { color: #64748b; font-size: 14px; margin: 4px 0 0; }
        }
      }
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 32px;
    }
    
    .role-card {
      padding: 0; border: none; border-radius: 28px; 
      background: var(--card-bg); border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; flex-direction: column; overflow: hidden;

      &:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.06); border-color: #3b82f640; }

      .role-header { 
        padding: 28px 28px 0; display: flex; align-items: center; gap: 18px; margin-bottom: 20px; 
      }
      
      .icon-circle { 
        width: 58px; height: 58px; border-radius: 18px; background: #fff; color: #3b82f6;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.1);
        mat-icon { font-size: 30px; width: 30px; height: 30px; }
      }

      .role-title {
        h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px; }
        .role-subtitle { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .level-badge { 
          background: #3b82f615; color: #3b82f6; padding: 3px 10px; border-radius: 8px; 
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
        }
        .user-count { font-size: 12px; color: #94a3b8; font-weight: 500; }
      }

      .description { 
        padding: 0 28px; font-size: 14.5px; color: #64748b; line-height: 1.6; 
        margin: 0 0 24px; opacity: 0.9; 
      }
    }

    .permissions-container {
      padding: 0 28px 28px; flex-grow: 1;
      display: flex; flex-direction: column; gap: 16px; min-height: 120px;
      
      .feature-tile {
        background: var(--tile-bg); border-radius: 16px; padding: 16px;
        border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        
        .tile-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
          .parent-icon { mat-icon { font-size: 18px; width: 18px; height: 18px; } }
          .parent-name { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
        }
        
        .tile-children {
          display: flex; flex-wrap: wrap; gap: 6px;
          .child-chip {
            padding: 4px 10px; border-radius: 8px; background: #f8fafc;
            border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700;
            color: #475569; letter-spacing: 0.2px;
          }
          .no-children { font-size: 11px; color: #10b981; font-weight: 800; }
        }
      }

      .empty-permissions {
        height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; color: #cbd5e1; border: 2px dashed #f1f5f9; border-radius: 20px;
        mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.5; }
        span { font-size: 13px; font-weight: 500; font-style: italic; }
      }
    }

    .card-actions { 
      padding: 20px 28px; background: var(--card-bg); border-top: 1px solid var(--border-color);
      display: flex; justify-content: space-between; align-items: center; 
      
      .manage-btn { 
        color: #3b82f6; font-weight: 800; font-size: 14px; padding: 0;
        &:hover { color: #2563eb; background: none; }
      }
      
      .btn-group { 
        display: flex; gap: 8px; 
        .edit-btn { color: #94a3b8; &:hover { color: #3b82f6; background: #eff6ff; } }
        .delete-btn { color: #94a3b8; &:hover { color: #ef4444; background: #fef2f2; } }
      }
    }

    .empty-state {
      text-align: center; padding: 100px 40px; color: #64748b;
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.2; margin-bottom: 24px; }
      h3 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
      p { margin: 12px 0 32px; font-size: 16px; }
      button { height: 48px; border-radius: 12px; font-weight: 700; padding: 0 32px; }
    }
  `]
})
export class ManageRolesComponent implements OnInit {
  private roleService = inject(RoleService);
  private featureService = inject(FeatureService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  roles = signal<Role[]>([]);
  allParentFeatures = signal<Feature[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    // Load both roles and parent features
    this.featureService.getActiveParentFeatures().subscribe({
      next: (features) => {
        this.allParentFeatures.set(features);
        this.loadRoles();
      },
      error: () => {
        this.showNotification('Failed to load system features', 'error');
        this.loadRoles();
      }
    });
  }

  loadRoles() {
    this.isLoading.set(true);
    this.roleService.getRoles()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.roles.set(data),
        error: () => this.showNotification('Failed to load roles', 'error')
      });
  }

  registerRole() {
    this.router.navigate(['/portal/roles/register']);
  }

  editRole(role: Role) {
    this.router.navigate(['/portal/roles/edit', role.id]);
  }

  deleteRole(role: Role) {
    if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      this.isLoading.set(true);
      this.roleService.deleteRole(role.id!)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('Role deleted successfully', 'success');
            this.loadRoles();
          },
          error: () => this.showNotification('Failed to delete role', 'error')
        });
    }
  }

  getGroupedFeatures(role: Role) {
    const grouped: { parent: Feature, children: Feature[] }[] = [];

    this.allParentFeatures().forEach(parent => {
      const childrenInRole: Feature[] = [];

      const findSelectedDescendants = (feature: Feature) => {
        if (feature.subFeatures && feature.subFeatures.length > 0) {
          feature.subFeatures.forEach(sub => {
            if (role.features.some(rf => rf.id === sub.id)) {
              childrenInRole.push(sub);
            }
            findSelectedDescendants(sub);
          });
        }
      };

      findSelectedDescendants(parent);

      const isParentInRole = role.features.some(rf => rf.id === parent.id);

      if (isParentInRole || childrenInRole.length > 0) {
        grouped.push({ parent, children: childrenInRole });
      }
    });

    return grouped;
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
