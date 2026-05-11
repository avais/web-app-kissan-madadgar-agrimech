import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InspectionQICReportService } from '../../../../core/services/inspection-qic-report.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, filter, map } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../core/services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TrackerCalibrationDialogComponent } from '../qic-form/tracker-calibration-dialog.component';
import { QicRequestDialogComponent } from '../qic-form/qic-request-dialog.component';
import { DeferralRemarksDialogComponent } from '../inspection-details-view/deferral-remarks-dialog.component';
import { PassConfirmationDialogComponent } from '../inspection-details-view/pass-confirmation-dialog.component';
import * as QRCode from 'qrcode';
import { SubmitReportDialogComponent } from './submit-report-dialog.component';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { HttpEventType } from '@angular/common/http';
import { environment } from '@env/environment';
import { ReportStateService } from '../../../../core/services/report-state.service';

@Component({
  selector: 'app-inspection-report-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="report-view-container">
      <!-- PROMINENT PROGRESS OVERLAY FOR CRITICAL PROCESS (BILL GENERATION) -->
      <div class="critical-progress-overlay" *ngIf="isGeneratingBill()">
        <div class="overlay-card">
          <div class="icon-pulsate">
             <mat-icon>receipt_long</mat-icon>
          </div>
          <h2>Processing Consolidated Bill</h2>
          <p>Please do not close this window. This is a critical system operation.</p>
          
          <div class="progress-info">
             <span class="step-text">{{ billStep() }}</span>
             <mat-progress-bar mode="indeterminate" color="accent"></mat-progress-bar>
          </div>
          
          <div class="security-note">
             <mat-icon>security</mat-icon>
             <span>Secure Transaction in Progress</span>
          </div>
        </div>
      </div>
      <div class="glass-header">
        <div class="meta-strip">
          <div class="meta-item created-by">
            <mat-icon>person_add</mat-icon>
            <div class="meta-content">
              <span>Created By</span>
              <strong>{{ report()?.generatedByUserName || report()?.createdBy || 'System' }}</strong>
            </div>
          </div>
          <div class="meta-item created-at">
            <mat-icon>history</mat-icon>
            <div class="meta-content">
              <span>Created At</span>
              <strong>{{ report()?.createdAt | date:'medium' }}</strong>
            </div>
          </div>
          <div class="meta-separator"></div>
          <div class="meta-item submitted-by" *ngIf="report()?.submittedBy">
            <mat-icon>verified_user</mat-icon>
            <div class="meta-content">
              <span>Submitted By</span>
              <strong>{{ report()?.submittedBy }}</strong>
            </div>
          </div>
          <div class="meta-item submitted-at" *ngIf="report()?.submittedAt">
            <mat-icon>event_available</mat-icon>
            <div class="meta-content">
              <span>Submitted At</span>
              <strong>{{ report()?.submittedAt | date:'medium' }}</strong>
            </div>
          </div>
          <div class="meta-item last-updated" *ngIf="!report()?.submittedBy">
             <mat-icon>edit_note</mat-icon>
             <div class="meta-content">
               <span>Last Updated</span>
               <strong>{{ report()?.updatedAt | date:'shortTime' }} by {{ report()?.updatedBy || 'User' }}</strong>
             </div>
          </div>
        </div>

        <div class="main-header">
          <div class="header-left">
            <button mat-icon-button class="back-btn" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="report-title">
              <div class="id-meta">
                <span class="label">Report Id #</span>
                <span class="status-chip" 
                      [class.submitted]="reportStatus() === 'SUBMITTED'"
                      [class.sent-to-convener]="reportStatus() === 'SENT_TO_CONVENER'">
                  {{ reportStatus().split('_').join(' ') }}
                </span>
              </div>
              <h1>{{ reportId() }}</h1>
            </div>
          </div>
        </div>

        <!-- Horizontal Stats Strip -->
        <div class="stats-horizontal">
          <div class="luxe-stat total">
             <div class="stat-icon"><mat-icon>inventory_2</mat-icon></div>
             <div class="stat-info">
               <span class="stat-label">Total Machines</span>
               <span class="stat-val">{{ report()?.totalApps || 0 }}</span>
             </div>
          </div>
          <div class="luxe-stat passed">
             <div class="stat-icon"><mat-icon>check_circle</mat-icon></div>
             <div class="stat-info">
               <span class="stat-label">Passed Machines</span>
               <span class="stat-val">{{ report()?.passedCount || 0 }}</span>
             </div>
          </div>
          <div class="luxe-stat rejected">
             <div class="stat-icon"><mat-icon>cancel</mat-icon></div>
             <div class="stat-info">
               <span class="stat-label">Deferred Machines</span>
               <span class="stat-val">{{ report()?.rejectedCount || 0 }}</span>
             </div>
          </div>
        </div>
 
        <div class="toolbar-section-header">
           <mat-icon>bolt</mat-icon>
           <span>Operational Documents #</span>
        </div>

        <!-- Actions toolbar moved below Stats -->
        <div class="header-action-toolbar">
            <div class="toolbar-btns">
                <button mat-stroked-button class="toolbar-upload-btn" *ngIf="canUploadSignedReport() && allAppsDecided() && reportStatus() === 'SENT_TO_CONVENER' && !isDocumentUploaded()" (click)="fileInput.click()">
                   <mat-icon>cloud_upload</mat-icon>
                   <span>Upload QIC Signed Report</span>
                </button>
                <input #fileInput type="file" style="display: none" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg">
 
                <div class="uploaded-chip-box" *ngIf="isDocumentUploaded()">
                   <div class="info-side">
                       <mat-icon>verified</mat-icon>
                       <span>Download QIC Signed Report</span>
                   </div>
                   <button mat-icon-button class="dl-action-btn" (click)="downloadDocument()" matTooltip="Download QIC Signed Report">
                      <mat-icon>file_download</mat-icon>
                   </button>
                </div>
  
                <!-- BILLING SECTION -->
                <button mat-flat-button class="toolbar-bill-btn" 
                        *ngIf="canGenerateBill() && reportStatus().toUpperCase().trim() === 'APPROVED' && (report()?.passedCount || 0) >= 1 && !report()?.generatedBillPath" 
                        (click)="generateBill()" [disabled]="isGeneratingBill()">
                   <ng-container *ngIf="!isGeneratingBill()">
                      <mat-icon>receipt_long</mat-icon>
                      <span>Generate Bill</span>
                   </ng-container>
                   <ng-container *ngIf="isGeneratingBill()">
                      <mat-spinner diameter="18" color="accent"></mat-spinner>
                      <span>Please wait...</span>
                   </ng-container>
                </button>

                <div class="uploaded-chip-box bill" *ngIf="report()?.generatedBillPath">
                   <div class="info-side">
                       <mat-icon>payments</mat-icon>
                       <span>QIC Statement / Bill</span>
                   </div>
                   <button mat-icon-button class="dl-action-btn" (click)="downloadBill()" matTooltip="Download Generated Bill">
                      <mat-icon>file_download</mat-icon>
                   </button>
                </div>

                <div class="uploaded-chip-box invoice" *ngIf="report()?.generatedInvoicePath">
                   <div class="info-side">
                       <mat-icon>verified</mat-icon>
                       <span>Download Invoice</span>
                   </div>
                   <button mat-icon-button class="dl-action-btn" (click)="downloadInvoice()" matTooltip="Download sales tax invoice (for letterhead)">
                      <mat-icon>file_download</mat-icon>
                   </button>
                </div>
 
                <button mat-flat-button class="toolbar-submit-btn" *ngIf="!isConvener() && (reportStatus() === 'NOT_SUBMITTED' || reportStatus() === 'CREATED')" (click)="openSubmitConfirmation('submit')">
                   <mat-icon>send</mat-icon>
                   <span>Submit to Convener</span>
                </button>
 
                <!-- GENERATE QIC DRAFT BUTTON (BEFORE GENERATION) -->
                <button mat-flat-button class="toolbar-generate-btn" 
                        *ngIf="!isReportGenerated() && (allAppsDecided() || reportStatus() === 'SUBMITTED' || reportStatus() === 'APPROVED')" 
                        (click)="generateReport()" [disabled]="isGeneratingReport()">
                   <ng-container *ngIf="!isGeneratingReport()">
                     <mat-icon>description</mat-icon>
                     <span>Generate QIC Draft</span>
                   </ng-container>
                   <ng-container *ngIf="isGeneratingReport()">
                     <mat-spinner diameter="18"></mat-spinner>
                     <span>Please wait...</span>
                   </ng-container>
                </button>

                <!-- DOWNLOAD QIC CHIP BOX (AFTER GENERATION) -->
                <div class="uploaded-chip-box draft" *ngIf="isReportGenerated()">
                   <div class="info-side">
                       <mat-icon>verified</mat-icon>
                       <span>Download QIC</span>
                   </div>
                   <button mat-icon-button class="dl-action-btn" (click)="downloadGeneratedReport()" matTooltip="Download Generated QIC">
                      <mat-icon>file_download</mat-icon>
                   </button>
                </div>

                <button mat-flat-button class="toolbar-dic-btn" 
                        *ngIf="false && (reportStatus() === 'APPROVED' || reportStatus() === 'SENT_TO_CONVENER' || reportStatus() === 'SUBMITTED')"
                        (click)="generateDicReport()" [disabled]="isGeneratingReport()">
                    <mat-icon>assignment_turned_in</mat-icon>
                    <span>Download DIC Reports</span>
                </button>
            </div>
        </div>
      </div>

      <div class="content-area">
        <!-- Main Content Area -->
        <div class="main-content">
          <div class="table-card">
            <mat-progress-bar mode="indeterminate" color="primary" *ngIf="isLoadingApps() || isLoadingReport() || isGeneratingReport() || isGeneratingBill()"
                              style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; height: 3px;">
            </mat-progress-bar>

            <div class="table-actions" style="display: flex; justify-content: space-between; align-items: center;">
              <div class="left-actions" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="search-box">
                  <mat-icon>search</mat-icon>
                  <input type="text" placeholder="Search by Farmer Name or CNIC..." 
                         [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()">
                </div>
                
                <div class="mode-label">
                  <mat-icon>{{ viewMode() === 'table' ? 'list' : 'view_module' }}</mat-icon>
                  <span>Displaying {{ applications().length }} of {{ totalRecords }} applications in {{ viewMode() }} mode</span>
                </div>
              </div>

              <div class="right-actions">
                <div class="view-toggle-group">
                  <button type="button" class="toggle-btn" [class.active]="viewMode() === 'table'" (click)="onViewModeChange('table')" matTooltip="Switch to Table">
                    <mat-icon>table_chart</mat-icon>
                    <span *ngIf="viewMode() === 'table'">Table</span>
                  </button>
                  <button type="button" class="toggle-btn" [class.active]="viewMode() === 'cards'" (click)="onViewModeChange('cards')" matTooltip="Switch to Cards">
                    <mat-icon>grid_view</mat-icon>
                    <span *ngIf="viewMode() === 'cards'">Cards</span>
                  </button>
                </div>
                <button mat-flat-button class="toolbar-excel-btn" 
                        (click)="downloadExcelList()" 
                        matTooltip="Download applications in Excel format"
                        style="height: 48px; padding: 0 24px; border-radius: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; border: none !important; cursor: pointer;">
                    <mat-icon style="display: inline-flex; align-items: center; justify-content: center; height: 20px; width: 20px; font-size: 20px;">table_view</mat-icon>
                    <span style="line-height: 1; display: inline-flex; align-items: center;">Download Excel Report</span>
                </button>
              </div>
            </div>

            <!-- TABLE VIEW -->
            <table mat-table [dataSource]="applications()" class="luxe-table" *ngIf="viewMode() === 'table'" [class.loading-fade]="isLoadingApps() || isLoadingReport()">
              <ng-container matColumnDef="appNo">
                <th mat-header-cell *matHeaderCellDef>App No #</th>
                <td mat-cell *matCellDef="let app">#{{ app.applicationNumber }}</td>
              </ng-container>

              <ng-container matColumnDef="farmerName">
                <th mat-header-cell *matHeaderCellDef>Farmer Name</th>
                <td mat-cell *matCellDef="let app">
                  <div class="farmer-cell">
                    <strong>{{ app.farmerName }}</strong>
                    <span>{{ app.fatherName }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="cnic">
                <th mat-header-cell *matHeaderCellDef>Farmer CNIC</th>
                <td mat-cell *matCellDef="let app">{{ app.cnic }}</td>
              </ng-container>

              <ng-container matColumnDef="implementId">
                <th mat-header-cell *matHeaderCellDef>machine / implement Unique Id</th>
                <td mat-cell *matCellDef="let app" class="mono-text">{{ app.uniqueImplementId || 'N/A' }}</td>
              </ng-container>

              <ng-container matColumnDef="imei">
                <th mat-header-cell *matHeaderCellDef>Tracker IMEI</th>
                <td mat-cell *matCellDef="let app" class="mono-text">{{ app.trackerImei || 'N/A' }}</td>
              </ng-container>


              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let app">
                  <span class="status-badge" 
                        [class.passed]="app.localDecision === 'PASSED'" 
                        [class.rejected]="app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED'"
                        [class.pending]="app.localDecision !== 'PASSED' && app.localDecision !== 'DEFERRED' && app.localDecision !== 'DEFFERED'">
                    <mat-icon>{{ app.localDecision === 'PASSED' ? 'verified' : ((app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED') ? 'cancel' : 'schedule') }}</mat-icon>
                    {{ app.localDecision === 'PASSED' ? 'PASSED' : ((app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED') ? 'DEFERRED' : 'PENDING') }}
                  </span>
                  <div *ngIf="app.qicDeferralReason" class="deferral-hint">
                    Reason: {{ app.qicDeferralReason }}
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="history">
                <th mat-header-cell *matHeaderCellDef>History</th>
                <td mat-cell *matCellDef="let app">
                  <button mat-icon-button class="history-btn" (click)="viewAppHistory(app)" matTooltip="View Full History">
                    <mat-icon>history</mat-icon>
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Action</th>
                <td mat-cell *matCellDef="let app">
                  <div class="row-actions" *ngIf="isConvener() && reportStatus() === 'SENT_TO_CONVENER' && app.localDecision !== 'PASSED' && syncedApps().has(app.id!)">
                      <button mat-flat-button class="table-pass-btn" (click)="passAppQic(app)">
                          <mat-icon>verified</mat-icon>
                          Accept
                      </button>
                      <button mat-stroked-button class="table-defer-btn" (click)="deferAppQic(app)">
                          <mat-icon>cancel</mat-icon>
                          Defer
                      </button>
                  </div>
                  <div class="row-actions" *ngIf="app.localDecision === 'PASSED'">
                      <!-- DIC Report button removed from here periodically as requested -->
                  </div>
                  <div *ngIf="!syncedApps().has(app.id) && app.localDecision !== 'PASSED' && app.localDecision !== 'DEFERRED' && app.localDecision !== 'DEFFERED'" class="sync-hint">
                      Sync location to enable actions
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <!-- CARDS VIEW (Image 2 Aesthetic) -->
            <div class="cards-grid-layout" *ngIf="viewMode() === 'cards'" [class.loading-fade]="isLoadingApps() || isLoadingReport()">
                <div class="app-luxe-card" *ngFor="let app of applications()">
                    <div class="card-header-belt">
                        <div class="app-no-top-bar">
                            <div class="app-identifier">
                                <span class="lbl">APPLICATION</span>
                                <span class="val">#{{ app.applicationNumber }}</span>
                            </div>
                            <button mat-icon-button class="history-btn-card" (click)="viewAppHistory(app)" matTooltip="View Full History">
                                <mat-icon>history</mat-icon>
                            </button>
                        </div>
                        <div class="implement-row top-aligned">
                            <div class="impl-name-box">
                                <mat-icon>settings_suggest</mat-icon>
                                <span>machine / implement: {{ app.implementName }}</span>
                            </div>
                            <div class="impl-sn" *ngIf="app.uniqueImplementId">
                                <span class="l">Unique Implement ID:</span>
                                <span class="v">{{ app.uniqueImplementId }}</span>
                            </div>
                        </div>
                        <div class="tags-row">
                            <div class="badges-group-horizontal">
                                <div class="premium-badge tracker">
                                    <mat-icon>link</mat-icon>
                                    <span>TRACKER ATTACHED</span>
                                </div>
                                 <div class="status-pill-luxe" 
                                     [class.passed]="app.localDecision === 'PASSED'" 
                                     [class.rejected]="app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED'"
                                     [class.pending]="app.localDecision !== 'PASSED' && app.localDecision !== 'DEFERRED' && app.localDecision !== 'DEFFERED'">
                                    <mat-icon>{{ app.localDecision === 'PASSED' ? 'verified' : ((app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED') ? 'warning' : 'schedule') }}</mat-icon>
                                    <span>QIC {{ app.localDecision === 'PASSED' ? 'PASSED' : ((app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED') ? 'DEFERRED' : 'PENDING') }}</span>
                                </div>
                                <button mat-flat-button class="live-loc-badge" [class.synced]="syncedApps().has(app.id!)" (click)="locateImplement(app); $event.stopPropagation()">
                                    <mat-icon>{{ syncedApps().has(app.id!) ? 'check_circle' : 'location_on' }}</mat-icon>
                                    <span>{{ syncedApps().has(app.id!) ? 'Location Synced' : 'View Live Location' }}</span>
                                </button>
                            </div>
                        </div>
                    </div>


                    <div class="card-body-content">
                        <div class="info-stack">
                            <div class="info-item">
                                <div class="icon-sq"><mat-icon>person</mat-icon></div>
                                <div class="txt">
                                    <span class="l">FARMER NAME / FATHER NAME</span>
                                    <span class="v">{{ app.farmerName }}</span>
                                    <span class="s" *ngIf="app.fatherName">S/O {{ app.fatherName }}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="icon-sq"><mat-icon>badge</mat-icon></div>
                                <div class="txt">
                                    <span class="l">CNIC NUMBER</span>
                                    <span class="v">{{ app.cnic }}</span>
                                </div>
                            </div>
                            <div class="info-item blue">
                                <div class="icon-sq"><mat-icon>satellite_alt</mat-icon></div>
                                <div class="txt">
                                    <span class="l">TRACKER IMEI</span>
                                    <span class="v imei">{{ app.trackerImei || 'N/A' }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="qr-panel" *ngIf="qrCodes()[app.id!]">
                            <div class="qr-container">
                                <img [src]="qrCodes()[app.id!]" alt="QR">
                            </div>
                            <span class="secure-tag">SECURE ID</span>
                        </div>
                    </div>
                    
                    <div class="deferral-footer" *ngIf="app.qicDeferralReason || app.deferralReason">
                        <mat-icon>error_outline</mat-icon>
                        <span>{{ app.qicDeferralReason || app.deferralReason }}</span>
                    </div>

                    <div class="card-actions-belt" *ngIf="isConvener() && reportStatus() === 'SENT_TO_CONVENER' && app.localDecision !== 'PASSED' && syncedApps().has(app.id!)">
                        <button mat-button class="mini-defer-btn" (click)="deferAppQic(app)">
                            <mat-icon>cancel</mat-icon>
                            Defer
                        </button>
                        <div class="v-sep"></div>
                        <button mat-button class="mini-accept-btn" (click)="passAppQic(app)">
                            <mat-icon>verified</mat-icon>
                            Accept
                        </button>
                    </div>
                    <div class="card-actions-belt" *ngIf="app.localDecision === 'PASSED'">
                        <!-- DIC Report button removed from cards as requested -->
                    </div>
                </div>
            </div>

            <mat-paginator [length]="totalRecords"
                           [pageSize]="pageSize"
                           [pageSizeOptions]="[5, 10, 25, 100]"
                           (page)="onPageChange($event)"
                           aria-label="Select page">
            </mat-paginator>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulsateOverlay {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .critical-progress-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      z-index: 20000; animation: fadeIn 0.4s ease;
      
      .overlay-card {
        background: white; padding: 48px; border-radius: 32px; width: 450px;
        display: flex; flex-direction: column; align-items: center; gap: 24px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        
        .icon-pulsate {
          width: 80px; height: 80px; background: #f0fdf4; color: #10b981;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          animation: pulsateOverlay 2s infinite;
          mat-icon { font-size: 40px; width: 40px; height: 40px; }
        }

        h2 { margin: 0; font-size: 24px; font-weight: 950; color: #0f172a; text-align: center; }
        p { margin: 0; font-size: 14px; color: #64748b; font-weight: 500; text-align: center; line-height: 1.5; }
        
        .progress-info {
          width: 100%; margin-top: 12px;
          .step-text { display: block; font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; text-align: center; }
          mat-progress-bar { height: 6px; border-radius: 3px; }
        }

        .security-note {
          display: flex; align-items: center; gap: 8px; margin-top: 12px;
          background: #f8fafc; padding: 10px 20px; border-radius: 12px;
          mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }
          span { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        }
      }
    }

    .report-view-container {
      padding: 0; background: #f8fafc; min-height: 100vh;
      animation: slideIn 0.5s ease-out; font-family: 'Inter', sans-serif;
    }

    .view-toggle-group {
      display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; align-items: center; flex-shrink: 0;
      .toggle-btn { 
        display: flex; align-items: center; justify-content: center; gap: 8px;
        height: 40px; min-width: 40px; padding: 0 12px; border-radius: 10px; color: #64748b; 
        border: none; background: transparent; cursor: pointer; font-weight: 700; font-size: 13px; font-family: inherit; transition: all 0.3s ease;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
        &.active { background: white; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 0 16px; min-width: auto; }
        &:not(.active):hover { color: #3b82f6; }
      }
    }

    .glass-header {
      background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px);
      padding: 0 40px 32px 40px; border-bottom: 1px solid rgba(0,0,0,0.05);
      z-index: 100;
      
      .meta-strip {
        display: flex; gap: 32px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 24px;
        .meta-item {
          display: flex; align-items: center; gap: 10px;
          mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; transition: all 0.3s ease; }
          .meta-content {
            display: flex; flex-direction: column;
            span { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            strong { font-size: 12px; color: #0f172a; }
          }

          &.created-by mat-icon { color: #6366f1; } /* Indigo */
          &.created-at mat-icon { color: #f59e0b; } /* Amber */
          &.submitted-by mat-icon { color: #10b981; } /* Emerald */
          &.submitted-at mat-icon { color: #3b82f6; } /* Sky Blue */
          &.last-updated mat-icon { color: #f43f5e; } /* Rose */
          
          &:hover mat-icon { transform: scale(1.2); }
        }
        .meta-separator { flex: 1; }
      }

      .main-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
        .header-left {
          display: flex; align-items: center; gap: 24px;
          .back-btn { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .report-title {
            .id-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
            .label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .status-chip {
              display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 850; text-transform: uppercase;
              background: #f1f5f9; color: #64748b; white-space: nowrap; border: 1px solid transparent;
              &.submitted { background: #ecfdf5; color: #059669; border-color: #dcfce7; }
              &.sent-to-convener { background: #eff6ff; color: #2563eb; border-color: #dbeafe; }
            }
            h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          }
        }
      }

      .history-btn {
        color: #64748b;
        &:hover { color: #3b82f6 !important; background: #eff6ff !important; }
      }

      .stats-horizontal {
        display: flex; gap: 24px; margin-top: 12px;
        .luxe-stat {
          flex: 1; padding: 20px 24px; background: white; border-radius: 20px; border: 1.5px solid #e2e8f0;
          display: flex; align-items: center; gap: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.02);
          transition: transform 0.3s ease;
          &:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.04); }
          
          .row-actions {
            display: flex; gap: 8px; align-items: center;
            .table-pass-btn { height: 28px; line-height: 28px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 800; background: #10b981; color: white; border: none; mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; } }
            .table-defer-btn { height: 28px; line-height: 28px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 800; color: #ef4444; border: 1.5px solid #fecaca; background: white; mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; } &:hover { background: #fef2f2; border-color: #ef4444; } }
          }
          .sync-hint { font-size: 9px; color: #94a3b8; font-style: italic; font-weight: 600; }
          .stat-icon {
            width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
            mat-icon { font-size: 24px; width: 24px; height: 24px; }
          }
          .stat-info {
            display: flex; flex-direction: column;
            .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .stat-val { font-size: 24px; font-weight: 900; color: #0f172a; }
          }
          &.total { .stat-icon { background: #f1f5f9; color: #475569; } }
          &.passed { .stat-icon { background: #dcfce7; color: #10b981; } .stat-val { color: #10b981; } }
          &.rejected { .stat-icon { background: #fee2e2; color: #ef4444; } .stat-val { color: #ef4444; } }
        }
      }

      .toolbar-section-header {
         margin-top: 40px; margin-bottom: 12px; padding: 0 8px;
         display: flex; align-items: center; gap: 12px; color: #94a3b8;
         mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3b82f6; opacity: 0.8; }
         span { font-size: 13px; font-weight: 850; text-transform: uppercase; letter-spacing: 1.5px; }
      }

      .header-action-toolbar {
        background: white; border-radius: 20px; padding: 16px 24px;
        display: flex; align-items: center; border: 1.5px solid #e2e8f0; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.03); gap: 24px;
        
        .toolbar-btns {
           display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex: 1;
           
           button {
               height: 48px; padding: 0 24px; border-radius: 12px; font-size: 13px; font-weight: 800;
               display: flex; align-items: center; justify-content: center; gap: 10px; 
               border: none !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
               
               mat-icon { 
                 font-size: 20px; width: 20px; height: 20px; 
                 margin: 0 !important;
                 display: inline-flex; align-items: center; justify-content: center;
                 vertical-align: middle;
                 position: relative; top: -1px; /* Subtle nudge for visual center */
               }
               span { line-height: 1; display: inline-flex; align-items: center; }
           }

           .toolbar-bill-btn {
               background: #10b981; color: white; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.2);
               &:hover { background: #059669; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.3); }
           }

           .toolbar-generate-btn {
               background: #0f172a; color: white; box-shadow: 0 8px 25px rgba(15, 23, 42, 0.15);
               &:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(15, 23, 42, 0.25); }
               &.download-ready { background: #3b82f6; box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2); &:hover { background: #2563eb; } }
               &:disabled { opacity: 0.7; cursor: not-allowed; }
               mat-spinner { margin-right: 0 !important; ::ng-deep circle { stroke: white !important; } }
           }

           .toolbar-submit-btn {
               background: #3b82f6; color: white; box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
               &:hover { background: #2563eb; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(59,130,246,0.3); }
           }

           .toolbar-dic-btn {
               background: #6366f1; color: white; box-shadow: 0 8px 15px rgba(99, 102, 241, 0.15);
               &:hover { background: #4f46e5; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(99, 102, 241, 0.25); }
           }

           .toolbar-excel-btn {
               background: #16a34a; color: white; box-shadow: 0 8px 15px rgba(22, 163, 74, 0.15);
               &:hover { background: #15803d; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(22, 163, 74, 0.25); }
           }

           .toolbar-upload-btn {
               background: white; border: 2.5px dashed #cbd5e1 !important; color: #64748b;
               &:hover { border-color: #3b82f6 !important; color: #3b82f6; background: #eff6ff; }
           }

                .uploaded-chip-box {
                   background: #f0fdf4; border: 1.5px solid #dcfce7; border-radius: 12px; padding: 0 8px 0 16px;
                   display: flex; align-items: center; gap: 12px; height: 48px;
                   &.bill { background: #eff6ff; border-color: #dbeafe; .info-side { color: #2563eb; } .dl-action-btn { color: #2563eb; } }
                   &.invoice { background: #fff7ed; border-color: #fed7aa; .info-side { color: #c2410c; } .dl-action-btn { color: #c2410c; } &:hover .dl-action-btn { background: #ea580c; color: white; } }
                   &.draft { background: #eef2ff; border-color: #e0e7ff; .info-side { color: #4f46e5; } .dl-action-btn { color: #4f46e5; } }
                   
                   .info-side {
                       display: flex; align-items: center; gap: 10px; color: #15803d; font-size: 13px; font-weight: 800;
                   mat-icon { font-size: 20px; width: 20px; height: 20px; }
               }

               .dl-action-btn {
                   background: white; border-radius: 12px; width: 36px; height: 36px; color: #10b981;
                   box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;
                   &:hover { background: #10b981; color: white; transform: rotate(-5deg); }
                   mat-icon { font-size: 20px; width: 20px; height: 20px; }
               }
           }
        }
      }
    }

    .content-area {
      max-width: 1400px; margin: 0 auto; padding: 40px;
      
      .main-content {
        .table-card {
          background: white; border-radius: 32px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.04);
          border: 1.5px solid #e2e8f0;
          position: relative; overflow: hidden;
          
          .table-actions {
            margin-bottom: 24px;
            .right-actions {
              display: flex;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
            }
            .search-box {
              background: #f8fafc; border-radius: 16px; padding: 0 20px; display: flex; align-items: center; gap: 12px;
              width: 400px; height: 56px; border: 2px solid transparent; transition: all 0.3s ease;
              &:focus-within { border-color: #3b82f6; background: white; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1); }
              mat-icon { color: #94a3b8; }
              input { border: none; background: transparent; outline: none; width: 100%; font-size: 15px; font-weight: 600; color: #1e293b; }
            }

            .mode-label {
              display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; font-weight: 500;
              mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }
            }
          }
        }
      }
    }

    /* Cards View Layout */
    .cards-grid-layout {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px; padding: 8px 0;
      transition: opacity 0.3s ease;
      &.loading-fade { opacity: 0.5; pointer-events: none; }
    }

    .app-luxe-card {
      background: white; border-radius: 20px; border: 1px solid #cbd5e1; padding: 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02); overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
      &:hover { transform: translateY(-5px); border-color: #3b82f6; box-shadow: 0 15px 35px rgba(59,130,246,0.08); }

      .row-actions {
        display: flex; gap: 8px;
        .table-pass-btn { height: 28px; line-height: 28px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 800; background: #10b981; color: white; mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; } }
        .table-defer-btn { height: 28px; line-height: 28px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 800; color: #ef4444; border: 1.5px solid #fecaca; mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; } &:hover { background: #fef2f2; } }
      }
      .sync-hint { font-size: 9px; color: #94a3b8; font-style: italic; font-weight: 600; }
      .deferral-hint { font-size: 10px; color: #ef4444; margin-top: 4px; font-weight: 700; }

      .card-header-belt {
        padding: 24px; border-bottom: 1px solid #e2e8f0;
        
        .app-no-top-bar {
          margin-bottom: 16px;
          display: flex; justify-content: space-between; align-items: flex-start;
          .app-identifier {
            display: flex; flex-direction: column;
            .lbl { font-size: 8px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
            .val { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 900; color: #0f172a; }
          }
          .history-btn-card {
            background: #f1f5f9; color: #64748b; margin-top: -8px; margin-right: -8px;
            &:hover { background: #eff6ff; color: #3b82f6; }
            mat-icon { font-size: 20px; width: 20px; height: 20px; }
          }
        }

        .implement-row.top-aligned {
           display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
           .impl-name-box {
            display: flex; align-items: center; gap: 8px; background: #f0fdf4; color: #10b981; padding: 10px 18px; border-radius: 12px; font-size: 15px; font-weight: 800;
            mat-icon { font-size: 20px; width: 20px; height: 20px; }
          }
          .impl-sn { font-size: 11px; font-weight: 700; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; .l { opacity: 0.5; margin-right: 4px; font-size: 9px; text-transform: uppercase; } }
        }

        .tags-row {
          display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-wrap: wrap;
          .badges-group-horizontal { 
            display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1;
            .premium-badge {
                display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: #0f172a; color: white; border-radius: 6px; font-size: 8.5px; font-weight: 800;
                mat-icon { font-size: 13px; width: 13px; height: 13px; }
            }
            .status-pill-luxe {
                display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: #f1f5f9; color: #64748b; border-radius: 6px; font-size: 8.5px; font-weight: 900; text-transform: uppercase;
                mat-icon { font-size: 13px; width: 13px; height: 13px; }
                &.passed { background: #dcfce7; color: #10b981; }
                &.rejected { background: #fee2e2; color: #ef4444; }
                &.pending { background: #fef9c3; color: #854d0e; }
            }
            .live-loc-badge {
                height: 26px; padding: 0 8px; border-radius: 6px; font-size: 8.5px; font-weight: 800;
                background: #eff6ff !important; color: #2563eb !important; border: 1px solid #bfdbfe;
                display: flex; align-items: center; gap: 4px; line-height: 1;
                mat-icon { font-size: 13px; width: 13px; height: 13px; margin-left: -4px; }
                &:hover { background: #dbeafe !important; }
                &.synced { background: #dcfce7 !important; color: #059669 !important; border-color: #10b981; }
            }
          }
        }
      }

      .card-body-content {
        padding: 24px; display: flex; gap: 20px;
        .info-stack { flex: 1; display: flex; flex-direction: column; gap: 16px; }
        .info-item {
          display: flex; gap: 14px;
          .icon-sq { width: 36px; height: 36px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
          .txt {
            display: flex; flex-direction: column;
            .l { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
            .v { font-size: 14px; font-weight: 700; color: #1e293b; &.imei { font-family: 'JetBrains Mono', monospace; color: #3b82f6; } }
            .s { font-size: 11px; color: #64748b; font-weight: 600; }
          }
          &.blue .icon-sq { background: #eff6ff; color: #3b82f6; }
        }
        .qr-panel {
          width: 85px; display: flex; flex-direction: column; align-items: center; gap: 6px;
          .qr-container { padding: 4px; background: white; border: 1px dashed #e2e8f0; border-radius: 8px; img { width: 100%; height: auto; display: block; } }
          .secure-tag { font-size: 8px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; }
        }
      }

      .deferral-footer {
        padding: 10px 24px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }

      .card-actions-belt {
        display: flex; gap: 0; background: #f8fafc; border-top: 1px solid #e2e8f0;
        .v-sep { width: 1px; height: 24px; background: #e2e8f0; align-self: center; }
        button { flex: 1; height: 44px; border-radius: 0; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .mini-defer-btn { color: #ef4444; &:hover { background: #fee2e2; } }
        .mini-accept-btn { color: #10b981; &:hover { background: #dcfce7; } }
        .mini-dic-btn { color: #6366f1; &:hover { background: #eef2ff; } }
        mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
      }
    }

    .table-dic-btn { 
      height: 32px !important; line-height: 30px !important; padding: 0 12px !important; border-radius: 8px !important; 
      font-size: 11px !important; font-weight: 800 !important; color: #6366f1 !important; border: 1.5px solid #e0e7ff !important;
      &:hover { background: #eef2ff !important; border-color: #6366f1 !important; }
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; margin-right: 4px !important; }
    }

    .luxe-table {
      width: 100%; transition: opacity 0.3s ease;
      &.loading-fade { opacity: 0.5; pointer-events: none; }
      th { background: white; padding: 24px 20px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
      td { padding: 24px 20px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
      
      .farmer-cell {
        display: flex; flex-direction: column;
        strong { font-size: 15px; color: #0f172a; }
        span { font-size: 12px; color: #64748b; }
      }
      
      .status-badge {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 12px; font-size: 11px; font-weight: 800;
        background: #f1f5f9; color: #64748b;
        &.passed { background: #ecfdf5; color: #059669; }
        &.rejected { background: #fef2f2; color: #dc2626; }
        &.pending { background: #fefae8; color: #ca8a04; }
      }
    }

    .deferral-hint { font-size: 11px; color: #ef4444; margin-top: 6px; font-weight: 700; background: #fee2e2; padding: 4px 8px; border-radius: 6px; display: inline-block; }
  `]
})
export class InspectionReportViewComponent implements OnInit {
  private router = inject(Router);
  private reportService = inject(InspectionQICReportService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
   private dialog = inject(MatDialog);
  private fileUploadService = inject(FileUploadService);
  private stateService = inject(ReportStateService);
  syncedApps = signal<Set<number>>(new Set());

  isConvener = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.role) return false;
    
    const role = user.role.toUpperCase();
    console.log('Current User Role:', role); // Debugging visibility
    
    return role.includes('CONVENER') || role.includes('ADMIN');
  });

  report = signal<any>(null);
  applications = signal<any[]>([]);
  qrCodes = signal<Record<number, string>>({});
  isLoadingReport = signal<boolean>(false);
  isLoadingApps = signal<boolean>(false);
  isGeneratingReport = signal<boolean>(false);
  reportId = signal<string>('QIC-NEXT');
  reportStatus = signal<string>('NOT_SUBMITTED');
  viewMode = signal<'table' | 'cards'>('table');
  isDocumentUploaded = signal<boolean>(false);
  isGeneratingBill = signal<boolean>(false);
  billStep = signal<string>('Preparing...');
   canGenerateBill = computed(() => this.authService.hasFeature('/portal/quality-inspection/reports/bill'));
   canUploadSignedReport = computed(() => this.authService.hasFeature('/portal/quality-inspection/reports/upload'));
  isReportGenerated = computed(() => !!this.report()?.generatedDocumentPath);

  allAppsDecided = computed(() => {
    const r = this.report();
    if (!r) return false;
    const total = r.totalApps || 0;
    const decided = (r.passedCount || 0) + (r.rejectedCount || 0);
    return total > 0 && total === decided;
  });

  // Pagination & Search
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  searchQuery = '';
  private searchSubject = new Subject<string>();

  displayedColumns: string[] = ['appNo', 'farmerName', 'cnic', 'implementId', 'imei', 'status', 'history', 'actions'];
  internalReportId: number | null = null;

  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.setupSearch();
    const state = history.state;

    if (state && state.report) {
      this.internalReportId = state.report.id;
      this.initFromReport(state.report);
    } else {
      // Check query params for deep linking or "call same page" refresh
      const idParam = this.route.snapshot.queryParamMap.get('id');
      if (idParam) {
        this.internalReportId = +idParam;
        this.loadReportFromServer(this.internalReportId);
      } else {
        this.snackBar.open('Session expired or no report data found.', 'Back', { duration: 3000 })
          .onAction().subscribe(() => this.goBack());
      }
    }

    const viewParam = this.route.snapshot.queryParamMap.get('view');
    if (viewParam === 'cards') {
      this.viewMode.set('cards');
    }
  }

  private loadReportFromServer(id: number) {
    this.isLoadingReport.set(true);
    this.reportService.getReport(id)
      .pipe(finalize(() => this.isLoadingReport.set(false)))
      .subscribe({
        next: (res) => this.initFromReport(res),
        error: (err: any) => {
          console.error('Failed to load report', err);
          this.snackBar.open('Error loading report details.', 'Error', { duration: 3000 });
        }
      });
  }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.saveCurrentState();
      this.loadApplications();
    });
  }

  onViewModeChange(mode: 'table' | 'cards') {
    this.viewMode.set(mode);
    this.saveCurrentState();
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

   private initFromReport(report: any) {
    this.report.set(report);
    if (report.reportNumber) this.reportId.set(report.reportNumber);
    if (report.status) this.reportStatus.set(report.status);
    this.isDocumentUploaded.set(!!report.signedDocumentPath);

    // Restore State
    if (this.internalReportId) {
      const saved = this.stateService.getOrCreateState(this.internalReportId);
      this.searchQuery = saved.searchQuery;
      this.currentPage = saved.currentPage;
      this.pageSize = saved.pageSize;
      this.viewMode.set(saved.viewMode);
      this.syncedApps.set(saved.syncedApps);
    }

    this.loadApplications();
  }

  private saveCurrentState() {
    if (this.internalReportId) {
      this.stateService.saveState(this.internalReportId, {
        searchQuery: this.searchQuery,
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        viewMode: this.viewMode(),
        syncedApps: this.syncedApps()
      });
    }
  }

  loadApplications() {
    if (!this.internalReportId) return;

    this.saveCurrentState();
    this.isLoadingApps.set(true);
    this.reportService.getReportApplications(
      this.internalReportId,
      this.searchQuery,
      this.currentPage,
      this.pageSize
    ).pipe(finalize(() => this.isLoadingApps.set(false)))
    .subscribe({
      next: (page: any) => {
        this.applications.set(page.content);
        this.totalRecords = page.totalElements;
        this.generateBatchQRs(page.content);
      }
    });
  }

  async generateBatchQRs(apps: any[]) {
    const qrMap: Record<number, string> = { ...this.qrCodes() };
    for (const app of apps) {
      if (!app.id || qrMap[app.id]) continue;

      const baseUrl = window.location.origin;
      const qrData = `${baseUrl}/verify-report?type=DIC&id=${app.applicationNumber}`;

      try {
        qrMap[app.id] = await QRCode.toDataURL(qrData, { 
            margin: 1, 
            width: 200,
            color: { dark: '#0f172a', light: '#ffffff' } 
        });
      } catch (err) { }
    }
    this.qrCodes.set(qrMap);
  }

   approveReport(navigateToListAfter = false) {
    if (!this.internalReportId) return;
    
    this.reportService.approveReport(this.internalReportId).subscribe({
      next: (res) => {
        this.snackBar.open('Report Approved and Finalized Successfully!', 'Success', { duration: 3000 });
        this.initFromReport(res);
        if (navigateToListAfter) {
          this.navigateToQicReportsList();
        }
      },
      error: (err) => {
        console.error('Failed to approve report', err);
        this.snackBar.open('Error: Could not approve report.', 'Error', { duration: 3000 });
      }
    });
  }

   submitReport(navigateToListAfter = false) {
    if (!this.internalReportId) return;
    
    this.reportService.submitReport(this.internalReportId, {}).subscribe({
      next: (res) => {
        this.snackBar.open('Report Submitted to Convener Successfully!', 'Success', { duration: 3000 });
        this.initFromReport(res);
        if (navigateToListAfter) {
          this.navigateToQicReportsList();
        }
      },
      error: (err) => {
        console.error('Failed to submit report', err);
        this.snackBar.open('Error: Could not submit report.', 'Error', { duration: 3000 });
      }
    });
  }

  /** QIC inspection batches list (after signed upload flow). */
  private navigateToQicReportsList(): void {
    this.isLoadingReport.set(false);
    this.router.navigate(['/portal/quality-inspection/reports']);
  }



   onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.saveCurrentState();
    this.loadApplications();
  }

  // Stats are now coming from the backend report DTO summary fields
  // No longer needs client-side computed properties for the whole batch

  locateImplement(app: any) {
    if (!app.trackerImei) {
      this.dialog.open(QicRequestDialogComponent, {
        width: '450px',
        data: {
          applicationNumber: app.applicationNumber,
          farmerName: app.farmerName,
          readonly: true
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(TrackerCalibrationDialogComponent, {
      data: {
        imei: app.trackerImei,
        applicationId: app.applicationId || app.id
      },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      panelClass: 'full-screen-calibration'
    });

    dialogRef.afterClosed().subscribe(synced => {
      if (synced) {
        this.syncedApps.update(set => {
          const newSet = new Set(set);
          newSet.add(app.id);
          return newSet;
        });
        this.saveCurrentState();
      }
    });
  }

  passAppQic(app: any) {
    if (!this.internalReportId) return;

    const dialogRef = this.dialog.open(PassConfirmationDialogComponent, {
      width: '400px',
      data: {
        applicationNumber: app.applicationNumber,
        farmerName: app.farmerName,
        uniqueImplementId: app.uniqueImplementId
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.reportService.updateApplicationDecision(this.internalReportId!, app.id, 'PASSED').subscribe({
          next: () => {
            this.snackBar.open(`Application #${app.applicationNumber} PASSED successfully`, 'OK', { duration: 2000 });
            this.loadApplications(); // Refresh list
            this.loadReportFromServer(this.internalReportId!); // Refresh summary stats
          },
          error: (err) => {
            console.error('Failed to pass application', err);
            this.snackBar.open('Error: Could not update decision.', 'Error', { duration: 3000 });
          }
        });
      }
    });
  }

  deferAppQic(app: any) {
    if (!this.internalReportId) return;

    const dialogRef = this.dialog.open(DeferralRemarksDialogComponent, {
      width: '450px',
      data: { applicationNumber: app.applicationNumber }
    });

    dialogRef.afterClosed().subscribe(remarks => {
      if (remarks) {
        this.reportService.updateApplicationDecision(this.internalReportId!, app.id, 'DEFFERED', remarks).subscribe({
          next: () => {
            this.snackBar.open(`Application #${app.applicationNumber} DEFERRED successfully`, 'OK', { duration: 2000 });
            this.loadApplications();
            this.loadReportFromServer(this.internalReportId!);
          },
          error: (err: any) => {
            console.error('Failed to defer application', err);
            this.snackBar.open('Error: Could not update decision.', 'Error', { duration: 3000 });
          }
        });
      }
    });
  }

  generateReport() {
    if (!this.internalReportId) return;

    const r = this.report();
    if (!r) return;

    this.isGeneratingReport.set(true);
    this.snackBar.open('Generating QIC Report (Official Format)...', 'Processing', { duration: 2000 });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Fetch all records for the report
    this.reportService.getReportApplications(this.internalReportId, '', 0, 1000).subscribe({
      next: async (fullData: any) => {
        try {
        const firstApp = fullData.content.length > 0 ? fullData.content[0] : {};
        const farmerDistrict = firstApp.districtName ?? '';
        const convenerDivision = (r.convenerDivisionName ?? '').trim();
        const rawFirmName = r.firmName || firstApp.bookedByFirmName || 'the assigned firm';
        const cleanedFirmName = rawFirmName.split(' ').filter((item: string, index: number, array: string[]) => array.indexOf(item) === index).join(' ');
        const implementName = r.implementName || firstApp.implementName || 'Super Seeder';

        // Format Date to DD-MM-YYYY
        const dateObj = new Date();
        const reportDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

        const baseUrl = window.location.origin;
        const reportUrl = `${baseUrl}/verify-report?type=QIC&id=${this.reportId()}`;
        const reportQrDataUrl = await QRCode.toDataURL(reportUrl, { margin: 1, width: 200, color: { dark: '#0f172a', light: '#ffffff' } });

        const drawHeader = (pdfDoc: any) => {
            const logoLeft = 'report-assets/gov-logo.png';
            const logoRight = 'report-assets/gov.jpg';
            try {
              pdfDoc.addImage(logoLeft, 'PNG', margin, 10, 22, 22);
              pdfDoc.addImage(logoRight, 'JPEG', pageWidth - margin - 25, 10, 25, 25);
            } catch (e) {}

            pdfDoc.setFont('times', 'bold');
            pdfDoc.setFontSize(14);
            pdfDoc.text('QUALITY INSPECTION COMMITTEE (QIC) REPORT', pageWidth / 2, 16, { align: 'center' });
            pdfDoc.setFontSize(10);
            pdfDoc.text('FOR THE PROJECT TITLED', pageWidth / 2, 22, { align: 'center' });
            pdfDoc.setFontSize(11);
            pdfDoc.text('“PUNJAB CLEAN AIR PROGRAM – AGRICULTURE COMPONENT”', pageWidth / 2, 28, { align: 'center' });
            pdfDoc.setFontSize(11);
            pdfDoc.text('FIELD WING OF AGRICULTURE DEPARTMENT', pageWidth / 2, 34, { align: 'center' });
            pdfDoc.setFontSize(12);
            pdfDoc.text('GOVERNMENT OF THE PUNJAB', pageWidth / 2, 40, { align: 'center' });

            pdfDoc.setDrawColor(0);
            pdfDoc.setLineWidth(0.5);
            pdfDoc.line(margin, 46, pageWidth - margin, 46);

            // Sub-Header Info
            pdfDoc.setFont('times', 'normal');
            pdfDoc.setFontSize(11);
            pdfDoc.text(`QIC No. ${this.reportId()}`, margin, 58);
            pdfDoc.text(`Date of Inspection: ${reportDate}`, pageWidth - margin, 58, { align: 'right' });

            pdfDoc.setFont('times', 'normal');
            pdfDoc.setFontSize(11);

            pdfDoc.text(`Farmer District: ${farmerDistrict}`, margin, 68);
            pdfDoc.text(`Firm: ${cleanedFirmName}`, pageWidth - margin, 68, { align: 'right' });

            pdfDoc.setFont('times', 'bold');
            pdfDoc.text(`machine / implement: ${implementName}`, margin, 76);
        };

        const drawFooter = (pdfDoc: any) => {
            const pageHeight = pdfDoc.internal.pageSize.getHeight();
            const pageWidth = pdfDoc.internal.pageSize.getWidth();
            try {
              pdfDoc.addImage(reportQrDataUrl, 'PNG', pageWidth - 35, pageHeight - 40, 24, 24);
              pdfDoc.setFontSize(7);
              pdfDoc.setFont('times', 'bold');
              pdfDoc.text('Scan to Verify', pageWidth - 23, pageHeight - 14, { align: 'center' });
            } catch (e) {}
        };

        const drawWatermark = (pdfDoc: any) => {
            pdfDoc.saveGraphicsState();
            pdfDoc.setGState(new (pdfDoc as any).GState({ opacity: 0.1 }));
            pdfDoc.setFont('times', 'bold');
            pdfDoc.setFontSize(26);
            pdfDoc.setTextColor(180, 180, 180);
            pdfDoc.text('Govt Of Punjab Agriculture Department', pdfDoc.internal.pageSize.getWidth() / 2, pdfDoc.internal.pageSize.getHeight() / 2, {
              align: 'center',
              angle: 45
            });
            pdfDoc.restoreGraphicsState();
        };

        const addNewPage = (pdfDoc: any) => {
            pdfDoc.addPage();
            drawHeader(pdfDoc);
            drawWatermark(pdfDoc);
            drawFooter(pdfDoc);
            return 82; // Cursor starts after header
        };


        // Table - Only Include Passed Applications
        const passedApps = fullData.content.filter((app: any) => app.localDecision === 'PASSED');
        const rows = passedApps.map((app: any, index: number) => {
          return [
            index + 1,
            app.farmerName || 'N/A',
            app.cnic || 'N/A',
            app.address || 'N/A', // Address comes from database via Farmer entity
            app.markazName || 'N/A',
            app.uniqueImplementId || 'N/A',
            app.trackerImei || 'N/A'
          ];
        });

        autoTable(doc, {
          startY: 82,
          margin: { top: 82, bottom: 45 },
          head: [['Sr. No.', 'Allottee Name', 'CNIC', 'Mailing Address', 'Tehsil', 'machine / implement ID', 'Tracker IMEI No.']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1 },
          styles: { fontSize: 7.5, cellPadding: 1.5, font: 'times', textColor: [0, 0, 0], minCellHeight: 12 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 28 },
            2: { cellWidth: 22 },
            3: { cellWidth: 40 },
            4: { cellWidth: 22 },
            5: { cellWidth: 32 },
            6: { cellWidth: 28 }
          },
          didDrawPage: (data) => {
            drawHeader(doc);
            drawWatermark(doc);
            drawFooter(doc);
          }
        });

        // Certification Section
        let finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY + 60 > doc.internal.pageSize.getHeight()) {
          finalY = addNewPage(doc);
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        const certText = `It is certified that the machinery / implements manufactured by the firm as mentioned above has been physically inspected by Quality Inspection Committee constituted by the Agriculture Department, Government of the Punjab vide No. SOA(P) 3-13/2025 dated 07.08.2025 and found as per approved technical specifications. The unique Implement ID Plate with QR code has been printed along with tracker installation on each machine / implement. The firm is allowed to deliver implements at concerned farmers / service providers premises.`;
        const splitCertText = doc.splitTextToSize(certText, pageWidth - (margin * 2));
        doc.text(splitCertText, margin, finalY);

        finalY += (splitCertText.length * 5) + 15;

        // Signatories — "X Division" is the firm convener's division (firms.convener_id → user location)
        const sigColLeft = pageWidth / 4 + 10;
        const sigColRight = (pageWidth * 3) / 4 - 10;

        doc.setFont('times', 'normal');
        doc.setFontSize(9);

        // Row 1
        // Member 1 (Left Column Centered)
        doc.text('Representative of Agricultural Mechanization', sigColLeft, finalY, { align: 'center' });
        doc.text('Research Institute (AMRI)', sigColLeft, finalY + 4, { align: 'center' });
        doc.text('Member', sigColLeft, finalY + 12, { align: 'center' });

        // Member 2 (Right Column Centered)
        doc.text('Representative of PISMC / NESPAK', sigColRight, finalY, { align: 'center' });
        doc.text('Member', sigColRight, finalY + 12, { align: 'center' });

        finalY += 30;
        if (finalY + 40 > doc.internal.pageSize.getHeight()) {
          finalY = addNewPage(doc);
        }

        // Row 2
        // Member 3 (Left Column Centered)
        doc.text('Representative of Director General Agriculture', sigColLeft, finalY, { align: 'center' });
        doc.text('(Field), Punjab Lahore', sigColLeft, finalY + 4, { align: 'center' });
        doc.text('Member', sigColLeft, finalY + 12, { align: 'center' });

        // Convener (Right Column Centered)
        doc.text('Director Agriculture Engineering', sigColRight, finalY, { align: 'center' });
        doc.text(convenerDivision ? `${convenerDivision} Division` : '', sigColRight, finalY + 4, { align: 'center' });
        doc.text('Convener', sigColRight, finalY + 12, { align: 'center' });

        finalY += 25;

        doc.setFont('times', 'bold');
        doc.text('Signature of the Firm Proprietor / Representative: ____________________________', margin, finalY);
        
        finalY += 10;
        doc.text('No : ___________', margin, finalY);
        doc.text('Date : ___________', pageWidth - margin, finalY, { align: 'right' });

        // Copy To Section
        finalY += 15;
        if (finalY + 40 > doc.internal.pageSize.getHeight()) {
          finalY = addNewPage(doc);
        }

        doc.setFont('times', 'bold');
        doc.text('Copy for information to', margin, finalY);
        doc.setFont('times', 'normal');

        const copies = [
          '1. The Director General Agriculture (Field), Punjab, Lahore',
          '2. All Committee Members',
          `3. The Deputy Director Agricultural Engineering, Convener of the District Inspection Committee (${farmerDistrict})`,
          `4. The Assistant Director, Agricultural Engineering (${farmerDistrict})`,
          `5. M/S ${cleanedFirmName}`
        ];

        copies.forEach((text, i) => {
          doc.text(text, margin + 5, finalY + 7 + (i * 5));
        });



        // Add Page Numbers (Page 1 of 2)
        const totalPages = (doc as any).internal.getNumberOfPages();
        for(let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFont('times', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }

        doc.save(`QIC_Report_${this.reportId()}.pdf`);

        // Now save to backend
        const pdfBlob = doc.output('blob');
        const fileName = `QIC_Report_${this.reportId()}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        this.fileUploadService.upload(pdfFile).subscribe({
          next: (event: any) => {
             if (event.type === HttpEventType.Response) {
                const uploadedFileName = event.body.fileName;
                this.reportService.updateGeneratedDocument(this.internalReportId!, uploadedFileName).subscribe({
                  next: (updatedReport) => {
                    this.initFromReport(updatedReport);
                    this.snackBar.open('Report generated and saved to backend!', 'Success', { duration: 3000 });
                  },
                  error: (err) => {
                     console.error('Failed to link generated report', err);
                     this.snackBar.open('Report generated but failed to save to backend.', 'Info', { duration: 5000 });
                  }
                });
             }
          },
          error: (err) => {
             console.error('Failed to upload generated report', err);
             this.snackBar.open('Report generated but failed to upload to backend.', 'Info', { duration: 5000 });
          }
        });

        this.snackBar.open('Report Exported Successfully!', 'Success', { duration: 3000 });
        } catch (error) {
           console.error('Error during report generation', error);
           this.snackBar.open('Error generating report!', 'Dismiss', { duration: 3000 });
        } finally {
          this.isGeneratingReport.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to get report applications', err);
        this.snackBar.open('Error getting report applications!', 'Dismiss', { duration: 3000 });
        this.isGeneratingReport.set(false);
      }
    });
  }

  generateDicReport(singleApp?: any) {
    if (!this.internalReportId) return;

    const r = this.report();
    if (!r) return;

    this.isGeneratingReport.set(true);
    this.snackBar.open(singleApp ? 'Generating DIC Report...' : 'Generating DIC Batch...', 'Processing', { duration: 2000 });

    this.reportService.getReportApplications(this.internalReportId, '', 0, 1000).subscribe({
      next: async (fullData: any) => {
        try {
          const doc = new jsPDF('p', 'mm', 'a4');
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 20;

          // Project Title from QIC Report logic line 1128
          const projectTitle = "“PUNJAB CLEAN AIR PROGRAM – AGRICULTURE COMPONENT”";
          
          const passedApps = singleApp ? [singleApp] : fullData.content.filter((app: any) => app.localDecision === 'PASSED');
          
          if (passedApps.length === 0) {
            this.snackBar.open('No passed applications found for DIC generation.', 'Dismiss', { duration: 3000 });
            this.isGeneratingReport.set(false);
            return;
          }

          for (let i = 0; i < passedApps.length; i++) {
            if (i > 0) doc.addPage();
            
            const app = passedApps[i];
            const dateObj = new Date();
            const reportDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
            
            // Watermark (Centered, Faded)
            try {
              (doc as any).setAlpha(0.08); // Very light watermark
              doc.addImage('report-assets/gov-logo.png', 'PNG', pageWidth / 4, pageHeight / 3.5, pageWidth / 2, pageWidth / 2);
              (doc as any).setAlpha(1); // Reset alpha
            } catch (e) {}

            // Header Assets
            try {
              // Left Logo (larger and further left)
              doc.addImage('report-assets/gov-logo.png', 'PNG', 8, 8, 25, 25);
              // Right Logo (matching size and further right)
              doc.addImage('report-assets/gov.jpg', 'JPEG', pageWidth - 8 - 25, 8, 25, 25);
            } catch (e) {
              console.warn('Header logos failed', e);
            }

            // Titles
            doc.setFont('times', 'bold');
            doc.setFontSize(15);
            doc.text('DISTRICT INSPECTION COMMITTEE (DIC) REPORT', pageWidth / 2, 18, { align: 'center' });
            doc.setFontSize(10);
            doc.text('FOR THE PROJECT TITLED', pageWidth / 2, 24, { align: 'center' });
            doc.setFontSize(11);
            doc.text(projectTitle, pageWidth / 2, 30, { align: 'center' });
            doc.setFontSize(10);
            doc.text('FIELD WING OF AGRICULTURE DEPARTMENT', pageWidth / 2, 36, { align: 'center' });

            // Data Fields Layout
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            let currentY = 50;
            const lineSpacing = 8;
            const labelCol = margin;
            const valueCol = margin + 35;

            // Row 1: Allottee Name & S/O
            doc.text('Allottee Name', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.farmerName || 'N/A', valueCol, currentY);
            doc.setFont('times', 'normal');
            doc.text('S/O', valueCol + 50, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.fatherName || 'N/A', valueCol + 60, currentY);

            currentY += lineSpacing;
            // Row 2: Mailing Address
            doc.setFont('times', 'normal');
            doc.text('Mailing Address', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.address || 'N/A', valueCol, currentY);

            currentY += lineSpacing;
            // Row 3: Markaz & District
            doc.setFont('times', 'normal');
            doc.text('Markaz', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.markazName || 'N/A', valueCol, currentY);
            doc.setFont('times', 'normal');
            doc.text('District', valueCol + 50, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.districtName || 'N/A', valueCol + 65, currentY);

            currentY += lineSpacing;
            // Row 4: Firm
            doc.setFont('times', 'normal');
            doc.text('Firm Name and address', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(`M/S ${r.firmName || app.bookedByFirmName || 'N/A'}`, valueCol + 5, currentY);

            currentY += lineSpacing;
            // Row 5: Name of Implement
            doc.setFont('times', 'normal');
            doc.text('Name of Implement', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.implementName || 'N/A', valueCol + 5, currentY);

            currentY += lineSpacing + 4;
            // Row 6: Unique Implement ID (Featured)
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text(`Unique Implement ID  ${app.uniqueImplementId || 'N/A'}`, pageWidth - margin, currentY, { align: 'right' });

            currentY += lineSpacing + 4;
            // Row 7: Unique Code & CNIC
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.text('Unique Code', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.applicationNumber || 'N/A', valueCol, currentY);
            doc.setFont('times', 'normal');
            doc.text('CNIC NO', valueCol + 50, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.cnic || 'N/A', valueCol + 70, currentY);

            currentY += lineSpacing;
            // Row 8: Date & Cell
            doc.setFont('times', 'normal');
            doc.text('Dated of inspection', labelCol, currentY);
            doc.setFont('times', 'bold');
            doc.text(reportDate, valueCol + 5, currentY);
            doc.setFont('times', 'normal');
            doc.text('Cell NO.', valueCol + 50, currentY);
            doc.setFont('times', 'bold');
            doc.text(app.contactNumber || 'N/A', valueCol + 70, currentY);

            currentY += 15;
            
            // Generate QR Code for this application
            const baseUrl = window.location.origin;
            const qrText = `${baseUrl}/verify-report?type=DIC&id=${app.applicationNumber}`;
            try {
              const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 100 });
              // Move QR code up so that there must be space for signature
              doc.addImage(qrDataUrl, 'PNG', margin, currentY - 25, 30, 30);
              doc.setFontSize(7);
              doc.text('SCAN TO VERIFY', margin + 15, currentY + 7, { align: 'center' });
            } catch (qrErr) {
              console.warn('QR Code generation failed for app', app.applicationNumber);
            }

            // Certification Text
            const certText = `It is certified that the delivery of the machinery /implement permitted by the Quality Inspection Committee (QIC) has been verified by District Inspection Committee (DIC) constituted by the Agriculture Department, Government of the Punjab vide No SOA(P) 3-13/2025 dated 07.08.2025. The unique implement ID Plate and QR Code printed by the QIC has also been verified on the implement along with tracker installation on the machine / implement. The DIC recommends to release the farmers share to the firm.`;
            doc.setFont('times', 'normal');
            const splitCert = doc.splitTextToSize(certText, pageWidth - (margin * 2));
            doc.text(splitCert, margin, currentY);

            currentY += (splitCert.length * 6) + 20;

            // Signatories Section
            const sigY = currentY;
            const colWidth = (pageWidth - (margin * 2)) / 3;
            const centerCol = margin + colWidth + (colWidth / 2);

            // Foot Signatories (Members) - 2x2 Grid Layout for 4 members
            doc.setFontSize(8);
            doc.setFont('times', 'bold');
            const colCenterLeft = margin + (pageWidth - margin * 2) / 4;
            const colCenterRight = pageWidth - margin - (pageWidth - margin * 2) / 4;
            const row1Y = sigY;
            
            // Row 1 - Left: Member 2
            doc.text('Rep of Deputy Director Agriculture', colCenterLeft, row1Y, { align: 'center' });
            doc.text('(Water Management) ' + (app.districtName || ''), colCenterLeft, row1Y + 4, { align: 'center' });
            doc.text('(Member)', colCenterLeft, row1Y + 8, { align: 'center' });

            // Row 1 - Right: Member 3 (Secretary)
            doc.text('Assistant Director Agricultural Engineering', colCenterRight, row1Y, { align: 'center' });
            doc.text(app.districtName || '', colCenterRight, row1Y + 4, { align: 'center' });
            doc.text('(Member / Secretary)', colCenterRight, row1Y + 8, { align: 'center' });

            // Row 2 - Left: Member 4
            const row2Y = row1Y + 22;
            doc.text('Rep of PISMC / NESPAK', colCenterLeft, row2Y, { align: 'center' });
            doc.text(app.districtName || '', colCenterLeft, row2Y + 4, { align: 'center' });
            doc.text('(Member)', colCenterLeft, row2Y + 8, { align: 'center' });

            // Final Footer Section (No. / Dated + Copy to + Convener)
            let footerY = row2Y + 20;
            doc.setFontSize(10);
            doc.text(`NO. ________________________`, margin, footerY);
            doc.text(`Dated  _________________`, pageWidth / 2 - 10, footerY);

            footerY += 10;
            doc.setFont('times', 'normal');
            doc.text('Copy for information to.', margin, footerY);
            
            footerY += 5;
            const copiesList = [
                '1. The Director General Agricultural (Field) Punjab, Lahore',
                '2-5. All Committee Members.',
                `6. M/S ${r.firmName || app.bookedByFirmName || 'N/A'}`
            ];
            
            copiesList.forEach((text, line) => {
                doc.text(text, margin + 5, footerY + (line * 5));
            });

            // Convener Signature (DD AE) on the Right of Member 4 (Row 2 Right)
            doc.setFont('times', 'bold');
            doc.setFontSize(9);
            doc.text('Deputy Director Agricultural Engineering', colCenterRight, row2Y, { align: 'center' });
            doc.text(app.districtName || '', colCenterRight, row2Y + 4, { align: 'center' });
            doc.text('(Convener)', colCenterRight, row2Y + 8, { align: 'center' });
          }

          const fileName = singleApp ? `DIC_Report_${singleApp.applicationNumber}.pdf` : `DIC_Batch_${this.reportId()}.pdf`;
          doc.save(fileName);
          this.snackBar.open(`${singleApp ? 'Report' : 'Batch'} Exported Successfully!`, 'Success', { duration: 3000 });

        } catch (error) {
          console.error('DIC Generation Error:', error);
          this.snackBar.open('Error generating DIC report!', 'Dismiss', { duration: 3000 });
        } finally {
          this.isGeneratingReport.set(false);
        }
      },
      error: (err) => {
        this.isGeneratingReport.set(false);
        this.snackBar.open('Error fetching data for DIC report!', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoadingReport.set(true);
      this.fileUploadService.upload(file).subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.Response) {
             const fileName = event.body.fileName;
             this.reportService.updateSignedDocument(this.internalReportId!, fileName).subscribe({
               next: (updatedReport) => {
                 this.initFromReport(updatedReport);
                  this.snackBar.open('Signed document uploaded and associated successfully!', 'OK', { duration: 3000 });
                 this.isLoadingReport.set(false);
                 // Optional submit/approve; then return to QIC reports list (same as cancel on dialog)
                 this.openSubmitConfirmation(this.isConvener() ? 'approve' : 'submit', true);
               },
               error: (err) => {
                 this.isLoadingReport.set(false);
                 console.error('Failed to update report document', err);
                 this.snackBar.open('Failed to associate document with report.', 'Error', { duration: 5000 });
               }
             });
          }
        },
        error: (err) => {
          this.isLoadingReport.set(false);
          console.error('File upload failed', err);
          this.snackBar.open('File upload failed. Please try again.', 'Error', { duration: 5000 });
        }
      });
    }
  }

   public openSubmitConfirmation(mode: 'submit' | 'approve' = 'submit', navigateToListAfter = false) {
    const dialogRef = this.dialog.open(SubmitReportDialogComponent, {
      width: '450px',
      data: {
        reportNumber: this.reportId(),
        totalApps: this.report()?.totalApps || 0,
        mode: mode
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        if (mode === 'approve') {
          this.approveReport(navigateToListAfter);
        } else {
          this.submitReport(navigateToListAfter);
        }
      } else if (navigateToListAfter) {
        this.navigateToQicReportsList();
      }
    });
  }

  viewAppHistory(app: any) {
    this.router.navigate(['/portal/applications/details', app.id || app.applicationId]);
  }

  downloadDocument() {
    const report = this.report();
    if (report && report.signedDocumentPath) {
      const url = `${environment.apiUrl}/api/files/${report.signedDocumentPath}`;
      window.open(url, '_blank');
    } else {
      this.snackBar.open('No signed document available for download.', 'Info', { duration: 3000 });
    }
  }

  downloadGeneratedReport() {
    const report = this.report();
    if (report && report.generatedDocumentPath) {
      const url = `${environment.apiUrl}/api/files/${report.generatedDocumentPath}`;
      window.open(url, '_blank');
    } else {
      this.snackBar.open('No generated report found to download.', 'Info', { duration: 3000 });
    }
  }

  downloadBill() {
    const report = this.report();
    if (report && report.generatedBillPath) {
      const url = `${environment.apiUrl}/api/files/${report.generatedBillPath}`;
      window.open(url, '_blank');
    }
  }

  downloadInvoice() {
    const report = this.report();
    if (report?.generatedInvoicePath) {
      const url = `${environment.apiUrl}/api/files/${report.generatedInvoicePath}`;
      window.open(url, '_blank');
    } else {
      this.snackBar.open('No invoice file available for download.', 'Info', { duration: 3000 });
    }
  }

  private async uploadPdfGetFileName(file: File): Promise<string> {
    const name = await firstValueFrom(
      this.fileUploadService.upload(file).pipe(
        filter((e) => e.type === HttpEventType.Response),
        map((e: any) => e.body?.fileName as string)
      )
    );
    if (!name) {
      throw new Error('Upload response missing fileName');
    }
    return name;
  }

  /**
   * Sales tax invoice: centered content block on A4 for letterhead; tables share one width for a clean “plate”.
   */
  private buildSalesTaxInvoicePdf(report: any, passedApps: any[], billDate: string): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const blockW = 178;
    const side = (pageW - blockW) / 2;
    const contentW = blockW;

    const fmt = (n: number) => Math.round(n).toLocaleString('en-PK');
    const gstRate = 0.18;

    const supplierName = report?.firmName || 'Supplier';
    const taxOrBlank = (v: unknown) => {
      const s = v != null ? String(v).trim() : '';
      return s.length > 0 ? s : '';
    };
    const supplierNtn = taxOrBlank(report?.firmNtn);
    const supplierStrn = taxOrBlank(report?.firmStrn);

    const labelStyle = { fontStyle: 'bold' as const, fillColor: [236, 239, 242] as [number, number, number] };

    autoTable(doc, {
      startY: 56,
      theme: 'grid',
      tableWidth: contentW,
      styles: {
        font: 'times',
        fontSize: 6.8,
        cellPadding: { top: 0.45, bottom: 0.45, left: 1.1, right: 1.1 },
        valign: 'middle',
        textColor: [15, 23, 42],
        lineColor: [30, 41, 59],
        lineWidth: 0.12
      },
      body: [
        [
          {
            content: 'SALES TAX INVOICE',
            colSpan: 4,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fontSize: 10,
              textColor: [15, 23, 42],
              fillColor: [176, 184, 194],
              minCellHeight: 5.5
            }
          }
        ],
        [
          {
            content: 'PARTICULARS OF SUPPLIER',
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 6.5,
              fillColor: [214, 219, 226],
              minCellHeight: 3.6
            }
          },
          {
            content: 'PARTICULARS OF BUYER',
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 6.5,
              fillColor: [214, 219, 226],
              minCellHeight: 3.6
            }
          }
        ],
        [
          { content: 'Date', styles: labelStyle },
          billDate,
          { content: 'Time of supply', styles: labelStyle },
          ''
        ],
        [
          { content: "Supplier's Name", styles: labelStyle },
          supplierName,
          { content: "Buyer's Name", styles: labelStyle },
          'Director General Agriculture Field Lahore'
        ],
        [
          { content: 'Address', styles: labelStyle },
          '',
          { content: 'Address', styles: labelStyle },
          'Lahore'
        ],
        [
          { content: 'NTN No.', styles: labelStyle },
          supplierNtn,
          { content: 'FTN', styles: labelStyle },
          '9020503-7'
        ],
        [
          { content: 'S.T Reg. No.', styles: { ...labelStyle, valign: 'middle' as const } },
          { content: supplierStrn, styles: { valign: 'middle' as const } },
          {
            content: 'Terms Of Sale',
            colSpan: 2,
            styles: {
              ...labelStyle,
              fontSize: 8.4,
              minCellHeight: 11,
              valign: 'top' as const,
              cellPadding: { top: 1.2, bottom: 3, left: 1.1, right: 1.1 }
            }
          }
        ]
      ],
      columnStyles: {
        0: { cellWidth: contentW * 0.17 },
        1: { cellWidth: contentW * 0.33 },
        2: { cellWidth: contentW * 0.17 },
        3: { cellWidth: contentW * 0.33 }
      },
      margin: { left: side, right: side }
    });

    const y = ((doc as any).lastAutoTable?.finalY as number) + 2.5;

    const rows: (string | number)[][] = [];
    let sumExcl = 0;
    let sumTax = 0;
    let sumIncl = 0;

    const byImplement = new Map<
      string,
      { qty: number; sumIncl: number; sumExcl: number; sumTax: number }
    >();

    for (const app of passedApps) {
      const incl = Number(app.totalCostPrice) || 0;
      const excl = Math.round(incl / (1 + gstRate));
      const tax = incl - excl;
      sumExcl += excl;
      sumTax += tax;
      sumIncl += incl;

      const key = String(app.implementName || 'Goods').trim() || 'Goods';
      const cur = byImplement.get(key) ?? { qty: 0, sumIncl: 0, sumExcl: 0, sumTax: 0 };
      cur.qty += 1;
      cur.sumIncl += incl;
      cur.sumExcl += excl;
      cur.sumTax += tax;
      byImplement.set(key, cur);
    }

    for (const [name, g] of Array.from(byImplement.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const unitIncl = g.qty > 0 ? Math.round(g.sumIncl / g.qty) : 0;
      rows.push([name, g.qty, fmt(unitIncl), fmt(g.sumExcl), '18%', fmt(g.sumTax), fmt(g.sumIncl)]);
    }

    const withholding = Math.round(sumTax / 5);
    const finalTax = sumTax - withholding;

    autoTable(doc, {
      startY: y,
      head: [[
        'Description Of Goods',
        'Qty',
        'Price',
        'Sales Tax Excl.\nValue Rs.',
        'Rate Of\nSale Tax',
        'Sales\nTaxable',
        'Value Including\nSales Tax'
      ]],
      body: rows,
      foot: [
        [
          { content: 'Total', styles: { fontStyle: 'bold', halign: 'left' } },
          '',
          '',
          { content: fmt(sumExcl), styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          { content: fmt(sumTax), styles: { fontStyle: 'bold', halign: 'right' } },
          { content: fmt(sumIncl), styles: { fontStyle: 'bold', halign: 'right' } }
        ],
        [
          {
            content: 'Deduction at source 1/5th Withholding Tax on GST',
            colSpan: 4,
            styles: { halign: 'left', fontStyle: 'bold' }
          },
          { content: '1/5th', styles: { halign: 'right' } },
          { content: fmt(withholding), styles: { halign: 'right' } },
          ''
        ],
        [
          { content: 'Total:', styles: { fontStyle: 'bold', halign: 'left' } },
          '',
          '',
          { content: fmt(sumExcl), styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          { content: fmt(finalTax), styles: { fontStyle: 'bold', halign: 'right' } },
          { content: fmt(sumIncl), styles: { fontStyle: 'bold', halign: 'right' } }
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        font: 'times',
        cellPadding: { top: 0.5, bottom: 0.5, left: 0.7, right: 0.7 },
        valign: 'middle',
        textColor: [15, 23, 42],
        lineColor: [30, 41, 59],
        lineWidth: 0.12
      },
      headStyles: { fillColor: [200, 206, 214], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 6.5 },
      footStyles: { fillColor: [255, 255, 255], textColor: [15, 23, 42], fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: contentW * 0.28, halign: 'left' },
        1: { cellWidth: contentW * 0.07, halign: 'right' },
        2: { cellWidth: contentW * 0.12, halign: 'right' },
        3: { cellWidth: contentW * 0.15, halign: 'right' },
        4: { cellWidth: contentW * 0.1, halign: 'center' },
        5: { cellWidth: contentW * 0.13, halign: 'right' },
        6: { cellWidth: contentW * 0.15, halign: 'right' }
      },
      margin: { top: 56, left: side, right: side, bottom: 42 },
      tableWidth: contentW
    });

    let footY = ((doc as any).lastAutoTable?.finalY as number) + 5;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (footY + 55 > pageHeight - 15) {
      doc.addPage();
      footY = 56;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const netInclLine = `Net Sales Tax Inclusive Value = ${fmt(sumIncl)}`;
    const saleTaxLine = `Sale Tax Rs. = ${fmt(sumTax)}`;
    doc.text(netInclLine, side + contentW, footY, { align: 'right' });
    footY += 7;
    doc.text(saleTaxLine, side + contentW, footY, { align: 'right' });
    footY += 11;
    const fillUnderscoresShort = (label: string, y: number, bold: boolean) => {
      doc.setFont('times', bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      const gap = ' ';
      doc.text(label + gap, side, y);
      const xAfterLabel = side + doc.getTextWidth(label + gap);
      const maxX = xAfterLabel + contentW / 3;
      let underscores = '';
      while (xAfterLabel + doc.getTextWidth(underscores + '_') <= maxX) {
        underscores += '_';
      }
      doc.text(underscores, xAfterLabel, y);
    };
    doc.setTextColor(15, 23, 42);
    fillUnderscoresShort('Signature:', footY, false);
    footY += 14;
    fillUnderscoresShort('Stamp:', footY, false);
    footY += 14;
    fillUnderscoresShort('Proprietor:', footY, true);
    doc.setTextColor(0, 0, 0);

    // Add Page Numbers to the Invoice PDF
    const totalInvoicePages = doc.getNumberOfPages();
    for (let i = 1; i <= totalInvoicePages; i++) {
      doc.setPage(i);
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${totalInvoicePages}`, side, doc.internal.pageSize.getHeight() - 10);
    }

    return doc;
  }

  generateBill() {
    const report = this.report();
    if (!report) return;

    this.isGeneratingBill.set(true);
    this.billStep.set('Fetching applications data...');
    
    // Fetch all applications for the report without pagination to ensure bill is complete
    this.reportService.getReportApplications(this.internalReportId!, '', 0, 1000).pipe(
      finalize(() => {
        // Only stop loading if we haven't proceeded to the next stage
      })
    ).subscribe({
      next: async (page: any) => {
        this.billStep.set('Generating PDF Document...');
        const passedApps = (page.content || []).filter((a: any) => a.localDecision === 'PASSED');
        
        if (passedApps.length === 0) {
          this.isGeneratingBill.set(false);
          this.snackBar.open('No passed applications found for bill generation.', 'Error', { duration: 3000 });
          return;
        }

        try {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 15;

          const firstApp = passedApps.length > 0 ? passedApps[0] : {};
          const billDistrict = firstApp.districtName ?? '';
          const qicDate = report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('en-GB') : (report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB') : 'N/A');
          const billDate = new Date().toLocaleDateString('en-GB');

          // Space for Letterhead (approx 60mm)
          let currentY = 60;

          // To Section 
          doc.setFont('times', 'bold');
          doc.setFontSize(14);
          
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          doc.text('“PUNJAB CLEAN AIR PROGRAM – AGRICULTURE COMPONENT”', pageWidth / 2, currentY, { align: 'center' });
          currentY += 6;
          doc.setFontSize(13);
          doc.text('FIELD WING OF AGRICULTURE DEPARTMENT', pageWidth / 2, currentY, { align: 'center' });
          currentY += 6;
          doc.setFontSize(12);
          doc.text('GOVERNMENT OF THE PUNJAB', pageWidth / 2, currentY, { align: 'center' });
          currentY += 8;
          
          currentY += 8; 

          // Header Table
          doc.setDrawColor(0);
          doc.setLineWidth(0.2);
          
          // Header Row
          doc.rect(margin, currentY, pageWidth - (margin * 2), 22);
          doc.setFont('times', 'bold');
          doc.setFontSize(10);
          const firmNtn = report?.firmNtn ? String(report.firmNtn).trim() : '__________________';
          const firmStrn = report?.firmStrn ? String(report.firmStrn).trim() : '__________________';
          doc.text(`NTN#: ${firmNtn}`, margin + 5, currentY + 7);
          doc.setFontSize(15);
          doc.text(`BILL / INVOICE`, pageWidth / 2, currentY + 8, { align: 'center' });
          doc.setFontSize(11);
          doc.text(`${billDistrict} - ${firstApp.implementName || 'N/A'}`, pageWidth / 2, currentY + 14, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`STRN: ${firmStrn}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });
          
          // District and Implement labels (Handwritten in image)
          doc.setFontSize(11);
          doc.text(`District: ${billDistrict}`, margin + 5, currentY + 18);
          doc.text(`Implement: ${firstApp.implementName || '_________________'}`, pageWidth - margin - 5, currentY + 18, { align: 'right' });
          currentY += 22;

          // Ref and Dates Row
          doc.rect(margin, currentY, pageWidth - (margin * 2), 12);
          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          
          doc.text(`QIC Report No: ${report.reportNumber || 'N/A'}`, margin + 5, currentY + 4.5);
          doc.text(`QIC Date: ${qicDate}`, margin + 5, currentY + 9);
          
          doc.setFont('times', 'bold');
          doc.setFontSize(8);
          doc.text('To: The Director General Agriculture (Field) Punjab Lahore', pageWidth / 2, currentY + 7, { align: 'center' });
          doc.setFont('times', 'normal');
          doc.setFontSize(9);

          doc.text(`Bill No: ${(report.reportNumber || '').replace('QIC', 'BILL')}`, pageWidth - margin - 5, currentY + 4.5, { align: 'right' });
          doc.text(`Bill Date: ${billDate}`, pageWidth - margin - 5, currentY + 9, { align: 'right' });
          
          // Add QR Code to Bill
          const baseUrl = window.location.origin;
          const qrText = `${baseUrl}/verify-report?type=BILL&id=${report.reportNumber}`;
          let qrDataUrl = '';
          try {
              qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 100 });
          } catch(e) {}

          const drawDocFooter = (pdfDoc: any) => {
              if (!qrDataUrl) return;
              const pHeight = pdfDoc.internal.pageSize.getHeight();
              const pWidth = pdfDoc.internal.pageSize.getWidth();
              pdfDoc.addImage(qrDataUrl, 'PNG', pWidth - margin - 25, pHeight - 35, 22, 22);
              pdfDoc.setFont('times', 'bold');
              pdfDoc.setFontSize(8);
              pdfDoc.setTextColor(0, 0, 0);
              pdfDoc.text('Scan to Verify', pWidth - margin - 14, pHeight - 11, { align: 'center' });
          };

          currentY += 16;

          // Main Table
          const tableData = passedApps.map((app: any, index: number) => [
            index + 1,
            app.uniqueImplementId || 'N/A',
            app.farmerName,
            app.cnic || 'N/A',
            app.address || 'N/A',
            (app.farmerShare || 0).toLocaleString(),
            (app.governmentShare || 0).toLocaleString(),
            (app.totalCostPrice || 0).toLocaleString()
          ]);

          const totalFarmerShare = passedApps.reduce((sum: number, app: any) => sum + (app.farmerShare || 0), 0);
          const totalGovtShare = passedApps.reduce((sum: number, app: any) => sum + (app.governmentShare || 0), 0);
          const totalAmount = passedApps.reduce((sum: number, app: any) => sum + (app.totalCostPrice || 0), 0);

          autoTable(doc, {
            startY: currentY,
            head: [['Sr. No', 'Unique ID', 'Farmer Name', 'CNIC', 'Farmer Address', 'Farmer Share (PKR)', 'Govt. Share (PKR)', 'Total Amount (PKR)']],
            body: tableData,
            foot: [[
              { content: 'Grand Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
              { content: totalFarmerShare.toLocaleString(), styles: { fontStyle: 'bold' } },
              { content: totalGovtShare.toLocaleString(), styles: { fontStyle: 'bold' } },
              { content: totalAmount.toLocaleString(), styles: { fontStyle: 'bold' } }
            ]],
            theme: 'grid',
            styles: { fontSize: 8, font: 'times' },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { top: 60, left: margin, right: margin, bottom: 40 },
            didDrawPage: (data) => {
                drawDocFooter(doc);
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;

          // Summary Section
          const summaryStartX = pageWidth / 2 - 10;
          const summaryWidth = pageWidth / 2 + 10 - margin;
          
          doc.setFont('times', 'bold');
          doc.setFontSize(9);
          
          const salesTax = Math.round(totalAmount / 1.18 * 0.18);
          
          const summaryLines = [
            { label: 'Total Amount including GST (PKR)', value: totalAmount.toLocaleString() },
            { label: 'Sales Tax Amount (PKR)', value: salesTax.toLocaleString() },
            { label: 'Farmer Share (PKR)', value: totalFarmerShare.toLocaleString() },
            { label: 'Govt. Share Balance (To be paid) (PKR)', value: totalGovtShare.toLocaleString() }
          ];

          // Check if the remaining space is enough for the entire summary and footer block (approx 110mm)
          const pageHeight = doc.internal.pageSize.getHeight();
          if (currentY + 110 > pageHeight - 40) {
            doc.addPage();
            currentY = 60;
            drawDocFooter(doc);
          }

          summaryLines.forEach((line, i) => {
            doc.rect(margin + 20, currentY, pageWidth - (margin * 2) - 40, 8);
            doc.setFont('times', 'normal');
            doc.text(line.label, margin + 25, currentY + 5.5);
            doc.setFont('times', 'bold');
            doc.text(line.value, pageWidth - margin - 25, currentY + 5.5, { align: 'right' });
            currentY += 8;
          });

          currentY += 10;

          // Amount in words
          doc.setFont('times', 'normal');
          doc.text('Govt. Share Amount in words', margin + 5, currentY);
          currentY += 5;
          doc.rect(margin + 5, currentY, pageWidth - (margin * 2) - 10, 8);
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          doc.text(`${this.amountToWords(totalGovtShare)} Rupees Only`, margin + 10, currentY + 6);
          currentY += 15;

          // Footer Text
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          
          const footerLines = [
            'It is requested that above mentioned amount of Subsidy i.e. (Govt. Share) may kindly be released.',
            '',
            'Following Documents are attached herewith:',
            '1. Copy of CNIC of Winner Farmer(s)',
            '2. Copy of Allotment Letter(s)',
            '3. Copy of Booking Receipt(s)',
            '4. Copy of Delivery Receipt(s)',
            '5. Copy of QIC Report'
          ];
          
          footerLines.forEach((line) => {
            doc.text(line, margin + 5, currentY);
            currentY += 5;
          });

          // Add Page Numbers to the Bill PDF
          const totalBillPages = doc.getNumberOfPages();
          for (let i = 1; i <= totalBillPages; i++) {
            doc.setPage(i);
            doc.setFont('times', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${i} of ${totalBillPages}`, margin + 5, doc.internal.pageSize.getHeight() - 10);
          }

          const pdfBlob = doc.output('blob');
          const fileName = `Bill_${report.reportNumber || 'Report'}.pdf`;

          const invoiceDoc = this.buildSalesTaxInvoicePdf(report, passedApps, billDate);
          const invoiceBlob = invoiceDoc.output('blob');
          const invoiceFileName = `Invoice_${report.reportNumber || 'Report'}.pdf`;

          doc.save(fileName);

          const billFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          const invFile = new File([invoiceBlob], invoiceFileName, { type: 'application/pdf' });

          this.billStep.set('Uploading bill and sales tax invoice...');
          try {
            const billPath = await this.uploadPdfGetFileName(billFile);
            const invoicePath = await this.uploadPdfGetFileName(invFile);
            this.billStep.set('Finalizing record & transitioning status...');
            this.reportService.updateGeneratedBill(report.id!, billPath, invoicePath).subscribe({
              next: (updatedReport) => {
                this.initFromReport(updatedReport);
                this.isGeneratingBill.set(false);
                this.snackBar.open(
                  'Consolidated bill and sales tax invoice generated. Use Download Invoice for letterhead printing. Applications moved to DIC PENDING.',
                  'Success',
                  { duration: 6000 }
                );
              },
              error: () => {
                this.isGeneratingBill.set(false);
                this.snackBar.open('Files uploaded but failed to update report record.', 'Partial Success', { duration: 4000 });
              }
            });
          } catch {
            this.isGeneratingBill.set(false);
            this.snackBar.open('Failed to upload generated bill or invoice to server.', 'Error', { duration: 4000 });
          }

        } catch (error) {
          this.isGeneratingBill.set(false);
          console.error('Bill Gen Error:', error);
          this.snackBar.open('Error generating bill PDF.', 'Error', { duration: 3000 });
        }
      },
      error: (err) => {
        this.isGeneratingBill.set(false);
        console.error('Fetch Apps Error:', err);
        this.snackBar.open('Failed to fetch applications for bill.', 'Error', { duration: 3000 });
      }
    });
  }

  amountToWords(amount: number): string {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = amount.toString();
    if (numStr.length > 9) return 'Amount too large';
    
    const padded = numStr.padStart(9, '0');
    const n = padded.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 

    let str = '';
    
    // Crore
    const crore = parseInt(n[1]);
    if (crore > 0) {
        str += (crore < 20 ? a[crore] : b[parseInt(n[1][0])] + ' ' + a[parseInt(n[1][1])]) + 'Crore ';
    }
    
    // Lac
    const lac = parseInt(n[2]);
    if (lac > 0) {
        str += (lac < 20 ? a[lac] : b[parseInt(n[2][0])] + ' ' + a[parseInt(n[2][1])]) + 'Lac ';
    }
    
    // Thousand
    const thousand = parseInt(n[3]);
    if (thousand > 0) {
        str += (thousand < 20 ? a[thousand] : b[parseInt(n[3][0])] + ' ' + a[parseInt(n[3][1])]) + 'Thousand ';
    }
    
    // Hundred
    const hundred = parseInt(n[4]);
    if (hundred > 0) {
        str += a[hundred] + 'Hundred ';
    }
    
    // Tens and Ones
    const lastTwo = parseInt(n[5]);
    if (lastTwo > 0) {
        if (str !== '') str += 'and ';
        str += (lastTwo < 20 ? a[lastTwo] : b[parseInt(n[5][0])] + ' ' + a[parseInt(n[5][1])]);
    }

    return str.trim();
  }

  downloadExcelList() {
    if (!this.internalReportId) return;

    this.snackBar.open(`Preparing Excel Download...`, 'Please wait', { duration: 2000 });
    this.reportService.getReportApplications(this.internalReportId, '', 0, 10000).subscribe({
      next: (res: any) => {
        let apps = res.content || [];
        if (apps.length === 0) {
          this.snackBar.open('No applications found to download', 'OK', { duration: 3000 });
          return;
        }

        let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        html += '<head><meta charset="utf-8"></head><body>';
        html += '<table border="1">';
        html += '<tr>';
        
        html += '<th>App No</th><th>Farmer Name</th><th>Father Name</th><th>CNIC</th><th>Address</th><th>District</th><th>Tehsil/Markaz</th><th>Firm Name</th><th>Implement Name</th><th>Implement ID</th><th>Tracker IMEI</th><th>Status</th>';
        
        html += '</tr>';

        for (const app of apps) {
          html += '<tr>';
          const firmName = app.bookedByFirmName || this.report()?.firmName || '';
          const farmerName = app.farmerName || '';
          const fatherName = app.fatherName || '';
          const cnic = app.cnic || '';
          const implementName = app.implementName || '';
          const implementId = app.uniqueImplementId || '';
          const status = app.localDecision || 'PENDING';

          html += `<td>${app.applicationNumber || ''}</td>`;
          html += `<td>${farmerName}</td>`;
          html += `<td>${fatherName}</td>`;
          html += `<td style="mso-number-format:'\\@'">${cnic}</td>`;
          html += `<td>${app.address || ''}</td>`;
          html += `<td>${app.districtName || ''}</td>`;
          html += `<td>${app.markazName || ''}</td>`;
          html += `<td>${firmName}</td>`;
          html += `<td>${implementName}</td>`;
          html += `<td>${implementId}</td>`;
          html += `<td style="mso-number-format:'\\@'">${app.trackerImei || ''}</td>`;
          html += `<td>${status}</td>`;
          html += '</tr>';
        }

        html += '</table></body></html>';

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `QIC_Applications_List_${this.reportId()}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.snackBar.open('Excel downloaded successfully!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Download error:', err);
        this.snackBar.open('Failed to fetch data for download', 'Error', { duration: 3000 });
      }
    });
  }

  goBack() {
    window.history.back();
  }
}
