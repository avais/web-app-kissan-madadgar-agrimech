import { environment } from '@env/environment';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FarmerApplicationService } from '../../../../core/services/farmer-application.service';
import { TrackerCalibrationDialogComponent } from './tracker-calibration-dialog.component';

@Component({
  selector: 'app-quality-inspection-form',
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
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="initial-loader" *ngIf="isLoadingApp()">
        <mat-spinner diameter="50" color="primary"></mat-spinner>
        <p>Fetching application dossier...</p>
      </div>

      <ng-container *ngIf="!isLoadingApp()">
        <header class="page-header">
          <div class="header-main">
            <button mat-icon-button (click)="goBack()" class="back-btn" title="Back to Application Details">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="title-group">
              <div class="process-id">QUALITY ASSURANCE HUB</div>
              <h1>Inspection Report</h1>
              <p>Device Verification & Pictorial Evidence</p>
            </div>
          </div>
          
          <div class="meta-strip" *ngIf="applicationDetails() as app">
            <div class="meta-item">
              <span class="lab">APP NO</span>
              <span class="val">{{ applicationNumber }}</span>
            </div>
            <div class="meta-item">
              <span class="lab">FARMER</span>
              <span class="val">{{ app.farmerName }}</span>
            </div>
            <div class="meta-item">
              <span class="lab">CNIC</span>
              <span class="val">{{ app.cnic }}</span>
            </div>
            <div class="meta-item accent">
              <span class="lab">IMPLEMENT</span>
              <span class="val">{{ app.implementName }}</span>
            </div>
          </div>
        </header>

        <div class="form-content-wrapper">
          <form [formGroup]="qicForm" (ngSubmit)="onSubmit()">
            <mat-card class="premium-form-card">
              <div class="card-hero-header">
                <mat-icon>satellite_alt</mat-icon>
                <div class="text">
                  <h3>Tracker Information</h3>
                  <p>Enter mandatory device and pictorial details for satellite linkage</p>
                </div>
              </div>

              <div class="form-body">
                <div class="imei-action-row">
                  <mat-form-field appearance="outline" class="imei-field premium">
                    <mat-label>Tracker IMEI Number</mat-label>
                    <input matInput formControlName="trackerImei" placeholder="Enter Tracker IMEI Serial">
                    <mat-icon matPrefix>developer_board</mat-icon>
                    <mat-error *ngIf="qicForm.get('trackerImei')?.hasError('required')">IMEI serial is required for inspection</mat-error>
                  </mat-form-field>

                  <button type="button" mat-flat-button class="calibrate-action-btn" 
                    [class.is-calibrated]="isCalibrated()"
                    [disabled]="qicForm.get('trackerImei')?.invalid || isCalibrated()"
                    (click)="openCalibration()">
                    <mat-icon>{{ isCalibrated() ? 'verified' : 'settings_input_component' }}</mat-icon>
                    <span>{{ isCalibrated() ? 'Device Calibrated' : 'Calibrate Device' }}</span>
                  </button>
                </div>

                <mat-form-field appearance="outline" class="full-width premium">
                  <mat-label>Inspection Observations & Remarks</mat-label>
                  <textarea matInput formControlName="remarks" rows="4" placeholder="Enter detailed inspection observations..."></textarea>
                  <mat-icon matPrefix>notes</mat-icon>
                </mat-form-field>

                <div class="evidence-section">
                  <label class="section-label">Pictorial Evidence (GPS Tagged)</label>
                  <div class="upload-grid">
                    <!-- Tracker Installation Box -->
                    <div class="premium-upload-box" [class.has-file]="trackerImage() || trackerImagePreview()" (click)="trackerInput.click()">
                      <div class="box-content" *ngIf="!trackerImage() && !trackerImagePreview()">
                        <div class="icon-orb">
                          <mat-icon>add_a_photo</mat-icon>
                        </div>
                        <span class="label">Tracker Installation Picture</span>
                        <span class="sub-label">Click to select photo</span>
                      </div>
                      
                      <div class="preview-overlay" *ngIf="trackerImage() || trackerImagePreview()">
                         <img [src]="trackerImagePreview()" alt="Tracker Evidence">
                         <div class="overlay-actions">
                            <button type="button" mat-mini-fab color="warn" (click)="$event.stopPropagation(); removeImage('tracker')">
                               <mat-icon>delete</mat-icon>
                            </button>
                         </div>
                      </div>
                      <input #trackerInput type="file" hidden (change)="onFileSelected($event, 'tracker')" accept="image/*">
                    </div>

                    <!-- Placeholder/Second evidence box if needed, or just single box -->
                  </div>
                </div>
              </div>

              <div class="card-footer-actions">
                <button mat-button type="button" class="cancel-btn" (click)="goBack()">Discard Changes</button>
                <button mat-flat-button color="primary" class="submit-action-btn" type="submit" [disabled]="!qicForm.valid || isSubmitting() || !isCalibrated()">
                  <mat-icon *ngIf="!isSubmitting()">send</mat-icon>
                  <span *ngIf="!isSubmitting()">Synchronize Inspection Result</span>
                  <span *ngIf="isSubmitting()">Processing Synchronization...</span>
                </button>
              </div>
              <mat-progress-bar *ngIf="isSubmitting()" mode="indeterminate" class="bottom-progress"></mat-progress-bar>
            </mat-card>
          </form>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { padding: 40px; background: #fdfbf7; min-height: 100vh; }
    
    .initial-loader {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px; color: #94a3b8; font-weight: 600;
      mat-spinner { margin-bottom: 24px; }
    }

    .page-header {
      margin-bottom: 40px;
      .header-main {
        display: flex; align-items: center; gap: 24px; margin-bottom: 24px;
        .back-btn { background: white; border: 1.5px solid #e2e8f0; color: #64748b; &:hover { color: #0f172a; border-color: #cbd5e1; } }
        .title-group {
          .process-id { font-size: 11px; font-weight: 900; color: #3b82f6; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
          h1 { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.2; letter-spacing: -0.5px; }
          p { margin: 4px 0 0; color: #64748b; font-size: 15px; font-weight: 600; }
        }
      }
      
      .meta-strip {
        display: flex; gap: 32px; padding: 16px 24px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; width: fit-content;
        .meta-item {
          display: flex; flex-direction: column; gap: 2px;
          .lab { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .val { font-size: 14px; font-weight: 700; color: #1e293b; }
          &.accent .val { color: #3b82f6; }
        }
      }
    }

    .form-content-wrapper { max-width: 900px; margin: 0 auto; }

    .premium-form-card {
      background: white; border-radius: 32px; border: none; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.05); overflow: hidden;
      
      .card-hero-header {
        background: #f8fafc; padding: 40px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #f1f5f9;
        mat-icon { font-size: 40px; width: 40px; height: 40px; color: #3b82f6; opacity: 0.8; }
        .text {
          h3 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
          p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 500; }
        }
      }

      .form-body { padding: 40px; }

      .imei-action-row {
        display: flex; gap: 20px; align-items: flex-start; margin-bottom: 32px;
        .imei-field { flex: 1; }
      }

      .calibrate-action-btn {
        height: 56px; border-radius: 16px; padding: 0 28px; font-weight: 800; font-size: 14px;
        background: #f1f5f9; color: #64748b; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        
        mat-icon { margin-right: 12px; font-size: 22px; width: 22px; height: 22px; }
        
        &:not([disabled]) { background: #3b82f6; color: white; box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.3); }
        &.is-calibrated { 
            background: #10b981; color: white; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3);
            border: 2px solid white;
        }

        &:hover:not([disabled]) { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.4); }
      }

      ::ng-deep .premium.mat-form-field {
        .mat-mdc-text-field-wrapper { background: #f8fafc !important; border-radius: 16px !important; }
        .mat-mdc-form-field-focus-indicator { display: none; }
        mat-icon { color: #94a3b8; margin-right: 12px; }
        .mat-mdc-input-element { font-weight: 700; color: #0f172a; }
      }

      .section-label { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 16px; display: block; }

      .premium-upload-box {
        width: 100%; height: 260px; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 24px;
        cursor: pointer; position: relative; transition: all 0.3s ease;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        
        &:hover { border-color: #3b82f6; background: #eff6ff; .icon-orb { background: #3b82f6; color: white; } }
        
        &.has-file { border-style: solid; border-color: #10b981; }

        .box-content {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          .icon-orb {
            width: 64px; height: 64px; background: white; border-radius: 20px;
            display: flex; align-items: center; justify-content: center; 
            color: #94a3b8; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            mat-icon { font-size: 32px; width: 32px; height: 32px; }
          }
          .label { font-size: 15px; font-weight: 800; color: #1e293b; }
          .sub-label { font-size: 12px; color: #94a3b8; font-weight: 500; }
        }

        .preview-overlay {
          width: 100%; height: 100%; position: relative;
          img { width: 100%; height: 100%; object-fit: cover; }
          .overlay-actions {
            position: absolute; top: 16px; right: 16px;
            button { box-shadow: 0 8px 16px rgba(0,0,0,0.15); }
          }
        }
      }

      .card-footer-actions {
        padding: 32px 40px; background: #f8fafc; border-top: 1px solid #f1f5f9;
        display: flex; justify-content: flex-end; gap: 20px;
        
        .cancel-btn { font-weight: 700; color: #64748b; height: 56px; padding: 0 24px; border-radius: 14px; }
        
        .submit-action-btn {
          height: 56px; border-radius: 16px; padding: 0 40px; font-weight: 900; font-size: 15px;
          background: #0f172a !important; color: white !important;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2); transition: all 0.3s ease;
          
          mat-icon { margin-right: 12px; }
          
          &:disabled { background: #cbd5e1 !important; color: #94a3b8 !important; box-shadow: none; }
          &:not([disabled]):hover { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(15, 23, 42, 0.3); }
        }
      }

      .bottom-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; }
    }
    @media (max-width: 600px) { .upload-section { grid-template-columns: 1fr; } }
  `]
})
export class QualityInspectionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(FarmerApplicationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  applicationId!: number;
  applicationNumber: string = '';
  qicForm!: FormGroup;
  isSubmitting = signal(false);
  isCalibrated = signal(false);
  isLoadingApp = signal(true);
  applicationDetails = signal<any>(null);

  trackerImage = signal<File | null>(null);
  reportImage = signal<File | null>(null);
  trackerImagePreview = signal<string | null>(null);
  reportImagePreview = signal<string | null>(null);

  ngOnInit() {
    this.applicationId = +this.route.snapshot.paramMap.get('id')!;
    this.applicationNumber = this.route.snapshot.queryParamMap.get('appNo') || '';

    this.qicForm = this.fb.group({
      trackerImei: ['', [Validators.required]],
      remarks: ['']
    });

    this.fetchApplicationDetails();
  }

  fetchApplicationDetails() {
    this.appService.getById(this.applicationId).subscribe({
      next: (app) => {
        this.applicationDetails.set(app);
        const rawImei = app.trackerImei ? String(app.trackerImei).trim() : '';
        const isInvalid = !rawImei ||
          rawImei.toUpperCase() === 'PENDING' ||
          rawImei.toLowerCase() === 'null' ||
          rawImei.toLowerCase() === 'undefined';

        if (!isInvalid) {
          this.qicForm.patchValue({ trackerImei: rawImei });
        } else {
          this.qicForm.patchValue({ trackerImei: '' });
        }
        if (app.qicRemarks) {
          this.qicForm.patchValue({ remarks: app.qicRemarks });
        }
        if (app.trackerPictorialEvidence) {
          this.trackerImagePreview.set(`${environment.apiUrl}/api/files/download/${app.trackerPictorialEvidence}`);
          this.isCalibrated.set(true); // If it has evidence, it was likely calibrated
        }
        if (app.qicReportPictorialEvidence) {
          this.reportImagePreview.set(`${environment.apiUrl}/api/files/download/${app.qicReportPictorialEvidence}`);
        }
        this.isLoadingApp.set(false);
      },
      error: (err) => {
        console.error('Error fetching application details', err);
        this.isLoadingApp.set(false);
      }
    });
  }

  openCalibration() {
    const dialogRef = this.dialog.open(TrackerCalibrationDialogComponent, {
      data: {
        imei: this.qicForm.value.trackerImei,
        applicationId: this.applicationId
      },
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      panelClass: 'full-screen-calibration'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isCalibrated.set(true);
        this.snackBar.open('Tracker successfully calibrated with satellite network.', 'Verified', {
          duration: 3000
        });
      }
    });
  }

  onFileSelected(event: any, type: 'tracker' | 'report') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (type === 'tracker') {
          this.trackerImage.set(file);
          this.trackerImagePreview.set(e.target.result);
        } else {
          this.reportImage.set(file);
          this.reportImagePreview.set(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(type: 'tracker' | 'report') {
    if (type === 'tracker') {
      this.trackerImage.set(null);
      this.trackerImagePreview.set(null);
    } else {
      this.reportImage.set(null);
      this.reportImagePreview.set(null);
    }
  }

  async onSubmit() {
    // Check if we have either a new file or an existing preview
    const hasTrackerImg = this.trackerImage() || this.trackerImagePreview();
    const hasReportImg = this.reportImage() || this.reportImagePreview();

    // Only Tracker IMEI and Calibration are now mandatory. Pictures are optional.
    if (this.qicForm.invalid || !this.isCalibrated()) {
      this.snackBar.open('Please verify the IMEI and perform calibration before submitting.', 'Warning', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    try {
      let trackerFilename = this.applicationDetails().trackerPictorialEvidence;
      let reportFilename = this.applicationDetails().qicReportPictorialEvidence;

      // 1. Upload tracker installation picture ONLY if changed
      if (this.trackerImage()) {
        const trackerRes = await this.appService.uploadFile(this.trackerImage()!).toPromise();
        trackerFilename = trackerRes.fileName;
      }

      // 2. Upload QIC report picture ONLY if changed
      if (this.reportImage()) {
        const reportRes = await this.appService.uploadFile(this.reportImage()!).toPromise();
        reportFilename = reportRes.fileName;
      }

      // 3. Submit the final QIC request
      const payload = {
        applicationId: this.applicationId,
        trackerImei: this.qicForm.value.trackerImei,
        trackerPictorialEvidence: trackerFilename,
        qicReportPictorialEvidence: reportFilename,
        remarks: this.qicForm.value.remarks
      };

      await this.appService.submitQualityInspection(payload).toPromise();

      this.snackBar.open('Quality Inspection Report submitted successfully!', 'Success', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      this.router.navigate(['/portal/applications/details', this.applicationId]);
    } catch (err) {
      console.error('Submission failed', err);
      this.snackBar.open('Failed to submit inspection. Please try again.', 'Error', {
        duration: 5000
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/portal/applications/details', this.applicationId]);
  }
}

