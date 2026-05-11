import { ChangeDetectorRef, Component, OnInit, AfterViewInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardStats, GeoCluster, TrackerMapPoint } from '../../../core/services/dashboard.service';
import { RegionService, Region } from '../../../core/services/region.service';
import { DivisionService, Division } from '../../../core/services/division.service';
import { DistrictService, District } from '../../../core/services/district.service';
import { forkJoin, Subject, takeUntil, timeout, catchError, of, finalize, interval, Subscription } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, FormsModule, MatProgressSpinnerModule,
    MatButtonModule, MatTooltipModule
  ],
  template: `
    <div class="dashboard-root">
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
      <div class="bg-glow bg-glow-3"></div>

      <!-- Top header: title + subtitle (one row), compact filters left, legend/actions right -->
      <div class="filters-bar">
        <div class="filters-left">
          <div class="header-geo-inline">
            <h1 class="geo-title">Geospatial Intelligence</h1>
            <span class="geo-inline-sep" aria-hidden="true"></span>
            <p class="geo-sub">Live tracker monitoring & machine deployment density across Punjab</p>
          </div>
          <div class="filters-inline">
            <mat-form-field appearance="outline" class="filter-select">
              <mat-select [(ngModel)]="selectedRegionId" (selectionChange)="onRegionChange()" placeholder="All Regions">
                <mat-option [value]="null">All Regions</mat-option>
                <mat-option *ngFor="let r of regions" [value]="r.id">{{r.name}}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-select">
              <mat-select [(ngModel)]="selectedDivisionId" (selectionChange)="onDivisionChange()" [disabled]="!selectedRegionId" placeholder="All Divisions">
                <mat-option [value]="null">All Divisions</mat-option>
                <mat-option *ngFor="let d of filteredDivisions" [value]="d.id">{{d.name}}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-select">
              <mat-select [(ngModel)]="selectedDistrictId" (selectionChange)="onDistrictChange()" [disabled]="!selectedDivisionId" placeholder="All Districts">
                <mat-option [value]="null">All Districts</mat-option>
                <mat-option *ngFor="let d of filteredDistricts" [value]="d.id">{{d.name}}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
        <div class="filters-right">
          <div class="legend-items legend-items--header" role="group" aria-label="Map legend">
            <div class="legend-item">
              <span class="legend-dot live"></span>
              <span>Live</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot offline"></span>
              <span>Offline</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot cluster"></span>
              <span>Cluster</span>
            </div>
          </div>

          <div class="live-badge live-badge--header">
            <span class="live-dot"></span>
            Live System
          </div>

          <button mat-icon-button class="reset-btn" matTooltip="Recenter Map" (click)="recenterMap()">
            <mat-icon>location_searching</mat-icon>
          </button>

          <button mat-icon-button class="reset-btn" matTooltip="Reset Filters" (click)="resetFilters()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Map Section - Full Width -->
      <div class="map-section">
        <div class="map-glass">
          <div class="map-canvas-wrapper">
            <div class="stats-overlay" aria-label="Fleet statistics">
              <div class="stat-card" *ngFor="let stat of statsCards; let i = index">
                <div class="stat-icon-ring" [style.--accent]="stat.accent">
                  <mat-icon>{{stat.icon}}</mat-icon>
                  <div class="ring-pulse"></div>
                </div>
                <div class="stat-body">
                  <span class="stat-label">{{stat.label}}</span>
                  <div class="stat-value-row" *ngIf="!statsLoading">
                    <span class="stat-number">
                      {{stat.value | number}}
                    </span>
                    <span class="stat-badge" *ngIf="stat.badgeText" [style.background]="stat.badgeBg" [style.color]="stat.badgeColor">
                      <mat-icon>{{stat.badgeIcon}}</mat-icon>
                      {{stat.badgeText}}
                    </span>
                  </div>
                  <div class="stat-value-row" *ngIf="statsLoading">
                    <div class="skeleton skeleton-number"></div>
                    <div class="skeleton skeleton-badge"></div>
                  </div>
                </div>
              </div>
            </div>
            <div id="admin-map" class="map-canvas"></div>

            <!-- Enhanced Premium Loading Overlay -->
            <div class="map-loading-overlay" *ngIf="statsLoading || mapLoading">
              <div class="loader-glass-card">
                <div class="loader-header">
                  <div class="loader-icon">
                    <mat-icon>satellite_alt</mat-icon>
                    <div class="loader-ring"></div>
                  </div>
                  <h2>Fleet Intelligence Hub</h2>
                  <p>Synchronizing global machine telemetry</p>
                </div>

                <div class="progress-section">
                  <div class="progress-label">
                    <span>System Status</span>
                    <span class="pct">{{ loadingProgress }}%</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="loadingProgress">
                      <div class="progress-glow"></div>
                    </div>
                  </div>
                </div>

                <div class="loading-steps">
                  <div class="step-item" *ngFor="let step of loadingSteps; let i = index" 
                       [class.active]="i === currentStep" 
                       [class.completed]="i < currentStep">
                    <div class="step-indicator">
                      <mat-icon *ngIf="i < currentStep">check_circle</mat-icon>
                      <div class="step-dot" *ngIf="i >= currentStep"></div>
                      <div class="step-line" *ngIf="i < loadingSteps.length - 1"></div>
                    </div>
                    <span class="step-text">{{ step }}</span>
                  </div>
                </div>

                <div class="loader-footer">
                  <div class="pulse-dot"></div>
                  <span>Awaiting encrypted response from clusters...</span>
                </div>
              </div>
            </div>
          </div>
          <div class="map-footer">
            <div class="footer-stat">
              <span class="footer-label">Tracked Machines</span>
              <span class="footer-value" *ngIf="!statsLoading">{{dashboardStats?.totalTrackedMachines | number}}</span>
              <div class="skeleton skeleton-footer" *ngIf="statsLoading"></div>
            </div>
            <div class="footer-divider"></div>
            <div class="footer-stat">
              <span class="footer-label">Live Now</span>
              <span class="footer-value live-text" *ngIf="!statsLoading">{{dashboardStats?.liveMachines | number}}</span>
              <div class="skeleton skeleton-footer" *ngIf="statsLoading"></div>
            </div>
            <div class="footer-divider"></div>
            <div class="footer-stat">
              <span class="footer-label">District Clusters</span>
              <span class="footer-value" *ngIf="!statsLoading">{{dashboardStats?.geoClusters?.length | number}}</span>
              <div class="skeleton skeleton-footer" *ngIf="statsLoading"></div>
            </div>
            <div class="footer-divider" *ngIf="mapLoading"></div>
            <div class="footer-stat tracker-loading-indicator" *ngIf="mapLoading">
              <div class="mini-spinner"></div>
              <span class="footer-label">Loading trackers...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dashboard-root {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: #e2e8f0;
      min-height: calc(100vh - 80px);
      background: #0a0f1e;
      border-radius: 24px;
      overflow: hidden;
      padding: 12px 16px 16px 14px;
    }

    .bg-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    .bg-glow-1 { top: -120px; right: -80px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%); }
    .bg-glow-2 { bottom: -150px; left: -100px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%); }
    .bg-glow-3 { top: 40%; left: 50%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%); }

    /* ───── Top header: title + subtitle inline, compact filters left, legend right ───── */
    .filters-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 2;
      gap: 10px 14px;
      flex-wrap: wrap;
    }

    .filters-left {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: 8px 6px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .header-geo-inline {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 200px;
    }

    .geo-inline-sep {
      width: 1px;
      height: 14px;
      flex-shrink: 0;
      background: rgba(148, 163, 184, 0.35);
      border-radius: 1px;
    }

    .geo-title {
      font-size: 15px;
      font-weight: 800;
      color: #f1f5f9;
      letter-spacing: -0.3px;
      line-height: 1.2;
      margin: 0;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .geo-sub {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
      line-height: 1.3;
      margin: 0;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filters-inline {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      flex-shrink: 0;
      margin-left: 0;
    }

    .filters-right {
      display: flex;
      align-items: center;
      gap: 8px 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
      flex: 0 1 auto;
      margin-left: auto;
    }

    .filter-select {
      width: 152px;
      flex: 0 0 auto;

      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background: rgba(30, 41, 59, 0.55) !important;
          border-radius: 10px !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }
        .mat-mdc-form-field-subscript-wrapper { display: none; }
        .mdc-notched-outline { display: none !important; }
        .mat-mdc-floating-label { display: none !important; }

        .mat-mdc-select-value {
          color: #e2e8f0 !important;
          font-weight: 500 !important;
          font-size: 11px !important;
        }

        .mat-mdc-select-placeholder {
          color: #94a3b8 !important;
          font-weight: 500 !important;
          font-size: 11px !important;
          opacity: 1 !important;
        }

        .mat-mdc-select-arrow {
          color: #64748b !important;
          width: 22px !important;
          flex-shrink: 0;
        }
        .mat-mdc-form-field-infix {
          padding: 4px 2px 4px 6px !important;
          min-height: 30px !important;
        }
        .mat-mdc-form-field-flex { align-items: center; }
      }
    }

    .reset-btn {
      background: rgba(239, 68, 68, 0.1) !important;
      color: #ef4444 !important;
      border: 1px solid rgba(239, 68, 68, 0.2) !important;
      border-radius: 10px !important;
      width: 34px !important;
      height: 34px !important;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(239, 68, 68, 0.2) !important;
        transform: rotate(180deg);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
      }
    }

    /* ───── Stats overlay on map (glass / see-through) ───── */
    .stats-overlay {
      position: absolute;
      top: 10px;
      left: 12px;
      right: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      z-index: 620;
      pointer-events: none;
    }

    .stats-overlay .stat-card {
      pointer-events: auto;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--accent, #10b981), transparent);
        opacity: 0;
        transition: opacity 0.4s ease;
      }

      &:hover {
        transform: translateY(-1px);
        background: rgba(15, 23, 42, 0.58);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);

        &::before { opacity: 1; }
      }
    }

    .stat-icon-ring {
      --accent: #10b981;
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--accent) 22%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        color: var(--accent);
        z-index: 1;
      }

      .ring-pulse {
        position: absolute;
        inset: 0;
        border-radius: 10px;
        background: var(--accent);
        opacity: 0;
        animation: ringPulse 3s ease-in-out infinite;
      }
    }

    @keyframes ringPulse {
      0%, 100% { opacity: 0; transform: scale(1); }
      50% { opacity: 0.15; transform: scale(1.15); }
    }

    .stat-body {
      flex: 1;
      min-width: 0;
    }

    .stat-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.45px;
    }

    .stat-value-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-top: 1px;
    }

    .stat-number {
      font-size: 19px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.4px;
      line-height: 1.1;
      text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);

      &.loading {
        color: #475569;
        animation: textPulse 1.5s ease-in-out infinite;
      }
    }

    @keyframes textPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }

    .stat-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;

      mat-icon {
        font-size: 11px;
        width: 11px;
        height: 11px;
      }
    }

    /* ───── Skeleton Loaders ───── */
    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
    }

    .skeleton-number {
      width: 56px;
      height: 19px;
      border-radius: 6px;
    }

    .skeleton-badge {
      width: 70px;
      height: 18px;
      border-radius: 6px;
    }

    .skeleton-footer {
      width: 60px;
      height: 22px;
      border-radius: 6px;
      margin-top: 2px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ───── Map Section (taller map via viewport calc) ───── */
    .map-section {
      z-index: 2;
    }

    .map-glass {
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      overflow: hidden;
    }

    .legend-items {
      display: flex;
      gap: 16px;
    }

    .legend-items--header {
      gap: 8px;
      padding: 0 4px;
      flex-shrink: 0;
    }

    .legend-items--header .legend-item {
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
      font-weight: 600;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      &.live { background: #10b981; box-shadow: 0 0 8px #10b981; }
      &.offline { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
      &.cluster { background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.5); }
    }

    .legend-items--header .legend-dot {
      width: 6px;
      height: 6px;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .live-badge--header {
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 9px;
      letter-spacing: 0.35px;
      gap: 5px;
      flex-shrink: 0;
    }

    .live-badge--header .live-dot {
      width: 5px;
      height: 5px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      animation: blink 1.5s infinite;
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

    .map-canvas-wrapper {
      position: relative;
    }

    .map-canvas {
      /* Map header merged into top bar — extra vertical space for map + stats */
      height: max(480px, calc(100vh - 102px));
      width: 100%;
    }

    /* ───── Map Loading Badge ───── */
    /* ───── Enhanced Premium Loading Overlay ───── */
    .map-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 2000;
      background: rgba(8, 12, 24, 0.7);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      animation: fadeIn 0.4s ease-out;
    }

    .loader-glass-card {
      width: min(420px, 90vw);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
      padding: 32px;
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .loader-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;

      .loader-icon {
        position: relative;
        width: 48px;
        height: 48px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        mat-icon {
          color: #3b82f6;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .loader-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 16px;
          animation: spin 1.5s linear infinite;
        }
      }

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: #f1f5f9;
        letter-spacing: -0.5px;
      }

      p {
        margin: 4px 0 0;
        font-size: 12px;
        font-weight: 500;
        color: #64748b;
      }
    }

    .progress-section {
      .progress-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        .pct { color: #3b82f6; }
      }

      .progress-track {
        height: 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #10b981);
        border-radius: 10px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;

        .progress-glow {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 30px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: progressShimmer 1.5s infinite;
        }
      }
    }

    .loading-steps {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .step-item {
      display: flex;
      gap: 16px;
      padding-bottom: 12px;
      opacity: 0.4;
      transition: all 0.4s ease;

      &.active {
        opacity: 1;
        .step-text { color: #f1f5f9; }
        .step-dot { 
          transform: scale(1.2); 
          background: #3b82f6; 
          box-shadow: 0 0 10px #3b82f6;
          animation: pulseStep 1s infinite alternate;
        }
      }

      &.completed {
        opacity: 0.8;
        .step-indicator mat-icon { color: #10b981; }
        .step-text { color: #94a3b8; }
      }

      &:last-child {
        padding-bottom: 0;
        .step-line { display: none; }
      }
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 20px;
      position: relative;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .step-dot {
        width: 8px;
        height: 8px;
        background: #334155;
        border-radius: 50%;
        margin-top: 5px;
      }

      .step-line {
        width: 1px;
        flex: 1;
        background: rgba(255, 255, 255, 0.08);
        margin: 4px 0;
        min-height: 12px;
      }
    }

    .step-text {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      padding-top: 1px;
    }

    .loader-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 11px;
      font-weight: 500;
      color: #475569;

      .pulse-dot {
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 50%;
        animation: blink 1.5s infinite;
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes progressShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
    @keyframes pulseStep {
      from { box-shadow: 0 0 0px #3b82f6; }
      to { box-shadow: 0 0 12px #3b82f6; }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .map-loading-badge {
      position: absolute;
      top: 74px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 630;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(10, 15, 30, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .map-footer {
      display: flex;
      align-items: center;
      padding: 10px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      gap: 20px;
    }

    .footer-stat {
      display: flex;
      flex-direction: column;
    }

    .footer-label {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .footer-value {
      font-size: 16px;
      font-weight: 800;
      color: #f1f5f9;
      letter-spacing: -0.3px;
    }

    .live-text { color: #10b981 !important; }

    .footer-divider {
      width: 1px;
      height: 26px;
      background: rgba(255, 255, 255, 0.08);
    }

    .tracker-loading-indicator {
      flex-direction: row !important;
      align-items: center;
      gap: 8px;
    }

    .mini-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: miniSpin 0.8s linear infinite;
    }

    @keyframes miniSpin {
      to { transform: rotate(360deg); }
    }

    /* ───── Leaflet Zoom Controls ───── */
    ::ng-deep .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
      border-radius: 12px !important;
      overflow: hidden;

      a {
        background: rgba(15, 23, 42, 0.9) !important;
        backdrop-filter: blur(12px);
        color: #e2e8f0 !important;
        width: 36px !important;
        height: 36px !important;
        line-height: 36px !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        border: none !important;
        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(16, 185, 129, 0.2) !important;
          color: #10b981 !important;
        }
      }

      .leaflet-control-zoom-out {
        border-bottom: none !important;
      }
    }

    /* ───── Location Pin Markers (small beeping dots) ───── */
    ::ng-deep .loc-pin {
      position: relative;
      width: 20px;
      height: 20px;

      .pin-dot {
        position: absolute;
        top: 50%; left: 50%;
        width: 8px; height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        z-index: 3;
        border: 2px solid rgba(255, 255, 255, 0.9);
      }

      .pin-pulse {
        position: absolute;
        top: 50%; left: 50%;
        width: 8px; height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        z-index: 1;
        opacity: 0;
      }

      /* ── Live: green beeping ── */
      &.live .pin-dot {
        background: #10b981;
        box-shadow: 0 0 6px 2px rgba(16, 185, 129, 0.8);
        animation: dotGlow 1.5s ease-in-out infinite;
      }
      &.live .pin-pulse {
        background: rgba(16, 185, 129, 0.4);
      }
      &.live .p1 { animation: beepPulse 2s ease-out infinite; }
      &.live .p2 { animation: beepPulse 2s ease-out infinite 1s; }

      /* ── Moving (speed > 1): teal / cyan (between green and blue) ── */
      &.moving .pin-dot {
        background: #14b8a6;
        box-shadow: 0 0 6px 2px rgba(20, 184, 166, 0.85);
        animation: dotGlowMoving 1.5s ease-in-out infinite;
      }
      &.moving .pin-pulse {
        background: rgba(56, 189, 248, 0.35);
      }
      &.moving .p1 { animation: beepPulseMoving 2s ease-out infinite; }
      &.moving .p2 { animation: beepPulseMoving 2s ease-out infinite 1s; }

      /* ── Sleep: amber dim ── */
      &.sleep .pin-dot {
        background: #f59e0b;
        box-shadow: 0 0 4px 1px rgba(245, 158, 11, 0.5);
        animation: dotDim 3s ease-in-out infinite;
      }
      &.sleep .pin-pulse {
        background: rgba(245, 158, 11, 0.25);
      }
      &.sleep .p1 { animation: beepSlow 4s ease-in-out infinite; }
      &.sleep .p2 { display: none; }
    }

    @keyframes dotGlow {
      0%, 100% { box-shadow: 0 0 4px 1px rgba(16, 185, 129, 0.5); }
      50% { box-shadow: 0 0 8px 3px rgba(16, 185, 129, 1); }
    }

    @keyframes dotGlowMoving {
      0%, 100% { box-shadow: 0 0 4px 1px rgba(20, 184, 166, 0.55); }
      50% { box-shadow: 0 0 10px 3px rgba(56, 189, 248, 0.95); }
    }

    @keyframes beepPulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(4); opacity: 0; }
    }

    @keyframes beepPulseMoving {
      0% { transform: scale(1); opacity: 0.55; }
      100% { transform: scale(4); opacity: 0; }
    }

    @keyframes dotDim {
      0%, 100% { opacity: 0.4; box-shadow: 0 0 3px 1px rgba(245, 158, 11, 0.3); }
      50% { opacity: 1; box-shadow: 0 0 6px 2px rgba(245, 158, 11, 0.6); }
    }

    @keyframes beepSlow {
      0%, 100% { transform: scale(1); opacity: 0.2; }
      50% { transform: scale(2.5); opacity: 0; }
    }

    /* ───── Leaflet Popup Overrides ───── */
    ::ng-deep {
      .leaflet-popup-pane {
        z-index: 700 !important;
      }
      .leaflet-popup {
        z-index: 700 !important;
      }
      .leaflet-popup-content-wrapper {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .leaflet-popup-content {
        margin: 0 !important;
        width: 280px !important;
      }
      .leaflet-popup-tip-container { display: none; }
      .leaflet-popup-close-button {
        color: rgba(255,255,255,0.5) !important;
        padding: 8px !important;
        font-size: 16px !important;
        z-index: 701 !important;
      }
    }

    /* ───── Responsive ───── */
    @media (max-width: 1100px) {
      .filters-bar { flex-direction: column; align-items: stretch; }
      .filters-left { flex: 1 1 auto; }
      .filters-right {
        width: 100%;
        justify-content: flex-end;
        margin-left: 0;
      }
      .header-geo-inline { max-width: 100%; flex: 1 1 100%; }
      .stats-overlay {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        gap: 8px;
        left: 8px;
        right: 8px;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }
      .stats-overlay .stat-card {
        flex: 0 0 min(320px, 88vw);
      }
    }

    @media (max-width: 768px) {
      .dashboard-root { padding: 10px 12px 14px; gap: 10px; }
      .header-geo-inline {
        flex-wrap: wrap;
        gap: 6px 8px;
      }
      .geo-title { font-size: 13px; white-space: normal; }
      .geo-inline-sep { display: none; }
      .geo-sub {
        flex: 1 1 100%;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .legend-items--header .legend-item span:last-child { display: none; }
      .legend-items--header .legend-item { gap: 0; }
      .legend-items--header { gap: 6px; }
      .stat-card { padding: 6px 10px; }
      .stat-number { font-size: 16px; }
      .stat-icon-ring { width: 30px; height: 30px; }
      .stat-icon-ring mat-icon { font-size: 15px; width: 15px; height: 15px; }
      .filter-select { width: min(140px, 29vw); }
      /* Stacked header + footer — reserve more vertical chrome */
      .map-canvas { height: max(320px, calc(100vh - 200px)); }
      .map-loading-badge { top: 68px; font-size: 11px; padding: 6px 14px; }
      .loader-text { font-size: 12px; }
      .radar-spinner { width: 60px; height: 60px; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private regionService = inject(RegionService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  private map!: L.Map;
  private clusterLayer = L.layerGroup();
  private trackerLayer = L.layerGroup();
  private canvasRenderer = L.canvas({ padding: 0.5 });

  statsLoading = true;
  mapLoading = true;
  loadingProgress = 0;
  currentStep = 0;
  loadingSteps = [
    'Initializing Geospatial Engine',
    'Getting Real Time Machines Locations',
    'Doing District Cluster Mapping',
    'Synchronizing Fleet Protocols',
    'Finalizing Map View'
  ];
  private loadingSubscription?: Subscription;

  dashboardStats: DashboardStats | null = null;
  trackerPoints: TrackerMapPoint[] = [];

  regions: Region[] = [];
  divisions: Division[] = [];
  districts: District[] = [];
  filteredDivisions: Division[] = [];
  filteredDistricts: District[] = [];

  selectedRegionId: number | null = null;
  selectedDivisionId: number | null = null;
  selectedDistrictId: number | null = null;
  private trackerDataReady = false;
  private statsDataReady = false;
  private trackersFinishedRendering = false;

  statsCards = [
    { label: 'Total Tracked Machines', value: 0, icon: 'gps_fixed', accent: '#10b981', badgeText: '', badgeIcon: 'precision_manufacturing', badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#10b981' },
    { label: 'Live Machines', value: 0, icon: 'sensors', accent: '#3b82f6', badgeText: '', badgeIcon: 'wifi_tethering', badgeBg: 'rgba(59,130,246,0.12)', badgeColor: '#3b82f6' },
    { label: 'Offline Machines', value: 0, icon: 'wifi_off', accent: '#f59e0b', badgeText: '', badgeIcon: 'warning', badgeBg: 'rgba(245,158,11,0.12)', badgeColor: '#f59e0b' }
  ];

  ngOnInit(): void {
    this.loadFilters();
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.initMap();
    if (this.dashboardStats || this.trackerPoints.length) {
      requestAnimationFrame(() => this.fitBoundsToData());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 0);
    }
  }

  private loadFilters(): void {
    forkJoin({
      regions: this.regionService.getRegions().pipe(catchError(() => of([]))),
      divisions: this.divisionService.getDivisions().pipe(catchError(() => of([]))),
      districts: this.districtService.getDistricts().pipe(catchError(() => of([])))
    }).pipe(
      timeout(10000),
      catchError(() => of({ regions: [] as Region[], divisions: [] as Division[], districts: [] as District[] })),
      takeUntil(this.destroy$)
    ).subscribe(({ regions, divisions, districts }) => {
      this.regions = regions;
      this.divisions = divisions;
      this.districts = districts;
      this.cdr.detectChanges();
    });
  }

  loadDashboard(): void {
    this.statsLoading = true;
    this.mapLoading = true;
    this.loadingProgress = 0;
    this.currentStep = 0;
    this.trackerDataReady = false;
    this.statsDataReady = false;
    this.trackersFinishedRendering = false;

    // Start a simulated progress but anchor it to real steps
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    this.loadingSubscription = interval(400).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.currentStep === 0 && this.loadingProgress < 15) this.loadingProgress += 2;
      if (this.currentStep === 1 && this.loadingProgress < 40) this.loadingProgress += 3;
      if (this.currentStep === 2 && this.loadingProgress < 65) this.loadingProgress += 2;
      if (this.currentStep === 3 && this.loadingProgress < 85) this.loadingProgress += 1;
      this.cdr.detectChanges();
    });

    const rId = this.selectedRegionId ?? undefined;
    const divId = this.selectedDivisionId ?? undefined;
    const distId = this.selectedDistrictId ?? undefined;

    // Phase 1: Engine Init (short delay to show overlay)
    setTimeout(() => {
      this.currentStep = 1;
      this.loadingProgress = 20;

      // Phase 2: Get Map Points (Trackers)
      this.dashboardService.getMapPoints(rId, divId, distId)
        .pipe(
          timeout(30000),
          catchError(() => of([])),
          takeUntil(this.destroy$),
          finalize(() => {
            if (this.currentStep < 3) {
              this.currentStep = 3;
              this.loadingProgress = 75;
            }
            this.cdr.detectChanges();
          })
        )
        .subscribe((points) => {
          this.trackerPoints = points ?? [];
          this.trackerDataReady = true;
          
          if (this.trackerPoints.length) {
            requestAnimationFrame(() => {
              this.renderTrackerPointsBatched(this.trackerPoints);
              this.fitBoundsToData();
            });
          } else {
            this.trackersFinishedRendering = true;
            this.checkFinalize();
          }
        });

      // Phase 3: Get Stats (Clusters)
      this.dashboardService.getStats(rId, divId, distId)
        .pipe(
          timeout(15000),
          catchError(() => of(null)),
          takeUntil(this.destroy$),
          finalize(() => {
            if (this.currentStep < 2) {
              this.currentStep = 2;
              this.loadingProgress = 50;
            }
            this.cdr.detectChanges();
          })
        )
        .subscribe((stats) => {
          if (stats) {
            this.dashboardStats = stats;
            this.statsDataReady = true;
            this.updateStats(stats);
            this.renderDistrictClusters(stats.geoClusters ?? []);
            this.fitBoundsToData();
          }
          this.checkFinalize();
        });
    }, 600);
  }

  private checkFinalize(): void {
    // Ensure both data sources are ready AND the map has finished rendering its implements
    if (this.trackerDataReady && this.statsDataReady && this.trackersFinishedRendering) {
      this.currentStep = 4;
      this.loadingProgress = 95;
      
      setTimeout(() => {
        this.loadingProgress = 100;
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.statsLoading = false;
          this.mapLoading = false;
          if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
          this.cdr.detectChanges();
        }, 600); // Slightly more buffer for visual polish
      }, 400);
    }
  }

  private updateStats(stats: DashboardStats): void {
    const total = stats.totalTrackedMachines;
    const live = stats.liveMachines;
    const offline = stats.offlineMachines;

    this.statsCards[0].value = total;
    this.statsCards[0].badgeText = 'Tracked';

    this.statsCards[1].value = live;
    const livePercent = total > 0 ? Math.round((live / total) * 100) : 0;
    this.statsCards[1].badgeText = `${livePercent}% Online`;

    this.statsCards[2].value = offline;
    const offPercent = total > 0 ? Math.round((offline / total) * 100) : 0;
    this.statsCards[2].badgeText = `${offPercent}% Silent`;
  }

  onRegionChange(): void {
    this.selectedDivisionId = null;
    this.selectedDistrictId = null;
    this.filteredDivisions = this.selectedRegionId
      ? this.divisions.filter(d => d.regionId === this.selectedRegionId)
      : [];
    this.filteredDistricts = [];
    this.loadDashboard();
  }

  onDivisionChange(): void {
    this.selectedDistrictId = null;
    this.filteredDistricts = this.selectedDivisionId
      ? this.districts.filter(d => d.divisionId === this.selectedDivisionId)
      : [];
    this.loadDashboard();
  }

  onDistrictChange(): void {
    this.loadDashboard();
  }

  recenterMap(): void {
    if (this.map) {
      this.map.setView([31.1704, 72.7097], 7);
    }
  }

  resetFilters(): void {
    this.selectedRegionId = null;
    this.selectedDivisionId = null;
    this.selectedDistrictId = null;
    this.filteredDivisions = [];
    this.filteredDistricts = [];
    this.loadDashboard();
  }

  /* ─────────── Map ─────────── */

  private initMap(): void {
    const el = document.getElementById('admin-map');
    if (!el) return;

    this.map = L.map(el, {
      center: [31.1704, 72.7097],
      zoom: 7,
      zoomControl: false,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      minZoom: 5,
      attribution: '&copy; CARTO'
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.clusterLayer.addTo(this.map);
    this.trackerLayer.addTo(this.map);

    this.map.whenReady(() => {
      this.map.invalidateSize();
    });
  }

  private fitBoundsToData(): void {
    if (!this.map) {
      return;
    }
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let hasCoords = false;

    const track = (lat: number, lng: number) => {
      // Punjab Roughly Bounds: Lat [27, 35], Lng [69, 76]
      // We filter out any coordinates clearly outside this box (like Europe or default 0,0)
      if (lat < 27 || lat > 37 || lng < 68 || lng > 78) {
        console.warn(`[Map] Skipping outlier coordinate: [${lat}, ${lng}]`);
        return;
      }
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      hasCoords = true;
    };

    (this.dashboardStats?.geoClusters || []).forEach(c => {
      if (c.latitude && c.longitude) track(Number(c.latitude), Number(c.longitude));
    });
    this.trackerPoints.forEach(p => {
      if (p.latitude && p.longitude) track(Number(p.latitude), Number(p.longitude));
    });

    if (hasCoords) {
      this.map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [60, 60], maxZoom: 12 });
    }
  }

  private renderDistrictClusters(clusters: GeoCluster[]): void {
    this.clusterLayer.clearLayers();
    if (!clusters.length) return;

    const maxMachines = Math.max(...clusters.map(c => c.totalMachines), 1);

    clusters.forEach(cluster => {
      if (!cluster.latitude || !cluster.longitude) return;

      const ratio = cluster.totalMachines / maxMachines;
      const radius = 18 + ratio * 40;
      const liveRatio = cluster.totalMachines > 0 ? cluster.liveMachines / cluster.totalMachines : 0;

      const hue = liveRatio > 0.6 ? 160 : liveRatio > 0.3 ? 45 : 0;
      const fillColor = `hsl(${hue}, 70%, 50%)`;

      const circle = L.circleMarker([cluster.latitude, cluster.longitude], {
        radius,
        fillColor,
        color: fillColor,
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.2,
        renderer: this.canvasRenderer
      });

      const outerGlow = L.circleMarker([cluster.latitude, cluster.longitude], {
        radius: radius + 8,
        fillColor,
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.06,
        renderer: this.canvasRenderer
      });

      outerGlow.addTo(this.clusterLayer);
      circle.addTo(this.clusterLayer);

      circle.bindPopup(`
        <div style="background: rgba(10, 15, 30, 0.95); backdrop-filter: blur(20px); color: white; padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 50px rgba(0,0,0,0.5); min-width: 220px;">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 900; color: #f1f5f9; letter-spacing: -0.3px;">${cluster.districtName || 'Unknown'}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">
              ${cluster.divisionName || ''} ${cluster.regionName ? '&middot; ' + cluster.regionName : ''}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <div style="text-align: center; padding: 8px 4px; background: rgba(59, 130, 246, 0.1); border-radius: 10px;">
              <div style="font-size: 18px; font-weight: 900; color: #3b82f6;">${cluster.totalMachines}</div>
              <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</div>
            </div>
            <div style="text-align: center; padding: 8px 4px; background: rgba(16, 185, 129, 0.1); border-radius: 10px;">
              <div style="font-size: 18px; font-weight: 900; color: #10b981;">${cluster.liveMachines}</div>
              <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Live</div>
            </div>
            <div style="text-align: center; padding: 8px 4px; background: rgba(245, 158, 11, 0.1); border-radius: 10px;">
              <div style="font-size: 18px; font-weight: 900; color: #f59e0b;">${cluster.offlineMachines}</div>
              <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Offline</div>
            </div>
          </div>
          <div style="margin-top: 10px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
            <div style="width: ${Math.round(liveRatio * 100)}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px;"></div>
          </div>
          <div style="margin-top: 4px; text-align: right; font-size: 10px; color: #64748b; font-weight: 600;">
            ${Math.round(liveRatio * 100)}% online
          </div>
        </div>
      `);
    });
  }

  private renderTrackerPointsBatched(points: TrackerMapPoint[]): void {
    this.trackerLayer.clearLayers();
    const valid = points.filter(p => p.latitude && p.longitude);
    if (!valid.length) return;

    const BATCH = 200;
    let idx = 0;

    const renderBatch = () => {
      const end = Math.min(idx + BATCH, valid.length);
      for (let i = idx; i < end; i++) {
        const point = valid[i];
        const speedNum = point.speed != null ? Number(point.speed) : NaN;
        const isMoving = Number.isFinite(speedNum) && speedNum > 1;
        const pinMode = isMoving ? 'moving' : point.isLive ? 'live' : 'sleep';

        const icon = L.divIcon({
          className: '',
          html: '<div class="loc-pin ' + pinMode + '">' +
                  '<div class="pin-dot"></div>' +
                  '<div class="pin-pulse p1"></div>' +
                  '<div class="pin-pulse p2"></div>' +
                '</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const cm = L.marker([point.latitude, point.longitude], { icon });

        cm.on('click', () => {
          if (!(cm as any)._popupBound) {
            let statusColor: string;
            let statusText: string;
            let statusIcon: string;
            if (isMoving) {
              statusColor = '#14b8a6';
              statusText = 'In motion';
              statusIcon = 'speed';
            } else if (point.isLive) {
              statusColor = '#10b981';
              statusText = 'Online';
              statusIcon = 'sensors';
            } else {
              statusColor = '#f59e0b';
              statusText = 'Sleep Mode';
              statusIcon = 'bedtime';
            }
            cm.bindPopup(
              '<div style="background:rgba(10,15,30,.95);backdrop-filter:blur(20px);color:#fff;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.08);box-shadow:0 15px 40px rgba(0,0,0,.5);min-width:220px">' +
                '<div style="margin-bottom:8px">' +
                  '<div style="font-size:14px;font-weight:900;color:#3b82f6;text-transform:uppercase;letter-spacing:.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (point.farmerName || 'Unknown') + '</div>' +
                  '<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px">#' + (point.applicationNumber || '—') + '</div>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:5px">' +
                  '<div style="display:flex;align-items:center;gap:6px"><i class="material-icons" style="font-size:14px;color:#64748b">badge</i><span style="color:#94a3b8;font-size:12px;font-weight:600">' + (point.farmerCnic || '—') + '</span></div>' +
                  '<div style="display:flex;align-items:center;gap:6px"><i class="material-icons" style="font-size:14px;color:#3b82f6">precision_manufacturing</i><span style="color:#cbd5e1;font-size:12px;font-weight:700">' + (point.implementName || '—') + '</span></div>' +
                  '<div style="display:flex;align-items:center;gap:6px"><i class="material-icons" style="font-size:14px;color:' + statusColor + '">' + statusIcon + '</i><span style="color:#cbd5e1;font-size:12px;font-weight:600">' + statusText + '</span></div>' +
                  '<div style="display:flex;align-items:center;gap:6px"><i class="material-icons" style="font-size:14px;color:#10b981">place</i><span style="color:#94a3b8;font-size:12px;font-weight:600">' + (point.districtName || '—') + '</span></div>' +
                '</div>' +
              '</div>'
            );
            (cm as any)._popupBound = true;
            cm.openPopup();
          }
        });

        cm.addTo(this.trackerLayer);
      }
      idx = end;
      if (idx < valid.length) {
        requestAnimationFrame(renderBatch);
      } else {
        // All trackers have been drawn to the map
        this.trackersFinishedRendering = true;
        this.checkFinalize();
      }
    };

    requestAnimationFrame(renderBatch);
  }

  private formatTimeAgo(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return 'Never';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return Math.round(minutes) + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
  }
}
