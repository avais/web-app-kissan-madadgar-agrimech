import { environment } from '@env/environment';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FarmerApplicationService, FarmerApplicationPayload } from '../../../../core/services/farmer-application.service';
import { BookingService, BookingRequest } from '../../../../core/services/booking.service';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { finalize } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HttpEventType } from '@angular/common/http';
import * as QRCode from 'qrcode';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MapJourneyDialogComponent } from '../../../imei-verification/map-journey/map-journey-dialog.component';

// Finalizing application lifecycle view
@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    FileUploadComponent
  ],
  template: `
    <div class="page-container">
      <!-- Full Page Loading State -->
      <div class="loading-overlay" *ngIf="isLoading()">
        <mat-spinner diameter="50" color="primary"></mat-spinner>
        <div class="l-text">Synchronizing application dossier...</div>
      </div>

      <ng-container *ngIf="application() as app">
      <!-- Header -->
      <div class="detail-header">
        <div class="back-nav">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-label">
            <div class="badge-row">
               <div class="main-badge">APPLICATION DOSSIER</div>
               <div class="status-badges">
                  <span class="status-tag info" *ngIf="app.trackerImei && app.trackerImei !== 'PENDING'">
                    <mat-icon>link</mat-icon> TRACKER ATTACHED
                  </span>
                  <span class="status-tag success" *ngIf="['QIC_APPROVED', 'DIC_PENDING', 'DIC_APPROVED', 'COMPLETED'].includes(app.status) || app.localDecision === 'PASSED'">
                    <mat-icon>verified</mat-icon> QIC PASSED
                  </span>
                  <span class="status-tag primary" *ngIf="app.trackerVerified">
                    <mat-icon>location_on</mat-icon> Location Synced
                  </span>
               </div>
            </div>
            <div class="header-main-row">
              <h1>{{app.applicationNumber}}</h1>
              <div class="status-indicator-pill" [class]="appStatusDisplay().class">
                <mat-icon>{{ getStatusIcon(app.status) }}</mat-icon>
                <span>{{ appStatusDisplay().text }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button mat-stroked-button class="action-btn" (click)="generateReport()">
            <mat-icon>print</mat-icon> Generate Report
          </button>
        </div>
      </div>


      <!-- Phase Stepper (Step-wise Visualization) -->
      <div class="phase-stepper-card">
        <div class="stepper-content">
          <div class="step" *ngFor="let phase of phases; let i = index" 
               [class.active]="isPhaseActive(phase)"
               [class.completed]="isPhaseCompleted(phase)"
               [class.glowing-step]="(phase.key === 'INSPECTION' && app.status === 'BOOKED' && hasStartInspectionFeature()) || (phase.key === 'DIC_INSPECTION' && app.status === 'DIC_PENDING' && hasStartDICFeature())">
            <div class="step-connector" *ngIf="i !== 0"></div>
            <div class="step-node">
              <div class="node-circle" [class.pulse]="(phase.key === 'INSPECTION' && app.status === 'BOOKED' && hasStartInspectionFeature()) || (phase.key === 'DIC_INSPECTION' && app.status === 'DIC_PENDING' && hasStartDICFeature())">
                <mat-icon>{{phase.icon}}</mat-icon>
                <div class="check-mark" *ngIf="isPhaseCompleted(phase)">
                  <mat-icon>check</mat-icon>
                </div>
              </div>
              <div class="node-label">
                <span class="step-name">{{phase.name}}</span>
                <span class="step-status" *ngIf="!((phase.key === 'INSPECTION' && app.status === 'BOOKED' && hasStartInspectionFeature()) || (phase.key === 'DIC_INSPECTION' && app.status === 'DIC_PENDING' && hasStartDICFeature()))">
                  {{getStepStatusLabel(phase)}}
                </span>
                
                <!-- Special Action Button for DIC Start -->
                <button *ngIf="phase.key === 'DIC_INSPECTION' && (['DIC_PENDING', 'DIC_IN_PROGRESS', 'DIC_DEFERED', 'DIC_DEFFERED'].includes(app.status)) && hasStartDICFeature()" 
                        mat-flat-button class="dic-start-btn" (click)="onStartDIC(app)" [disabled]="isGeneratingReport()">
                  <mat-spinner diameter="16" color="accent" *ngIf="isGeneratingReport()" style="margin-right: 8px;"></mat-spinner>
                  {{ isGeneratingReport() ? 'INITIALIZING DIC...' : (app.status === 'DIC_PENDING' ? 'START DIC INSPECTION' : 'CONTINUE DIC INSPECTION') }}
                </button>

                <!-- Status Specific Decision Buttons: DIC_IN_PROGRESS -->
                <div *ngIf="phase.key === 'DIC_IN_PROGRESS' && app.status === 'DIC_IN_PROGRESS' && hasStartDICFeature()" class="dic-decision-row">
                  <button mat-flat-button class="dic-approve-btn" (click)="onStartDIC(app)" [disabled]="isGeneratingReport()">
                    <mat-icon>verified</mat-icon> Finalize DIC Inspection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Report Generation Overlay -->
      <div class="loading-overlay" *ngIf="isGeneratingReport()">
        <mat-spinner diameter="60" color="primary"></mat-spinner>
        <div class="l-text">Conducting Authorized Signature & Verification Fetch...</div>
        <div style="font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 4px;">Preparing high-fidelity PDF dossier</div>
      </div>

      <!-- DIC DECISION WIZARD: Premium Sign-off Interface -->
      <div class="loading-overlay decision-wizard" *ngIf="isDicDecisionWizardActive()">
        <div class="selection-card">
          <div class="wizard-header">
            <mat-icon class="dic-icon">verified_user</mat-icon>
            <h3>DIC Official Sign-off</h3>
            <p>Please finalize the committee inspection findings</p>
          </div>

          <div class="wizard-body" *ngIf="!dicDecisionProcess()">
            <div class="option-grid">
               <button mat-flat-button class="accept-opt" (click)="dicDecisionProcess.set('ACCEPT')">
                  <mat-icon>check_circle</mat-icon>
                  <div class="opt-label-group">
                    <label>Accept Inspection</label>
                    <span>Upload Signed Performa</span>
                  </div>
               </button>
               <button mat-stroked-button color="warn" class="defer-opt" (click)="dicDecisionProcess.set('DEFER')">
                  <mat-icon>post_add</mat-icon>
                  <div class="opt-label-group">
                    <label>Defer Inspection</label>
                    <span>Add Reason</span>
                  </div>
               </button>
            </div>
            <button mat-button class="cancel-wizard" (click)="closeDicWizard()">CANCEL</button>
          </div>

          <!-- Acceptance Path: Signed Dossier Upload -->
          <div class="wizard-body upload-step" *ngIf="dicDecisionProcess() === 'ACCEPT'">
             <div class="step-meta">
                <mat-icon>upload_file</mat-icon>
                <span>Upload Official Scanned Dossier (Signed DIC Report)</span>
             </div>
             
             <div class="upload-area" (click)="signedFileInput.click()" [class.has-file]="!!signedDicFile">
                <input type="file" #signedFileInput hidden (change)="onSignedFileSelected($event)" accept="application/pdf">
                <mat-icon>{{ signedDicFile ? 'task' : 'cloud_upload' }}</mat-icon>
                <div class="file-text">{{ signedDicFile ? signedDicFile.name : 'Click to Browse Signed PDF' }}</div>
             </div>

             <div class="wizard-actions">
                <button mat-button (click)="dicDecisionProcess.set(null)">BACK</button>
                <button mat-flat-button color="primary" [disabled]="!signedDicFile" (click)="submitDicApproval()">COMPLETE APPROVAL</button>
             </div>
          </div>

          <!-- Defer Path: Remarks Collection -->
          <div class="wizard-body remarks-step" *ngIf="dicDecisionProcess() === 'DEFER'">
             <div class="step-meta">
                <mat-icon>report_problem</mat-icon>
                <span>Provide Justification for Deferral</span>
             </div>
             <textarea class="remarks-area" placeholder="Enter findings or missing requirements..." [(ngModel)]="dicDeferRemarks"></textarea>
             <div class="wizard-actions">
                <button mat-button (click)="dicDecisionProcess.set(null)">BACK</button>
                <button mat-flat-button color="warn" [disabled]="!dicDeferRemarks().trim()" (click)="submitDicDeferral()">DEFER INSPECTION</button>
             </div>
          </div>
        </div>
      </div>

      <!-- Premium Summary Card (NEW) -->
      <div class="premium-summary-card">
        <div class="card-p-header">
           <div class="top-row">
              <div class="app-label">APPLICATION</div>
              <div class="app-no">#{{app.applicationNumber?.replace('APP-', '')}}</div>
           </div>
           
           <div class="sub-header-row">
              <div class="implement-highlight">
                 <mat-icon>auto_awesome_green</mat-icon>
                 <span>machine / implement: <b>{{app.implementName}}</b></span>
              </div>

              <div class="uid-row">
                 <span class="l">UNIQUE machine / implement ID:</span>
                 <span class="v">{{app.uniqueImplementId || 'PENDING'}}</span>
              </div>
           </div>

           <div class="p-status-row">
              <div class="p-tag black" *ngIf="app.trackerImei && app.trackerImei !== 'PENDING'">
                <mat-icon>link</mat-icon> TRACKER ATTACHED
              </div>
              <div class="p-tag green" *ngIf="['QIC_APPROVED', 'DIC_PENDING', 'DIC_APPROVED', 'COMPLETED'].includes(app.status) || app.localDecision === 'PASSED'">
                <mat-icon>verified</mat-icon> QIC PASSED
              </div>
              <button mat-button class="p-tag blue" *ngIf="app.trackerImei && app.trackerImei !== 'PENDING'" (click)="onViewLiveLocation(app.trackerImei)">
                <mat-icon>location_on</mat-icon> View Live Location
              </button>
           </div>
        </div>

        <div class="card-p-divider"></div>

        <div class="card-p-body">
           <div class="p-info-main">
              <div class="p-item-group">
                 <div class="p-icon-box"><mat-icon>person</mat-icon></div>
                 <div class="p-text-box">
                    <label>FARMER NAME / FATHER NAME</label>
                    
                    <!-- Farmer Name Value -->
                    <div class="p-val-group" *ngIf="editingField() !== 'farmerName'">
                       <h3>{{app.farmerName}}</h3>
                       <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit('farmerName', app.farmerName)">
                          <mat-icon>edit</mat-icon>
                       </button>
                    </div>
                    <div class="p-edit-box" *ngIf="editingField() === 'farmerName'">
                       <div class="edit-input-wrapper">
                          <mat-progress-bar mode="indeterminate" *ngIf="isUpdatingField()" class="mini-progress-bar"></mat-progress-bar>
                          <input type="text" [(ngModel)]="editModel.farmerName" class="premium-input-small" [disabled]="isUpdatingField()">
                       </div>
                       <div class="p-edit-btns">
                          <button mat-icon-button color="primary" (click)="saveEdit('farmerName')" [disabled]="isUpdatingField()">
                             <mat-icon *ngIf="!isUpdatingField()">check</mat-icon>
                             <mat-spinner diameter="18" color="primary" *ngIf="isUpdatingField()"></mat-spinner>
                          </button>
                          <button mat-icon-button color="warn" (click)="cancelEdit()" [disabled]="isUpdatingField()">
                             <mat-icon>close</mat-icon>
                          </button>
                       </div>
                    </div>

                    <!-- Father Name Value -->
                    <div class="p-val-group" *ngIf="editingField() !== 'fatherName'">
                       <p>S/O {{app.fatherName}}</p>
                       <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit('fatherName', app.fatherName)">
                          <mat-icon>edit</mat-icon>
                       </button>
                    </div>
                    <div class="p-edit-box" *ngIf="editingField() === 'fatherName'">
                       <div class="edit-input-wrapper">
                          <mat-progress-bar mode="indeterminate" *ngIf="isUpdatingField()" class="mini-progress-bar"></mat-progress-bar>
                          <input type="text" [(ngModel)]="editModel.fatherName" class="premium-input-small" [disabled]="isUpdatingField()">
                       </div>
                       <div class="p-edit-btns">
                          <button mat-icon-button color="primary" (click)="saveEdit('fatherName')" [disabled]="isUpdatingField()">
                             <mat-icon *ngIf="!isUpdatingField()">check</mat-icon>
                             <mat-spinner diameter="18" color="primary" *ngIf="isUpdatingField()"></mat-spinner>
                          </button>
                          <button mat-icon-button color="warn" (click)="cancelEdit()" [disabled]="isUpdatingField()">
                             <mat-icon>close</mat-icon>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="p-item-group">
                 <div class="p-icon-box small"><mat-icon>badge</mat-icon></div>
                 <div class="p-text-box">
                    <label>CNIC NUMBER</label>
                    <div class="p-val-group" *ngIf="editingField() !== 'cnic'">
                       <h3 class="mono">{{app.cnic}}</h3>
                       <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit('cnic', app.cnic)">
                          <mat-icon>edit</mat-icon>
                       </button>
                    </div>
                    <div class="p-edit-box" *ngIf="editingField() === 'cnic'">
                       <div class="edit-input-wrapper">
                          <mat-progress-bar mode="indeterminate" *ngIf="isUpdatingField()" class="mini-progress-bar"></mat-progress-bar>
                          <input type="text" [(ngModel)]="editModel.cnic" class="premium-input-small" [disabled]="isUpdatingField()">
                       </div>
                       <div class="p-edit-btns">
                          <button mat-icon-button color="primary" (click)="saveEdit('cnic')" [disabled]="isUpdatingField()">
                             <mat-icon *ngIf="!isUpdatingField()">check</mat-icon>
                             <mat-spinner diameter="18" color="primary" *ngIf="isUpdatingField()"></mat-spinner>
                          </button>
                          <button mat-icon-button color="warn" (click)="cancelEdit()" [disabled]="isUpdatingField()">
                             <mat-icon>close</mat-icon>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="p-item-group">
                 <div class="p-icon-box small"><mat-icon>phone</mat-icon></div>
                 <div class="p-text-box">
                    <label>CONTACT NUMBER</label>
                    <div class="p-val-group" *ngIf="editingField() !== 'contactNumber'">
                       <h3>{{app.contactNumber}}</h3>
                       <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit('contactNumber', app.contactNumber)">
                          <mat-icon>edit</mat-icon>
                       </button>
                    </div>
                    <div class="p-edit-box" *ngIf="editingField() === 'contactNumber'">
                       <div class="edit-input-wrapper">
                          <mat-progress-bar mode="indeterminate" *ngIf="isUpdatingField()" class="mini-progress-bar"></mat-progress-bar>
                          <input type="text" [(ngModel)]="editModel.contactNumber" class="premium-input-small" [disabled]="isUpdatingField()">
                       </div>
                       <div class="p-edit-btns">
                          <button mat-icon-button color="primary" (click)="saveEdit('contactNumber')" [disabled]="isUpdatingField()">
                             <mat-icon *ngIf="!isUpdatingField()">check</mat-icon>
                             <mat-spinner diameter="18" color="primary" *ngIf="isUpdatingField()"></mat-spinner>
                          </button>
                          <button mat-icon-button color="warn" (click)="cancelEdit()" [disabled]="isUpdatingField()">
                             <mat-icon>close</mat-icon>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="p-item-group" *ngIf="app.address">
                 <div class="p-icon-box small"><mat-icon>home</mat-icon></div>
                 <div class="p-text-box">
                    <label>FARMER ADDRESS</label>
                    <div class="p-val-group" *ngIf="editingField() !== 'address'">
                       <h3>{{app.address}}</h3>
                       <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit('address', app.address)">
                          <mat-icon>edit</mat-icon>
                       </button>
                    </div>
                    <div class="p-edit-box" *ngIf="editingField() === 'address'">
                       <div class="edit-input-wrapper">
                          <mat-progress-bar mode="indeterminate" *ngIf="isUpdatingField()" class="mini-progress-bar"></mat-progress-bar>
                          <input type="text" [(ngModel)]="editModel.address" class="premium-input-small" [disabled]="isUpdatingField()">
                       </div>
                       <div class="p-edit-btns">
                          <button mat-icon-button color="primary" (click)="saveEdit('address')" [disabled]="isUpdatingField()">
                             <mat-icon *ngIf="!isUpdatingField()">check</mat-icon>
                             <mat-spinner diameter="18" color="primary" *ngIf="isUpdatingField()"></mat-spinner>
                          </button>
                          <button mat-icon-button color="warn" (click)="cancelEdit()" [disabled]="isUpdatingField()">
                             <mat-icon>close</mat-icon>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="p-item-group" *ngIf="app.trackerImei">
                 <div class="p-icon-box small blue"><mat-icon>satellite_alt</mat-icon></div>
                 <div class="p-text-box">
                    <label>TRACKER IMEI</label>
                    <h3>{{app.trackerImei}}</h3>
                 </div>
              </div>
           </div>

           <div class="p-info-qr" *ngIf="qrCodeDataUrl()">
              <div class="qr-wrapper-premium">
                 <img [src]="qrCodeDataUrl()" alt="Secure ID">
                 <div class="qr-label-premium">SECURE ID</div>
              </div>
           </div>
        </div>
      </div>

      <!-- Detailed Info Grid -->
      <div class="details-grid">
        <!-- Left Column: Applicant & Location -->
        <div class="grid-col main-info">
          <mat-card class="info-card geography">
            <div class="card-header">
              <mat-icon>map</mat-icon>
              <h3>Geographic Allocation</h3>
            </div>
            <div class="info-body">
              <div class="data-grid-small">
                <div class="data-item">
                  <label>Division</label>
                  <div class="val">{{ app.divisionName || 'N/A' }}</div>
                </div>
                <div class="data-item">
                  <label>Farmer District</label>
                  <div class="val">{{ app.districtName || 'N/A' }}</div>
                </div>
                <div class="data-item">
                  <label>Tehsil</label>
                  <div class="val">{{ app.markazName || 'N/A' }}</div>
                </div>
              </div>
            </div>
          </mat-card>

          <!-- Booking Action Card (FIRM ONLY) -->
          <mat-card class="info-card action-card booking-action" *ngIf="app.status === 'ALLOTED'">
            <div class="card-header">
              <mat-icon>bookmark_added</mat-icon>
              <h3>Initialize Booking</h3>
            </div>
            <div class="info-body">
              <p class="instr">Secure this application by providing deposit (CDR) details for procurement.</p>
              
              <div class="action-form">
                <div class="form-group">
                  <label>CDR Number <span style="color: #ef4444">*</span></label>
                  <input type="text" [(ngModel)]="bookingModel.cdrNo" class="premium-input" placeholder="E.g. 0543219">
                </div>
                <div class="form-group">
                  <label>CDR Bank Name <span style="color: #ef4444">*</span></label>
                  <input type="text" [(ngModel)]="bookingModel.cdrBankName" class="premium-input" placeholder="E.g. Bank of Punjab">
                </div>
                <div class="form-group">
                  <label>CDR Amount (Rs.)</label>
                  <input type="number" [(ngModel)]="bookingModel.cdrAmount" class="premium-input">
                </div>

                <div class="form-group">
                   <label>Deposit Slip / CDR Copy <span style="color: #ef4444">*</span></label>
                   <app-file-upload 
                    (fileSelected)="onFileSelected($event)" 
                    [progress]="uploadProgress()" 
                    [isUploading]="isUploadingFile()">
                   </app-file-upload>
                </div>
                
                <button mat-flat-button class="execute-btn booking-btn" (click)="onExecuteBooking()" [disabled]="isProcessingBooking() || !bookingModel.cdrNo">
                  <mat-icon *ngIf="!isProcessingBooking()">verified_user</mat-icon>
                  <span *ngIf="!isProcessingBooking()">Confirm & Secure Booking</span>
                  <span *ngIf="isProcessingBooking()">Processing Booking...</span>
                </button>
              </div>
            </div>
          </mat-card>

          <!-- Booking Details Card (Success State) -->
          <mat-card class="info-card certificate-card booking-cert" *ngIf="['BOOKED', 'QIC_PENDING', 'QIC_REQUESTED', 'QIC_IN_PROGRESS', 'QIC_APPROVED', 'DIC_PENDING', 'DIC_APPROVED', 'COMPLETED'].includes(app.status)">
            <div class="card-header">
              <mat-icon>fact_check</mat-icon>
              <h3>Booking Confirmed</h3>
            </div>
            <div class="info-body">
              <div class="certificate-box booking-box">
                <div class="cert-header">
                   <div class="govt-label">SECURED VIA PUNJAB CLEAN AIR</div>
                   <div class="cert-title">BOOKING CONFIRMATION</div>
                </div>
                <div class="cert-data">
                  <div class="c-item">
                    <span class="c-label">BOOKED STATUS:</span>
                    <span class="c-val highlight">SECURED</span>
                  </div>
                  <div class="c-item">
                    <span class="c-label">FIRM ASSOCIATION:</span>
                    <span class="c-val">{{app.bookedByFirmName || 'Authorized Firm'}}</span>
                  </div>
                  <div class="c-item">
                    <span class="c-label">machine / implement:</span>
                    <span class="c-val">{{app.implementName}}</span>
                  </div>
                </div>
                
                <button mat-flat-button class="execute-btn" style="width: 100%;" disabled>
                  <mat-icon>check_circle</mat-icon> Booking Active
                </button>
              </div>
            </div>
          </mat-card>

          <!-- QR Verification Card -->
          <mat-card class="info-card qr-card" *ngIf="['BOOKED', 'QIC_PENDING', 'QIC_REQUESTED', 'QIC_IN_PROGRESS', 'QIC_APPROVED', 'DIC_PENDING', 'DIC_APPROVED', 'COMPLETED'].includes(app.status)">
            <div class="card-header">
              <mat-icon>qr_code_2</mat-icon>
              <h3>Digital Verification QR</h3>
            </div>
            <div class="info-body">
              <div class="qr-content-wrapper">
                <div class="qr-image-box">
                  <img [src]="qrCodeDataUrl()" *ngIf="qrCodeDataUrl()" alt="Verification QR">
                  <div class="qr-placeholder" *ngIf="!qrCodeDataUrl()">
                    <mat-icon>qr_code_scanner</mat-icon>
                  </div>
                </div>
                <div class="qr-meta">
                   <div class="unique-id-badge">
                      <label>Unique machine / implement ID</label>
                      <div class="id-val">{{app.uniqueImplementId || 'N/A (Pending)'}}</div>
                   </div>
                   <p class="qr-instr">The unique machine / implement ID Plate and tracker with QR code have been installed on each machine / implement. This QR code contains authenticated application data for field verification via Punjab Clean Air mobile apps.</p>
                   <button mat-stroked-button class="print-qr-btn">
                     <mat-icon>print</mat-icon> Print QR Label
                   </button>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- Right Column: Machinery & Technical -->
        <div class="grid-col side-info">
          <mat-card class="info-card equipment">
            <div class="card-header">
              <mat-icon>agriculture</mat-icon>
              <h3>Equipment & Financials</h3>
            </div>
            <div class="info-body">
              <div class="equipment-box">
                <mat-icon>settings_suggest</mat-icon>
                <div class="eq-details">
                  <div class="eq-name">{{app.implementName}}</div>
                  <div class="eq-meta">Project: {{app.projectTypeName}}</div>
                </div>
              </div>

              <!-- Pricing Breakdown -->
              <div class="pricing-breakdown">
                <div class="price-header">Financial Distribution</div>
                <div class="price-slots">
                  <div class="price-item total">
                    <span class="p-label">Total Cost</span>
                    <span class="p-val">Rs. {{app.totalCostPrice | number}}</span>
                  </div>
                  <div class="price-divider"></div>
                  <div class="price-row">
                    <div class="price-sub-item">
                       <span class="p-label">Govt. Share ({{app.subsidyPercentage}}%)</span>
                       <span class="p-val gov">- Rs. {{app.governmentShare | number}}</span>
                    </div>
                    <div class="price-sub-item">
                       <span class="p-label">Farmer Payable</span>
                       <span class="p-val farmer">Rs. {{app.farmerShare | number}}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="tech-specs">
                <div class="tech-tag">
                  <mat-icon>speed</mat-icon>
                  <span>{{app.tractorHP}} HP</span>
                </div>
                <div class="tech-tag">
                  <mat-icon>model_training</mat-icon>
                  <span>{{app.tractorModel}}</span>
                </div>
                <div class="tech-tag">
                  <mat-icon>landscape</mat-icon>
                  <span>{{app.landArea}} {{app.landUnit}}</span>
                </div>
              </div>
            </div>
          </mat-card>


          <!-- Allotment Action Card -->
          <mat-card class="info-card action-card" *ngIf="app.status === 'BALLOTED'">
            <div class="card-header">
              <mat-icon>verified_user</mat-icon>
              <h3>Execute Allotment</h3>
            </div>
            <div class="info-body">
              <p class="instr">Finalize selection by assigning the applicant to a quota category.</p>
              
              <div class="action-form">
                <div class="form-group">
                  <label>Quota Category</label>
                  <select [(ngModel)]="allotmentModel.category" class="premium-select">
                    <option value="WINNER">Winner (Selected)</option>
                    <option value="WAITING">Waiting List</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Queue Position (1-100)</label>
                  <input type="number" [(ngModel)]="allotmentModel.quotaNumber" class="premium-input" min="1" max="100">
                </div>
                <div class="form-group">
                  <label>Allotment Date</label>
                  <input type="date" [(ngModel)]="allotmentModel.date" class="premium-input">
                </div>
                
                <button mat-flat-button class="execute-btn" (click)="onExecuteAllotment()" [disabled]="isProcessingAllotment()">
                  <mat-icon *ngIf="!isProcessingAllotment()">document_scanner</mat-icon>
                  <span *ngIf="!isProcessingAllotment()">Confirm & Allot</span>
                  <span *ngIf="isProcessingAllotment()">Processing...</span>
                </button>
              </div>
            </div>
          </mat-card>

          <!-- Allotment Details Card -->
          <mat-card class="info-card certificate-card" *ngIf="app.status === 'ALLOTED' || app.allotmentNumber">
            <div class="card-header">
              <mat-icon>description</mat-icon>
              <h3>Official Allotment</h3>
            </div>
            <div class="info-body">
              <div class="certificate-box">
                <div class="cert-header">
                   <div class="govt-label">GOVERNMENT OF PUNJAB</div>
                   <div class="cert-title">ALLOTMENT LETTER</div>
                </div>
                <div class="cert-data">
                  <div class="c-item">
                    <span class="c-label">ALLOTMENT NO:</span>
                    <span class="c-val highlight">{{app.allotmentNumber}}</span>
                  </div>
                  <div class="c-item">
                    <span class="c-label">CATEGORY:</span>
                    <span class="c-val">{{app.allotmentCategory}} - Position #{{app.allotmentQuotaNumber}}</span>
                  </div>
                  <div class="c-item">
                    <span class="c-label">ISSUED ON:</span>
                    <span class="c-val">{{app.allotmentDate | date:'mediumDate'}}</span>
                  </div>
                </div>
                <button mat-stroked-button class="print-cert-btn">
                  <mat-icon>download</mat-icon> <span>Download Allotment Letter (PDF)</span>
                </button>
              </div>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Application History Redesigned UI -->
      <mat-card class="info-card history-card full-width">
        <div class="card-header audit-header">
          <div class="header-left">
            <mat-icon>analytics</mat-icon>
            <div class="h-text">
              <h3>Detailed Application Audit Trail</h3>
              <span>Tracing every administrative touchpoint and state transition</span>
            </div>
          </div>
          <div class="header-right">
            <span class="entry-count">{{app.history?.length || 0}} Entries Found</span>
          </div>
        </div>
        
        <div class="info-body timeline-container">
          <div class="timeline-v-line"></div>
          
          <div class="timeline-event" *ngFor="let item of app.history; let last = last" [class.latest]="last">
            <div class="timeline-dot" [class.active]="last">
              <mat-icon>{{ getStatusIcon(item.status) }}</mat-icon>
            </div>
            
            <div class="event-card">
              <div class="card-top">
                <div class="action-info">
                   <div class="action-status">{{ item.action?.replace('_', ' ') }}</div>
                   <div class="action-time">
                      <mat-icon>schedule</mat-icon>
                      {{item.timestamp | date:'shortTime'}} • {{item.timestamp | date:'mediumDate'}}
                   </div>
                </div>
                <div class="performed-by" *ngIf="item.performedBy">
                   <div class="user-avatar">
                      <mat-icon>person_outline</mat-icon>
                   </div>
                   <div class="user-meta">
                      <label>PERFORMED BY</label>
                      <span class="p-name">{{item.performedByFullName || item.performedBy}}</span>
                      <a [href]="'tel:' + item.performedByPhone" class="p-phone" *ngIf="item.performedByPhone && item.performedByPhone !== 'N/A'">
                        <mat-icon>call</mat-icon> {{item.performedByPhone}}
                      </a>
                   </div>
                </div>
              </div>
              
              <div class="card-details">
                <div class="status-indicator" [class]="item.status.toLowerCase()">
                  <div class="indicator-dot"></div>
                  <span>System Status: <b>{{ item.status?.replace('_', ' ') }}</b></span>
                </div>
                
                <div class="remarks-box" *ngIf="item.remarks">
                  <mat-icon>chat_bubble_outline</mat-icon>
                  <p>{{item.remarks}}</p>
                </div>

                <!-- Download Attachment Button (Redesigned for context) -->
                <div class="attachment-action" *ngIf="item.attachmentPath">
                  <button mat-flat-button class="download-sign-btn" (click)="downloadAttachment(item.attachmentPath)">
                    <mat-icon>file_download</mat-icon> 
                    <span>{{ item.action === 'DIC_START' ? 'Click Here to Download DIC Performa' : (item.action === 'QIC_BILL_GENERATED' ? 'Click Here to Download' : 'Download Signed Report') }}</span>
                  </button>
                </div>
                
                <div class="default-desc" *ngIf="!item.remarks">
                  {{ item.status === 'BALLOTED' ? 'Successfully selected in computerized balloting.' : 
                     item.status === 'ALLOTED' ? 'Official Punjab Government Allotment Letter Issued.' :
                     'Awaiting administrative review.' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Fallback if no history -->
          <div class="timeline-event latest" *ngIf="!app.history || app.history.length === 0">
             <div class="timeline-dot active">
                <mat-icon>file_open</mat-icon>
             </div>
             <div class="event-card">
                <div class="card-top">
                   <div class="action-info">
                      <div class="action-status">Application Submission</div>
                      <div class="action-time">
                         <mat-icon>schedule</mat-icon>
                         {{app.createdAt | date:'shortTime'}} • {{app.createdAt | date:'mediumDate'}}
                      </div>
                   </div>
                </div>
                <div class="card-details">
                   <p>Application successfully received and registered in the system dossier.</p>
                </div>
             </div>
          </div>
        </div>
      </mat-card>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { padding: 40px; background: #fdfbf7; min-height: 100vh; }

    /* Header */
    .detail-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;
      padding: 24px 32px; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
      border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.02);

      .back-nav { display: flex; align-items: center; gap: 24px; }
      .back-btn { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: none; color: #0f172a; }
      .title-label {
        .badge { font-size: 10px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; display: block; }
        h1 { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
      }
    }
    .header-actions { display: flex; gap: 12px; }
    .action-btn {
      height: 48px; border-radius: 14px; font-weight: 800; padding: 0 24px;
      transition: all 0.3s ease;

      ::ng-deep .mdc-button__label {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }

      mat-icon { font-size: 20px; width: 20px; height: 20px; margin: 0 !important; }
      &.primary { background: #3b82f6 !important; color: white !important; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2); }
    }

    /* Stepper */
    .phase-stepper-card {
      background: var(--card-bg); border-radius: 24px; padding: 32px; margin-bottom: 32px;
      border: 1px solid var(--border-color); box-shadow: 0 10px 30px rgba(0,0,0,0.02);
    }
    .stepper-content { display: flex; justify-content: space-between; position: relative; }
    .step {
      flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1;
      
      .step-node { display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .node-circle {
        width: 52px; height: 52px; border-radius: 16px; background: #f1f5f9; 
        color: #94a3b8; display: flex; align-items: center; justify-content: center;
        transition: all 0.4s ease; position: relative;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      .check-mark {
        position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; 
        background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
      .node-label { text-align: center; }
      .step-name { display: block; font-size: 13px; font-weight: 800; color: #1e293b; }
      .step-status { font-size: 11px; font-weight: 600; color: #94a3b8; }

      &.active { .node-circle { background: #10b981; color: white; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4); } .step-status { color: #10b981; } }
      &.completed { .node-circle { background: #ecfdf5; color: #10b981; } .step-status { color: #059669; } }
    }
    .step-connector {
      position: absolute; top: 26px; left: -50%; width: 100%; height: 2px;
      background: #f1f5f9; z-index: -1;
    }
    .step.completed + .step .step-connector, .step.active + .step .step-connector { background: #10b98130; }

    /* Grid Layout */
    .details-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }
    .grid-col { display: flex; flex-direction: column; gap: 32px; }

    .info-card {
      border: 1px solid #f1f5f9; border-radius: 28px; padding: 32px; background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s ease;
      
      &:hover { box-shadow: 0 10px 40px rgba(0,0,0,0.04); transform: translateY(-4px); }

      .card-header {
        display: flex; align-items: center; gap: 16px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f8fafc;
        mat-icon { color: #3b82f6; background: #eff6ff; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
      }
    }

    .data-row { display: flex; gap: 32px; margin-bottom: 20px; }
    .data-item {
      flex: 1;
      label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .val { font-size: 15px; font-weight: 700; color: #1e293b; }
      .font-mono { font-family: monospace; letter-spacing: 1px; }
    }

    .data-grid-small { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }

    .equipment-box {
      display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 16px; margin-bottom: 24px;
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: #cbd5e1; }
      .eq-name { font-size: 18px; font-weight: 900; color: #0f172a; }
      .eq-meta { font-size: 12px; color: #64748b; font-weight: 600; }
    }

    .pricing-breakdown {
      margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #fdfbf7; border: 1.5px dashed #e2e8f0;
      .price-header { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
      .price-slots { display: flex; flex-direction: column; gap: 12px; }
      .price-item { display: flex; justify-content: space-between; align-items: center; }
      .p-label { font-size: 12px; font-weight: 700; color: #64748b; }
      .p-val { font-size: 16px; font-weight: 900; color: #1e293b; }
      .price-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }
      .price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .price-sub-item { display: flex; flex-direction: column; gap: 4px; }
      .gov { color: #10b981 !important; font-size: 14px; }
      .farmer { color: #4f46e5 !important; font-size: 14px; }
    }

    .tech-specs { display: flex; flex-wrap: wrap; gap: 12px; }
    .tech-tag {
      background: #f1f5f9; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }
      span { font-size: 13px; font-weight: 800; color: #475569; }
    }
    
    .action-card { background: #f0fdf4 !important; border: 1px solid #bbf7d0 !important; }
    .instr { font-size: 13px; color: #166534; font-weight: 500; margin-bottom: 20px; }
    .action-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; label { font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; } }
    .premium-select, .premium-input { height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #bbf7d0; background: white; font-weight: 700; color: #1e293b; outline: none; &:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); } }
    .execute-btn { background: #10b981 !important; color: white !important; height: 48px; border-radius: 14px; font-weight: 800; mat-icon { margin-right: 8px; } }

    .certificate-card { background: var(--card-bg) !important; border: 2px solid var(--border-color) !important; }
    .certificate-box { border: 2px solid var(--border-color); border-radius: 20px; padding: 32px; background: var(--card-bg); position: relative; overflow: hidden; &::after { content: 'PUNJAB'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 900; color: rgba(0,0,0,0.02); z-index: 0; pointer-events: none; } }
    .cert-header { text-align: center; margin-bottom: 32px; position: relative; z-index: 1; .govt-label { font-size: 11px; font-weight: 800; color: #10b981; letter-spacing: 2px; } .cert-title { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 4px; } }
    .cert-data { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; position: relative; z-index: 1; }
    .c-item { display: flex; justify-content: space-between; align-items: center; .c-label { font-size: 12px; font-weight: 700; color: #64748b; } .c-val { font-size: 15px; font-weight: 800; color: #1e293b; } }
    .print-cert-btn { width: 100%; height: 48px; border-radius: 14px; border: 2px solid #10b981 !important; color: #10b981 !important; font-weight: 800; mat-icon { margin-right: 8px; } }

    /* Audit Trail Redesign */
    .badge-row { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
    .status-badges { display: flex; gap: 8px; }
    .status-tag {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px;
      font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.info { background: #eff6ff; color: #3b82f6; }
      &.success { background: #ecfdf5; color: #10b981; }
      &.primary { background: #f0fdf4; color: #10b981; border: 1px solid #bbf7d0; }
    }

    .header-main-row { 
      display: flex; align-items: center; gap: 20px; margin-top: 10px;
    }

    .status-indicator-pill {
      height: 40px; padding: 0 20px; border-radius: 50px; font-size: 13px; font-weight: 850; 
      text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 10px; 
      border: 2px solid; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);

      mat-icon { font-size: 20px; width: 20px; height: 20px; margin: 0 !important; }

      &.approved, &.completed { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
      &.deferred, &.rejected { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
      &.qic-review, &.dic-pending, &.qic-pending, &.qic-in-progress { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
      &.booked, &.allotted, &.balloted { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
      &.default { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
      
      &:hover { transform: scale(1.02); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
    }

    .attachment-action { margin-top: 16px; }
    .download-sign-btn {
      background: #0f172a !important; color: white !important; border-radius: 12px;
      height: 40px; font-weight: 800; font-size: 12px; padding: 0 16px; transition: all 0.3s ease;
      
      ::ng-deep .mdc-button__label {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin: 0 !important; }
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2); }
    }

    .history-card {
      margin-top: 50px;
      padding: 0 !important;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 40px rgba(0,0,0,0.03);
      background: #fcfcfc !important;

      .audit-header {
        padding: 24px 32px;
        background: white;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          mat-icon { font-size: 28px; width: 28px; height: 28px; color: #10b981; }
          .h-text {
            h3 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; }
            span { font-size: 12px; color: #94a3b8; font-weight: 500; }
          }
        }
        .entry-count {
          padding: 6px 14px;
          background: #f1f5f9;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
        }
      }
    }

    .timeline-container {
      padding: 40px 32px;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 32px;
      
      .timeline-v-line {
        position: absolute;
        left: 48px;
        top: 60px;
        bottom: 60px;
        width: 2px;
        background: #e2e8f0;
        z-index: 0;
      }
    }

    .timeline-event {
      display: flex;
      gap: 32px;
      position: relative;
      z-index: 1;

      .timeline-dot {
        width: 32px;
        height: 32px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 4px;
        color: #94a3b8;
        transition: all 0.3s ease;
        flex-shrink: 0;
        
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
        &.active {
          border-color: #10b981;
          background: #10b981;
          color: white;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.15);
        }
      }

      .event-card {
        flex: 1;
        background: white;
        border-radius: 20px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        padding: 24px;
        transition: all 0.3s ease;
        
        &:hover {
          transform: translateX(8px);
          border-color: #e2e8f0;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.05);
        }
      }

      &.latest .event-card {
        border-left: 4px solid #10b981;
      }
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f8fafc;

      .action-info {
        .action-status {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .action-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
        }
      }

      .performed-by {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: #f8fafc;
        border-radius: 12px;
        
        .user-avatar {
          width: 32px;
          height: 32px;
          background: #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          mat-icon { font-size: 18px; width: 18px; height: 18px; }
        }
        .user-meta {
          display: flex;
          flex-direction: column;
          label { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; margin: 0; }
          .p-name { font-size: 13px; font-weight: 800; color: #1e293b; }
          .p-phone { 
            display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #10b981; 
            text-decoration: none; margin-top: 2px;
            mat-icon { font-size: 11px; width: 11px; height: 11px; }
            &:hover { color: #059669; }
          }
        }
      }
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 16px;
      
      .indicator-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
      span { font-size: 11px; color: #64748b; b { font-weight: 800; color: #1e293b; } }
      
      &.qic_approved, &.alloted, &.booked, &.completed { .indicator-dot { background: #10b981; } background: #ecfdf5; }
      &.qic_deferred, &.rejected { .indicator-dot { background: #ef4444; } background: #fef2f2; }
      &.qic_requested, &.pending { .indicator-dot { background: #3b82f6; } background: #eff6ff; }
    }

    .remarks-box {
      background: #fcfcfc;
      border-left: 3px solid #e2e8f0;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      border-radius: 0 12px 12px 0;
      
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #cbd5e1; margin-top: 2px; }
      p { margin: 0; font-size: 14px; font-weight: 500; color: #475569; line-height: 1.5; font-style: italic; }
    }

    .default-desc { font-size: 14px; color: #94a3b8; font-weight: 500; }

    .qic-start-btn {
      margin-top: 8px; height: 32px; line-height: normal; background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; color: white !important; font-size: 10px; font-weight: 900; border-radius: 8px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); animation: pulsate 2s infinite ease-in-out; border: none; padding: 0 12px;
    }
    @keyframes pulsate { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    .pulse { animation: shadow-pulse 2s infinite; }
    @keyframes shadow-pulse { 0% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); } }

    .qr-card {
      background: #fafaf9 !important; border: 1.5px dashed #e2e8f0 !important;
      .qr-content-wrapper { display: flex; gap: 24px; align-items: flex-start; }
      .qr-image-box { 
        width: 140px; height: 140px; background: white; border-radius: 16px; padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;
        img { width: 100%; height: 100%; object-fit: contain; }
      }
      .qr-meta {
        flex: 1; display: flex; flex-direction: column; gap: 16px;
        .unique-id-badge {
          background: #f1f5f9; padding: 12px; border-radius: 12px; border-left: 4px solid #10b981;
          label { display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
          .id-val { font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
        }
        .qr-instr { font-size: 11px; color: #64748b; margin: 0; line-height: 1.5; font-weight: 500; }
        .print-qr-btn { height: 36px; border-radius: 10px; font-size: 11px; font-weight: 800; color: #0f172a; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
      }
    }

    .premium-summary-card {
      background: white; border-radius: 16px; padding: 16px; margin-bottom: 16px;
      border: 1.5px solid #3b82f620; box-shadow: 0 15px 35px rgba(59, 130, 246, 0.04);
      position: relative; overflow: hidden;
      
      .card-p-header {
        margin-bottom: 12px;
        .top-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
        .app-label { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; }
        .app-no { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
        
        .sub-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        
        .implement-highlight {
          display: inline-flex; align-items: center; gap: 6px;
          background: #f0fdf4; padding: 5px 12px; border-radius: 8px;
          border: 1px solid transparent; /* Match border logic of uid-row */
          mat-icon { color: #10b981; font-size: 16px; width: 16px; height: 16px; }
          span { font-size: 12px; color: #065f46; b { font-weight: 800; font-size: 13px; } }
        }
        
        .uid-row {
          background: #fafaf9; padding: 5px 12px; border-radius: 8px; border: 1px solid #e2e8f0;
          display: inline-flex; align-items: center; gap: 8px;
          .l { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .v { font-size: 12px; font-weight: 800; color: #475569; font-family: monospace; }
        }

        .p-status-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .p-tag {
          display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px;
          font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
          mat-icon { font-size: 12px; width: 12px; height: 12px; }
          &.black { background: #1e293b; color: white; }
          &.green { background: #dcfce7; color: #166534; }
          &.blue { background: #eff6ff; color: #1e40af; border: none; cursor: pointer; &:hover { background: #dbeafe; } }
        }
      }

      .card-p-divider { height: 1px; background: #f1f5f9; margin: 0 -16px 16px; }

      .card-p-body {
        display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
        
        .p-info-main { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 24px; flex: 1; }
        .p-item-group {
          display: flex; gap: 10px; align-items: center;
          .p-icon-box {
            width: 32px; height: 32px; background: #eff6ff; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; color: #3b82f6;
            mat-icon { font-size: 16px; width: 16px; height: 16px; }
            &.small { width: 28px; height: 28px; border-radius: 8px; mat-icon { font-size: 14px; width: 14px; height: 14px; } }
            &.blue { background: #eff6ff; color: #3b82f6; }
          }
          .p-text-box {
            display: flex; flex-direction: column;
            label { font-size: 8px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; margin-bottom: 2px; text-transform: uppercase; }
            h3 { margin: 0; font-size: 14px; font-weight: 950; color: #1e293b; letter-spacing: -0.2px; }
            p { margin: 1px 0 0; font-size: 12px; font-weight: 600; color: #64748b; }
            .mono { font-family: monospace; letter-spacing: 0.5px; }
          }
        }

        .p-info-qr {
          .qr-wrapper-premium {
            background: white; padding: 8px; border-radius: 12px; border: 1px solid #f1f5f9;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center;
            img { width: 80px; height: 80px; object-fit: contain; }
            .qr-label-premium { font-size: 7px; font-weight: 950; color: #cbd5e1; letter-spacing: 1px; margin-top: 4px; }
          }
        }
      }
    }
    .p-val-group { display: flex; align-items: center; gap: 12px; position: relative; }
    .inline-edit-btn {
      width: 28px; height: 28px; line-height: 28px; opacity: 0; transition: all 0.2s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #3b82f6; }
      &:hover { background: #eff6ff; }
    }

    .qic-start-btn, .dic-start-btn {
      margin-top: 8px; background: #10b981 !important; color: white !important;
      font-weight: 850; font-size: 10px; padding: 0 12px; height: 32px; border-radius: 8px;
      line-height: normal; min-width: 140px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      animation: buttonSlideUp 0.5s ease forwards;
    }

    @keyframes buttonSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .glowing-step {
      .node-circle { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1), 0 0 20px rgba(16, 185, 129, 0.2) !important; z-index: 2; }
      .step-name { color: #10b981 !important; }
    }

    .pulse { animation: pulseAnim 2s infinite; }
    @keyframes pulseAnim { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

    .p-val-group:hover .inline-edit-btn { opacity: 1; }

    .p-edit-box { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .edit-input-wrapper { position: relative; display: flex; flex-direction: column; width: 100%; }
    .mini-progress-bar { height: 2px !important; margin-bottom: 2px; border-radius: 2px; }
    .p-edit-btns { display: flex; gap: 4px; align-items: center; button { width: 32px; height: 32px; line-height: 32px; display: flex; align-items: center; justify-content: center; } }

    .loading-overlay { 
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 10000; animation: fadeIn 0.4s ease forwards;
      .l-text { margin-top: 24px; font-weight: 800; color: #1e293b; font-size: 16px; letter-spacing: -0.2px; }
    }
    .dic-decision-row { display: flex; gap: 8px; margin-top: 8px; }
    .dic-approve-btn { background: #10b981 !important; color: white !important; font-weight: 800; font-size: 10px; height: 32px; border-radius: 8px; }
    .dic-reject-btn { font-weight: 800; font-size: 10px; height: 32px; border-radius: 8px; }

    /* DECISION WIZARD STYLES */
    .decision-wizard { background: rgba(15, 23, 42, 0.9) !important; z-index: 1000 !important; }
    .selection-card { background: white; width: 420px; border-radius: 20px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .wizard-header { text-align: center; margin-bottom: 24px; .dic-icon { font-size: 48px; width: 48px; height: 48px; color: #020617; } h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 12px 0 4px; } p { font-size: 13px; color: #64748b; font-weight: 500; } }
    .option-grid { display: flex; gap: 16px; margin-bottom: 20px; }
    .accept-opt, .defer-opt { flex: 1; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border-radius: 16px; border: 2px solid transparent; 
       mat-icon { font-size: 28px; width: 28px; height: 28px; }
       .opt-label-group { display: flex; flex-direction: column; align-items: center; gap: 2px; }
       label { font-size: 13px; font-weight: 800; cursor: pointer; color: inherit; } span { font-size: 10px; opacity: 0.8; font-weight: 700; }
    }
    .accept-opt { background: #ecfdf5 !important; color: #065f46 !important; border-color: #059669; }
    .defer-opt { background: #fef2f2 !important; color: #991b1b !important; border-color: #dc2626; }
    .cancel-wizard { width: 100%; font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; }
    .upload-step, .remarks-step { .step-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 16px; mat-icon { font-size: 18px; width: 18px; height: 18px; } } }
    .upload-area { height: 100px; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; cursor: pointer; transition: all 0.2s;
       mat-icon { color: #64748b; font-size: 32px; width: 32px; height: 32px; } .file-text { font-size: 11px; font-weight: 700; color: #475569; margin-top: 8px; }
       &:hover { border-color: #3b82f6; background: #eff6ff; } &.has-file { border-color: #10b981; background: #f0fdf4; mat-icon { color: #10b981; } }
    }
    .remarks-area { width: 100%; height: 100px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 500; font-family: inherit; resize: none; &:focus { border-color: #ef4444; outline: none; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); } }
    .wizard-actions { display: flex; justify-content: space-between; margin-top: 24px; button { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; } }
  `]
})
export class ApplicationDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private applicationService = inject(FarmerApplicationService);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private fileUploadService = inject(FileUploadService);
  private snackBar = inject(MatSnackBar);

  application = signal<FarmerApplicationPayload | null>(null);
  isLoading = signal(true);

  // File Upload State
  selectedFile = signal<File | null>(null);
  uploadProgress = signal(0);
  isUploadingFile = signal(false);
  hasStartInspectionFeature = signal(false);
  hasStartDICFeature = signal(false);
  hasEditFeature = signal(false);
  editingField = signal<string | null>(null);
  isUpdatingField = signal(false);
  editModel: any = {};
  qrCodeDataUrl = signal<string>('');

  phases = [
    { name: 'Registry', key: 'REGISTRATION', icon: 'how_to_reg', statuses: ['ACCEPTED', 'ELIGIBLE', 'PENDING'] },
    { name: 'Balloting', key: 'BALLOTING', icon: 'auto_awesome_motion', statuses: ['BALLOTED'] },
    { name: 'Allotment', key: 'ALLOTMENT', icon: 'verified', statuses: ['ALLOTED'] },
    { name: 'Booking', key: 'BOOKING', icon: 'bookmark_added', statuses: ['BOOKED'] },
    { name: 'Inspection QIC', key: 'INSPECTION', icon: 'fact_check', statuses: ['QIC_PENDING', 'QIC_REQUESTED', 'QIC_IN_PROGRESS', 'QIC_APPROVED', 'QIC_DEFFERED'] },
    { name: 'Inspection DIC', key: 'DIC_INSPECTION', icon: 'how_to_reg', statuses: ['DIC_PENDING', 'DIC_IN_PROGRESS', 'DIC_APPROVED', 'DIC_DEFERED', 'DIC_DEFFERED'] },
    { name: 'Subsidy', key: 'SUBSIDY', icon: 'payments', statuses: ['REQUEST_INVOICE', 'SUBSIDY_PAID'] },
    { name: 'Completed', key: 'COMPLETED', icon: 'offline_pin', statuses: ['COMPLETED'] }
  ];

  // Allotment Form Model
  allotmentModel = {
    category: 'WINNER',
    quotaNumber: 1,
    date: new Date().toISOString().split('T')[0]
  };
  isProcessingAllotment = signal(false);

  // Booking Form Model
  bookingModel = {
    cdrNo: '',
    cdrBankName: '',
    cdrAmount: 0,
    remarks: 'Booking initiated from application details.'
  };
  isProcessingBooking = signal(false);

  appStatusDisplay(): { text: string; class: string } {
    const app = this.application();
    if (!app) return { text: 'Loading...', class: 'default' };
    const s = app.status;
    
    switch(s) {
      case 'BOOKED': return { text: 'Booking Secured', class: 'booked' };
      case 'QIC_PENDING': return { text: 'QIC Draft Mode', class: 'qic-pending' };
      case 'QIC_REQUESTED': return { text: 'Pending Convener Review', class: 'qic-review' };
      case 'QIC_IN_PROGRESS': return { text: 'In Progress: QIC Field Work', class: 'qic-in-progress' };
      case 'QIC_APPROVED': return { text: 'QIC Passed & Finalized', class: 'approved' };
      case 'QIC_DEFFERED': return { text: 'QIC Deferred (Follow Up)', class: 'deferred' };
      case 'DIC_PENDING': return { text: 'Awaiting DIC Verification', class: 'dic-pending' };
      case 'DIC_IN_PROGRESS': return { text: 'In Progress: DIC Field Work', class: 'dic-pending' };
      case 'DIC_DEFERED': 
      case 'DIC_DEFFERED': return { text: 'DIC Deferred (Follow Up)', class: 'deferred' };
      case 'DIC_APPROVED': return { text: 'DIC Cleared', class: 'approved' };
      case 'COMPLETED': return { text: 'Lifecycle Completed', class: 'completed' };
      case 'BALLOTED': return { text: 'Ballot Selection Winner', class: 'balloted' };
      case 'ALLOTED': return { text: 'Official Quota Allotted', class: 'allotted' };
      case 'REJECTED': return { text: 'Application Denied', class: 'rejected' };
      default: return { text: s?.replace(/_/g, ' ') || 'In Processing', class: 'default' };
    }
  }

  getStatusIcon(status: string): string {
    if (!status) return 'history';
    const s = status.toUpperCase();
    if (s.includes('APPROVED') || s.includes('COMPLETED') || s.includes('SUCCESS')) return 'check_circle';
    if (s.includes('REJECTED') || s.includes('CANCELLED') || s.includes('DEFERRED')) return 'cancel';
    if (s.includes('PENDING') || s.includes('REQUESTED')) return 'schedule';
    if (s.includes('IN_PROGRESS')) return 'sync';
    if (s.includes('BOOKED')) return 'bookmark';
    if (s.includes('BALLOTED')) return 'auto_awesome';
    if (s.includes('ALLOTED')) return 'verified';
    return 'info';
  }

  ngOnInit() {
    this.checkFeatures();
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isLoading.set(true);
        this.loadDetails(+id);
      }
    });
  }

  private checkFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures = JSON.parse(featuresStr);
        this.hasStartInspectionFeature.set(
          allFeatures.some((f: any) => f.name === 'Quality Inspection Initiation Request. (QIC Start)' && f.active)
        );
        this.hasStartDICFeature.set(
            allFeatures.some((f: any) => f.name === 'Delivery Inspection Initiation Request (DIC Start)' && f.active)
        );
        this.hasEditFeature.set(
          allFeatures.some((f: any) => (f.name === 'Edit Farmer Application' || f.name === 'Farmer Application Updation') && f.active)
        );
      } catch (e) {
        console.error('Error parsing features', e);
      }
    }
  }

  loadDetails(id: number) {
    this.applicationService.getById(id).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (data: FarmerApplicationPayload) => {
        this.application.set(data);
        if (data.farmerShare) {
          this.bookingModel.cdrAmount = data.farmerShare;
        }
        this.generateQRCode(data);
      },
      error: (err: any) => console.error('Error loading application', err)
    });
  }

  async generateQRCode(app: FarmerApplicationPayload) {
    const baseUrl = window.location.origin;
    const qrText = `${baseUrl}/verify-report?type=DIC&id=${app.applicationNumber}`;

    try {
      const url = await QRCode.toDataURL(qrText, {
        margin: 1,
        width: 250,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      this.qrCodeDataUrl.set(url);
    } catch (err) {
      console.error('QR Generation failed', err);
    }
  }

  onFileSelected(file: File | null) {
    this.selectedFile.set(file);
  }

  onExecuteBooking() {
    const app = this.application();
    if (!app || !app.id) return;

    if (!app.implementId) {
      this.snackBar.open('Machinery specification is missing caps.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.bookingModel.cdrNo || !this.bookingModel.cdrBankName) {
      this.snackBar.open('Please provide CDR Number and Bank Name.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.selectedFile()) {
      this.snackBar.open('Please upload the CDR / Deposit Slip copy.', 'Close', { duration: 3000 });
      return;
    }

    this.isProcessingBooking.set(true);
    this.isUploadingFile.set(true);
    this.uploadProgress.set(0);

    this.fileUploadService.upload(this.selectedFile()!).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          const fileName = event.body.fileName;
          this.proceedWithBooking(app.id!, app.implementId!, fileName);
          this.isUploadingFile.set(false);
        }
      },
      error: (err) => {
        this.snackBar.open('File upload failed.', 'Error', { duration: 5000 });
        this.isProcessingBooking.set(false);
        this.isUploadingFile.set(false);
      }
    });
  }

  private proceedWithBooking(applicationId: number, implementId: number, cdrFilePath: string) {
    const request: BookingRequest = {
      applicationId: applicationId,
      implementId: implementId,
      cdrNo: this.bookingModel.cdrNo,
      cdrBankName: this.bookingModel.cdrBankName,
      cdrAmount: this.bookingModel.cdrAmount,
      remarks: this.bookingModel.remarks,
      cdrFilePath: cdrFilePath
    };

    this.bookingService.processBooking(request)
      .pipe(finalize(() => this.isProcessingBooking.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Booking secured successfully!', 'Success', { duration: 5000 });
          this.loadDetails(applicationId);
        },
        error: (err) => {
          this.snackBar.open('Booking failed: ' + (err.error?.message || 'Server error'), 'Error', { duration: 5000 });
        }
      });
  }

  onExecuteAllotment() {
    const app = this.application();
    if (!app || !app.id) return;

    this.isProcessingAllotment.set(true);
    this.applicationService.allot(app.id, this.allotmentModel.category, this.allotmentModel.quotaNumber, this.allotmentModel.date)
      .pipe(finalize(() => this.isProcessingAllotment.set(false)))
      .subscribe({
        next: (updated) => this.application.set(updated),
        error: (err) => console.error('Allotment failed', err)
      });
  }

  onStartQIC(app: FarmerApplicationPayload) {
    if (!app.id) return;

    this.router.navigate(['/portal/quality-inspection/form', app.id], {
      queryParams: { appNo: app.applicationNumber }
    });
  }

  isDicDecisionWizardActive = signal(false);
  dicDecisionProcess = signal<'ACCEPT' | 'DEFER' | null>(null);
  dicDeferRemarks = signal('');
  signedDicFile: File | null = null;

  async onStartDIC(app: any) {
    if (app.status === 'DIC_IN_PROGRESS') {
      this.isDicDecisionWizardActive.set(true);
      return;
    }
    this.generateDicReport(app);
  }

  closeDicWizard() {
    this.isDicDecisionWizardActive.set(false);
    this.dicDecisionProcess.set(null);
    this.signedDicFile = null;
    this.dicDeferRemarks.set('');
  }

  onSignedFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
       this.signedDicFile = file;
    } else {
       this.snackBar.open('Please select a valid PDF file.', 'Error', { duration: 3000 });
    }
  }

  submitDicApproval() {
    const app = this.application();
    if (!app || !this.signedDicFile) return;

    this.isGeneratingReport.set(true);
    this.snackBar.open('Archiving Official Signed Dossier...', 'Sync', { duration: 2000 });
    
    this.applicationService.uploadFile(this.signedDicFile).subscribe({
      next: (uploadRes: any) => {
        this.applicationService.approveDic(app.id!, uploadRes.fileName).subscribe({
          next: (updated) => {
             this.application.set(updated);
             this.isGeneratingReport.set(false);
             this.closeDicWizard();
             this.snackBar.open('DIC Inspection Accepted & Finalized!', 'Success', { duration: 4000 });
          },
          error: (err) => {
             this.isGeneratingReport.set(false);
             this.snackBar.open('Approval failed: ' + (err.error?.message || 'Server error'), 'Error', { duration: 5000 });
          }
        });
      },
      error: () => {
         this.isGeneratingReport.set(false);
         this.snackBar.open('Dossier upload failed.', 'Error', { duration: 4000 });
      }
    });
  }

  submitDicDeferral() {
    const app = this.application();
    if (!app || !this.dicDeferRemarks().trim()) return;

    this.isGeneratingReport.set(true);
    this.applicationService.deferDic(app.id!, this.dicDeferRemarks()).subscribe({
      next: (updated) => {
         this.application.set(updated);
         this.isGeneratingReport.set(false);
         this.closeDicWizard();
         this.snackBar.open('DIC Inspection Deferred Successfully', 'Deferred', { duration: 4000 });
      },
      error: (err) => {
         this.isGeneratingReport.set(false);
         this.snackBar.open('Defer failed: ' + (err.error?.message || 'Server error'), 'Error', { duration: 5000 });
      }
    });
  }

  isGeneratingReport = signal(false);
  generateDicReport(app: FarmerApplicationPayload) {
    if (!app || !app.id) return;

    this.isGeneratingReport.set(true);
    this.snackBar.open('Acquiring convener authorization...', 'Processing', { duration: 1500 });
    
    this.applicationService.getConcernConvener(app.id).subscribe({
      next: (convener) => this.generateDicReportFinal(app, convener),
      error: () => {
        console.warn('Convener details not found, using defaults.');
        this.generateDicReportFinal(app, null);
      }
    });
  }

  private generateDicReportFinal(app: FarmerApplicationPayload, convener: any) {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      const baseUrl = window.location.origin;
      const qrText = `${baseUrl}/verify-report?type=DIC&id=${app.applicationNumber}`;

      QRCode.toDataURL(qrText, { margin: 1, width: 100 }).then(qrDataUrl => {
        // Watermark (Centered, Faded)
        try {
          const pageHeight = doc.internal.pageSize.getHeight();
          (doc as any).setAlpha(0.08); // Very light watermark
          doc.addImage('report-assets/gov-logo.png', 'PNG', pageWidth / 4, pageHeight / 3.5, pageWidth / 2, pageWidth / 2);
          (doc as any).setAlpha(1); // Reset alpha
        } catch (e) {}

        // Headers & Logos
        try {
          doc.addImage('report-assets/gov-logo.png', 'PNG', 8, 8, 25, 25);
          doc.addImage('report-assets/gov.jpg', 'JPEG', pageWidth - 8 - 25, 8, 25, 25);
        } catch (e) { console.warn('Logos not found for PDF'); }

        doc.setFont('times', 'bold');
        doc.setFontSize(15);
        doc.text('DISTRICT INSPECTION COMMITTEE (DIC) REPORT', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(10);
        doc.text('FOR THE PROJECT TITLED', pageWidth / 2, 24, { align: 'center' });
        doc.setFontSize(11);
        doc.text('“PUNJAB CLEAN AIR PROGRAM – AGRICULTURE COMPONENT”', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(10);
        doc.text('FIELD WING OF AGRICULTURE DEPARTMENT', pageWidth / 2, 36, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(margin, 42, pageWidth - margin, 42);

        doc.setFont('times', 'normal');
        const reportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        
        doc.text(`DIC No. DIC-${app.applicationNumber?.replace('APP-', '')}`, margin, 52);
        doc.text(`Date of Inspection: ${reportDate}`, pageWidth - margin, 52, { align: 'right' });
        
        doc.text(`Farmer District: ${app.districtName || 'N/A'}`, margin, 60);
        doc.text(`Firm: ${app.bookedByFirmName || 'N/A'}, ${app.divisionName || 'N/A'}`, pageWidth - margin, 60, { align: 'right' });
        
        doc.setFont('times', 'bold');
        doc.text(`machine / implement: ${app.implementName}`, margin, 68);

        // Main Table (7 columns)
        autoTable(doc, {
          startY: 75,
          margin: { left: margin, right: margin },
          head: [['Sr. No.', 'Allottee Name', 'CNIC', 'Mailing Address', 'Tehsil', 'machine / implement ID', 'Tracker IMEI No.']],
          body: [[ '1', app.farmerName || 'N/A', app.cnic || 'N/A', app.address || 'N/A', app.markazName || 'N/A', app.uniqueImplementId || 'N/A', app.trackerImei || 'N/A' ]],
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [200, 200, 200] },
          bodyStyles: { fontSize: 9, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
          columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 1: { cellWidth: 30 }, 2: { cellWidth: 28 }, 3: { cellWidth: 35 }, 4: { cellWidth: 20 }, 5: { cellWidth: 30 }, 6: { cellWidth: 25 } }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 15;

        // Certification Text
        const certText = `It is certified that the delivery of the machinery /implement permitted by the Quality Inspection Committee (QIC) has been verified by District Inspection Committee (DIC) constituted by the Agriculture Department, Government of the Punjab vide No SOA(P) 3-13/2025 dated 07.08.2025. The unique implement ID Plate and QR Code printed by the QIC has also been verified on the implement along with tracker installation on the machine / implement. The DIC recommends to release the farmers share to the firm.`;
        doc.setFont('times', 'normal'); doc.setFontSize(10);
        const splitText = doc.splitTextToSize(certText, pageWidth - (margin * 2));
        doc.text(splitText, margin, finalY);

        finalY += (splitText.length * 5) + 20;

        // Signatures Section
        doc.setFont('times', 'bold'); doc.setFontSize(10);
        doc.text('Signature/Thumb Impression of Beneficiary : ____________________________', margin, finalY);
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 35, finalY - 25, 35, 35);

        // Footer Signatories (Members) - 2x2 Grid Layout
        finalY += 30;
        const colCenterLeft = margin + (pageWidth - margin * 2) / 4;
        const colCenterRight = pageWidth - margin - (pageWidth - margin * 2) / 4;
        doc.setFontSize(8);
        
        doc.text('Rep of Deputy Director Agriculture', colCenterLeft, finalY, { align: 'center' });
        doc.text('(Water Management) ' + (app.districtName || ''), colCenterLeft, finalY + 4, { align: 'center' });
        doc.text('(Member)', colCenterLeft, finalY + 8, { align: 'center' });

        doc.text('Assistant Director Agricultural Engineering', colCenterRight, finalY, { align: 'center' });
        doc.text(app.districtName || '', colCenterRight, finalY + 4, { align: 'center' });
        doc.text('(Member / Secretary)', colCenterRight, finalY + 8, { align: 'center' });

        finalY += 22;
        doc.text('Rep of PISMC / NESPAK', colCenterLeft, finalY, { align: 'center' });
        doc.text(app.districtName || '', colCenterLeft, finalY + 4, { align: 'center' });
        doc.text('(Member)', colCenterLeft, finalY + 8, { align: 'center' });

        const secretaryY = finalY;

        finalY += 20;
        doc.setFontSize(10);
        doc.text(`NO. ________________________`, margin, finalY);
        doc.text(`Dated  _________________`, pageWidth / 2 - 10, finalY);

        finalY += 10; doc.setFont('times', 'normal');
        doc.text('Copy for information to.', margin, finalY);
        
        finalY += 5;
        const copies = [ '1. The Director General Agricultural (Field) Punjab, Lahore', '2-5. All Committee Members.', `6. M/S ${app.bookedByFirmName || 'N/A'}` ];
        copies.forEach((text, line) => { doc.text(text, margin + 5, finalY + (line * 5)); });

        // Convener Signature (DD AE or fetched title)
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.text(convener?.designation || 'Deputy Director Agricultural Engineering', colCenterRight, secretaryY, { align: 'center' });
        doc.text(convener?.districtName || app.districtName || '', colCenterRight, secretaryY + 4, { align: 'center' });
        doc.text('(Convener)', colCenterRight, secretaryY + 8, { align: 'center' });

        // NEW: Upload and Save DIC Report to Database
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `DIC_Report_${app.applicationNumber}.pdf`, { type: 'application/pdf' });

        this.snackBar.open('Uploading DIC Performa to Server...', 'Sync', { duration: 1500 });
        
        this.applicationService.uploadFile(pdfFile).subscribe({
            next: (uploadRes: any) => {
                const reportPath = uploadRes.fileName;
                this.applicationService.startDicInspection(app.id!, reportPath).subscribe({
                    next: (updatedApp) => {
                        this.application.set(updatedApp);
                        this.isGeneratingReport.set(false);
                        this.snackBar.open(`DIC Report Generated & Saved to Dossier!`, 'Success', { duration: 4000 });
                        
                        // Also trigger local download for user convenience
                        doc.save(`DIC_Report_${app.applicationNumber}.pdf`);
                    },
                    error: (err) => {
                        console.error('Failed to update DIC status', err);
                        this.isGeneratingReport.set(false);
                        this.snackBar.open('Report uploaded, but status update failed.', 'Warning', { duration: 5000 });
                        doc.save(`DIC_Report_${app.applicationNumber}.pdf`);
                    }
                });
            },
            error: (err) => {
                console.error('File upload failed', err);
                this.isGeneratingReport.set(false);
                this.snackBar.open('Failed to upload report to server.', 'Error', { duration: 5000 });
                // Fallback: Local download only
                doc.save(`DIC_Report_${app.applicationNumber}.pdf`);
            }
        });
      });
    } catch (err) {
      console.error('Report generation failed', err);
      this.isGeneratingReport.set(false);
      this.snackBar.open('Failed to generate report.', 'Error', { duration: 5000 });
    }
  }
  startEdit(field: string, val: any) {
    this.editingField.set(field);
    this.editModel[field] = val;
  }

  cancelEdit() {
    this.editingField.set(null);
  }

  saveEdit(field: string) {
    const app = this.application();
    if (!app || !app.id) return;

    const updatePayload: any = {};
    updatePayload[field] = this.editModel[field];

    this.isUpdatingField.set(true);
    this.applicationService.update(app.id, updatePayload)
      .pipe(finalize(() => this.isUpdatingField.set(false)))
      .subscribe({
        next: (updated) => {
          this.application.set(updated);
          this.editingField.set(null);
          
          // Enhanced success feedback
          const fieldLabel = field.replace(/([A-Z])/g, ' $1').toLowerCase();
          this.snackBar.open(`Excellent! The ${fieldLabel} has been updated successfully.`, 'Dismiss', { 
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['premium-success-snackbar']
          });
        },
        error: (err) => {
          this.snackBar.open('Update failed: ' + (err.error?.message || 'Server error'), 'Close', { duration: 5000 });
        }
      });
  }

  async generateReport() {
    const app = this.application();
    if (!app) return;

    this.isGeneratingReport.set(true);
    this.snackBar.open('Assembling Official Dossier...', 'Processing', { duration: 1500 });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header Section with Logos
    const logoLeft = 'report-assets/gov-logo.png';
    const logoRight = 'report-assets/gov.jpg';

    try {
      doc.addImage(logoLeft, 'PNG', margin, 10, 22, 22);
      doc.addImage(logoRight, 'JPEG', pageWidth - margin - 25, 10, 25, 25);
    } catch (e) {
      console.warn('Could not add logos', e);
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('APPLICATION DOSSIER - PUNJAB CLEAN AIR PROGRAM', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text('AGRICULTURE COMPONENT - FIELD WING', pageWidth / 2, 22, { align: 'center' });

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, 40, pageWidth - margin, 40);

    // Profile Info
    doc.setFontSize(12);
    doc.text('Applicant Profile', margin, 50);
    
    autoTable(doc, {
      startY: 55,
      body: [
        ['Full Name', `${app.farmerName || 'N/A'}`],
        ['Father Name', `${app.fatherName || 'N/A'}`],
        ['CNIC Number', `${app.cnic || 'N/A'}`],
        ['Contact Number', `${app.contactNumber || 'N/A'}`],
        ['Farmer District', `${app.districtName || 'N/A'}`],
        ['Division', `${app.divisionName || 'N/A'}`]
      ],
      theme: 'grid',
      styles: { font: 'times', fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // Machine Info
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Equipment & Machine / implement Details', margin, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      body: [
        ['machine / implement', `${app.implementName || 'N/A'}`],
        ['Unique machine / implement ID', `${app.uniqueImplementId || 'Pending'}`],
        ['Tractor HP / Model', `${app.tractorHP || 'N/A'} HP / ${app.tractorModel || 'N/A'}`],
        ['Project Type', `${app.projectTypeName || 'N/A'}`],
        ['Land Area', `${app.landArea || 0} ${app.landUnit || 'Acres'}`]
      ],
      theme: 'grid',
      styles: { font: 'times', fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // Verification QR Section
    finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.text('Digital Verification QR Code', margin, finalY);
    
    const qrUrl = this.qrCodeDataUrl();
    if (qrUrl) {
      doc.addImage(qrUrl, 'PNG', margin, finalY + 5, 40, 40);
    }

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const certText = `The unique machine / implement ID Plate and tracker with QR code have been installed on each machine / implement. This QR code contains authenticated application data for field verification via Punjab Clean Air mobile apps.`;
    const splitCertText = doc.splitTextToSize(certText, pageWidth - margin * 2 - 50);
    doc.text(splitCertText, margin + 50, finalY + 15);

    doc.save(`Application_${app.applicationNumber}.pdf`);
    
    setTimeout(() => {
      this.isGeneratingReport.set(false);
      this.snackBar.open('Dossier Generated Successfully', 'Success', { duration: 3000 });
    }, 800);
  }

  isPhaseActive(phase: any): boolean {
    const app = this.application();
    if (!app) return false;
    const currentStatus = app.status;
    const phaseIndex = this.phases.indexOf(phase);
    const currentIndex = this.phases.findIndex(p => p.statuses.includes(currentStatus));
    
    // If the phase is completed, it's not the active (current) one
    if (this.isPhaseCompleted(phase)) return false;

    // A phase is active if it's the current one determined by global status...
    if (phaseIndex === currentIndex) return true;

    // ...OR if the application has pushed into this phase via local logic but global status lags
    if (phase.key === 'SUBSIDY' && this.isPhaseCompleted(this.phases[5])) {
       return currentIndex <= 5; // Subsidy active if DIC is done and global is still at or before DIC
    }

    return false;
  }

  isPhaseCompleted(phase: any): boolean {
    const app = this.application();
    if (!app) return false;
    const currentStatus = app.status;
    const phaseIndex = this.phases.indexOf(phase);
    const currentIndex = this.phases.findIndex(p => p.statuses.includes(currentStatus));
    
    // Normal progress via global status
    if (currentIndex > phaseIndex) return true;
    if (phaseIndex === currentIndex && ['QIC_APPROVED', 'DIC_APPROVED', 'COMPLETED'].includes(currentStatus)) return true;

    // Special Decoupled Logic for QIC
    if (phase.key === 'INSPECTION' && (app.localDecision === 'PASSED' || app.localDecision === 'DEFERRED' || app.localDecision === 'DEFFERED')) {
       return true;
    }

    // DIC completed if we are at Subsidy or later
    if (phase.key === 'DIC_INSPECTION' && ['REQUEST_INVOICE', 'SUBSIDY_PAID', 'COMPLETED'].includes(currentStatus)) {
        return true;
    }

    return false;
  }

  goBack() {
    this.router.navigate(['/portal/applications']);
  }

  onRejectDIC(app: FarmerApplicationPayload) {
    const remarks = prompt('Please provide final REJECTION remarks for this machinery unit:');
    if (remarks === null) return;
    if (!remarks.trim()) {
        alert('Remarks are mandatory for rejection.');
        return;
    }

    this.isGeneratingReport.set(true);
    this.applicationService.rejectDic(app.id!, remarks).subscribe({
        next: (updated) => {
            this.application.set(updated);
            this.isGeneratingReport.set(false);
            this.snackBar.open('Machinery Unit REJECTED officially.', 'Rejected', { duration: 4000 });
        },
        error: (err) => {
            this.isGeneratingReport.set(false);
            this.snackBar.open('Failed to reject: ' + (err.error?.message || 'Server error'), 'Error', { duration: 5000 });
        }
    });
  }

  getStepStatusLabel(phase: any): string {
    const app = this.application();
    if (!app) return 'Pending';
    const currentStatus = app.status;
    
    if (this.isPhaseCompleted(phase)) return 'Completed';
    if (this.isPhaseActive(phase)) {
      if (phase.key === 'INSPECTION' && (currentStatus === 'BOOKED' || currentStatus === 'QIC_PENDING') && this.hasStartInspectionFeature()) {
        return 'Ready for Inspection';
      }
      if (currentStatus === 'QIC_REQUESTED') return 'Pending convener review...';
      return 'In Progress';
    }
    return 'Pending';
  }

  downloadAttachment(path: string) {
    if (!path) return;
    
    this.snackBar.open('Initializing specialized file stream...', 'Download', { duration: 2000 });
    this.fileUploadService.download(path).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = path;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Failed to download dossier.', 'Error', { duration: 4000 })
    });
  }

  onViewLiveLocation(imei: string) {
    if (!imei) return;
    this.dialog.open(MapJourneyDialogComponent, {
      data: { imei },
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      panelClass: 'fullscreen-dialog',
      disableClose: true
    });
  }

  private dialog = inject(MatDialog);
}
