import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FarmerApplicationService } from '../../../../core/services/farmer-application.service';
import * as L from 'leaflet';

@Component({
    selector: 'app-attach-tracker-dialog',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule, 
        MatDialogModule, 
        MatButtonModule, 
        MatIconModule, 
        MatFormFieldModule, 
        MatInputModule,
        MatSnackBarModule
    ],
    template: `
    <div class="attach-dialog">
      <!-- Immersive Map Background -->
      <div id="attach-map" class="map-box"></div>

      <!-- Left Panel: Form & Info -->
      <div class="side-panel glass">
        <header class="panel-header">
            <mat-icon class="icon">app_registration</mat-icon>
            <div class="title-group">
                <h3>Associate Tracker</h3>
                <p>Verify and Link IMEI to Application</p>
            </div>
            <button mat-icon-button (click)="close()" class="close-btn"><mat-icon>close</mat-icon></button>
        </header>

        <div class="app-summary card">
            <div class="summary-row">
                <span class="l">APPLICATION</span>
                <span class="v">#{{ data.app.applicationNumber }}</span>
            </div>
            <div class="summary-row">
                <span class="l">FARMER</span>
                <span class="v">{{ data.app.farmerName }}</span>
            </div>
            <div class="summary-row">
                <span class="l">IMPLEMENT</span>
                <span class="v">{{ data.app.implementName }}</span>
            </div>
        </div>

        <div class="imei-entry">
            <mat-form-field appearance="outline" class="full-width luxe-field">
                <mat-label>Tracker IMEI Serial</mat-label>
                <input matInput [(ngModel)]="imei" placeholder="e.g. 35821010..." (ngModelChange)="isVerified.set(false)">
                <mat-icon matPrefix>developer_board</mat-icon>
            </mat-form-field>

            <button mat-flat-button class="verify-btn" 
                    [disabled]="!imei || isVerifying()" 
                    (click)="verifyTracker()">
                <mat-icon *ngIf="!isVerifying()">satellite_alt</mat-icon>
                <span *ngIf="!isVerifying()">Locate and Verify</span>
                <span *ngIf="isVerifying()">Searching...</span>
            </button>
        </div>

        <div class="verif-status" *ngIf="isVerified()">
            <div class="status-card success">
                <mat-icon>verified</mat-icon>
                <div class="s-info">
                    <span class="s-t">Signal Locked</span>
                    <span class="s-s">Location tracked successfully</span>
                </div>
            </div>

            <div class="location-details" *ngIf="calibData()">
                <div class="detail">
                    <label>Lat/Long</label>
                    <code>{{ calibData()?.latitude }}, {{ calibData()?.longitude }}</code>
                </div>
                <div class="detail">
                    <label>Address</label>
                    <p>{{ currentAddress() || 'Resolving...' }}</p>
                </div>
            </div>
        </div>

        <div class="actions">
            <button mat-flat-button class="save-btn" 
                    [disabled]="!isVerified() || isSaving()" 
                    (click)="saveAssociation()">
                <mat-icon *ngIf="!isSaving()">link</mat-icon>
                <span *ngIf="!isSaving()">Associate & Link Tracker</span>
                <span *ngIf="isSaving()">Processing...</span>
            </button>
        </div>
      </div>

      <!-- No Signal Overlay -->
      <div class="no-signal-overlay" *ngIf="!isVerified() && !isVerifying() && !hasAttempted()">
         <div class="empty-state">
             <mat-icon>map</mat-icon>
             <p>Map will center once IMEI signal is locked</p>
         </div>
      </div>
    </div>
  `,
    styles: [`
    .attach-dialog {
      width: 100vw; height: 100vh; position: relative; background: #f8fafc; 
      overflow: hidden; font-family: 'Inter', sans-serif;
    }

    .map-box { width: 100%; height: 100%; position: absolute; z-index: 1; }

    .glass {
        background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        box-shadow: 20px 0 60px rgba(0, 0, 0, 0.05);
    }

    .side-panel {
        position: absolute; left: 0; top: 0; bottom: 0; width: 420px;
        z-index: 10; display: flex; flex-direction: column; padding: 32px;
        pointer-events: auto;
    }

    .panel-header {
        display: flex; align-items: center; gap: 16px; margin-bottom: 32px;
        .icon { font-size: 32px; width: 32px; height: 32px; color: #3b82f6; }
        .title-group {
            flex: 1;
            h3 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
            p { margin: 0; font-size: 12px; color: #64748b; font-weight: 600; }
        }
        .close-btn { background: #f1f5f9; color: #64748b; }
    }

    .app-summary.card {
        background: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 24px;
        border: 1px solid #e2e8f0;
        .summary-row {
            display: flex; justify-content: space-between; margin-bottom: 8px;
            &:last-child { margin-bottom: 0; }
            .l { font-size: 9px; font-weight: 800; color: #94a3b8; }
            .v { font-size: 13px; font-weight: 700; color: #1e293b; }
        }
    }

    .imei-entry {
        margin-bottom: 24px;
        .luxe-field { margin-bottom: 8px; }
        ::ng-deep .mat-mdc-text-field-wrapper { background: #f1f5f9 !important; border-radius: 12px !important; }
        .verify-btn {
            width: 100%; height: 52px; border-radius: 12px; font-weight: 800;
            background: #0f172a; color: white;
            mat-icon { margin-right: 8px; }
            &:disabled { background: #cbd5e1; color: #94a3b8; }
        }
    }

    .verif-status {
        flex: 1; display: flex; flex-direction: column; gap: 16px;
        .status-card.success {
            display: flex; align-items: center; gap: 12px; padding: 16px;
            background: #dcfce7; border-radius: 16px; color: #166534;
            mat-icon { font-size: 24px; width: 24px; height: 24px; }
            .s-info {
                .s-t { display: block; font-size: 14px; font-weight: 800; }
                .s-s { font-size: 11px; font-weight: 600; opacity: 0.8; }
            }
        }
        .location-details {
            display: flex; flex-direction: column; gap: 12px;
            .detail {
                label { display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
                code { display: block; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-family: 'JetBrains Mono'; color: #3b82f6; }
                p { margin: 0; font-size: 13px; font-weight: 600; color: #475569; line-height: 1.4; }
            }
        }
    }

    .actions {
        margin-top: auto; padding-top: 24px;
        .save-btn {
            width: 100%; height: 56px; border-radius: 14px; font-weight: 900;
            background: #3b82f6; color: white; font-size: 15px;
            box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
            mat-icon { margin-right: 8px; }
            &:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; }
        }
    }

    .no-signal-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center; z-index: 5;
        .empty-state {
            text-align: center; color: white;
            mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; margin-bottom: 16px; }
            p { font-size: 16px; font-weight: 700; opacity: 0.8; }
        }
    }

    ::ng-deep .pulse-marker {
        width: 18px; height: 18px; background: #3b82f6; border: 3px solid white; border-radius: 50%;
        box-shadow: 0 0 15px rgba(59,130,246,0.6); position: relative;
    }
    ::ng-deep .pulse-marker::after {
        content: ''; position: absolute; inset: -10px; border: 3px solid #3b82f6; border-radius: 50%; animation: pPulse 2s infinite;
    }
    @keyframes pPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
  `]
})
export class AttachTrackerDialogComponent implements OnInit {
    public dialogRef = inject(MatDialogRef<AttachTrackerDialogComponent>);
    public data = inject(MAT_DIALOG_DATA);
    private appService = inject(FarmerApplicationService);
    private snackBar = inject(MatSnackBar);

