import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatChipsModule, RouterModule, MatProgressSpinnerModule],
  template: `
    <div class="manage-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Managing Identities</h3>
            <p>Gathering user credentials and access levels...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>System Users</h1>
          <p>Manage administrative personnel and firm-linked accounts.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" routerLink="register">
          <mat-icon>person_add</mat-icon> Create New User
        </button>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="users()">
          <ng-container matColumnDef="username">
            <th mat-header-cell *matHeaderCellDef> Identity & Profile </th>
            <td mat-cell *matCellDef="let element"> 
                <div class="user-cell">
                    <div class="avatar" [class.firm]="element.userType === 'FIRM'">
                        <mat-icon>{{element.userType === 'FIRM' ? 'business_center' : 'person'}}</mat-icon>
                    </div>
                    <div class="user-info">
                        <span class="full-name">{{element.firstName}} {{element.lastName}}</span>
                        <span class="username">{{element.username}}</span>
                        <span class="type-badge" [class.staff]="element.userType !== 'FIRM'">
                            {{element.userType === 'FIRM' ? 'Firm Principal' : 'System Staff'}}
                        </span>
                    </div>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef> Contact No </th>
            <td mat-cell *matCellDef="let element"> {{element.phone || 'N/A'}} </td>
          </ng-container>

          <ng-container matColumnDef="designation">
            <th mat-header-cell *matHeaderCellDef> Designation </th>
            <td mat-cell *matCellDef="let element"> {{element.designation || 'N/A'}} </td>
          </ng-container>

          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef> Roles & Access </th>
            <td mat-cell *matCellDef="let element"> 
                <mat-chip-set>
                    <mat-chip *ngFor="let role of element.roleNames" class="role-chip">{{role}}</mat-chip>
                </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="linked">
            <th mat-header-cell *matHeaderCellDef> Context </th>
            <td mat-cell *matCellDef="let element"> 
                <div class="linked-cell">
                    <span class="entity" *ngIf="element.firmName">{{element.firmName}}</span>
                    <span class="hierarchy" *ngIf="element.markazName">{{element.divisionName}} > {{element.districtName}} > {{element.markazName}}</span>
                    <span class="muted" *ngIf="!element.firmName && !element.markazName">Stand-alone Principal</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let element">
                <span class="status-badge" [class.active]="element.active" [class.inactive]="!element.active">
                    {{element.active ? 'Active' : 'Locked'}}
                </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="primary" [routerLink]="['edit', element.id]"><mat-icon>settings</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteUser(element.id)"><mat-icon>delete_outline</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .manage-container { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; padding: 24px; }
    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px);
      z-index: 100; display: flex; align-items: center; justify-content: center;
      border-radius: 20px;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .add-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #2196F3 !important; }
    }
    .table-card { border: none; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    table { width: 100%; }
    .user-cell { display: flex; align-items: center; gap: 16px; padding: 12px 0; }
    .avatar { 
        width: 44px; height: 44px; background: #eff6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #3b82f6;
        &.firm { background: #fef2f2; color: #ef4444; }
    }
    .user-info { 
        display: flex; flex-direction: column; gap: 2px;
        .full-name { font-weight: 800; color: #1e293b; font-size: 15px; } 
        .username { font-size: 12px; color: #64748b; }
        .type-badge { font-size: 10px; font-weight: 800; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; width: fit-content; margin-top: 4px; text-transform: uppercase;
            &.staff { background: #ecfdf5; color: #065f46; }
        }
    }
    .linked-cell { display: flex; flex-direction: column; .entity { font-weight: 700; color: #334155; } .hierarchy { font-size: 11px; color: #94a3b8; } }
    .role-chip { font-size: 11px; font-weight: 700; height: 24px; background: #f1f5f9; }
    .status-badge { 
        padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
        &.active { background: #dcfce7; color: #166534; }
        &.inactive { background: #fee2e2; color: #991b1b; }
    }
    .muted { color: #cbd5e1; font-style: italic; }
  `]
})
export class ManageUsersComponent implements OnInit {
  private userService = inject(UserService);
  users = signal<User[]>([]);
  isLoading = signal(false);
  displayedColumns = ['username', 'contact', 'designation', 'roles', 'linked', 'status', 'actions'];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getUsers()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => this.users.set(data));
  }

  deleteUser(id: number) {
    if (confirm('Permanently remove this user? This action cannot be undone.')) {
      this.isLoading.set(true);
      this.userService.deleteUser(id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe(() => this.loadUsers());
    }
  }
}
