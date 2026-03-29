import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { FarmerApplicationService, FarmerApplicationPayload, PagedResponse } from '../../../core/services/farmer-application.service';
import { AuthService } from '../../../core/services/auth.service';
import { DivisionService, Division } from '../../../core/services/division.service';
import { DistrictService, District } from '../../../core/services/district.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-farmer-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSnackBarModule,
    FormsModule
  ],
  template: `
    <div class="page-container">
      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-badge">ADMINISTRATION PORTAL</div>
          <h1>Farmer Applications</h1>
          <p>Orchestrate and monitor the agricultural implement lifecycle across all districts.</p>
        </div>
        <div class="header-actions">
          <button *ngIf="hasRegisterFeature()" mat-flat-button class="premium-btn primary" routerLink="/portal/applications/register">
            <mat-icon>add_task</mat-icon> New Application
          </button>
          <button *ngIf="hasQicStartFeature()" mat-flat-button class="premium-btn primary qic-btn" routerLink="/portal/quality-inspection/initiate">
            <mat-icon>assignment_turned_in</mat-icon> Request Quality Inspection
          </button>
          <button mat-stroked-button class="premium-btn secondary">
            <mat-icon>cloud_download</mat-icon> Export Dataset
          </button>
        </div>
      </div>

      <!-- Stats Grid for Admin/Standard Users -->
      <div class="stats-grid" *ngIf="!isFirmUser() && !isDistrictOfficer()">
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon total"><mat-icon>analytics</mat-icon></div>
          <div class="stat-info">
            <label>Total Pipeline</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().total | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon draft"><mat-icon>assignment_turned_in</mat-icon></div>
          <div class="stat-info">
            <label>Eligible Candidates</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().eligible | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon active"><mat-icon>how_to_reg</mat-icon></div>
          <div class="stat-info">
            <label>Successfully Balloted</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().balloted | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon completed"><mat-icon>task_alt</mat-icon></div>
          <div class="stat-info">
            <label>Fully Completed</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
      </div>

      <!-- Stats Grid for District Officers -->
      <div class="stats-grid district-officer-grid" *ngIf="isDistrictOfficer()">
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon district"><mat-icon>location_on</mat-icon></div>
          <div class="stat-info">
            <label>District Pipeline</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().total | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Applications in your district</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon balloted"><mat-icon>how_to_reg</mat-icon></div>
          <div class="stat-info">
            <label>Balloted</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().balloted | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Success in ballot</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon booked"><mat-icon>shopping_bag</mat-icon></div>
          <div class="stat-info">
            <label>Booked</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().booked | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Firm associations</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon dic-pending"><mat-icon>pending_actions</mat-icon></div>
          <div class="stat-info">
            <label>DIC Pending</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicPending | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Awaiting delivery initiation</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon completed"><mat-icon>verified</mat-icon></div>
          <div class="stat-info">
            <label>Verified & Paid</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Process finalized</div>
        </div>
      </div>

      <!-- Stats Grid for Firm Users -->
      <div class="stats-grid compact-grid" *ngIf="isFirmUser()">
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">Booked</span>
          <div class="stat-content">
            <div class="stat-icon-mini booked"><mat-icon>shopping_bag</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().booked || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">QIC Requested</span>
          <div class="stat-content">
            <div class="stat-icon-mini requested"><mat-icon>drive_folder_upload</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().qicRequested || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">QIC Approved</span>
          <div class="stat-content">
            <div class="stat-icon-mini approved"><mat-icon>verified</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().qicApproved || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">DIC Pending</span>
          <div class="stat-content">
            <div class="stat-icon-mini dic"><mat-icon>pending_actions</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicPending || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">DIC Approved</span>
          <div class="stat-content">
            <div class="stat-icon-mini dicsuccess"><mat-icon>fact_check</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicApproved || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">Completed</span>
          <div class="stat-content">
            <div class="stat-icon-mini done"><mat-icon>task_alt</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
      </div>

      <!-- Redesigned Financial Intelligence Section -->
      <div class="financial-showcase" *ngIf="isFirmUser()">
        <div class="showcase-header">
           <mat-icon>payments</mat-icon>
           <span>Financial Intelligence Dashboard</span>
        </div>
        <div class="financial-grid-modern">
           <!-- Expected Revenue -->
           <div class="premium-finance-card expected" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Total Pipeline Value</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().expectedRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading()">Total value of all booked orders</div>
              </div>
           </div>

           <!-- Received Revenue -->
           <div class="premium-finance-card realized" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Revenue Realized</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().receivedRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading()">Subsidy & payments settled</div>
              </div>
           </div>

           <!-- Pending Revenue -->
           <div class="premium-finance-card pending" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Revenue Pipeline</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().pendingRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading()">Current value in verification stages</div>
              </div>
           </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filter-toolbar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search by Farmer Name, CNIC or App ID..." (input)="onSearchChange($event)">
        </div>
        <div class="filter-options">
          <mat-form-field appearance="outline" class="status-select">
            <mat-label>Lifecycle Status</mat-label>
            <mat-select (selectionChange)="onStatusChange($event.value)" value="all">
              <mat-option value="all">All Phases</mat-option>
              <mat-option value="ACCEPTED">Accepted</mat-option>
              <mat-option value="ELIGIBLE">Eligible</mat-option>
              <mat-option value="BALLOTED">Balloted</mat-option>
              <mat-option value="ALLOTED">Alloted</mat-option>
              <mat-option value="BOOKED">Booked</mat-option>
              <mat-option value="QIC_PENDING">QIC Pending</mat-option>
              <mat-option value="QIC_REQUESTED">QIC Requested</mat-option>
              <mat-option value="QIC_APPROVED">QIC Approved</mat-option>
              <mat-option value="COMPLETED">Completed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="status-select">
            <mat-label>Division</mat-label>
            <mat-select (selectionChange)="onDivisionChange($event.value)" [value]="'all'">
              <mat-option value="all">All Divisions</mat-option>
              <mat-option *ngFor="let div of divisions()" [value]="div.id">{{div.name}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="status-select">
            <mat-label>District</mat-label>
            <mat-select (selectionChange)="onDistrictChange($event.value)" [value]="'all'" [disabled]="!selectedDivision()">
              <mat-option value="all">All Districts</mat-option>
              <mat-option *ngFor="let dist of districts()" [value]="dist.id">{{dist.name}}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-icon-button class="refresh-btn" (click)="loadApplications()" [disabled]="isLoading()">
            <mat-icon [class.rotating]="isLoading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <mat-card class="premium-table-card">
        <mat-progress-bar mode="indeterminate" *ngIf="isLoading()" color="accent"></mat-progress-bar>
        
        <table mat-table [dataSource]="applications()">
          <!-- Farmer Column -->
          <ng-container matColumnDef="farmer">
            <th mat-header-cell *matHeaderCellDef> Applicant Details </th>
            <td mat-cell *matCellDef="let app">
              <div class="farmer-cell">
                <div class="avatar-orb">{{app.farmerName.charAt(0)}}</div>
                <div class="info">
                   <!-- Farmer Name -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'farmerName'">
                      <div class="name">{{app.farmerName}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'farmerName')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'farmerName'">
                      <input type="text" [(ngModel)]="editModel.farmerName" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>

                   <!-- Father Name (Optional Display) -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'fatherName'">
                      <div class="father-name" *ngIf="app.fatherName">S/O {{app.fatherName}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'fatherName')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'fatherName'">
                      <input type="text" [(ngModel)]="editModel.fatherName" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>

                   <!-- CNIC -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'cnic'">
                      <div class="cnic">{{app.cnic}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'cnic')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'cnic'">
                      <input type="text" [(ngModel)]="editModel.cnic" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Machinery Column -->
          <ng-container matColumnDef="machinery">
            <th mat-header-cell *matHeaderCellDef> Requested Asset </th>
            <td mat-cell *matCellDef="let app">
              <div class="machinery-cell">
                <mat-icon>agriculture</mat-icon>
                <span>{{app.implementName}}</span>
              </div>
            </td>
          </ng-container>

          <!-- Unique Implement ID Column -->
          <ng-container matColumnDef="uniqueImplementId">
            <th mat-header-cell *matHeaderCellDef> Asset ID </th>
            <td mat-cell *matCellDef="let app">
              <span class="unique-id-cell">{{app.uniqueImplementId || 'Pending'}}</span>
            </td>
          </ng-container>

          <!-- App ID & Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Application Ref </th>
            <td mat-cell *matCellDef="let app">
              <div class="ref-cell">
                <div class="app-id">{{app.applicationNumber}}</div>
                <div class="date">{{app.createdAt | date:'mediumDate'}}</div>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Pipeline Status </th>
            <td mat-cell *matCellDef="let app">
              <div class="status-badge" [attr.data-status]="app.status">
                <div class="dot"></div>
                <span>{{app.status.replace('_', ' ')}}</span>
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Control </th>
            <td mat-cell *matCellDef="let app">
              <div class="action-stack">
                <button mat-stroked-button class="review-action-btn" [routerLink]="['details', app.id]">
                  <span>View File</span>
                  <mat-icon>open_in_new</mat-icon>
                </button>
                <button *ngIf="hasBookingFeature() && app.status === 'ALLOTED'" 
                        mat-flat-button class="quick-book-btn" 
                        [routerLink]="['details', app.id]">
                  <mat-icon>bookmark_add</mat-icon>
                  <span>Book Now</span>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="premium-row"></tr>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading() && applications().length === 0">
          <mat-icon>manage_search</mat-icon>
          <h3>No applications found</h3>
          <p>Refine your search or status filters to locate records.</p>
        </div>

        <mat-paginator [length]="totalCount()"
                       [pageSize]="pageSize()"
                       [pageSizeOptions]="[5, 10, 25, 100]"
                       (page)="onPageChange($event)"
                       aria-label="Select page">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { 
      padding: 40px; 
      background: #fdfbf7; /* Matching the Premium Beige Theme */
      min-height: calc(100vh - 80px);
      display: flex; flex-direction: column; gap: 32px;
    }

    /* Header Styling */
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      .title-badge { font-size: 10px; font-weight: 800; color: #10b981; letter-spacing: 1px; margin-bottom: 8px; }
      h1 { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; }
      p { color: #64748b; font-size: 15px; margin-top: 8px; max-width: 500px; }
    }

    .header-actions { display: flex; gap: 16px; align-items: center; }
    .premium-btn {
      height: 48px; border-radius: 16px; padding: 0 24px; font-weight: 800; font-size: 14px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 10px; }
      &.primary { background: #10b981 !important; color: white !important; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4); }
      &.qic-btn { background: #4f46e5 !important; color: white !important; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4); }
      &.secondary { background: white; color: #64748b; border: 1.5px solid #e2e8f0 !important; }
    }

    /* Stats Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .compact-grid { grid-template-columns: repeat(6, 1fr); gap: 16px; }
    
    .stat-card {
      background: var(--card-bg); border-radius: 20px; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;
      border: 1px solid var(--border-color); transition: all 0.3s ease;
      position: relative; overflow: hidden; min-height: 110px;
      &:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05); }

      &.glass-morphism { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
      &.loading { pointer-events: none; opacity: 0.8; }

      .label { font-size: 11px; font-weight: 850; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; }

      .stat-content {
        display: flex; align-items: center; gap: 14px;
        .val { font-size: 28px; font-weight: 950; color: #1e293b; line-height: 1; }
      }

      .stat-icon-mini {
        width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
        &.booked { background: #e0f2fe; color: #0369a1; }
        &.pending { background: #fff7ed; color: #c2410c; }
        &.requested { background: #eef2ff; color: #4f46e5; }
        &.approved { background: #f0fdf4; color: #15803d; }
        &.dic { background: #fefce8; color: #a16207; }
        &.dicsuccess { background: #ecfeff; color: #0891b2; }
        &.done { background: #fdf4ff; color: #d946ef; }
      }

      .mini-loader {
        width: 16px; height: 16px; border: 2px solid rgba(16, 185, 129, 0.1); border-top: 2px solid #10b981;
        border-radius: 50%; animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    }

    /* Modern Financial Section */
    .financial-showcase {
      background: var(--card-bg); border-radius: 32px; padding: 24px; border: 1px solid var(--border-color);
      display: flex; flex-direction: column; gap: 20px;
      box-shadow: 0 10px 40px -15px rgba(0,0,0,0.03);
    }
    .showcase-header {
      display: flex; align-items: center; gap: 12px; color: #0f172a;
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: #6366f1; }
      span { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
    }
    .financial-grid-modern { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    
    .premium-finance-card {
      height: 100px; border-radius: 16px; position: relative; overflow: hidden; padding: 14px 20px;
      display: flex; flex-direction: column; justify-content: space-between;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      &:hover { transform: scale(1.02); }

      .card-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; }
      label { font-size: 9px; font-weight: 800; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .main-val { 
          font-size: 22px; font-weight: 900; margin: 0; display: flex; align-items: baseline;
          .currency-label { font-size: 11px; margin-right: 4px; font-weight: 700; opacity: 0.9; }
      }
      .sub-desc { font-size: 9px; font-weight: 600; opacity: 0.7; margin-top: 4px; }

      &.expected { 
          background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.3);
      }
      &.realized { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.3);
      }
      &.pending { 
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(245, 158, 11, 0.3);
      }

      .wave-bg {
        position: absolute; bottom: -20px; right: -20px; width: 120px; height: 120px;
        background: rgba(255,255,255,0.1); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        animation: wave 10s infinite linear;
      }
      @keyframes wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    }

    /* Filter Toolbar */
    .filter-toolbar {
      display: flex; justify-content: space-between; align-items: center; background: var(--card-bg);
      padding: 10px 10px 10px 24px; border-radius: 20px; border: 1px solid var(--border-color);
      flex-wrap: wrap; gap: 16px;
    }
    .search-box {
      display: flex; align-items: center; gap: 12px; flex: 1;
      mat-icon { color: #94a3b8; }
      input { border: none; font-size: 14px; font-weight: 600; color: #1e293b; width: 100%; outline: none; }
      input::placeholder { color: #cbd5e1; font-weight: 500; }
    }
    .filter-options { display: flex; align-items: center; gap: 16px; }
    .status-select { ::ng-deep .mat-mdc-form-field-wrapper { padding-bottom: 0; } width: 160px; }
    .refresh-btn { color: #94a3b8; .rotating { animation: rotate 1s infinite linear; } }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Table Styling */
    .premium-table-card { 
      border: none; border-radius: 28px; background: transparent !important; 
      box-shadow: none !important;
    }
    table { 
      width: 100%; border-collapse: separate; border-spacing: 0 16px; 
      background: transparent; margin-top: -16px;
    }
    th { 
      padding: 12px 24px !important; font-size: 11px; font-weight: 800; color: #94a3b8; 
      text-transform: uppercase; letter-spacing: 1px; border: none !important;
    }
    td { 
      padding: 20px 24px !important; background: var(--card-bg); border: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:first-child { border-radius: 20px 0 0 20px; border-left: 1px solid #f1f5f9 !important; }
      &:last-child { border-radius: 0 20px 20px 0; border-right: 1px solid #f1f5f9 !important; }
      border-top: 1px solid #f1f5f9 !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }

    .premium-row {
      cursor: pointer;
      &:hover td { 
        background: #fdfbf7; 
        transform: translateY(-2px);
        border-top-color: #10b98140 !important;
        border-bottom-color: #10b98140 !important;
        box-shadow: 0 10px 20px -10px rgba(0,0,0,0.05);
      }
    }

    /* Cell Components */
    .farmer-cell { 
      display: flex; align-items: center; gap: 14px;
      .avatar-orb { width: 40px; height: 40px; border-radius: 12px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 15px; }
      .info { .name { font-weight: 800; color: #1e293b; font-size: 14px; } .cnic { font-size: 11px; font-weight: 600; color: #94a3b8; } }
    }
    .machinery-cell { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #475569; mat-icon { font-size: 20px; width: 20px; height: 20px; color: #cbd5e1; } }
    .unique-id-cell { font-family: monospace; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 11px; }
    .ref-cell { .app-id { font-weight: 800; color: #0f172a; font-size: 13px; } .date { font-size: 11px; color: #94a3b8; font-weight: 600; } }

    /* Modern Status Badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800;
      white-space: nowrap; transition: all 0.3s ease; border: 1px solid transparent;
      .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
      
      &[data-status="ELIGIBLE"], &[data-status="ALLOTED"], &[data-status="BOOKED"], &[data-status="DIC_APPROVED"], &[data-status="ACCEPTED"] { background: #ecfdf5; color: #10b981; border-color: #d1fae5; .dot { background: #10b981; } }
      &[data-status="PENDING"], &[data-status="QIC_PENDING"], &[data-status="DIC_PENDING"] { background: #fffcf0; color: #f59e0b; border-color: #fef3c7; .dot { background: #f59e0b; } }
      &[data-status="QIC_REQUESTED"] { background: #eef2ff; color: #4f46e5; border-color: #e0e7ff; .dot { background: #4f46e5; } }
      &[data-status="QIC_IN_PROGRESS"], &[data-status="DIC_IN_PROGRESS"] { background: #eff6ff; color: #3b82f6; border-color: #dbeafe; .dot { background: #3b82f6; } }
      &[data-status="QIC_DEFFERED"], &[data-status="DIC_DEFERRED"], &[data-status="NOT_ELIGIBLE"], &[data-status="DEFERRED"] { background: #fef2f2; color: #ef4444; border-color: #fee2e2; .dot { background: #ef4444; } }
      &[data-status="COMPLETED"], &[data-status="SUBSIDY_PAID"] { background: #fdf4ff; color: #d946ef; border-color: #f5d0fe; .dot { background: #d946ef; } }
      &[data-status="BALLOTED"] { background: #eef2ff; color: #4f46e5; border-color: #e0e7ff; .dot { background: #4f46e5; } }
      
      /* Fallback for new/unknown statuses */
      &:not([data-status]) { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; .dot { background: #94a3b8; } }
    }

    .review-action-btn { 
      min-width: 110px; height: 36px; border-radius: 10px; 
      border: 1.5px solid var(--border-color) !important; 
      background: var(--card-bg) !important;
      color: #0f172a !important; 
      font-weight: 800 !important; 
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex; align-items: center; justify-content: center;

      span { margin-right: 8px; color: #0f172a; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64748b; }
      
      &:hover { 
        background: #f8fafc !important; 
        border-color: #10b981 !important; 
        color: #10b981 !important;
        span, mat-icon { color: #10b981; }
      }
    }

    .action-stack { display: flex; flex-direction: column; gap: 8px; }
    .quick-book-btn {
      height: 32px; border-radius: 8px; background: #4f46e5 !important; color: white !important;
      font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 0 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 4px; }
    }

    .empty-state { padding: 80px 20px; text-align: center; color: #94a3b8; mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 20px; } h3 { font-size: 20px; color: #1e293b; margin-bottom: 8px; } p { font-size: 14px; } }

    mat-paginator { background: transparent; border-top: 1px solid #f1f5f9; }

    .val-group { display: flex; align-items: center; gap: 4px; }
    .inline-edit-btn {
      width: 24px; height: 24px; line-height: 24px; opacity: 0; transition: all 0.2s;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: #10b981; }
      &:hover { background: #f0fdf4; }
    }
    .val-group:hover .inline-edit-btn { opacity: 1; }
    .inline-edit-box { display: flex; align-items: center; gap: 4px; margin: 2px 0; }
    .edit-btns { display: flex; gap: 0; button { width: 28px; height: 28px; line-height: 28px; mat-icon { font-size: 16px; width: 16px; height: 16px; } } }
    .premium-input-tiny { height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #1e293b; width: 120px; &:focus { border-color: #10b981; outline: none; } }
    .farmer-cell .info .father-name { font-size: 11px; font-weight: 600; color: #64748b; }
    .stats-grid.district-officer-grid {
      grid-template-columns: repeat(5, 1fr);
    }
    .stat-card.district-theme {
      background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 20px;
      display: flex; flex-direction: column; gap: 12px; transition: all 0.3s ease;
      &:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: #10b981; }
      .stat-icon.district { background: #f0f9ff; color: #0ea5e9; }
      .stat-icon.balloted { background: #fdf4ff; color: #d946ef; }
      .stat-icon.booked { background: #fff7ed; color: #f97316; }
      .stat-icon.dic-pending { background: #fefce8; color: #a16207; }
      .stat-icon.completed { background: #f0fdf4; color: #10b981; }
      .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
      .stat-footer { font-size: 11px; color: #94a3b8; font-weight: 600; }
    }
  `]
})
export class ManageFarmerApplicationsComponent implements OnInit {
  private applicationService = inject(FarmerApplicationService);
  private authService = inject(AuthService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private snackBar = inject(MatSnackBar);

  hasEditFeature = signal(false);
  editingId = signal<number | null>(null);
  editingField = signal<string | null>(null);
  editModel = { farmerName: '', fatherName: '', cnic: '' };

  divisions = signal<Division[]>([]);
  districts = signal<District[]>([]);
  selectedDivision = signal<number | null>(null);
  selectedDistrict = signal<number | null>(null);

  isFirmUser = signal(false);
  isDistrictOfficer = signal(false);

  displayedColumns = ['farmer', 'machinery', 'uniqueImplementId', 'date', 'status', 'actions'];
  hasRegisterFeature = signal(false);
  hasBookingFeature = signal(false);
  hasQicStartFeature = signal(false);
  isLoading = signal(false);
  isStatsLoading = signal(false);
  applications = signal<FarmerApplicationPayload[]>([]);
  stats = signal<any>({
    total: 0, eligible: 0, balloted: 0, completed: 0,
    booked: 0, qicRequested: 0, qicApproved: 0, dicPending: 0, dicApproved: 0,
    expectedRevenue: 0, receivedRevenue: 0, pendingRevenue: 0
  });

  displayedStats = signal<any>({
    total: 0, eligible: 0, balloted: 0, completed: 0,
    booked: 0, qicRequested: 0, qicApproved: 0, dicPending: 0, dicApproved: 0,
    expectedRevenue: 0, receivedRevenue: 0, pendingRevenue: 0
  });

  totalCount = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  currentSearch = '';
  currentStatus = 'all';

  ngOnInit() {
    this.checkFeatures();
    const userRole = this.authService.currentUser()?.role;
    this.isFirmUser.set(userRole === 'FIRM' || userRole === 'ROLE_FIRM');
    this.isDistrictOfficer.set(userRole === 'DISTRICT_OFFICER' || userRole === 'ROLE_DISTRICT_OFFICER');
    
    this.loadDivisions();
    this.loadApplications();
    this.loadStats();
  }

  loadStats() {
    this.isStatsLoading.set(true);
    this.applicationService.getSummaryCounts().subscribe({
      next: (counts) => {
        const newStats = {
          ...counts,
          total: counts.total || 0,
          eligible: counts.eligible || 0,
          balloted: counts.balloted || 0,
          completed: counts.completed || 0,
          booked: counts.booked || 0,
          qicRequested: counts.qicRequested || 0,
          qicApproved: counts.qicApproved || 0,
          dicPending: counts.dicPending || 0,
          dicApproved: counts.dicApproved || 0,
          expectedRevenue: counts.expectedRevenue || 0,
          receivedRevenue: counts.receivedRevenue || 0,
          pendingRevenue: counts.pendingRevenue || 0
        };

        this.stats.set(newStats);
        this.isStatsLoading.set(false);
        this.animateStats(newStats);
      },
      error: (err) => {
        console.error('Error fetching stats', err);
        this.isStatsLoading.set(false);
      }
    });
  }

  loadDivisions() {
    this.divisionService.getDivisions().subscribe({
      next: (divs) => this.divisions.set(divs),
      error: (err) => console.error('Error loading divisions', err)
    });
  }

  private animateStats(target: any) {
    const duration = 1500; // 1.5s
    const start = Date.now();
    const initial = { ...this.displayedStats() };

    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const currentDisp = { ...initial };
      Object.keys(target).forEach(key => {
        if (typeof target[key] === 'number') {
          currentDisp[key] = Math.floor(initial[key] + (target[key] - initial[key]) * easeProgress);
        }
      });

      this.displayedStats.set(currentDisp);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.displayedStats.set(target);
      }
    };

