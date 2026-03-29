import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { TrackerCalibrationDialogComponent } from '../qic-form/tracker-calibration-dialog.component';
import { FarmerApplicationService, FarmerApplicationPayload } from '../../../../core/services/farmer-application.service';
import * as QRCode from 'qrcode';
import * as L from 'leaflet';

@Component({
  selector: 'app-qic-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="wizard-page">
      <!-- Full Page Loading State -->
      <div class="loading-overlay" *ngIf="isLoading()">
        <mat-spinner diameter="50" color="primary"></mat-spinner>
        <div class="l-text">Synchronizing workflow protocols...</div>
      </div>

      <header class="wizard-header">
        <div class="h-main">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-group">
            <div class="process-id">QIC PROCESS HUB #{{ applicationId }}</div>
            <h1>Inspection Workflow</h1>
          </div>
        </div>
        <div class="h-status" *ngIf="application()">
          <span class="status-chip" [attr.data-status]="application()?.status">
            {{ application()?.status?.replace('_', ' ') }}
          </span>
        </div>
      </header>

      <div class="wizard-container">
        <mat-horizontal-stepper #stepper [linear]="true">
          <!-- STEP 1: VERIFICATION & INITIALIZATION -->
          <mat-step [stepControl]="verifyForm">
            <ng-template matStepLabel>Verification & Validation</ng-template>
            
            <div class="step-content split-layout">
              <!-- Left Action Panel -->
              <div class="action-panel">
                <mat-card class="luxe-card action-card">
                  <div class="card-title">
                    <mat-icon>verified_user</mat-icon>
                    <h3>QIC Request Decision</h3>
                  </div>
                  
                  <form [formGroup]="verifyForm" class="decision-form">
                    <div class="toggle-group">
                      <label>Verification Decision</label>
                      <mat-button-toggle-group formControlName="decision" aria-label="Verification Decision">
                        <mat-button-toggle value="APPROVED" class="approve-btn">
                          <mat-icon>check_circle</mat-icon> APPROVE
                        </mat-button-toggle>
                        <mat-button-toggle value="DEFFERED" class="reject-btn">
                          <mat-icon>cancel</mat-icon> DEFFER
                        </mat-button-toggle>
                      </mat-button-toggle-group>
                    </div>

                    <div class="form-grid">
                      <mat-form-field appearance="outline" class="full-width" *ngIf="verifyForm.get('decision')?.value === 'DEFFERED'">
                        <mat-label>Defferal Reason</mat-label>
                        <textarea matInput formControlName="defferalReason" placeholder="Specify why the request is being deffered..."></textarea>
                        <mat-error>Defferal reason is mandatory for defferals</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Unique Implement ID</mat-label>
                        <input matInput formControlName="uniqueImplementId" placeholder="E.g. PCA-IMP-2024-XXXX">
                        <mat-icon matSuffix>badge</mat-icon>
                        <mat-hint>Unique serial for this machinery unit</mat-hint>
                      </mat-form-field>
                    </div>

                    <div class="map-preview-section">
                       <div class="map-header">
                          <div class="mh-left">
                            <mat-icon>satellite_alt</mat-icon>
                            <span>Live Terminal Feed</span>
                          </div>
                          <button type="button" mat-stroked-button color="primary" class="full-calib-btn" (click)="openFullCalibration()">
                             <mat-icon>fullscreen</mat-icon> Full Calibration
                          </button>
                       </div>
                       <div id="wizard-map" class="mini-map"></div>
                    </div>

                    <div class="step-actions">
                      <button mat-flat-button color="primary" class="next-btn" (click)="proceedToStep2(stepper)">
                        PROCEED TO REPORTING
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </form>
                </mat-card>
              </div>

              <!-- Right Data Panel -->
              <div class="data-panel">
                <mat-card class="luxe-card data-card profile">
                  <div class="card-title">
                    <mat-icon>person</mat-icon>
                    <h3>Farmer Dossier</h3>
                  </div>
                  <div class="profile-summary">
                    <div class="info-bit">
                      <span class="lab">NAME</span>
                      <span class="val">{{ application()?.farmerName }}</span>
                    </div>
                    <div class="info-bit">
                      <span class="lab">CNIC</span>
                      <span class="val">{{ application()?.cnic }}</span>
                    </div>
                    <div class="info-bit">
                      <span class="lab">LOCATION</span>
                      <span class="val">{{ application()?.districtName }}, {{ application()?.divisionName }}</span>
                    </div>
                    <div class="info-bit accent">
                      <span class="lab">IMPLEMENT</span>
                      <span class="val">{{ application()?.implementName }}</span>
                    </div>
                  </div>
                </mat-card>

                <mat-card class="luxe-card qr-card-v2">
                   <div class="card-title">
                      <mat-icon>qr_code_2</mat-icon>
                      <h3>Security QR Label</h3>
                   </div>
                   <div class="qr-box">
                      <img [src]="qrCodeUrl()" *ngIf="qrCodeUrl()">
                      <div class="qr-placeholder" *ngIf="!qrCodeUrl()">SCANNABLE DATA READY</div>
                   </div>
                   <p class="qr-caption">Authorized encrypted ID for field verification. Unique Implement ID must be set to synchronize.</p>
                </mat-card>
              </div>
            </div>
          </mat-step>

          <!-- STEP 2: SUMMARY & REPORT -->
          <mat-step>
            <ng-template matStepLabel>Reporting & Completion</ng-template>
            <div class="step-content final-step">
               <mat-card class="luxe-card report-hub">
                  <div class="report-id-bar">
                     <mat-icon>description</mat-icon>
                     <span>QIC REPORT SERIAL: #{{ 10000 + applicationId }}</span>
                  </div>
                  
                  <div class="final-summary-grid">
                     <div class="summary-item">
                        <label>Decision</label>
                        <div class="badge" [class.success]="verifyForm.get('decision')?.value === 'APPROVED'">
                            {{ verifyForm.get('decision')?.value }}
                        </div>
                     </div>
                     <div class="summary-item">
                        <label>Implement ID</label>
                        <div class="id-text">{{ verifyForm.get('uniqueImplementId')?.value || 'N/A' }}</div>
                     </div>
                     <div class="summary-item full">
                        <div class="row-details">
                           <div class="r-row">
                              <span class="r-label">Verification Date</span>
                              <span class="r-val">{{ today | date:'mediumDate' }}</span>
                           </div>
                           <div class="r-row">
                              <span class="r-label">Dossier Integrity</span>
                              <span class="r-val status">VERIFIED</span>
                           </div>
                           <div class="r-row">
                              <span class="r-label">Terminal Link</span>
                              <span class="r-val status">STABLE</span>
                           </div>
                        </div>
                     </div>
                     <div class="summary-item full">
                        <label>Inspection Outcome</label>
                        <p class="outcome-txt" *ngIf="verifyForm.get('decision')?.value === 'APPROVED'">
                           Application is verified for final quality check. The firm fulfills the mandatory technical requirements and tracker linkage.
                        </p>
                        <p class="outcome-txt warn" *ngIf="verifyForm.get('decision')?.value === 'DEFFERED'">
                           Defferal reason: {{ verifyForm.get('defferalReason')?.value }}
                        </p>
                     </div>
                  </div>

                  <div class="completion-footer">
                     <button mat-button (click)="stepper.previous()">Back to Verification</button>
                     <button mat-flat-button class="final-submit" (click)="finalizeProcess()">
                        FINAL SUBMIT & CLOSE CASE
                     </button>
                  </div>
               </mat-card>
            </div>
          </mat-step>
        </mat-horizontal-stepper>
      </div>
    </div>
  `,
  styles: [`
    .wizard-page { padding: 40px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
    
    .wizard-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;
      .h-main { 
        display: flex; align-items: center; gap: 20px; 
        .back-btn { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .title-group {
          .process-id { font-size: 11px; font-weight: 800; color: #3b82f6; letter-spacing: 1px; }
          h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; }
        }
      }
    }

    .luxe-card {
        border-radius: 24px; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.03); background: white;
        padding: 32px; margin-bottom: 24px;
        .card-title {
            display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
            mat-icon { color: #3b82f6; }
            h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
        }
    }

    .split-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; align-items: start; }
    
    .decision-form {
        display: flex; flex-direction: column; gap: 32px;
        .toggle-group {
            display: flex; flex-direction: column; gap: 12px;
            label { font-size: 13px; font-weight: 700; color: #64748b; }
            mat-button-toggle-group { border: none; background: #f1f5f9; border-radius: 12px; height: 52px; padding: 4px; gap: 8px; width: 100%; }
            ::ng-deep .mat-button-toggle { flex: 1; border: none !important; border-radius: 8px !important; transition: all 0.3s; .mat-button-toggle-label-content { font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; } }
            ::ng-deep .mat-button-toggle-checked { background: white !important; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .approve-btn.mat-button-toggle-checked { color: #10b981; }
            .reject-btn.mat-button-toggle-checked { color: #ef4444; }
        }
    }

    .mini-map { 
        height: 250px; border-radius: 20px; background: #e2e8f0; margin-top: 12px; 
    }
    .map-header { 
        display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; 
        .mh-left { display: flex; align-items: center; gap: 8px; }
        span { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; } 
        mat-icon { font-size: 16px; width: 16px; height: 16px; color: #3b82f6; } 
        .full-calib-btn { height: 32px; font-size: 11px; font-weight: 800; border-radius: 8px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    }

    .row-details {
        display: flex; flex-direction: column; gap: 12px; padding: 20px; background: #f8fafc; border-radius: 16px;
        .r-row {
            display: flex; justify-content: space-between; align-items: center;
            .r-label { font-size: 12px; font-weight: 700; color: #64748b; }
            .r-val { font-size: 13px; font-weight: 800; color: #1e293b; &.status { color: #10b981; } }
        }
    }

    .profile-summary {
        display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        .info-bit {
            display: flex; flex-direction: column;
            .lab { font-size: 10px; font-weight: 800; color: #94a3b8; }
            .val { font-size: 15px; font-weight: 700; color: #1e293b; }
            &.accent .val { color: #3b82f6; }
        }
    }

    .qr-card-v2 {
        text-align: center;
        .qr-box { width: 180px; height: 180px; margin: 0 auto 20px; background: #f8fafc; border-radius: 16px; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #e2e8f0; img { width: 140px; } .qr-placeholder { font-size: 10px; font-weight: 800; color: #cbd5e1; } }
        .qr-caption { font-size: 12px; color: #64748b; font-weight: 500; line-height: 1.5; }
    }

    .step-actions { margin-top: 24px; .next-btn { height: 56px; width: 100%; border-radius: 14px; background: #0f172a; font-weight: 800; } }

    .report-hub {
        max-width: 800px; margin: 0 auto;
        .report-id-bar { 
            background: #fdf2f8; padding: 16px 24px; border-radius: 14px; margin-bottom: 40px; display: flex; align-items: center; gap: 12px;
            mat-icon { color: #db2777; }
            span { font-weight: 900; color: #db2777; letter-spacing: 1px; }
        }
        .final-summary-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;
            .summary-item {
                label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
                .badge { display: inline-block; padding: 6px 16px; border-radius: 8px; font-weight: 800; background: #fee2e2; color: #ef4444; &.success { background: #dcfce7; color: #10b981; } }
                .id-text { font-size: 18px; font-weight: 900; color: #0f172a; }
                &.full { grid-column: 1 / -1; }
                .outcome-txt { font-size: 15px; color: #475569; font-weight: 500; line-height: 1.6; &.warn { color: #b91c1c; } }
            }
        }
    }

    .completion-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 32px; border-top: 1px solid #f1f5f9; .final-submit { background: #10b981; color: white; height: 52px; border-radius: 12px; font-weight: 800; padding: 0 40px; } }

    .status-chip { 
        padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; color: #475569;
        &[data-status="QIC_REQUESTED"] { background: #eff6ff; color: #3b82f6; }
        &[data-status="QIC_APPROVED"] { background: #dcfce7; color: #10b981; }
    }

    .loading-overlay { 
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 10000; animation: fadeIn 0.4s ease forwards;
      .l-text { margin-top: 24px; font-weight: 800; color: #1e293b; font-size: 16px; letter-spacing: -0.2px; }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    ::ng-deep .mat-horizontal-stepper-header { pointer-events: none !important; }
  `]
})
export class QicWizardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(FarmerApplicationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  applicationId!: number;
  application = signal<FarmerApplicationPayload | null>(null);
  qrCodeUrl = signal<string>('');
  today = new Date();
  isLoading = signal(true);

  verifyForm!: FormGroup;

  private map!: L.Map;
  private marker!: L.Marker;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.applicationId = +params['id'];
      this.initForm();
      this.loadApplication();
    });
  }

  initForm() {
    this.verifyForm = this.fb.group({
      decision: ['APPROVED', Validators.required],
      defferalReason: [''],
      uniqueImplementId: ['', Validators.required]
    });

    // Handle deferral reason validation
    this.verifyForm.get('decision')?.valueChanges.subscribe(val => {
      const reasonControl = this.verifyForm.get('defferalReason');
      if (val === 'DEFERRED') {
        reasonControl?.setValidators([Validators.required]);
      } else {
        reasonControl?.clearValidators();
      }
      reasonControl?.updateValueAndValidity();
    });

    // Regenerate QR when unique ID changes
    this.verifyForm.get('uniqueImplementId')?.valueChanges.subscribe(() => {
      if (this.application()) {
        this.generateQR();
      }
    });
  }

  loadApplication() {
    this.isLoading.set(true);
    this.appService.getById(this.applicationId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
      next: (app) => {
        this.application.set(app);
        if (app.uniqueImplementId) {
          this.verifyForm.patchValue({ uniqueImplementId: app.uniqueImplementId });
        }
        this.generateQR();
        this.initMap();
        this.loadCalibrationData();
      }
    });
  }

  async generateQR() {
    const app = this.application();
    if (!app) return;

    const qrData = `PCAP-QIC-VERIFY
App #: ${app.applicationNumber}
Farmer: ${app.farmerName}
CNIC: ${app.cnic}
District: ${app.districtName}
Implement: ${app.implementName}
UID: ${this.verifyForm.get('uniqueImplementId')?.value || 'PENDING'}`;

    try {
      const url = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 250,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      this.qrCodeUrl.set(url);
    } catch (err) {
      console.error('QR failed', err);
    }
  }

  initMap() {
    setTimeout(() => {
      if (this.map) return;
      this.map = L.map('wizard-map', { zoomControl: false }).setView([31.5204, 74.3587], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(this.map);
      this.marker = L.marker([31.5204, 74.3587]).addTo(this.map);
    }, 500);
  }

  loadCalibrationData() {
    const app = this.application();
    if (!app?.trackerImei) return;

    this.appService.getCalibrationData(this.applicationId, app.trackerImei).subscribe({
      next: (res) => {
        if (res.latitude && res.longitude) {
          this.map.setView([res.latitude, res.longitude], 15);
          this.marker.setLatLng([res.latitude, res.longitude]);
          this.map.invalidateSize();
        }
      }
    });
  }

  openFullCalibration() {
    const app = this.application();
    if (!app?.trackerImei) return;

    const dialogRef = this.dialog.open(TrackerCalibrationDialogComponent, {
      data: {
        imei: app.trackerImei,
        applicationId: this.applicationId
      },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      panelClass: 'full-screen-calibration'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCalibrationData();
        this.snackBar.open('Tracker successfully synchronized.', 'Verified', { duration: 3000 });
      }
    });
  }

  proceedToStep2(stepper: any) {
    if (this.verifyForm.invalid) {
      this.snackBar.open('Please complete the verification form correctly.', 'Dismiss', { duration: 3000 });
      return;
    }
    stepper.next();
  }

  finalizeProcess() {
    const app = this.application();
    if (!app) return;

    const payload = {
      applicationId: this.applicationId,
      status: this.verifyForm.get('decision')?.value === 'APPROVED' ? 'QIC_APPROVED' : 'QIC_DEFFERED',
      remarks: this.verifyForm.get('defferalReason')?.value || 'Verified via QIC Wizard',
      uniqueImplementId: this.verifyForm.get('uniqueImplementId')?.value
    };

    // We use the existing summary/submit logic but tailored for this wizard
    this.appService.submitQualityInspection({
      applicationId: this.applicationId,
      trackerImei: app.trackerImei,
      remarks: payload.remarks,
      uniqueImplementId: payload.uniqueImplementId,
      status: payload.status // Assuming backend supports custom status mapping or we use existing endpoints
    }).subscribe({
      next: () => {
        this.snackBar.open('QIC Process Finalized Successfully!', 'Success', { duration: 3000 });
        this.router.navigate(['/portal/quality-inspection/process']);
      },
      error: (err: any) => {
        console.error('Finalization failed', err);
        this.snackBar.open('Process failed. Please try again.', 'Error', { duration: 5000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/portal/quality-inspection/process']);
  }
}
