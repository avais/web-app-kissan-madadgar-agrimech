import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { User } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';
import { finalize, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatChipsModule, RouterModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatSelectModule, FormsModule, MatPaginatorModule],
  template: `
    <div class="manage-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{loadingTitle()}}</h3>
            <p>{{loadingMessage()}}</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>System Users</h1>
          <p>Manage administrative personnel and system staff accounts.</p>
        </div>
        <div class="actions-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Search by name, email..." [value]="searchTerm()" (input)="onSearch($event)">
          </mat-form-field>
          <mat-form-field appearance="outline" class="role-select">
            <mat-label>Filter by Roles</mat-label>
            <mat-select multiple [ngModel]="selectedRoles()" (ngModelChange)="onRoleChange($event)">
              <mat-option *ngFor="let role of availableRoles()" [value]="role.id">{{role.name}}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" class="add-btn" routerLink="register">
            <mat-icon>person_add</mat-icon> Create New User
          </button>
        </div>
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
                    <span class="hierarchy" *ngIf="element.assignedDistrictNames?.length">
                      Districts: {{element.assignedDistrictNames.join(', ')}}
                    </span>
                    <span class="hierarchy" *ngIf="!element.assignedDistrictNames?.length && element.markazName">{{element.divisionName}} > {{element.districtName}} > {{element.markazName}}</span>
                    <span class="muted" *ngIf="!element.firmName && !element.markazName && !element.assignedDistrictNames?.length">Stand-alone Principal</span>
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
        
        <mat-paginator [length]="totalElements()" 
                       [pageSize]="pageSize()" 
                       [pageSizeOptions]="[10, 25, 50, 100]" 
                       [pageIndex]="pageIndex()"
                       (page)="onPageChange($event)"
                       showFirstLastButtons>
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .manage-container { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; padding: 24px; }
    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(4px);
      z-index: 100;
      border-radius: 20px;
    }
    .loader-container { 
      position: sticky; top: 40vh; transform: translateY(-50%);
      margin: 0 auto; width: fit-content;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      background: white; padding: 32px 48px; border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1); text-align: center;
      animation: popIn 0.3s ease-out;
    }
    .loader-text h3 { margin: 0; font-size: 18px; font-weight: 800; color: #1e293b; }
    .loader-text p { margin: 6px 0 0; font-size: 14px; color: #64748b; }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .actions-section { display: flex; gap: 16px; align-items: center; }
      .search-field { width: 260px; }
      .role-select { width: 240px; }
      .search-field ::ng-deep .mdc-text-field--outlined, .role-select ::ng-deep .mdc-text-field--outlined { --mdc-outlined-text-field-container-shape: 12px; }
      .search-field ::ng-deep .mat-mdc-text-field-wrapper { padding: 0; }
      .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper, .role-select ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
      .add-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #2196F3 !important; }
    }
    .table-card { border: none; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; margin-top: 16px; }
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
  private roleService = inject(RoleService);
  
  users = signal<User[]>([]);
  availableRoles = signal<Role[]>([]);
  selectedRoles = signal<number[]>([]);
  
  isLoading = signal(false);
  loadingTitle = signal('Loading');
  loadingMessage = signal('Please wait...');
  
  displayedColumns = ['username', 'contact', 'designation', 'roles', 'linked', 'status', 'actions'];

  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);
  searchTerm = signal('');

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.roleService.getRoles().subscribe(roles =>
      this.availableRoles.set(roles.filter(r => r.name.toUpperCase() !== 'FIRM'))
    );

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.pageIndex.set(0);
      this.loadUsers();
    });

    this.loadUsers();
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  onRoleChange(roles: number[]) {
    this.selectedRoles.set(roles);
    this.pageIndex.set(0);
    this.loadUsers();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  loadUsers() {
    this.loadingTitle.set('Loading Users');
    this.loadingMessage.set('Fetching user directory...');
    this.isLoading.set(true);
    this.userService.getUsers(this.pageIndex(), this.pageSize(), this.searchTerm(), 'id,desc', this.selectedRoles(), 'USER')
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.content);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.users.set([]);
          this.totalElements.set(0);
        }
      });
  }

  deleteUser(id: number) {
    if (confirm('Permanently remove this user? This action cannot be undone.')) {
      this.loadingTitle.set('Deleting User');
      this.loadingMessage.set('Removing user records and relationships...');
      this.isLoading.set(true);
      this.userService.deleteUser(id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe(() => this.loadUsers());
    }
  }
}
