import { Component, inject, signal, OnInit } from '@angular/core';
import { environment } from '@env/environment';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MapJourneyDialogComponent } from './map-journey/map-journey-dialog.component';

@Component({
  selector: 'app-imei-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    RouterModule
  ],
  template: `
    <div class="verify-page">
      <div class="glass-bg no-print"></div>

      <div class="container">
        <!-- Web Header -->
        <div class="header-section no-print">
          <div class="logo-area" routerLink="/">
            <mat-icon>eco</mat-icon>
            <h1>Punjab<span>CleanAir</span></h1>
          </div>
          <div class="header-text">
            <h2>IMEI Verification Portal</h2>
            <p>Enter your 15-digit tracker IMEI to verify application status and real-time data.</p>
          </div>
        </div>

        <!-- Print Button -->
        <div class="action-toolbar no-print" *ngIf="resultData()">
          <div class="charging-alert-web">
            <mat-icon>battery_charging_full</mat-icon>
            <span>{{ chargingInstructionsUrdu }}</span>
          </div>
          <button mat-flat-button color="accent" class="journey-btn" (click)="openJourneyDialog()" *ngIf="resultData()?.hasTrackingData">
            <mat-icon>route</mat-icon>
            View Journey
          </button>
          <button mat-flat-button color="primary" (click)="printReport()">
            <mat-icon>print</mat-icon>
            Print Sticker
          </button>
        </div>

        <!-- Search -->
        <div class="search-box-container no-print">
          <mat-card class="search-card">
            <form [formGroup]="verifyForm" (ngSubmit)="onVerify()">
              <mat-form-field appearance="outline" class="imei-field">
                <mat-label>Enter 15-digit IMEI Number</mat-label>
                <input matInput formControlName="imei" placeholder="e.g. 863482061234567" maxlength="15">
                <mat-icon matPrefix>satellite_alt</mat-icon>
                <mat-error *ngIf="verifyForm.get('imei')?.hasError('required')">IMEI is required</mat-error>
                <mat-error *ngIf="verifyForm.get('imei')?.hasError('pattern')">Must be a 15-digit number</mat-error>
              </mat-form-field>
              <button mat-flat-button color="primary" class="verify-btn" [disabled]="verifyForm.invalid || isLoading()">
                <mat-icon *ngIf="!isLoading()">verified</mat-icon>
                <mat-spinner diameter="24" *ngIf="isLoading()"></mat-spinner>
                <span>{{ isLoading() ? 'Verifying...' : 'Verify IMEI Now' }}</span>
              </button>
            </form>
          </mat-card>
        </div>

        <!-- Error -->
        <div class="error-msg no-print" *ngIf="errorMessage()">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMessage() }}</span>
        </div>

        <!-- ========== PRINT STICKER (only visible when printing) ========== -->
        <div class="sticker print-only" *ngIf="resultData()">
          <!-- LEFT SIDE -->
          <div class="sticker-left">
            <div class="sticker-header">
              <mat-icon class="sticker-icon">eco</mat-icon>
              <div class="sticker-program">PUNJAB CLEAN AIR PROGRAM</div>
            </div>
            <div class="sticker-divider"></div>
            <div class="sticker-qr">
              <img [src]="qrUrl" alt="Verification QR Code">
            </div>
            <div class="sticker-info">
              <div class="sticker-row">
                <span class="sticker-label">IOT Device Id #:</span>
                <span class="sticker-value">IMEI{{ resultData().imei }}</span>
              </div>
              <div class="sticker-row">
                <span class="sticker-label">Device Configuration:</span>
                <span class="sticker-value">Tracker + Battery + {{ resultData().charger || '17V' }} Charger = 10,000 mAH</span>
              </div>
              <div class="sticker-row" *ngIf="resultData().firmName">
                <span class="sticker-label">Associated Firm:</span>
                <span class="sticker-value">{{ resultData().firmName }}</span>
              </div>
            </div>
          </div>
          <!-- VERTICAL DIVIDER -->
          <div class="sticker-vdivider"></div>
          <!-- RIGHT SIDE -->
          <div class="sticker-right">
            <div class="sticker-arrow">
              <span class="arrow-symbol">&#x2191;</span>
              <span class="arrow-text">اوپر کی طرف</span>
            </div>
            <div class="sticker-divider-h"></div>
            <div class="sticker-urdu">
              <p class="urdu-title">چارج کرنے کا طریقہ:</p>
              <p class="urdu-line">&#x2022; چارجنگ کور کو کھولیں</p>
              <p class="urdu-line">&#x2022; وینٹیلیشن ہول کو کھولیں</p>
              <p class="urdu-line">&#x2022; جب تک چارجر کی سبز لائٹ آن ہو تب تک چارجنگ کریں</p>
              <p class="urdu-line">&#x2022; سرخ لائٹ کا مطلب ہے چارجنگ ہو رہی ہے</p>
            </div>
            <div class="sticker-divider-h"></div>
            <div class="sticker-warning">
              <p>نوٹ: سٹیکر اور QC ہٹانے سے وارنٹی ختم ہو جائے گی</p>
              <p class="big-urdu-warning">{{ chargingInstructionsUrdu }}</p>
            </div>
          </div>
        </div>

        <!-- ========== WEB DASHBOARD (hidden when printing) ========== -->
        <div class="result-section no-print" *ngIf="resultData()">
          <div class="result-grid">
            <!-- Farmer Info (top, full width — matches public verification layout) -->
            <mat-card class="info-card farmer-card full-width" *ngIf="resultData().isConfigured">
              <div class="card-title"><mat-icon>person</mat-icon><span>Farmer Information</span></div>
              <div class="info-grid farmer-info-grid">
                <div class="info-item farmer-name-block">
                  <span class="label">Farmer Name</span>
                  <span class="value">{{ resultData().farmerName }}</span>
                  <span class="label label-urdu">Farmer Name (Urdu)</span>
                  <span class="value urdu-name" dir="rtl">{{ resultData().farmerNameUrdu || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">CNIC Number</span>
                  <span class="value">{{ resultData().farmerCnic }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Implement</span>
                  <span class="value">{{ resultData().implementName }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Application No</span>
                  <span class="value highlight">#{{ resultData().applicationNumber }}</span>
                </div>
                <div class="info-item" *ngIf="resultData().firmName">
                  <span class="label">Associated Firm</span>
                  <span class="value">{{ resultData().firmName }}</span>
                </div>
              </div>
            </mat-card>

            <!-- Pending -->
            <mat-card class="info-card empty-card full-width" *ngIf="!resultData().isConfigured">
              <div class="empty-state">
                <mat-icon class="es-icon">pending_actions</mat-icon>
                <h4>Pending Association</h4>
                <p>This device is in stock. Not yet associated with a farmer application.</p>
              </div>
            </mat-card>

            <!-- QR Code -->
            <mat-card class="info-card qr-card">
              <div class="card-title"><mat-icon>qr_code_2</mat-icon><span>Verification QR</span></div>
              <div class="qr-container">
                <img [src]="qrUrl" alt="QR Code" class="qr-img">
                <p class="qr-hint">Scan to verify on mobile</p>
              </div>
            </mat-card>

            <!-- Device Identity -->
            <mat-card class="info-card device-card">
              <div class="card-title"><mat-icon>memory</mat-icon><span>Device Identity</span></div>
              <div class="implement-hero">
                <div class="implement-icon" [class.unconfigured]="!resultData().isConfigured">
                  <mat-icon>sensors</mat-icon>
                </div>
                <div class="implement-text">
                  <h3>{{ resultData().deviceModel || 'IoT Tracker X1' }}</h3>
                  <p>IMEI: {{ resultData().imei }}</p>
                  <span class="badge" [class.badge-success]="resultData().isConfigured" [class.badge-warning]="!resultData().isConfigured">
                    {{ resultData().isConfigured ? 'Configured' : 'Ready to Install' }}
                  </span>
                </div>
              </div>
              <mat-divider></mat-divider>
              <div class="info-grid mt-24">
                <div class="info-item">
                  <span class="label">Manufacturer</span>
                  <span class="value">{{ resultData().manufacturer || 'AgriConnect' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Config</span>
                  <span class="value">Tracker + Battery + {{ resultData().charger || '17V' }} Charger = 10,000 mAH</span>
                </div>
              </div>
            </mat-card>

            <!-- Live Tracking -->
            <mat-card class="info-card location-card full-width" *ngIf="resultData().hasTrackingData">
              <div class="card-title"><mat-icon>location_on</mat-icon><span>Live Tracking Summary</span></div>
              <div class="location-body">
                <div class="address-box">
                  <span class="label">Current Location Address</span>
                  <p class="address-val">{{ currentAddress() || resultData().address || 'Validating location...' }}</p>
                  <p class="address-coords" *ngIf="resultData().latitude && resultData().longitude">
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">gps_fixed</mat-icon>
                    Lat: {{ resultData().latitude }}, Lng: {{ resultData().longitude }}
                  </p>
                </div>
                <div class="tracking-stats">
                  <div class="stat"><span class="label">Speed</span><span class="val">{{ resultData().speed || 0 }} km/h</span></div>
                  <div class="stat"><span class="label">Battery Remaining</span><span class="val">{{ resultData().battery || 0 }}%</span></div>
                  <div class="stat"><span class="label">Total Internal Battery</span><span class="val">{{ resultData().totalInternalBattery || '10,000 mAh' }}</span></div>
                  <div class="stat"><span class="label">Satellites</span><span class="val">{{ resultData().satellites || 0 }}</span></div>
                  <div class="stat">
                    <span class="label">Status</span>
                    <span class="val" [class.on]="isIgnitionOn(resultData())">{{ getIgnitionStatusLabel(resultData()) }}</span>
                  </div>
                  <div class="stat"><span class="label">Last Updated</span><span class="val">{{ resultData().timestamp ? (resultData().timestamp | date:'medium') : 'N/A' }}</span></div>
                </div>
              </div>
            </mat-card>
          </div>
        </div>
      </div>

      <footer class="public-footer no-print">
        <p>&copy; 2026 Punjab Clean Air Program (Govt. of Punjab).</p>
      </footer>
    </div>
  `,
  styles: [`
    /* ===== WEB VIEW ===== */
    .verify-page {
      min-height: 100vh;
      background: #f8fafc;
      position: relative;
      overflow-x: hidden;
      padding-bottom: 80px;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .glass-bg {
      position: absolute; top: -200px; right: -100px; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(76,175,80,0.1) 0%, transparent 70%);
      filter: blur(60px); z-index: 0;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 24px; position: relative; z-index: 1; }

    .header-section {
      text-align: center; margin-bottom: 40px;
      .logo-area {
        display: inline-flex; align-items: center; gap: 12px; margin-bottom: 24px; cursor: pointer;
        mat-icon { font-size: 40px; width: 40px; height: 40px; color: #2e7d32; }
        h1 { margin: 0; font-size: 32px; font-weight: 800; color: #1e293b; span { color: #4CAF50; } }
      }
      .header-text {
        h2 { font-size: 36px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
        p { color: #64748b; font-size: 16px; max-width: 600px; margin: 0 auto; }
      }
    }

    .action-toolbar { 
        display: flex; justify-content: flex-end; margin-bottom: 16px; gap: 12px; align-items: center;
        button { border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px;} 
        .journey-btn { background: #3b82f6; color: white; }
        .charging-alert-web {
          margin-right: auto;
          background: #fff7ed;
          border: 3px solid #fb923c;
          color: #9a3412;
          padding: 12px 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 950;
          font-size: 32px;
          direction: rtl;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.1);
          mat-icon { color: #f97316; font-size: 36px; width: 36px; height: 36px; }
        }
    }

    .search-box-container {
      margin-bottom: 32px;
      .search-card {
        padding: 24px; border-radius: 20px; background: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid rgba(226,232,240,0.8);
        form {
          display: flex; gap: 16px; align-items: flex-start;
          .imei-field { flex: 1; margin-bottom: 0; }
          .verify-btn {
            height: 56px; padding: 0 32px; border-radius: 14px; font-weight: 700;
            background: linear-gradient(135deg, #166534 0%, #22c55e 100%) !important;
            display: flex; align-items: center; gap: 12px;
          }
        }
      }
    }

    .error-msg {
      background: #fef2f2; border: 1px solid #fee2e2; color: #dc2626;
      padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;
      margin-bottom: 32px; font-weight: 600;
    }

    .result-grid { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
    .info-card {
      padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
      .card-title {
        display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
        color: #94a3b8; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
        mat-icon { font-size: 16px; width: 16px; height: 16px; color: #4CAF50; }
      }
      &.full-width { grid-column: 1 / -1; }
    }
    .qr-container {
      display: flex; flex-direction: column; align-items: center; padding: 10px 0;
      .qr-img { width: 140px; height: 140px; border: 4px solid #f1f5f9; border-radius: 12px; margin-bottom: 12px; }
      .qr-hint { font-size: 11px; color: #64748b; font-weight: 600; margin: 0; }
    }
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      .info-item {
        display: flex; flex-direction: column; gap: 2px;
        min-width: 0;
        .label { font-size: 11px; color: #94a3b8; font-weight: 600; }
        .value { font-size: 15px; font-weight: 800; color: #1e293b; word-break: break-word; overflow-wrap: anywhere; }
        .value.urdu-name { font-weight: 700; line-height: 1.5; }
        .highlight { color: #3b82f6; font-family: 'JetBrains Mono', monospace; word-break: break-all; }
      }
    }
    .farmer-info-grid { align-items: start; }
    .farmer-name-block {
      gap: 4px;
      .label-urdu { margin-top: 10px; }
    }
    .implement-hero {
      display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
      .implement-icon {
        width: 52px; height: 52px; background: #f0fdf4; border-radius: 14px;
        display: flex; align-items: center; justify-content: center; color: #10b981;
        mat-icon { font-size: 28px; width: 28px; height: 28px; }
        &.unconfigured { background: #fff7ed; color: #f97316; }
      }
      .implement-text {
        h3 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; }
        p { margin: 2px 0 6px; color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
      }
    }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase;
      &-success { background: #dcfce7; color: #166534; }
      &-warning { background: #fff7ed; color: #9a3412; }
    }
    .empty-card {
      display: flex; align-items: center; justify-content: center; text-align: center;
      background: #f8fafc; border: 2px dashed #e2e8f0;
      .empty-state {
        max-width: 300px;
        .es-icon { font-size: 40px; width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
        h4 { margin: 0 0 8px; font-weight: 800; color: #475569; }
        p { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
      }
    }
    .location-body {
      display: flex; flex-direction: column; gap: 20px;
      .address-box {
        .address-val { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; word-break: break-word; overflow-wrap: anywhere; }
        .address-coords { font-size: 13px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin: 6px 0 0; display: flex; align-items: flex-start; gap: 4px; flex-wrap: wrap; word-break: break-all; }
      }
      .tracking-stats {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        .stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; .label { word-break: break-word; } .val { font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-word; } .on { color: #166534; } }
      }
    }
    .mt-24 { margin-top: 24px; }
    .public-footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 12px; }

    /* Hide sticker in web view */
    .print-only { display: none; }

    @media (max-width: 768px) {
      .container { padding: 24px 16px 64px; }
      .header-section {
        margin-bottom: 24px;
        .logo-area { margin-bottom: 16px; mat-icon { font-size: 36px; width: 36px; height: 36px; } h1 { font-size: 26px; } }
        .header-text h2 { font-size: 24px; margin-bottom: 8px; }
        .header-text p { font-size: 14px; padding: 0 4px; }
      }
      .action-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        button { width: 100%; justify-content: center; box-sizing: border-box; }
      }
      .search-box-container { margin-bottom: 20px; }
      .search-box-container .search-card { padding: 16px; }
      .search-box-container .search-card form { flex-direction: column; align-items: stretch; gap: 12px; .verify-btn { width: 100%; } }
      .error-msg { margin-bottom: 20px; font-size: 14px; }
      .result-grid { grid-template-columns: 1fr; gap: 16px; }
      .info-card { padding: 16px; border-radius: 16px; }
      .qr-container .qr-img { max-width: 100%; height: auto; aspect-ratio: 1; }
      .implement-hero { flex-wrap: wrap; gap: 12px; .implement-text { min-width: 0; flex: 1; h3 { font-size: 16px; word-break: break-word; } p { word-break: break-all; } } }
      .location-body .address-box .address-val { font-size: 16px; }
      .location-body .tracking-stats { grid-template-columns: 1fr 1fr !important; gap: 12px; }
      .action-toolbar {
        flex-direction: column-reverse;
        .charging-alert-web { width: 100%; justify-content: center; margin: 0; box-sizing: border-box; font-size: 20px; }
      }
      .public-footer { padding: 24px 12px; }
    }

    @media (max-width: 480px) {
      .info-grid { grid-template-columns: 1fr; gap: 14px; }
      .farmer-name-block .label-urdu { margin-top: 8px; }
      .location-body .tracking-stats { grid-template-columns: 1fr !important; }
    }

    /* ===== PRINT STICKER ===== */
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      .no-print { display: none !important; }
      .print-only { display: flex !important; }

      html, body { margin: 0; padding: 0; }
      .verify-page { min-height: auto; background: #fff; padding: 0; }
      .container { max-width: 100%; padding: 0; }

      @page { size: landscape; margin: 8mm; }

      /* Horizontal sticker: left + divider + right */
      .sticker {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        width: 180mm;
        margin: 0 auto;
        padding: 6mm;
        border: 2px solid #000;
        font-family: Arial, Helvetica, sans-serif;
        page-break-inside: avoid;
      }

      .sticker-left {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .sticker-vdivider {
        width: 2px;
        background: #000;
        margin: 0 6mm;
      }

      .sticker-right {
        width: 55mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .sticker-icon {
        font-size: 32px !important;
        width: 32px !important;
        height: 32px !important;
        color: #000 !important;
        margin-bottom: 2px;
      }

      .sticker-program {
        font-size: 20px;
        font-weight: 900;
        color: #000;
        text-align: center;
        letter-spacing: 1.5px;
        line-height: 1.2;
      }

      .sticker-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      }

      .sticker-divider {
        width: 100%;
        height: 2px;
        background: #000;
        margin: 5px 0 10px 0;
      }

      .sticker-qr {
        margin-bottom: 8px;
        img { width: 45mm; height: 45mm; display: block; }
      }

      .sticker-info {
        width: 100%;
        text-align: left;
      }

      .sticker-row {
        margin-bottom: 1px;
        font-size: 11px;
        color: #000;
        line-height: 1.4;
      }

      .sticker-label { font-weight: 700; margin-right: 3px; }
      .sticker-value { font-weight: 400; }

      /* Arrow */
      .sticker-arrow {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 6px;
        .arrow-text {
          flex: 1;
          font-size: 18px;
          font-weight: 900;
          color: #000;
          direction: rtl;
          text-align: center;
        }
        .arrow-symbol {
          font-size: 44px;
          font-weight: 900;
          line-height: 1;
          color: #000;
          -webkit-text-stroke: 2px #000;
        }
      }

      .sticker-divider-h {
        width: 100%;
        height: 1px;
        background: #999;
        margin: 5px 0;
      }

      .sticker-urdu {
        width: 100%;
        text-align: right;
        direction: rtl;
        .urdu-title {
          font-size: 11px;
          font-weight: 900;
          color: #000;
          margin: 0 0 2px 0;
        }
        .urdu-line {
          font-size: 10px;
          color: #000;
          margin: 0;
          line-height: 1.5;
        }
      }

      .sticker-warning {
        width: 100%;
        text-align: right;
        direction: rtl;
        margin-top: 2px;
        p {
          font-size: 9px;
          font-weight: 700;
          color: #000;
          margin: 0;
          font-style: italic;
        }
        .big-urdu-warning {
          font-size: 28px !important;
          font-weight: 950 !important;
          font-style: normal !important;
          margin-top: 15px !important;
          border: 2.5px solid #000;
          padding: 4px 8px;
          text-align: center;
          line-height: 1.2;
          display: block;
        }
      }
    }
  `]
})
export class ImeiVerificationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  isLoading = signal(false);
  resultData = signal<any>(null);
  errorMessage = signal<string | null>(null);
  currentAddress = signal<string | null>(null);

  get chargingInstructionsUrdu(): string {
    const data = this.resultData();
    if (!data) return '';
    
    // Logic: 12V -> 5 hours, else (null/17V) -> 3 hours
    if (data.charger?.toString().includes('12')) {
      return 'زیادہ سے زیادہ 5 گھنٹے چارج کریں';
    }
    return 'زیادہ سے زیادہ 3 گھنٹے چارج کریں';
  }

  verifyForm = this.fb.group({
    imei: ['', [Validators.required, Validators.pattern(/^[0-9]{15}$/)]]
  });

  get qrUrl(): string {
    const currentImei = this.verifyForm.get('imei')?.value;
    if (!currentImei) return '';
    const fullUrl = `${environment.apiUrl}/imei-verification?imei=${currentImei}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const imei = params['imei'];
      if (imei && /^[0-9]{15}$/.test(imei)) {
        this.verifyForm.patchValue({ imei });
        this.onVerify();
      }
    });
  }

  onVerify() {
    if (this.verifyForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resultData.set(null);
    this.currentAddress.set(null);

    const imei = this.verifyForm.value.imei;
    this.http.get(`${environment.apiUrl}/api/public/verify-imei/${imei}`).subscribe({
      next: (res: any) => { 
        this.resultData.set(res); 
        this.isLoading.set(false); 
        
        if (!res.address && res.latitude && res.longitude) {
          this.reverseGeocode(res.latitude, res.longitude);
        }
      },
      error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Verification failed. Please check the IMEI and try again.'); }
    });
  }

  private reverseGeocode(lat: number, lon: number) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.display_name) {
          this.currentAddress.set(data.display_name);
        } else {
          this.currentAddress.set('Location Found');
        }
      })
      .catch(() => this.currentAddress.set('Location Found'));
  }

  openJourneyDialog() {
    const currentImei = this.verifyForm.get('imei')?.value;
    if (!currentImei) return;

    this.dialog.open(MapJourneyDialogComponent, {
      data: { imei: currentImei },
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      panelClass: 'fullscreen-dialog',
      disableClose: true // Must use HUD close button
    });
  }

  printReport() {
    window.print();
  }

  isIgnitionOn(data: any): boolean {
    const speed = Number(data?.speed ?? 0);
    return Number.isFinite(speed) && speed > 0;
  }

  getIgnitionStatusLabel(data: any): string {
    return this.isIgnitionOn(data) ? 'IGNITION ON' : 'IGNITION OFF';
  }
}