    requestAnimationFrame(step);
  }

  loadApplications() {
    this.isLoading.set(true);
    this.applicationService.list(
      this.currentSearch, 
      this.currentStatus, 
      this.selectedDivision() || undefined,
      this.selectedDistrict() || undefined,
      this.pageIndex(), 
      this.pageSize()
    ).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res: PagedResponse<FarmerApplicationPayload>) => {
        this.applications.set(res.content);
        this.totalCount.set(res.totalElements);
        // Stats are loaded independently via loadStats() for real-time accuracy across all pages
      },
      error: (err: any) => console.error('Error fetching applications', err)
    });
  }

  calculateStats(data: FarmerApplicationPayload[]) {
    // In a real scenario, stats would come from a summary endpoint
    // For now, we update them based on the response if possible, 
    // but usually total is provided by separate aggregated count
    this.stats.update(s => ({ ...s, total: this.totalCount() }));
  }

  onSearchChange(event: any) {
    this.currentSearch = event.target.value;
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onStatusChange(status: string) {
    this.currentStatus = status;
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onDivisionChange(divisionId: any) {
    if (divisionId === 'all') {
      this.selectedDivision.set(null);
      this.selectedDistrict.set(null);
      this.districts.set([]);
    } else {
      const id = Number(divisionId);
      this.selectedDivision.set(id);
      this.selectedDistrict.set(null);
      this.districtService.getDistrictsByDivision(id).subscribe({
        next: (districts) => this.districts.set(districts),
        error: (err) => console.error('Error loading districts', err)
      });
    }
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onDistrictChange(districtId: any) {
    this.selectedDistrict.set(districtId === 'all' ? null : Number(districtId));
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadApplications();
  }

  private checkFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures = JSON.parse(featuresStr);
        this.hasRegisterFeature.set(
          allFeatures.some((f: any) => (f.name === 'Register New Farmer Application' || f.name === 'Register Application') && f.active)
        );
        this.hasBookingFeature.set(
          allFeatures.some((f: any) => (f.name === 'Booking Process' || f.name.includes('Booking')) && f.active)
        );
        this.hasQicStartFeature.set(
          allFeatures.some((f: any) => (f.name === 'Quality Inspection Initiation Request. (QIC Start)') && f.active)
        );
        this.hasEditFeature.set(
          allFeatures.some((f: any) => (f.name === 'Edit Farmer Application' || f.name === 'Farmer Application Updation') && f.active)
        );
      } catch (e) {
        console.error('Error parsing features', e);
      }
    }
  }

  startEdit(app: any, field: string) {
    this.editingId.set(app.id);
    this.editingField.set(field);
    this.editModel = { 
      farmerName: app.farmerName, 
      fatherName: app.fatherName, 
      cnic: app.cnic 
    };
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingField.set(null);
  }

  saveEdit(app: any) {
    if (!this.editingId() || !app.id) return;
    
    const payload: any = {};
    const field = this.editingField();
    if (field) {
      payload[field] = (this.editModel as any)[field];
    }

    this.applicationService.update(app.id, payload).subscribe({
      next: (res) => {
        this.snackBar.open(`${field} updated successfully`, 'OK', { duration: 3000 });
        // Update local state
        Object.assign(app, res);
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.snackBar.open('Failed to update field', 'Error', { duration: 3000 });
      }
    });
  }
}
