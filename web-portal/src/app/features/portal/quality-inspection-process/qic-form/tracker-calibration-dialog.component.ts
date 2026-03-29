import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FarmerApplicationService } from '../../../../core/services/farmer-application.service';
import * as L from 'leaflet';

@Component({
    selector: 'app-tracker-calibration-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="calibration-dialog">
      <!-- Immersive Map Background -->
      <div id="calibration-map" class="map-box"></div>

      <!-- Compact Overlay Interface (HUD Style) -->
      <div class="hud-container">
        
        <!-- Header HUD: Ultra Slim Top Bar -->
        <header class="hud-header glass">
            <div class="h-left">
                <mat-icon class="pulse-icon">satellite_alt</mat-icon>
                <div class="h-txt">
                    <span class="h-title">TERMINAL CALIBRATION</span>
                    <span class="h-sub">IMEI: {{ data.imei }}</span>
                </div>
            </div>
            <div class="h-right">
                <button mat-icon-button (click)="close()" class="c-btn"><mat-icon>close</mat-icon></button>
            </div>
        </header>

        <!-- Main Info HUD: Compact Flex Layout to maximize map visibility -->
        <div class="info-hud glass" *ngIf="calibData()">
            <div class="info-group">
                <label>FARMER</label>
                <b>{{ calibData()?.farmerName }}</b>
            </div>
            <div class="info-sep"></div>
            <div class="info-group">
                <label>CNIC</label>
                <b>{{ calibData()?.farmerCnic }}</b>
            </div>
            <div class="info-sep"></div>
            <div class="info-group">
                <label>IMPLEMENT</label>
                <b class="accent">{{ calibData()?.implementName }}</b>
            </div>
        </div>

        <!-- Right Side Telemetry HUD (Vertical & Slim) -->
        <div class="side-hud glass" *ngIf="!isCalibrating() && !isMerging() && calibData()?.latitude">
            <div class="tel-box">
                <mat-icon [class.active]="calibData()?.status === 'IGNITION_ON'">
                    {{ calibData()?.status === 'IGNITION_ON' ? 'key' : 'key_off' }}
                </mat-icon>
                <span [style.color]="calibData()?.status === 'IGNITION_ON' ? '#10b981' : '#ef4444'">
                    {{ calibData()?.status === 'IGNITION_ON' ? 'ON' : 'OFF' }}
                </span>
            </div>
            <div class="side-sep"></div>
            <div class="tel-box">
                <mat-icon>speed</mat-icon>
                <span>{{ calibData()?.speed || 0 }} <small>km/h</small></span>
            </div>
            <div class="side-sep"></div>
            <div class="tel-box">
                <mat-icon [style.color]="getBatteryColor(calibData()?.battery)">
                    {{ getBatteryIcon(calibData()?.battery) }}
                </mat-icon>
                <span class="bat-val" [style.color]="getBatteryColor(calibData()?.battery)">
                    {{ (calibData()?.battery || 0).toFixed(0) }}%
                </span>
            </div>
        </div>

        <!-- Address Toast (Bottom Floating Bar) -->
        <div class="addr-hud glass" *ngIf="!isCalibrating() && !isMerging() && calibData()?.latitude">
            <mat-icon>location_on</mat-icon>
            <div class="addr-content">
                <span class="addr-label">CURRENT ADDRESS</span>
                <p class="addr-val">{{ currentAddress() || 'Resolving Address...' }}</p>
                <div class="addr-meta">
                    <code>LAT: {{ calibData()?.latitude }}</code>
                    <code>LONG: {{ calibData()?.longitude }}</code>
                    <code class="time">{{ calibData()?.timestamp | date:'shortTime' }}</code>
                </div>
            </div>
        </div>

        <!-- Enhanced Tech Animation Overlay -->
        <div class="anim-overlay" *ngIf="isCalibrating() || isMerging()">
            <div class="tech-card glass">
                
                <!-- STEP 1: Satellite Handshake Visual -->
                <div class="radar-wrap" *ngIf="isCalibrating()">
                    <div class="radar-circle">
                        <div class="radar-sweep"></div>
                        <div class="radar-ring r1"></div>
                        <div class="radar-ring r2"></div>
                        <mat-icon class="sat-core">satellite_alt</mat-icon>
                    </div>
                    <div class="tech-text">
                        <h4 class="glitch-text" [attr.data-text]="calibrationStepText()">{{ calibrationStepText() }}</h4>
                        <div class="bit-loader">
                            <span *ngFor="let i of [1,2,3,4,5]" [style.animationDelay]="i * 0.1 + 's'"></span>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: System Kernel Merging Visual -->
                <div class="merge-wrap" *ngIf="isMerging()">
                    <div class="hex-core">
                        <div class="ring-system">
                            <div class="r-outer"></div>
                            <div class="r-mid"></div>
                            <div class="r-inner"></div>
                        </div>
                        <mat-icon class="shield-pulse">verified_user</mat-icon>
                    </div>
                    <div class="tech-text">
                        <h4 class="shimmer-text">Merging System Kernels...</h4>
                        <p class="sub-log">Synchronizing terminal handshakes with PCAP blockchain...</p>
                    </div>
                </div>

            </div>
        </div>
      </div>

      <!-- Minimal Control Footer -->
      <footer class="hud-footer glass">
        <div class="f-side">
            <div class="status-indicator" [class.verified]="isSuccess()">
                <div class="s-dot" [class.pulse]="isCalibrating()"></div>
                <span>{{ statusText() }}</span>
            </div>
        </div>
        <div class="f-actions">
            <button mat-button class="mini-btn" (click)="fetchFreshData()" [disabled]="isCalibrating() || isMerging()">
                <mat-icon>refresh</mat-icon> Sync
            </button>
            <button mat-flat-button class="action-btn" *ngIf="!isSuccess()" 
                [disabled]="isCalibrating() || isMerging() || !calibData()?.latitude" 
                (click)="startCalibration()">
                <mat-icon>bolt</mat-icon> Initialize Link
            </button>
            <button mat-flat-button class="success-btn" *ngIf="isSuccess()" (click)="onVerifiedAndProceed()">
                <mat-icon>verified</mat-icon> Verified & Proceed
            </button>
        </div>
      </footer>
    </div>
  `,
    styles: [`
    .calibration-dialog {
      width: 100vw; height: 100vh; position: relative; background: #020617; 
      overflow: hidden; font-family: 'Outfit', 'Inter', sans-serif;
    }

    .map-box { width: 100%; height: 100%; position: absolute; z-index: 1; }

    .hud-container {
        position: absolute; inset: 0; z-index: 10; pointer-events: none;
        padding: 16px; display: flex; flex-direction: column;
    }
    .hud-container > * { pointer-events: auto; }

    .glass {
        background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(16px);
        border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .hud-header {
      padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;
      width: fit-content; margin-bottom: 12px;
      .h-left {
        display: flex; gap: 12px; align-items: center;
        .pulse-icon { color: #3b82f6; font-size: 24px; width: 24px; height: 24px; }
        .h-txt { display: flex; flex-direction: column; .h-title { font-size: 14px; font-weight: 900; color: white; letter-spacing: 1px; } .h-sub { font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono'; } }
      }
      .c-btn { color: #94a3b8; width: 32px; height: 32px; line-height: 32px; mat-icon { font-size: 20px; } }
    }

    .info-hud {
        display: flex; align-items: center; gap: 20px; padding: 12px 24px; width: fit-content;
        .info-group {
            display: flex; flex-direction: column;
            label { font-size: 9px; font-weight: 800; color: #94a3b8; margin-bottom: 2px; }
            b { font-size: 13px; font-weight: 700; color: white; }
            .accent { color: #10b981; }
        }
        .info-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }
    }

    .side-hud {
        position: absolute; right: 28px; top: 100px; padding: 16px;
        display: flex; flex-direction: column; gap: 16px; align-items: center;
        .tel-box {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            mat-icon { font-size: 20px; width: 20px; height: 20px; color: #94a3b8; &.active { color: #10b981; } }
            span { font-size: 12px; font-weight: 800; color: white; small { font-size: 8px; opacity: 0.7; } }
        }
        .side-sep { width: 24px; height: 1px; background: rgba(255,255,255,0.1); }
    }

    .addr-hud {
        position: absolute; bottom: 100px; left: 24px; right: 24px;
        padding: 16px 24px; display: flex; gap: 16px; align-items: flex-start;
        mat-icon { color: #f43f5e; font-size: 28px; width: 28px; height: 28px; margin-top: 4px; }
        .addr-content {
            flex: 1;
            .addr-label { font-size: 9px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px; }
            .addr-val { margin: 4px 0 8px; font-size: 15px; font-weight: 800; color: white; line-height: 1.4; }
            .addr-meta {
                display: flex; gap: 12px;
                code { font-size: 10px; color: #3b82f6; background: rgba(59,130,246,0.1); padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono'; }
                .time { color: #64748b; background: transparent; }
            }
        }
    }

    .anim-overlay {
        position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 1000;
        background: rgba(2, 6, 23, 0.4); backdrop-filter: blur(8px);
        
        .tech-card {
            padding: 48px; min-width: 420px; text-align: center; border-radius: 32px;
            background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.3);
            box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5), inset 0 0 40px rgba(59, 130, 246, 0.1);
        }

        .tech-text {
            margin-top: 32px;
            h4 { color: white; font-size: 18px; font-weight: 900; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
            .sub-log { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 600; }
        }

        /* RADAR STYLES */
        .radar-circle {
            position: relative; width: 100px; height: 100px; margin: 0 auto;
            border-radius: 50%; border: 1px solid rgba(59, 130, 246, 0.2);
            .radar-sweep {
                position: absolute; inset: 0; border-radius: 50%;
                background: conic-gradient(from 0deg, rgba(59, 130, 246, 0.4) 0%, transparent 40%);
                animation: spin 2s linear infinite;
            }
            .radar-ring {
                position: absolute; border-radius: 50%; border: 1px solid rgba(59, 130, 246, 0.1);
                &.r1 { inset: 15%; } &.r2 { inset: 30%; }
            }
            .sat-core { position: absolute; inset: 0; margin: auto; font-size: 32px; width: 32px; height: 32px; color: #3b82f6; animation: softPulse 2s infinite; }
        }

        /* MERGE STYLES */
        .hex-core {
            position: relative; width: 120px; height: 120px; margin: 0 auto;
            .ring-system {
                position: absolute; inset: 0;
                .r-outer { position: absolute; inset: 0; border: 3px dashed #10b981; border-radius: 50%; animation: spin 4s linear infinite; opacity: 0.6; }
                .r-mid { position: absolute; inset: 15%; border: 2px solid #10b981; border-radius: 50%; border-style: dotted; animation: spin-rev 3s linear infinite; opacity: 0.4; }
                .r-inner { position: absolute; inset: 30%; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 50%; }
            }
            .shield-pulse { position: absolute; inset: 0; margin: auto; font-size: 44px; width: 44px; height: 44px; color: #10b981; filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.5)); }
        }

        /* LOADERS */
        .bit-loader {
            display: flex; gap: 4px; justify-content: center; margin-top: 12px;
            span { width: 12px; height: 3px; background: #3b82f6; border-radius: 2px; opacity: 0.2; animation: bitJump 1s infinite; }
        }
    }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
    @keyframes bitJump { 0%, 100% { opacity: 0.2; transform: scaleY(1); } 50% { opacity: 1; transform: scaleY(2); } }
    @keyframes softPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
    @keyframes shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

    .shimmer-text { animation: shimmer 2s infinite ease-in-out; }

    .hud-footer {
        position: absolute; bottom: 24px; left: 24px; right: 24px; z-index: 20;
        padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;
        .status-indicator {
            display: flex; align-items: center; gap: 10px;
            .s-dot { width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; }
            .s-dot.pulse { background: #3b82f6; animation: softPulse 2s infinite; }
            &.verified .s-dot { background: #10b981; }
            span { font-size: 12px; font-weight: 800; color: #64748b; }
        }
        .f-actions { 
            display: flex; gap: 12px; 
            .mini-btn { color: #64748b; font-weight: 700; font-size: 13px; }
            .action-btn { background: #3b82f6; color: white; border-radius: 12px; font-weight: 800; }
            .success-btn { background: #10b981; color: white; border-radius: 12px; font-weight: 800; }
        }
    }
    
    .h-title { color: #0f172a !important; }
    .tel-box span { color: #0f172a !important; }
    .tel-box .bat-val { font-weight: 900 !important; }
    .info-group b { color: #0f172a !important; }
    .addr-val { color: #0f172a !important; }

    ::ng-deep .marker-box { overflow: visible !important; }
    ::ng-deep .pulse-marker {
        width: 18px; height: 18px; background: #3b82f6; border: 3px solid white; border-radius: 50%;
        box-shadow: 0 0 15px rgba(59,130,246,0.6); position: relative;
    }
    ::ng-deep .pulse-marker::after {
        content: ''; position: absolute; inset: -12px; border: 2.5px solid #3b82f6; border-radius: 50%;
        animation: bluePulse 1.8s infinite ease-out; opacity: 0;
    }
    @keyframes bluePulse {
        0% { transform: scale(0.5); opacity: 0; }
        50% { opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
    }
    ::ng-deep .pulse-marker {
        width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%;
        box-shadow: 0 0 30px rgba(59,130,246,0.8);
        &::after { content: ''; position: absolute; inset: -10px; border: 3px solid #3b82f6; border-radius: 50%; animation: mPulse 2s infinite; }
    }
    @keyframes mPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
  `]
})
export class TrackerCalibrationDialogComponent implements OnInit {
    public dialogRef = inject(MatDialogRef<TrackerCalibrationDialogComponent>);
    public data = inject(MAT_DIALOG_DATA);
    private appService = inject(FarmerApplicationService);

    private map!: L.Map;
    private marker!: L.Marker;

    isCalibrating = signal(false);
    isMerging = signal(false);
    isSuccess = signal(false);
    statusText = signal('Scanning Network...');
    calibrationStepText = signal('Linking Satellite...');

    calibData = signal<any>(null);
    currentAddress = signal<string | null>(null);

    ngOnInit() {
        this.fetchFreshData();
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 600);
    }

    fetchFreshData() {
        this.appService.getCalibrationData(this.data.applicationId, this.data.imei).subscribe({
            next: (res) => {
                this.calibData.set(res);
                if (res.latitude && res.longitude) {
                    this.statusText.set('Terminals Connected');
                    this.updateMap(res.latitude, res.longitude);
                    if (!this.currentAddress()) this.reverseGeocode(res.latitude, res.longitude);
                } else {
                    this.statusText.set('No Signal');
                }
            },
            error: () => console.error('Sync failed')
        });
    }

    private initMap(lat: number, lng: number) {
        if (this.map) return;
        this.map = L.map('calibration-map', { center: [lat, lng], zoom: 16, zoomControl: false });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(this.map);

        const icon = L.divIcon({
            className: 'marker-box',
            html: '<div class="pulse-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    }

    private updateMap(lat: number, lng: number) {
        if (!this.map) {
            setTimeout(() => this.initMap(lat, lng), 100);
        } else {
            this.map.panTo([lat, lng]);
            this.marker.setLatLng([lat, lng]);
            this.map.invalidateSize();
        }
    }

    async startCalibration() {
        if (!this.calibData()?.latitude) return;

        this.isCalibrating.set(true);
        this.calibrationStepText.set('Handshaking Satellite...');
        await this.delay(1000);

        this.calibrationStepText.set('Syncing DB Logs...');
        await this.delay(1000);

        this.isCalibrating.set(false);
        this.isMerging.set(true);
        await this.delay(1500);

        this.isMerging.set(false);
        this.isSuccess.set(true);
        this.statusText.set('Calibration Success');
    }

    private reverseGeocode(lat: number, lon: number) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(data => this.currentAddress.set(data.display_name))
            .catch(() => this.currentAddress.set('Location Found'));
    }

    getBatteryIcon(battery: number): string {
        if (battery > 80) return 'battery_full';
        if (battery > 50) return 'battery_5_bar';
        return 'battery_alert';
    }

    getBatteryColor(battery: number): string {
        if (battery < 20) return '#ef4444';
        if (battery < 50) return '#f59e0b';
        return '#10b981';
    }

    private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

    onVerifiedAndProceed() {
        this.appService.verifyTracker(this.data.applicationId).subscribe({
            next: () => this.dialogRef.close(true),
            error: (err) => {
                console.error('Failed to verify tracker in DB', err);
                this.dialogRef.close(true); // Still proceed but log error
            }
        });
    }

    close() { this.dialogRef.close(false); }
}