    private map!: L.Map;
    private marker!: L.Marker;

    imei = '';
    isVerifying = signal(false);
    isVerified = signal(false);
    hasAttempted = signal(false);
    isSaving = signal(false);
    calibData = signal<any>(null);
    currentAddress = signal<string | null>(null);

    ngOnInit() {
        if (this.data.app.trackerImei) {
            this.imei = this.data.app.trackerImei;
        }
        setTimeout(() => this.initMap(), 100);
    }

    private initMap() {
        this.map = L.map('attach-map', { center: [31.5204, 74.3587], zoom: 6, zoomControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(this.map);
    }

    verifyTracker() {
        if (!this.imei) return;
        this.isVerifying.set(true);
        this.hasAttempted.set(true);
        this.appService.getCalibrationData(this.data.app.id, this.imei).subscribe({
            next: (res) => {
                this.isVerifying.set(false);
                if (res.latitude && res.longitude) {
                    this.isVerified.set(true);
                    this.calibData.set(res);
                    this.updateMap(res.latitude, res.longitude);
                    this.reverseGeocode(res.latitude, res.longitude);
                    this.snackBar.open('Tracker signal located successfully!', 'Locked', { duration: 3000 });
                } else {
                    this.snackBar.open('Unable to locate tracker. Please check IMEI or power.', 'No Signal', { duration: 5000 });
                }
            },
            error: () => {
                this.isVerifying.set(false);
                this.snackBar.open('Communication failure with tracking network.', 'Error', { duration: 5000 });
            }
        });
    }

    private updateMap(lat: number, lng: number) {
        this.map.setView([lat, lng], 16);
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: 'marker-box',
                html: '<div class="pulse-marker"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
        }
        this.map.invalidateSize();
    }

    private reverseGeocode(lat: number, lon: number) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(data => this.currentAddress.set(data.display_name))
            .catch(() => this.currentAddress.set('Location Found'));
    }

    saveAssociation() {
        if (!this.isVerified()) return;
        this.isSaving.set(true);
        this.appService.updateTrackerImei(this.data.app.id, this.imei).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.snackBar.open('Tracker successfully associated with application.', 'Linked', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.isSaving.set(false);
                console.error('Association failed', err);
                this.snackBar.open('Failed to link tracker. Please try again.', 'Error', { duration: 5000 });
            }
        });
    }

    close() { this.dialogRef.close(false); }
}
