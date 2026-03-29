import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FarmerApplicationService } from '../../../../core/services/farmer-application.service';
import { InspectionQICReportService } from '../../../../core/services/inspection-qic-report.service';
import { FarmerApplication } from '../../../../core/models/quality-inspection.model';
import { QicRequestDialogComponent } from '../qic-form/qic-request-dialog.component';
import { TrackerCalibrationDialogComponent } from '../qic-form/tracker-calibration-dialog.component';
import { DeferralRemarksDialogComponent } from './deferral-remarks-dialog.component';
import { PassConfirmationDialogComponent } from './pass-confirmation-dialog.component';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-inspection-details-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="wizard-selector-page">
      <header class="wizard-header">
        <div class="h-main">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-group">
            <div class="process-id">QIC PROCESS HUB</div>
            <h1>{{ firmName || 'Firm' }} Batch Controller</h1>
          </div>
        </div>
        
        <div class="h-progress">
          <div class="step active">
            <div class="node">1</div>
            <span>Select Application</span>
          </div>
          <div class="line"></div>
          <div class="step">
            <div class="node">2</div>
            <span>Verification</span>
          </div>
        </div>
      </header>

      <div class="luxe-filter-belt">
          <mat-form-field appearance="outline" class="search-field luxe">
              <mat-label>Search Farmer / CNIC</mat-label>
              <input matInput [(ngModel)]="searchQuery" (ngModelChange)="currentPage = 0" placeholder="Filter current batch...">
              <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          
          <div class="active-filters" *ngIf="statusFilter()">
              <div class="luxe-chip pinned">
                  <mat-icon>verified</mat-icon>
                  {{ statusFilter()?.replace('_', ' ') }}
                  <!-- Clear button removed to lock the mandatory filter -->
              </div>
          </div>
          
          <div class="stats-group" *ngIf="!isLoading()">
              <div class="pill">TOTAL: {{ applications().length }}</div>
              <div class="pill active" *ngIf="searchQuery || statusFilter()">FOUND: {{ filteredApps().length }}</div>
          </div>

          <div class="header-main-actions" *ngIf="!isLoading()">
              <button mat-flat-button class="proceed-step-btn" 
                      [disabled]="!hasChanges()"
                      (click)="proceedToStep2()">
                  <div class="btn-content">
                      <mat-icon>double_arrow</mat-icon>
                      <span>Proceed to Approval</span>
                      <div class="change-badge" *ngIf="processedCount() > 0">{{ processedCount() }}</div>
                  </div>
              </button>
          </div>
      </div>

      <div class="loading-state" *ngIf="isLoading()">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>Loading application cards...</p>
      </div>

      <div class="content-wrapper" *ngIf="!isLoading()">
        <div class="cards-grid">
            <div class="application-card" *ngFor="let app of paginatedApps()">
            <div class="card-header">
                <div class="app-header-top">
                    <div class="id-wrapper">
                        <span class="id-label">Application</span>
                        <span class="app-no">#{{ app.applicationNumber }}</span>
                    </div>
                    <div class="header-right-group">
                        <button mat-flat-button class="live-track-btn" 
                                (click)="locateImplement(app); $event.stopPropagation()">
                            <span>Live Tracking</span>
                            <div class="live-dot"></div>
                        </button>
                    </div>
                </div>
                <div class="implement-badge">
                <mat-icon>settings_suggest</mat-icon>
                {{ app.implementName }}
                </div>
            </div>

            <div class="card-body">
                <div class="body-split">
                  <div class="farmer-info">
                    <div class="info-row">
                        <div class="icon-container">
                            <mat-icon>person</mat-icon>
                        </div>
                        <div class="text">
                        <span class="label">Farmer Name</span>
                        <span class="val">{{ app.farmerName }}</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="icon-container">
                            <mat-icon>badge</mat-icon>
                        </div>
                        <div class="text">
                        <span class="label">CNIC Number</span>
                        <span class="val">{{ app.cnic }}</span>
                        </div>
                    </div>
                    <div class="info-row" *ngIf="app.trackerImei">
                        <div class="icon-container">
                            <mat-icon>satellite_alt</mat-icon>
                        </div>
                        <div class="text">
                        <span class="label">Tracker IMEI</span>
                        <span class="val imei-text">{{ app.trackerImei }}</span>
                        </div>
                    </div>
                    <div class="info-row" *ngIf="app.uniqueImplementId">
                        <div class="icon-container accent">
                            <mat-icon>verified</mat-icon>
                        </div>
                        <div class="text">
                        <span class="label">Unique machine / implement ID</span>
                        <span class="val id-val">{{ app.uniqueImplementId }}</span>
                        </div>
                    </div>
                  </div>
                  <div class="qr-thumbnail" *ngIf="qrCodes()[app.id!]">
                     <img [src]="qrCodes()[app.id!]" alt="App QR">
                     <span class="qr-label">SECURE ID</span>
                  </div>
                </div>
            </div>

            <div class="card-footer decision-footer">
                <button mat-flat-button class="reject-card-btn" 
                        (click)="rejectQic(app)" 
                        [disabled]="!!app.localDecision">
                    <mat-icon>{{ app.localDecision === 'DEFERRED' ? 'cancel' : 'close' }}</mat-icon>
                    {{ app.localDecision === 'DEFERRED' ? 'DEFERRED' : 'DEFER' }}
                </button>
                <div class="footer-sep"></div>
                <button mat-flat-button class="pass-card-btn" 
                        [class.passed]="app.localDecision === 'PASSED'"
                        (click)="passQic(app)" 
                        [disabled]="!!app.localDecision">
                    <mat-icon>{{ app.localDecision === 'PASSED' ? 'verified' : 'check_circle' }}</mat-icon>
                    {{ app.localDecision === 'PASSED' ? 'PASSED' : 'PASS' }}
                </button>
            </div>
            </div>

            <div class="empty-state" *ngIf="filteredApps().length === 0">
            <mat-icon>find_in_page</mat-icon>
            <h3>No applications match your search</h3>
            <p>Try different keywords or clear the search filter.</p>
            </div>
        </div>

        <div class="paginator-container" *ngIf="filteredApps().length > 0">
            <mat-paginator 
                [length]="filteredApps().length"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 20, 50]"
                (page)="onPageChange($event)"
                aria-label="Select page">
            </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes livePulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(3.5); opacity: 0; }
    }

    .wizard-selector-page { 
      padding: 40px; background: #f8fafc; min-height: 100vh;
      animation: fadeIn 0.4s ease-out;
    }

    .wizard-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;
      .h-main { 
        display: flex; align-items: center; gap: 20px; 
        .back-btn { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); color: #64748b; &:hover { color: #0f172a; } }
        .title-group {
          .process-id { font-size: 11px; font-weight: 800; color: #3b82f6; letter-spacing: 1px; }
          h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; }
        }
      }
    }

    .h-progress {
      display: flex; align-items: center; gap: 12px;
      .step {
        display: flex; align-items: center; gap: 8px; opacity: 0.4;
        .node { width: 32px; height: 32px; border-radius: 50%; background: #94a3b8; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; }
        span { font-size: 13px; font-weight: 800; color: #64748b; }
        &.active { opacity: 1; .node { background: #3b82f6; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); } span { color: #0f172a; } }
      }
      .line { width: 40px; height: 2.5px; background: #e2e8f0; border-radius: 2px; }
    }

    .luxe-filter-belt {
      display: flex; align-items: center; gap: 24px; padding: 12px 24px; background: white; border-radius: 20px; margin-bottom: 32px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid #f1f5f9;
      .search-field.luxe { margin-bottom: -1.25em; flex: 1; max-width: 450px; }
    }

    .luxe-chip {
      display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: #eff6ff; border-radius: 12px; font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      button { width: 20px; height: 20px; line-height: 20px; mat-icon { font-size: 14px; } }
      &.pinned { background: #0f172a; color: white; border: none; mat-icon { color: #3b82f6; } padding-right: 20px; }
    }

    .stats-group {
      display: flex; gap: 8px;
      .pill { padding: 6px 16px; background: #f1f5f9; border-radius: 20px; font-size: 10px; font-weight: 800; color: #64748b; &.active { background: #0f172a; color: white; } }
    }

    .header-main-actions {
       margin-left: 20px;
       .proceed-step-btn {
          height: 48px; padding: 0 24px; border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
          color: white !important; font-weight: 800; border: none;
          box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          
          .btn-content { display: flex; align-items: center; gap: 12px; }
          mat-icon { font-size: 20px; width: 20px; height: 20px; margin: 0; }
          
          .change-badge {
             min-width: 22px; height: 22px; background: white; color: #2563eb; 
             border-radius: 50%; display: flex; align-items: center; justify-content: center;
             font-size: 11px; font-weight: 900; box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          }

          &:disabled {
             background: #f1f5f9 !important; color: #94a3b8 !important; box-shadow: none; cursor: not-allowed;
             .change-badge { background: #cbd5e1; color: #94a3b8; }
          }
          
          &:not(:disabled):hover {
             transform: scale(1.02) translateY(-2px);
             box-shadow: 0 15px 25px -5px rgba(37, 99, 235, 0.5);
          }
       }
    }

    .loading-state { text-align: center; padding: 100px; p { margin-top: 16px; color: #64748b; } }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 28px;
      margin-bottom: 40px;
    }

    .application-card {
      background: white; border-radius: 24px; border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden; display: flex; flex-direction: column;

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08);
        border-color: rgba(76, 175, 80, 0.2);
      }

      .card-header {
        padding: 24px; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
        border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 16px;
        
        .app-header-top {
          display: flex; justify-content: space-between; align-items: center;
          
          .id-wrapper {
             display: flex; flex-direction: column;
             .id-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
             .app-no { font-family: 'JetBrains Mono', monospace; font-weight: 900; color: #0f172a; font-size: 18px; line-height: 1.2; }
          }

          .header-right-group {
             display: flex; align-items: center;
          }

          .live-track-btn {
              height: 34px; padding: 0 16px; background: #f0fdf4; color: #166534; border-radius: 12px;
              font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px;
              display: inline-flex !important; align-items: center !important; justify-content: center !important;
              border: 1px solid #dcfce7; line-height: 1; transition: all 0.3s;
              
              span { white-space: nowrap; }
              
              .live-dot {
                  width: 8px; height: 8px; background: #10b981; border-radius: 50%;
                  float: right; margin-left: 10px; margin-top: 2px;
                  position: relative; flex-shrink: 0;
                  &::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: #10b981; animation: livePulse 1.8s infinite; }
              }
              &:hover { background: #ffffff; border-color: #10b981; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }
          }
        }

        .implement-badge {
          display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 800; color: #2e7d32;
          background: #e8f5e9; padding: 8px 16px; border-radius: 14px; width: fit-content; border: 1px solid rgba(76, 175, 80, 0.1);
          mat-icon { font-size: 20px; width: 20px; height: 20px; color: #4CAF50; }
        }
      }

      .card-body {
        padding: 24px; flex: 1;
        .body-split {
          display: flex; gap: 16px; align-items: flex-start;
          .farmer-info { flex: 1; }
          .qr-thumbnail {
             width: 100px; padding: 8px; background: #fff; border-radius: 12px; border: 1.5px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; gap: 4px;
             img { width: 100%; height: auto; }
             .qr-label { font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          }
        }
        .info-row {
            display: flex; gap: 18px; margin-bottom: 20px;
            &:last-child { margin-bottom: 0; }
            .icon-container {
               width: 40px; height: 40px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.3s;
               &.accent { background: #eff6ff; color: #3b82f6; }
            }
            &:hover .icon-container { background: #f8fafc; }
            .text {
              display: flex; flex-direction: column; justify-content: center;
              .label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
              .val { font-size: 16px; font-weight: 700; color: #1e293b; }
              .imei-text { color: #2563eb; font-family: 'JetBrains Mono', monospace; font-size: 14px; letter-spacing: -0.5px; }
              .id-val { color: #059669; font-weight: 800; }
            }
        }
      }

      .decision-footer {
        padding: 12px 16px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; gap: 8px;
        .footer-sep { width: 1px; height: 32px; background: #e2e8f0; align-self: center; }
        .pass-card-btn {
          flex: 1; height: 40px; border-radius: 12px; background: #10b981; color: white; font-weight: 800; font-size: 13px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
          &:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
          
          &.passed {
             background: #4f46e5 !important; /* Premium Indigo for Verified State */
             color: white !important;
             box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
             opacity: 1 !important;
             cursor: default;
             transform: none !important;
          }
        }
        .reject-card-btn {
          flex: 0.6; height: 40px; border-radius: 12px; background: white; color: #ef4444; border: 1.5px solid #fecaca; font-weight: 800; font-size: 13px;
          mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
          transition: all 0.3s; &:hover { background: #fef2f2; border-color: #ef4444; transform: translateY(-2px); }
        }
      }
    }

    .empty-state {
      grid-column: 1 / -1; text-align: center; padding: 100px 40px; color: #94a3b8; background: white; border-radius: 32px; border: 2px dashed #f1f5f9;
      mat-icon { font-size: 80px; width: 80px; height: 80px; margin-bottom: 24px; opacity: 0.3; color: #4CAF50; }
      h3 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
      p { font-size: 16px; max-width: 400px; margin: 0 auto; line-height: 1.6; }
    }

    .paginator-container {
        margin-top: 24px; background: white; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; overflow: hidden;
    }
  `]

})
export class InspectionDetailsViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(FarmerApplicationService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  applications = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  qrCodes = signal<Record<number, string>>({});

  // Filters
  searchQuery = '';
  statusFilter = signal<string | null>(null);

  // Pagination
  pageSize = 10;
  currentPage = 0;

  districtId: number = 0;
  firmId: number = 0;
  districtName: string = '';
  firmName: string = '';

  // Filtered result computed
  filteredApps = computed(() => {
    let apps = this.applications();

    // Status filter - strictly fetch/show only REQUESTED as PENDING
    const status = this.statusFilter();
    return apps.filter(app => {
      // Search filter
      const query = this.searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        app.farmerName.toLowerCase().includes(query) ||
        app.cnic.includes(query) ||
        app.applicationNumber.toLowerCase().includes(query);

      // We only care about REQUESTED machines for this batch view
      return matchesSearch && app.status === 'QIC_REQUESTED';
    });
  });

  // Track processed apps
  processedCount = computed(() => {
    return this.applications().filter(a => !!a.localDecision).length;
  });

  hasChanges = computed(() => this.processedCount() > 0);

  // Paginated result computed
  paginatedApps = computed(() => {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredApps().slice(start, end);
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.districtId = +params['districtId'];
      this.firmId = +params['firmId'];
      this.districtName = params['districtName'];
      this.firmName = params['firmName'];

      if (params['status']) {
        this.statusFilter.set(params['status']);
      }

      if (this.districtId && this.firmId) {
        this.loadDetails();
      }
    });
  }

  loadDetails() {
    this.isLoading.set(this.applications().length === 0);
    this.appService.getInspectionDetails(this.districtId, this.firmId).subscribe({
      next: (res: any[]) => {
        // Filter out everything except QIC_REQUESTED from the source data
        const requestedOnly = res.filter(app => app.status === 'QIC_REQUESTED');
        this.applications.set(requestedOnly);
        this.generateAllQRs(requestedOnly);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load application tiles', err);
        this.isLoading.set(false);
      }
    });
  }

  async generateAllQRs(apps: any[]) {
    const qrMap: Record<number, string> = {};
    for (const app of apps) {
      if (!app.id) continue;

      const qrData = `Punjab Clean Air Program-PCAP (Agriculture Component)
Farmer Name: ${app.farmerName}
Father Name: ${app.fatherName || 'N/A'}
District: ${app.districtName || this.districtName}
CNIC: ${app.cnic}
Cell No: ${app.contactNumber || 'N/A'}
machine / implement: ${app.implementName}
Firm Name: ${app.bookedByFirmName || this.firmName}
QIC Div: ${app.divisionName || this.districtName}
Unique Implement ID: ${app.uniqueImplementId || 'PENDING'}`;

      try {
        qrMap[app.id] = await QRCode.toDataURL(qrData, {
          margin: 1,
          width: 200,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      } catch (err) {
        console.error('QR generation failed for app', app.id, err);
      }
    }
    this.qrCodes.set(qrMap);
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    // Scroll to top of results on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatStatus(status: string): string {
    // Map QIC_REQUESTED to PENDING as per user requirement
    if (status === 'QIC_REQUESTED') return 'QIC PENDING';
    return status.replace(/_/g, ' ').toLowerCase();
  }

  viewFullDetails(app: FarmerApplication) {
    this.router.navigate(['/portal/applications/details', app.id]);
  }

  locateImplement(app: any) {
    if (!app.trackerImei) {
      this.dialog.open(QicRequestDialogComponent, {
        width: '450px',
        data: {
          applicationNumber: app.applicationNumber,
          farmerName: app.farmerName,
          readonly: true // Hint that we just want to show status if not available
        }
      });
      return;
    }

    this.dialog.open(TrackerCalibrationDialogComponent, {
      data: {
        imei: app.trackerImei,
        applicationId: app.id
      },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      panelClass: 'full-screen-calibration'
    });
  }

  passQic(app: any) {
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
        // Local state update – DO NOT change 'status' property to keep cards from vanishing/changing label
        const updatedApps = this.applications().map(a => {
          if (a.id === app.id) {
            return { ...a, localDecision: 'PASSED', remarks: 'Approved locally (Pending sync)' };
          }
          return a;
        });
        this.applications.set(updatedApps);
        this.snackBar.open(`Application #${app.applicationNumber} marked as PASSED locally`, 'OK', { duration: 2000 });
      }
    });
  }

  rejectQic(app: any) {
    const dialogRef = this.dialog.open(DeferralRemarksDialogComponent, {
      width: '450px',
      data: { applicationNumber: app.applicationNumber }
    });

    dialogRef.afterClosed().subscribe(remarks => {
      if (remarks) {
        // Local state update – use 'localDecision'
        const updatedApps = this.applications().map(a => {
          if (a.id === app.id) {
            return { ...a, localDecision: 'DEFERRED', remarks: remarks };
          }
          return a;
        });
        this.applications.set(updatedApps);
        this.snackBar.open(`Application #${app.applicationNumber} marked as DEFERRED locally`, 'OK', { duration: 2000 });
      }
    });
  }

  startQic(app: any) {
    this.router.navigate(['/portal/quality-inspection/form', app.id], {
      queryParams: { appNo: app.applicationNumber }
    });
  }

  private reportService = inject(InspectionQICReportService);

  proceedToStep2() {
    const processedApps = this.applications().filter(a => !!a.localDecision);
    if (processedApps.length === 0) {
      this.snackBar.open('Please pass or defer at least one machine first.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.snackBar.open(`Finalizing decisions for ${processedApps.length} machines and generating report...`, 'Wait', { duration: 2000 });

    // Build decisions and reasons maps
    const decisions: Record<number, string> = {};
    const deferralReasons: Record<number, string> = {};
    
    processedApps.forEach(app => {
      if (app.id && app.localDecision) {
        decisions[app.id] = app.localDecision;
        // Also capture the remarks/reason
        if (app.remarks) {
          deferralReasons[app.id] = app.remarks;
        }
      }
    });

    const payload = {
      applicationIds: processedApps.map(a => a.id),
      decisions: decisions,
      deferralReasons: deferralReasons
    };

    this.reportService.createReport(payload).subscribe({
      next: (report: any) => {
        this.snackBar.open('Batch Quality Inspection Synchronized Successfully!', 'Success', { duration: 3000 });
        // Smooth transition to Step 2 with the generated report
        setTimeout(() => {
          this.router.navigate(['/portal/quality-inspection/inspection-report-view'], {
            state: {
              report: report,
              apps: processedApps
            },
            queryParams: { id: report.id } // For robustness
          });
        }, 800);
      },
      error: (err: any) => {
        console.error('Failed to synchronize inspection batch', err);
        this.snackBar.open('Network Error: Could not save inspection results. Please try again.', 'Error', { duration: 5000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/portal/quality-inspection/process']);
  }
}
