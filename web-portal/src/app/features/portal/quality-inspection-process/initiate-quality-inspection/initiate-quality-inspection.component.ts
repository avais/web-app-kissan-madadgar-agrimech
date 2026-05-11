import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { FarmerApplicationService, FarmerApplicationPayload } from '../../../../core/services/farmer-application.service';
import { DistrictService, District } from '../../../../core/services/district.service';
import { AttachTrackerDialogComponent } from './attach-tracker-dialog.component';
import { ConfirmQICRequestDialogComponent } from './confirm-qic-request-dialog.component';
import { InspectionQICReportService } from '../../../../core/services/inspection-qic-report.service';
import { UserService } from '../../../../core/services/user.service';
import * as QRCode from 'qrcode';
import { forkJoin, map, switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-initiate-quality-inspection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatTableModule
  ],
  template: `
    <div class="initiate-page">
      <header class="page-header">
        <div class="h-main">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-group">
            <div class="sub-title">QIC PROCESS HUB</div>
            <h1>{{ currentStep() === 1 ? 'Initiate Quality Inspection' : 'Confirm Submission' }}</h1>
          </div>
        </div>
        
        <div class="stepper-summary">
          <div class="step" [class.active]="currentStep() >= 1">
            <div class="node">1</div>
            <span>Select Applications</span>
          </div>
          <div class="step-line"></div>
          <div class="step" [class.active]="currentStep() === 2">
            <div class="node">2</div>
            <span>Submission</span>
          </div>
        </div>
      </header>

       <div class="filter-belt glass-card" *ngIf="currentStep() === 1">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" 
                 placeholder="Search by Farmer Name, CNIC or App #...">
        </div>

        <mat-form-field appearance="outline" class="district-select luxe">
          <mat-label>Filter by District</mat-label>
          <mat-select [(ngModel)]="selectedDistrict" (selectionChange)="onDistrictChange()">
            <mat-option [value]="null" disabled>All Districts (Select One)</mat-option>
            <mat-option *ngFor="let dist of districts()" [value]="dist.id">
              {{ dist.name }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>location_on</mat-icon>
        </mat-form-field>

        <div class="stats-pill" *ngIf="!isLoading()">
          <span class="label">Eligible:</span>
          <span class="count">{{ totalRecords }}</span>
        </div>

        <button mat-flat-button class="bulk-request-btn" 
                [disabled]="selectedApps().size === 0"
                (click)="proceedToSubmission()">
          <mat-icon>arrow_forward</mat-icon>
          Review Selection ({{ selectedApps().size }})
        </button>
      </div>

       <div class="content-area">
        <div class="loading-overlay" *ngIf="isLoading()">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        </div>

        <!-- STEP 1: GRID VIEW -->
        <ng-container *ngIf="currentStep() === 1">
          <div class="cards-grid" *ngIf="!isLoading()">
            <div class="app-card" *ngFor="let app of applications()" 
                 [class.selected]="selectedApps().has(app.id!)"
                 (click)="toggleSelection(app)">
              <div class="card-header">
                  <div class="header-top">
                    <div class="app-id">
                      <div class="tracker-status-flag" *ngIf="!app.trackerImei">
                          <mat-icon>lock</mat-icon>
                          <span>Tracker Unlinked</span>
                      </div>
                      <span class="label">APPLICATION</span>
                      <span class="val">#{{ app.applicationNumber }}</span>
                    </div>
                  <div class="header-actions">
                      <button mat-flat-button class="attach-tracker-btn" 
                              [class.attached]="!!app.trackerImei"
                              (click)="attachTracker(app); $event.stopPropagation()">
                          <mat-icon>{{ app.trackerImei ? 'check_circle' : 'add_link' }}</mat-icon>
                          <span>{{ app.trackerImei ? 'Tracker Attached' : 'Attach Tracker' }}</span>
                      </button>
                      <div class="status-chip" [attr.data-status]="app.status">
                        <mat-icon>{{ app.status === 'QIC_DEFFERED' ? 'warning' : 'info' }}</mat-icon>
                        {{ app.status?.split('_')?.join(' ') }}
                      </div>
                    </div>
                  </div>
                <div class="implement-info-wrap">
                  <div class="implement-info">
                      <mat-icon>settings_suggest</mat-icon>
                      <span>{{ app.implementName }}</span>
                  </div>
                  <div class="impl-id" *ngIf="app.uniqueImplementId">
                      <span class="l">S/N:</span>
                      <span class="v">{{ app.uniqueImplementId }}</span>
                  </div>
                </div>
              </div>

              <div class="card-body">
                <div class="details-row">
                  <div class="icon-box"><mat-icon>person</mat-icon></div>
                  <div class="details">
                    <span class="label">Farmer Name / Father Name</span>
                    <span class="val">{{ app.farmerName }}</span>
                    <span class="sub-val" *ngIf="app.fatherName">S/O {{ app.fatherName }}</span>
                  </div>
                </div>
                <div class="details-row">
                  <div class="icon-box"><mat-icon>badge</mat-icon></div>
                  <div class="details">
                    <span class="label">CNIC Number</span>
                    <span class="val">{{ app.cnic }}</span>
                  </div>
                </div>
                <div class="details-row" *ngIf="app.trackerImei">
                  <div class="icon-box imei"><mat-icon>satellite_alt</mat-icon></div>
                  <div class="details">
                    <span class="label">Tracker IMEI</span>
                    <span class="val mono">{{ app.trackerImei }}</span>
                  </div>
                </div>
                
                <div class="card-qr" *ngIf="qrCodes()[app.id!]">
                  <img [src]="qrCodes()[app.id!]" alt="QR">
                  <span class="qr-text">SECURE ID</span>
                </div>
              </div>

              <div class="card-selection-layer" *ngIf="app.trackerImei">
                <mat-icon>{{ selectedApps().has(app.id!) ? 'check_circle' : 'add_circle_outline' }}</mat-icon>
                <span>{{ selectedApps().has(app.id!) ? 'SELECTED' : 'CLICK TO SELECT' }}</span>
              </div>

              <div class="card-blocked-layer" *ngIf="!app.trackerImei">
                 <div class="lock-circle"><mat-icon>lock_outline</mat-icon></div>
                 <span class="block-msg">ATTACH TRACKER FIRST</span>
                 <button mat-stroked-button class="inner-attach-btn" (click)="attachTracker(app); $event.stopPropagation()">
                     <mat-icon>add_link</mat-icon>
                     Attach Now
                 </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="!isLoading() && applications().length === 0">
            <mat-icon>find_in_page</mat-icon>
            <h3>No eligible applications found</h3>
            <p>Applications must be in BOOKED or QIC_DEFFERED status to initiate inspection.</p>
          </div>

          <div class="paginator-wrap" *ngIf="!isLoading() && totalRecords > 0">
            <mat-paginator [length]="totalRecords"
                           [pageSize]="pageSize"
                           [pageIndex]="pageIndex"
                           [pageSizeOptions]="[10, 20, 50]"
                           (page)="onPageChange($event)">
            </mat-paginator>
          </div>
        </ng-container>

        <!-- STEP 2: SUBMISSION TABLE -->
        <div class="submission-view" *ngIf="currentStep() === 2">
          <div class="submission-card glass-card">
            <div class="sub-header">
              <div class="left">
                <h2>Selected Applications for Inspection</h2>
                <p>Please review the list and IMEI numbers before final submission.</p>
              </div>
              <div class="right-actions">
                <button mat-stroked-button (click)="backToSelection()">
                  <mat-icon>arrow_back</mat-icon>
                  Back to Selection
                </button>
                <button mat-flat-button class="final-submit-btn" (click)="requestBulkQic()">
                  <mat-icon>verified</mat-icon>
                  Confirm & Submit ({{ selectedApps().size }})
                </button>
              </div>
            </div>

            <div class="table-container">
              <table mat-table [dataSource]="getSelectedAppsData()" class="luxe-table">
                <ng-container matColumnDef="appNo">
                  <th mat-header-cell *matHeaderCellDef [style.width.px]="150"> App # </th>
                  <td mat-cell *matCellDef="let element"> 
                    <span class="app-badge">#{{ element.applicationNumber }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="farmer">
                  <th mat-header-cell *matHeaderCellDef> Farmer Details </th>
                  <td mat-cell *matCellDef="let element">
                    <div class="cell-primaryText">{{ element.farmerName }}</div>
                    <div class="cell-subText">CNIC: {{ element.cnic }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="implement">
                  <th mat-header-cell *matHeaderCellDef> Machine / Implement </th>
                  <td mat-cell *matCellDef="let element">
                    <div class="cell-primaryText">{{ element.implementName }}</div>
                    <div class="cell-subText" *ngIf="element.uniqueImplementId">S/N: {{ element.uniqueImplementId }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="imei">
                  <th mat-header-cell *matHeaderCellDef> Assigned IMEI </th>
                  <td mat-cell *matCellDef="let element">
                    <div class="imei-pill">
                      <mat-icon>satellite_alt</mat-icon>
                      <span>{{ element.trackerImei }}</span>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['appNo', 'farmer', 'implement', 'imei']"></tr>
                <tr mat-row *matRowDef="let element; columns: ['appNo', 'farmer', 'implement', 'imei']"></tr>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes livePulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(3.5); opacity: 0; }
    }

    .initiate-page { padding: 40px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;
      .h-main { 
        display: flex; align-items: center; gap: 20px;
        .back-btn { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .title-group {
          .sub-title { font-size: 11px; font-weight: 800; color: #3b82f6; letter-spacing: 1px; }
          h1 { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
        }
      }
    }

    .stepper-summary {
      display: flex; align-items: center; gap: 12px;
      .step {
        display: flex; align-items: center; gap: 8px; opacity: 0.4;
        .node { width: 32px; height: 32px; border-radius: 50%; background: #94a3b8; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }
        span { font-size: 14px; font-weight: 700; color: #64748b; }
        &.active { opacity: 1; .node { background: #3b82f6; } span { color: #0f172a; } }
      }
      .step-line { width: 40px; height: 2px; background: #e2e8f0; }
    }

    .glass-card {
      background: white; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 10px 40px rgba(0,0,0,0.03);
    }

    .filter-belt {
      display: flex; align-items: center; gap: 24px; padding: 12px 24px; margin-bottom: 32px;
      .search-box {
        flex: 1; display: flex; align-items: center; gap: 12px; background: #f1f5f9; padding: 0 16px; border-radius: 12px; height: 48px;
        mat-icon { color: #94a3b8; }
        input { border: none; background: transparent; outline: none; width: 100%; font-size: 14px; font-weight: 600; color: #1e293b; }
      }
      .district-select.luxe { 
          width: 250px; margin-bottom: -1.25em; 
          ::ng-deep .mat-mdc-text-field-wrapper { background: #f8fafc !important; border-radius: 12px !important; }
      }
      .stats-pill {
        display: flex; align-items: center; gap: 8px; background: #0f172a; color: white; padding: 0 20px; border-radius: 12px; height: 48px;
        .label { font-size: 10px; font-weight: 800; opacity: 0.7; }
        .count { font-size: 16px; font-weight: 900; }
      }
      .bulk-request-btn {
        height: 48px; padding: 0 24px; border-radius: 12px; background: #3b82f6; color: white; font-weight: 800;
        &:disabled { background: #e2e8f0; color: #94a3b8; }
      }
    }

    .cards-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;
    }

    .app-card {
      background: white; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      &:hover { transform: translateY(-8px); border-color: #3b82f6; box-shadow: 0 20px 40px rgba(59,130,246,0.1); }
      &.selected { 
          border: 2px solid #3b82f6; 
          .card-selection-layer { opacity: 1; transform: translateY(0); }
          .header-actions { opacity: 0; pointer-events: none; }
      }

      .card-header {
        padding: 24px; border-bottom: 1px solid #f8fafc;
        .header-top { 
           display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;
           .app-id {
             display: flex; flex-direction: column;
             .label { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
             .val { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 900; color: #0f172a; }
           }
           .header-actions { 
             display: flex; align-items: center; gap: 8px; transition: opacity 0.3s; 
             position: relative; z-index: 10;
           }
           .live-track-btn {
              height: 32px; padding: 0 12px; background: #f0fdf4; color: #166534; border-radius: 10px;
              font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
              display: inline-flex !important; align-items: center !important; justify-content: center !important;
              border: 1px solid #dcfce7; line-height: 1; transition: all 0.3s;
              
              .live-dot {
                  width: 6px; height: 6px; background: #10b981; border-radius: 50%;
                  margin-left: 8px; position: relative;
                  &::after { content: ''; position: absolute; inset: -2px; border-radius: 50%; background: #10b981; animation: livePulse 1.8s infinite; }
              }
              &:hover { background: #ffffff; border-color: #10b981; }
          }
           .status-chip {
             padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 950; display: flex; align-items: center; gap: 6px; 
             background: #f1f5f9; color: #64748b; white-space: nowrap; text-transform: uppercase;
             mat-icon { font-size: 13px; width: 13px; height: 13px; flex-shrink: 0; }
             &[data-status="QIC_DEFFERED"] { background: #fee2e2; color: #ef4444; }
             &[data-status="BOOKED"] { background: #dcfce7; color: #10b981; }
           }
        }
         .attach-tracker-btn {
             height: 32px; padding: 0 12px; background: #0f172a; color: white; border-radius: 10px;
             font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
             display: inline-flex !important; align-items: center !important; justify-content: center !important;
             gap: 6px; line-height: 1; transition: all 0.3s;
             mat-icon { font-size: 16px; width: 16px; height: 16px; margin: 0; }
             &:hover { background: #3b82f6; transform: scale(1.05); }
             &.attached { background: #10b981; &:hover { background: #059669; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); } }
         }

        .implement-info {
           display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; color: #10b981; background: #f0fdf4; padding: 8px 16px; border-radius: 12px; width: fit-content;
           mat-icon { font-size: 20px; width: 20px; height: 20px; }
        }
      }

      .card-body {
        padding: 24px; position: relative;
        .details-row {
          display: flex; gap: 16px; margin-bottom: 16px;
          .icon-box {
            width: 36px; height: 36px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b;
            mat-icon { font-size: 18px; width: 18px; height: 18px; }
            &.imei { background: #eff6ff; color: #3b82f6; }
          }
          .details {
            display: flex; flex-direction: column;
            .label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
            .val { font-size: 14px; font-weight: 700; color: #1e293b; }
            .sub-val { font-size: 11px; font-weight: 600; color: #64748b; }
            .mono { font-family: 'JetBrains Mono', monospace; color: #2563eb; }
          }
        }
        .card-qr {
          position: absolute; right: 24px; top: 24px; width: 80px; padding: 4px; background: white; border: 1px dashed #e2e8f0; border-radius: 8px; text-align: center;
          img { width: 100%; }
          .qr-text { font-size: 7px; font-weight: 900; color: #cbd5e1; }
        }
      }

      .card-selection-layer {
        position: absolute; inset: 0; background: rgba(59, 130, 246, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: white; opacity: 0; transform: translateY(100%); transition: all 0.3s ease;
        mat-icon { font-size: 40px; width: 40px; height: 40px; }
        span { font-weight: 900; font-size: 14px; letter-spacing: 1px; }
      }

      .card-blocked-layer {
        position: absolute; inset: 0; background: rgba(255, 255, 255, 0.4); 
        backdrop-filter: blur(8px); display: flex; flex-direction: column; 
        align-items: center; justify-content: center; gap: 16px; color: #1e293b; 
        opacity: 0; pointer-events: none; transition: all 0.3s ease;
        z-index: 5;

        .lock-circle {
            width: 48px; height: 48px; background: #fee2e2; color: #ef4444; 
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            mat-icon { font-size: 24px; width: 24px; height: 24px; }
        }

        .block-msg { font-weight: 900; font-size: 13px; letter-spacing: 1px; color: #ef4444; }
        
        .inner-attach-btn {
            background: #0f172a; color: white; border-radius: 12px; height: 40px;
            font-weight: 800; font-size: 12px; border: none;
            &:hover { background: #3b82f6; }
        }
      }

      &:hover:not(.selected) .card-blocked-layer { 
          opacity: 1; pointer-events: auto; 
      }

      .tracker-status-flag {
          display: flex; align-items: center; gap: 4px; color: #ef4444; 
          font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px;
          mat-icon { font-size: 11px; width: 11px; height: 11px; }
      }

      .implement-info-wrap {
          display: flex; align-items: center; gap: 12px; margin-top: 4px;
          .impl-id {
              display: flex; gap: 4px; font-size: 10px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;
              .l { opacity: 0.6; }
          }
      }
    }

    .empty-state {
      text-align: center; padding: 80px; color: #94a3b8;
      mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.3; }
      h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    }

     .paginator-wrap { margin-top: 32px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; }

    .submission-view {
      animation: fadeIn 0.4s ease-out;
      .submission-card {
        padding: 32px;
        .sub-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;
          h2 { margin: 0 0 4px 0; font-size: 24px; font-weight: 800; color: #0f172a; }
          p { margin: 0; color: #64748b; font-size: 14px; }
          .right-actions { display: flex; gap: 16px; }
          .final-submit-btn { background: #10b981; color: white; height: 48px; padding: 0 24px; border-radius: 12px; font-weight: 800; }
        }
      }
    }

    .table-container { 
        border: 1px solid #f1f5f9; border-radius: 16px; overflow: hidden;
        .luxe-table { 
            width: 100%; 
            th { background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 16px 24px; }
            td { padding: 16px 24px; vertical-align: middle; border-bottom: 1px solid #f8fafc; }
        }
        .app-badge { background: #eff6ff; color: #3b82f6; padding: 6px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 13px; }
        .cell-primaryText { font-size: 14px; font-weight: 700; color: #1e293b; }
        .cell-subText { font-size: 11px; color: #94a3b8; font-weight: 600; }
        .imei-pill { 
            display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; color: #166534; padding: 8px 16px; border-radius: 10px; font-weight: 800;
            mat-icon { font-size: 16px; width: 16px; height: 16px; }
            span { font-family: 'JetBrains Mono', monospace; }
        }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class InitiateQualityInspectionComponent implements OnInit {
  private appService = inject(FarmerApplicationService);
  private districtService = inject(DistrictService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private reportService = inject(InspectionQICReportService);
  private userService = inject(UserService);

  applications = signal<FarmerApplicationPayload[]>([]);
  districts = signal<District[]>([]);
  selectedDistrict = null;
  searchQuery = '';

  isLoading = signal(true);
  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;

  selectedApps = signal<Set<number>>(new Set());
  selectedAppObjects = new Map<number, FarmerApplicationPayload>();
  qrCodes = signal<Record<number, string>>({});
  currentStep = signal(1);

  ngOnInit() {
    this.loadDistricts();
  }

  loadDistricts() {
    this.districtService.getDistricts().subscribe({
      next: (res) => {
        this.districts.set(res);
        if (res.length > 0 && !this.selectedDistrict) {
          this.selectedDistrict = res[0].id as any;
          this.loadApplications();
        }
      },
      error: (err) => console.error('Failed to load districts', err)
    });
  }

  onDistrictChange() {
    this.selectedApps.set(new Set()); 
    this.selectedAppObjects.clear();
    this.pageIndex = 0;
    this.loadApplications();
  }

  loadApplications() {
    this.isLoading.set(true);
    const statuses = ['BOOKED', 'QIC_DEFFERED'];

    this.appService.list(
      this.searchQuery,
      statuses,
      undefined, // divisionId
      this.selectedDistrict || undefined,
      this.pageIndex,
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.applications.set(res.content);
        this.totalRecords = res.totalElements;
        this.generateQRs(res.content);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load applications', err);
        this.isLoading.set(false);
      }
    });
  }

  async generateQRs(apps: FarmerApplicationPayload[]) {
    const qrMap: Record<number, string> = {};
    for (const app of apps) {
      if (!app.id) continue;
      const data = `PCAP-QIC-INIT\nApp: ${app.applicationNumber}\nFarmer: ${app.farmerName}\nCNIC: ${app.cnic}`;
      try {
        qrMap[app.id] = await QRCode.toDataURL(data, { margin: 1, width: 150 });
      } catch (e) { }
    }
    this.qrCodes.set(qrMap);
  }

  onSearchChange() {
    this.pageIndex = 0;
    this.loadApplications();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadApplications();
  }

  toggleSelection(app: FarmerApplicationPayload) {
    if (!app.id) return;
    if (!app.trackerImei) {
        this.snackBar.open('Please attach a tracker before selecting this application.', 'OK', { duration: 3000 });
        return;
    }
    const current = new Set(this.selectedApps());
    if (current.has(app.id)) {
      current.delete(app.id);
      this.selectedAppObjects.delete(app.id);
    } else {
      current.add(app.id);
      this.selectedAppObjects.set(app.id, app);
    }
    this.selectedApps.set(current);
  }

  getSelectedAppsData() {
    return Array.from(this.selectedAppObjects.values());
  }

  proceedToSubmission() {
    this.currentStep.set(2);
  }

  backToSelection() {
    this.currentStep.set(1);
  }

  requestBulkQic() {
    const selected = this.getSelectedAppsData();
    if (selected.length === 0) return;

    // 1. Determine Firm from selected applications
    const firmId = selected[0].bookedByFirmId;

    // 2. Fetch Convener from DB
    this.userService.getConvenerByFirm(firmId!).pipe(
      catchError(() => of(null)) // Handle case if no convener found
    ).subscribe(convener => {
      // 3. Open Confirmation Box
      const dialogRef = this.dialog.open(ConfirmQICRequestDialogComponent, {
        width: '450px',
        data: {
          title: 'Confirm QIC Request Submission',
          message: `You are about to send a bulk Quality Inspection Request for <strong>${selected.length}</strong> machines to the division convener. This will mark the applications as <strong>SENT TO QIC</strong>.`,
          convener: convener,
          confirmText: 'Submit Request',
          cancelText: 'Cancel'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.executeQicReportCreation(selected);
        }
      });
    });
  }

  private executeQicReportCreation(selected: FarmerApplicationPayload[]) {
    this.isLoading.set(true);
    const payload = {
      applicationIds: selected.map(a => a.id!),
      decisions: selected.reduce((acc, a) => ({ ...acc, [a.id!]: 'PENDING' }), {})
    };

    this.reportService.createReport(payload).subscribe({
      next: (report) => {
        this.snackBar.open(`QIC Report ${report.reportNumber} created successfully and sent to QIC.`, 'Success', { duration: 5000 });
        this.selectedApps.set(new Set());
        this.selectedAppObjects.clear();
        this.currentStep.set(1);
        this.loadApplications();
        // Redirect to reports
        setTimeout(() => this.router.navigate(['/portal/quality-inspection/reports']), 2000);
      },
      error: (err) => {
        console.error('Failed to create QIC report', err);
        this.isLoading.set(false);
        this.snackBar.open('Failed to initiate request. Please check server logs.', 'Error', { duration: 5000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/portal/applications']);
  }

  attachTracker(app: any) {
    const dialogRef = this.dialog.open(AttachTrackerDialogComponent, {
      data: { app },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      panelClass: 'full-screen-attach'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.pageIndex = 0;
        this.loadApplications();
      }
    });
  }

  locateImplement(app: any) {
    // This method is now legacy as "Live Tracking" was replaced by "Attach Tracker"
    // Keep it for now if needed elsewhere or remove if safe.
  }
}
