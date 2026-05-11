import { Component, OnInit, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { FarmerApplicationService, FarmerApplicationPayload } from '../../../../core/services/farmer-application.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, timer } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-subsidy-release-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="subsidy-dialog-container">
      <div class="dialog-header">
        <mat-icon>payments</mat-icon>
        <h2>Release Subsidy?</h2>
      </div>
      
      <div class="dialog-content">
        <p>Are you sure you want to mark the subsidy for <strong>{{ data.farmerName }}</strong> as Paid/Released? This action is irreversible.</p>
        
        <div class="date-section">
          <label>Subsidy Release Date (Required)</label>
          <input type="date" [(ngModel)]="releaseDate" class="date-input" required>
        </div>

        <div class="upload-section">
          <label>Payment Proof / Attachment (Optional)</label>
          <div class="proof-box" [class.has-file]="file" (click)="!file && fileInput.click()">
            <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none" accept=".pdf,image/*">
            <div class="placeholder" *ngIf="!file">
              <mat-icon>cloud_upload</mat-icon>
              <span>Upload payment receipt</span>
            </div>
            <div class="file-info" *ngIf="file">
              <mat-icon>check_circle</mat-icon>
              <span class="fname">{{ file.name }}</span>
              <button mat-icon-button (click)="removeFile($event)"><mat-icon>cancel</mat-icon></button>
            </div>
          </div>
        </div>

        <div class="remarks-section">
          <label>Remarks (Optional)</label>
          <textarea [(ngModel)]="remarks" placeholder="Enter any payment details..."></textarea>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" [disabled]="uploadState !== ''">Cancel</button>
        <button mat-flat-button color="primary" 
                [disabled]="!releaseDate || uploadState !== ''" 
                (click)="onConfirm()"
                class="release-btn">
          <span *ngIf="uploadState === ''">Yes, Release Payment</span>
          <div class="spin-wrap" *ngIf="uploadState !== ''">
             <mat-spinner diameter="16" color="accent" style="margin-right: 8px;"></mat-spinner>
             <span>{{ uploadState === 'UPLOADING' ? 'Uploading Proof...' : 'Finalizing Subsidy...' }}</span>
          </div>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .subsidy-dialog-container { padding: 12px; min-width: 380px; }
    .dialog-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #1e293b; 
      mat-icon { color: #10b981; font-size: 32px; width: 32px; height: 32px; } h2 { margin: 0; font-weight: 800; }
    }
    p { color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .upload-section, .date-section, .remarks-section { margin-bottom: 20px; 
      label { display: block; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    }
    .proof-box { 
      border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s;
      &:hover { border-color: #10b981; background: #f0fdf4; }
      &.has-file { border-style: solid; border-color: #10b981; background: #f0fdf4; cursor: default; }
      .placeholder { display: flex; align-items: center; justify-content: center; gap: 8px; color: #64748b; font-size: 13px; font-weight: 600; }
      .file-info { display: flex; align-items: center; gap: 8px; text-align: left; width: 100%; box-sizing: border-box;
        mat-icon { color: #10b981; flex-shrink: 0; } 
        .fname { flex: 1; font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        button { flex-shrink: 0; }
      }
    }
    .date-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 14px; box-sizing: border-box;
      outline: none; transition: border-color 0.3s; &:focus { border-color: #10b981; } background: #f8fafc; color: #1e293b; font-family: inherit;
    }
    textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 14px; min-height: 80px; resize: none; box-sizing: border-box;
      outline: none; transition: border-color 0.3s; &:focus { border-color: #10b981; } background: #f8fafc;
    }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
    .release-btn { background: #059669 !important; color: white !important; font-weight: 700; border-radius: 12px; padding: 0 24px; height: 44px; position: relative; min-width: 180px; overflow: hidden; }
    .release-btn:disabled { background: #94a3b8 !important; color: #f1f5f9 !important; cursor: not-allowed; }
    .spin-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #047857; font-size: 13px; }
  `]
})
export class SubsidyReleaseDialogComponent {
  remarks = '';
  file: File | null = null;
  releaseDate = new Date().toISOString().split('T')[0];
  uploadState = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<SubsidyReleaseDialogComponent>,
    private cdr: ChangeDetectorRef
  ) {}

  setUploadState(state: string) {
    this.uploadState = state;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.file = file;
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.file = null;
  }

  onCancel() { this.dialogRef.close(); }
  onConfirm() {
    if (this.data.onConfirm) {
      this.data.onConfirm(this.file, this.remarks, this.releaseDate, this);
    }
  }
}

@Component({
  selector: 'app-farmer-share-release',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSnackBarModule,
    FormsModule,
    MatTooltipModule,
    MatDialogModule,
    ConfirmationDialogComponent,
    MatProgressSpinnerModule,
    SubsidyReleaseDialogComponent
  ],
  template: `
    <div class="page-container">
      <div class="premium-processing-overlay" *ngIf="isProcessing()">
        <div class="processing-card">
          <div class="processing-header">
            <div class="header-icon">
              <mat-icon>payments</mat-icon>
              <div class="header-ring"></div>
            </div>
            <h2>Processing Bulk Subsidy Request</h2>
            <p>Please wait while we prepare documentation and finalize records</p>
          </div>

          <div class="progress-area">
            <div class="progress-details">
              <span>Request Lifecycle Progress</span>
              <span class="pct">{{ loadingProgress() }}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width.%]="loadingProgress()">
                <div class="progress-bar-shine"></div>
              </div>
            </div>
          </div>

          <div class="steps-flow">
            <div class="step-line-item" *ngFor="let step of loadingSteps; let i = index" 
                 [class.active]="i === currentStep()" 
                 [class.completed]="i < currentStep()">
              <div class="step-icon-wrap">
                <mat-icon *ngIf="i < currentStep()">check_circle</mat-icon>
                <div class="step-dot-point" *ngIf="i >= currentStep()"></div>
                <div class="step-connector" *ngIf="i < loadingSteps.length - 1"></div>
              </div>
              <span class="step-label-text">{{ step }}</span>
            </div>
          </div>

          <div class="processing-footer">
            <div class="live-pulse"></div>
            <span>System is executing your request pipeline...</span>
          </div>
        </div>
      </div>

      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-badge">FINANCIAL OPERATIONS</div>
          <h1>Farmer Share Release Requests</h1>
          <p>Monitor and initiate bulk subsidy release requests for DIC approved applications.</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button 
                  class="premium-btn primary subsidy-btn" 
                  (click)="onRequestFarmerShareRelease()" 
                  *ngIf="hasSubsidyRequestFeature()"
                  [disabled]="dicApprovedCount() === 0"
                  [matTooltip]="subsidyTooltip()"
                  matTooltipPosition="above">
            <mat-icon>payments</mat-icon> 
            <span class="btn-text">Request Bulk Release</span>
            <span class="premium-badge pulse" *ngIf="dicApprovedCount() > 0">{{dicApprovedCount()}}</span>
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card" [class.active]="currentStatus() === 'DIC_APPROVED'" (click)="onFilterStatus('DIC_APPROVED')">
          <div class="stat-icon pending"><mat-icon>hourglass_empty</mat-icon></div>
          <div class="stat-info">
            <label>Awaiting Request</label>
            <div class="val">{{dicApprovedCount()}}</div>
          </div>
        </div>
        <div class="stat-card" [class.active]="currentStatus() === 'SUBSIDY_REQUESTED'" (click)="onFilterStatus('SUBSIDY_REQUESTED')">
          <div class="stat-icon requested"><mat-icon>forward_to_inbox</mat-icon></div>
          <div class="stat-info">
            <label>Requested</label>
            <div class="val">{{subsidyRequestedCount()}}</div>
          </div>
        </div>
        <div class="stat-card" [class.active]="currentStatus() === 'SUBSIDY_PAID'" (click)="onFilterStatus('SUBSIDY_PAID')">
          <div class="stat-icon completed"><mat-icon>verified</mat-icon></div>
          <div class="stat-info">
            <label>Released/Paid</label>
            <div class="val">{{subsidyPaidCount()}}</div>
          </div>
        </div>
      </div>

      <mat-card class="premium-table-card">
        <mat-progress-bar mode="indeterminate" *ngIf="isLoading()" color="accent"></mat-progress-bar>
        
        <div class="table-scroll-wrap">
        <table mat-table [dataSource]="applications()" class="farmer-apps-table">
          <ng-container matColumnDef="farmer">
            <th mat-header-cell *matHeaderCellDef> Applicant </th>
            <td mat-cell *matCellDef="let app">
              <div class="farmer-cell">
                <div class="avatar-orb">{{app.farmerName.charAt(0)}}</div>
                <div class="info">
                  <div class="name">{{app.farmerName}}</div>
                  <div class="cnic">{{app.cnic}}</div>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="implement">
            <th mat-header-cell *matHeaderCellDef> Machine </th>
            <td mat-cell *matCellDef="let app">
              <div class="implement-cell">
                <div class="i-name">{{app.implementName}}</div>
                <div class="i-id">{{app.uniqueImplementId || 'N/A'}}</div>
                <div *ngIf="!isFirmRole() && app.bookedByFirmName" class="i-firm" matTooltip="Assigned Firm">
                   <mat-icon>business</mat-icon>
                   {{app.bookedByFirmName}}
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="share">
            <th mat-header-cell *matHeaderCellDef> Share Amount </th>
            <td mat-cell *matCellDef="let app">
              <div class="share-cell">
                <div class="amount">PKR {{app.farmerShare | number}}</div>
                <div class="label">Farmer's Contribution</div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let app">
              <div class="status-badge" [attr.data-status]="app.status">
                <div class="dot"></div>
                <span>{{ statusDisplayLabel(app.status) }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Date </th>
            <td mat-cell *matCellDef="let app">
              <div class="date-cell">
                {{(app.updatedAt || app.createdAt) | date:'mediumDate'}}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let app">
              <div class="actions-cell">
                <button mat-icon-button [routerLink]="['/portal/applications/details', app.id]" matTooltip="View Dossier">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="primary" 
                        *ngIf="app.status === 'SUBSIDY_REQUESTED' && hasReleaseSubsidyFeature()" 
                        (click)="onReleaseSubsidy(app)"
                        matTooltip="Release Subsidy">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="accent" 
                        *ngIf="(app.status === 'SUBSIDY_PAID' || app.status === 'COMPLETED') && getPaymentProofPath(app)" 
                        (click)="downloadProof(getPaymentProofPath(app))"
                        matTooltip="Download Payment Proof">
                  <mat-icon>download</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="premium-row"></tr>
        </table>
        </div>

        <div class="empty-state" *ngIf="!isLoading() && applications().length === 0">
          <mat-icon>payments</mat-icon>
          <h3>No records found</h3>
          <p>Applications will appear here once they are DIC Approved or Subsidy is requested.</p>
        </div>

        <mat-paginator [length]="totalCount()"
                      [pageSize]="pageSize"
                      [pageSizeOptions]="[10, 25, 50]"
                      (page)="onPageChange($event)"
                      aria-label="Select page">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; background: #f8fafc; min-height: 100vh; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
    .title-badge { font-size: 12px; font-weight: 800; color: #10b981; letter-spacing: 1.5px; margin-bottom: 8px; }
    h1 { font-size: 32px; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -1px; }
    p { color: #64748b; margin: 8px 0 0; font-size: 16px; }

    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px; }
    .stat-card { 
      background: white; padding: 24px; border-radius: 20px; display: flex; align-items: center; gap: 20px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.3s;
    }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .stat-card.active { border-color: #10b981; background: #f0fdf4; }
    .stat-icon { 
      width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .stat-icon.pending { background: #fffbeb; color: #d97706; }
    .stat-icon.requested { background: #eff6ff; color: #2563eb; }
    .stat-icon.completed { background: #f0fdf4; color: #10b981; }
    .stat-info label { display: block; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-info .val { font-size: 28px; font-weight: 900; color: #1e293b; }

    .premium-table-card { border-radius: 24px; border: none; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); overflow: hidden; }
    .table-scroll-wrap { overflow-x: auto; }
    .farmer-apps-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    
    .premium-row:hover { background: #f8fafc; }
    
    .farmer-cell { display: flex; align-items: center; gap: 12px; }
    .avatar-orb { 
      width: 40px; height: 40px; border-radius: 50%; background: #10b98110; color: #10b981;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
    }
    .info .name { font-weight: 700; color: #1e293b; }
    .info .cnic { font-size: 12px; color: #64748b; }
    
    .implement-cell .i-name { font-weight: 600; color: #1e293b; }
    .implement-cell .i-id { font-size: 12px; color: #64748b; font-family: monospace; }
    .implement-cell .i-firm { font-size: 11px; color: #4338ca; margin-top: 4px; display: flex; align-items: center; gap: 4px; font-weight: 600; }
    .implement-cell .i-firm mat-icon { font-size: 12px; width: 12px; height: 12px; }
    
    .share-cell .amount { font-weight: 700; color: #1e293b; color: #10b981; }
    .share-cell .label { font-size: 11px; color: #94a3b8; }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .status-badge .dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-badge[data-status="DIC_APPROVED"] { background: #fffbeb; color: #d97706; .dot { background: #d97706; } }
    .status-badge[data-status="SUBSIDY_REQUESTED"] { background: #eff6ff; color: #2563eb; .dot { background: #2563eb; } }
    .status-badge[data-status="SUBSIDY_PAID"] { background: #f0fdf4; color: #10b981; .dot { background: #10b981; } }

    .premium-btn {
      height: 48px; border-radius: 16px; padding: 0 24px; font-weight: 800; font-size: 14px; position: relative;
      mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 10px; }
      &.subsidy-btn { 
        padding: 0 32px 0 24px !important;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; 
        color: white !important; 
        box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5) !important;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        &:hover:not([disabled]) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 15px 30px -8px rgba(16, 185, 129, 0.6) !important;
          .premium-badge { transform: scale(1.2) rotate(10deg); }
        }
        &[disabled] { filter: grayscale(0.8); opacity: 0.6; }
      }
    }

    .premium-badge {
      position: absolute;
      top: -25px;
      right: -25px;
      background: #ef4444;
      color: white;
      min-width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4);
      border: 2px solid white;
      transition: all 0.3s ease;
      z-index: 10;

      &.pulse {
        animation: badgePulse 2s infinite;
      }
    }

    @keyframes badgePulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Processing Overlay */
    .premium-processing-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
    }
    .processing-card {
      background: white; width: 100%; max-width: 540px; padding: 48px; border-radius: 32px;
      text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .header-icon { position: relative; width: 80px; height: 80px; margin: 0 auto 24px; color: #10b981; }
    .header-icon mat-icon { font-size: 80px; width: 80px; height: 80px; }
    .header-ring {
      position: absolute; inset: -10px; border: 4px solid #10b98120; border-top-color: #10b981;
      border-radius: 50%; animation: spin 2s linear infinite;
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .progress-area { margin-bottom: 32px; }
    .progress-details { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px; }
    .progress-bar-track { height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; position: relative; }
    .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.5s ease; position: relative; }
    .progress-bar-shine { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shine 2s infinite; }
    @keyframes shine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

    .steps-flow { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
    .step-line-item { display: flex; align-items: center; gap: 16px; opacity: 0.4; transition: opacity 0.3s; }
    .step-line-item.active { opacity: 1; }
    .step-line-item.completed { opacity: 0.8; color: #10b981; }
    .step-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 24px; }
    .step-dot-point { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
    .step-line-item.active .step-dot-point { background: #10b981; transform: scale(1.5); }
    .step-connector { position: absolute; top: 24px; left: 11px; width: 2px; height: 16px; background: #e2e8f0; }

    .empty-state { text-align: center; padding: 64px; mat-icon { font-size: 64px; width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; } h3 { font-size: 20px; color: #1e293b; margin: 0 0 8px; } p { color: #64748b; margin: 0; } }
  `]
})
export class FarmerShareReleaseRequestsComponent implements OnInit {
  private service = inject(FarmerApplicationService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fileUploadService = inject(FileUploadService);

  applications = signal<FarmerApplicationPayload[]>([]);
  isLoading = signal(false);
  isProcessing = signal(false);
  totalCount = signal(0);
  pageSize = 10;
  currentPage = 0;
  currentStatus = signal<string>('DIC_APPROVED');

  dicApprovedCount = signal(0);
  subsidyRequestedCount = signal(0);
  subsidyPaidCount = signal(0);
  hasReleaseSubsidyFeature = signal(false);
  hasSubsidyRequestFeature = signal(false);

  displayedColumns = ['farmer', 'implement', 'share', 'status', 'date', 'actions'];

  isFirmRole(): boolean {
    const role = localStorage.getItem('user_role');
    return !!role && role.toUpperCase().includes('FIRM');
  }

  // Loading sequence for bulk processing
  loadingProgress = signal(0);
  currentStep = signal(0);
  loadingSteps = [
    'Scanning system for DIC approved dossiers...',
    'Aggregating farmer share contribution records...',
    'Generating bulk release authorization manifest (PDF)...',
    'Synchronizing ledger with agricultural field wing...',
    'Finalizing request lifecycle & updating statuses...'
  ];

  ngOnInit() {
    this.checkFeatures();
    this.loadCounts();
    this.loadApplications();
  }

  private checkFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures = JSON.parse(featuresStr);
        this.hasReleaseSubsidyFeature.set(
          allFeatures.some((f: any) => f.name === 'Release Subsidy' && f.active)
        );
        this.hasSubsidyRequestFeature.set(
          allFeatures.some((f: any) => f.name === 'Request Farmer Share Release' && f.active)
        );
      } catch (e) {
        console.error('Error parsing features', e);
      }
    }
  }

  loadCounts() {
    this.service.getSummaryCounts().subscribe(stats => {
      this.dicApprovedCount.set(stats.dicApproved || 0);
      this.subsidyRequestedCount.set(stats.subsidyRequested || 0);
      this.subsidyPaidCount.set((stats.subsidyPaid || 0) + (stats.completed || 0));
    });
  }

  loadApplications() {
    this.isLoading.set(true);
    this.service.list(undefined, this.currentStatus(), undefined, undefined, this.currentPage, this.pageSize)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(res => {
        this.applications.set(res.content);
        this.totalCount.set(res.totalElements);
      });
  }

  onFilterStatus(status: string) {
    this.currentStatus.set(status);
    this.currentPage = 0;
    this.loadApplications();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadApplications();
  }

  statusDisplayLabel(status: string): string {
    switch(status) {
      case 'DIC_APPROVED': return 'Awaiting Request';
      case 'SUBSIDY_REQUESTED': return 'Requested';
      case 'SUBSIDY_PAID': return 'Paid';
      case 'COMPLETED': return 'Finalized';
      default: return status;
    }
  }

  subsidyTooltip() {
    if (this.dicApprovedCount() === 0) return 'No applications are currently eligible for share release';
    return `Click to initiate share release request for ${this.dicApprovedCount()} farmers`;
  }

  onRequestFarmerShareRelease() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '440px',
      data: {
        title: 'Initiate Subsidy Release?',
        message: `This will generate a formal bulk request for ${this.dicApprovedCount()} applications and update their status. Are you sure you want to proceed?`,
        confirmText: 'Yes, Submit Request',
        cancelText: 'Cancel',
        icon: 'payments',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeBulkRequest();
      }
    });
  }

  private executeBulkRequest() {
    this.isProcessing.set(true);
    this.loadingProgress.set(5);
    this.currentStep.set(0);

    const stepInterval = setInterval(() => {
        if (this.currentStep() < this.loadingSteps.length - 1) {
            this.currentStep.update(s => s + 1);
            this.loadingProgress.update(p => p + 20);
        }
    }, 1200);

    this.service.requestFarmerShareRelease().subscribe({
      next: (res) => {
        clearInterval(stepInterval);
        this.loadingProgress.set(100);
        this.currentStep.set(this.loadingSteps.length);
        
        timer(1000).subscribe(() => {
          this.isProcessing.set(false);
          this.snack.open('Subisdy release request submitted successfully.', 'OK', { duration: 5000 });
          this.loadCounts();
          this.loadApplications();
          
          if (res.reportUrl) {
            const fullUrl = this.service.getDownloadUrl(res.reportUrl);
            this.service.downloadFileBlob(fullUrl).subscribe({
              next: (blob) => {
                const fileName = res.reportUrl.split('/').pop() || 'subsidy_request.pdf';
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              },
              error: (err) => {
                console.error('Download failed', err);
                this.snack.open('Request successful, but report download failed. Please try manual download from history.', 'OK', { duration: 5000 });
              }
            });
          }
        });
      },
      error: (err) => {
        clearInterval(stepInterval);
        this.isProcessing.set(false);
        this.snack.open(err.error?.message || 'Failed to initiate request', 'OK', { duration: 4000 });
      }
    });
  }

  getPaymentProofPath(app: FarmerApplicationPayload): string | undefined {
    if (app.subsidyReleaseProofPath) return app.subsidyReleaseProofPath;
    if (!app.history) return undefined;
    const releaseEvent = app.history.find(h => h.status === 'SUBSIDY_PAID' || h.action === 'SUBSIDY_RELEASED');
    return releaseEvent?.attachmentPath;
  }

  downloadProof(path: string | undefined) {
    if (!path) return;
    const url = this.service.getDownloadUrl(path);
    window.open(url, '_blank');
  }

  onReleaseSubsidy(app: FarmerApplicationPayload) {
    const dialogRef = this.dialog.open(SubsidyReleaseDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        farmerName: app.farmerName,
        onConfirm: (file: File | null, remarks: string, releaseDate: string, dialogInstance: SubsidyReleaseDialogComponent) => {
          const completeRelease = (proofPath: string | null) => {
            dialogInstance.setUploadState('FINALIZING');
            this.service.releaseSubsidy(app.id!, remarks, proofPath, releaseDate).subscribe({
              next: (updated) => {
                this.snack.open('Subsidy released successfully!', 'Success', { duration: 5000 });
                this.loadApplications();
                this.loadCounts();
                dialogRef.close(true);
              },
              error: (err) => {
                this.snack.open('Failed to release subsidy: ' + (err.error?.message || 'Server error'), 'Error', { duration: 5000 });
                dialogInstance.setUploadState('');
              }
            });
          };

          if (file) {
            dialogInstance.setUploadState('UPLOADING');
            this.fileUploadService.upload(file).subscribe({
              next: (event: any) => {
                if (event.type === HttpEventType.Response) {
                  const proofPath = event.body.fileName;
                  completeRelease(proofPath);
                }
              },
              error: (err) => {
                this.snack.open('File upload failed. Please try again.', 'Error', { duration: 5000 });
                dialogInstance.setUploadState('');
              }
            });
          } else {
            completeRelease(null);
          }
        }
      }
    });
  }
}
