import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { environment } from '@env/environment';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker'; // Make sure this is installed via npm install leaflet-rotatedmarker @types/leaflet-rotatedmarker

export interface MapJourneyData {
  imei: string;
}

@Component({
  selector: 'app-map-journey-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule
  ],
  providers: [DatePipe],
  template: `
    <div class="journey-dialog">
      <!-- Fullscreen Map Background -->
      <div id="journey-map" class="map-box" [class.dark-mode]="isDarkMode()"></div>

      <!-- Compact Overlay Interface (HUD Style) -->
      <div class="hud-container">
        
        <!-- Header HUD -->
        <header class="hud-header glass">
            <div class="h-left">
                <mat-icon class="pulse-icon">route</mat-icon>
                <div class="h-txt">
                    <span class="h-title">ASSET JOURNEY EXPLORER</span>
                    <span class="h-sub">IMEI: {{ data.imei }}</span>
                </div>
            </div>
            <div class="h-right">
                <button mat-icon-button (click)="toggleTheme()" class="c-btn" title="Toggle Map Theme">
                    <mat-icon>{{ isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="close()" class="c-btn"><mat-icon>close</mat-icon></button>
            </div>
        </header>

        <!-- Time Controls HUD -->
        <div class="time-controls glass">
            <div class="preset-filters">
                <button mat-flat-button [class.active-filter]="activeFilter() === 'today'" (click)="setFilter('today')">Today</button>
                <button mat-flat-button [class.active-filter]="activeFilter() === 'week'" (click)="setFilter('week')">Last Week</button>
                <button mat-flat-button [class.active-filter]="activeFilter() === 'month'" (click)="setFilter('month')">Last 1 Month</button>
                <button mat-flat-button [class.active-filter]="activeFilter() === '6months'" (click)="setFilter('6months')">Last 6 Months</button>
                <button mat-flat-button [class.active-filter]="activeFilter() === 'year'" (click)="setFilter('year')">Year</button>
                <div class="custom-range-toggle">
                    <button mat-icon-button [class.active-filter]="activeFilter() === 'custom'" (click)="toggleCustomRange()" title="Custom Date Range">
                        <mat-icon>date_range</mat-icon>
                    </button>
                </div>
            </div>

            <!-- Custom Date Range Form -->
            <div class="custom-date-form" *ngIf="showCustomRange()">
                <mat-form-field appearance="outline" class="date-field">
                    <mat-label>Start Date</mat-label>
                    <input matInput [matDatepicker]="startPicker" [formControl]="startDateCtrl">
                    <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                    <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>
                
                <span class="date-separator">to</span>

                <mat-form-field appearance="outline" class="date-field">
                    <mat-label>End Date</mat-label>
                    <input matInput [matDatepicker]="endPicker" [formControl]="endDateCtrl">
                    <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                    <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>

                <button mat-flat-button class="apply-btn" (click)="applyCustomRange()" [disabled]="!startDateCtrl.value || !endDateCtrl.value">Apply</button>
            </div>
        </div>

        <!-- Telemetry HUD & Playback Controls -->
        <div class="playback-hud glass" *ngIf="journeyData().length > 0" cdkDrag cdkDragBoundary=".journey-dialog">
            
            <div class="hud-drag-handle" cdkDragHandle>
                <mat-icon class="drag-icon">drag_indicator</mat-icon>
                <div class="drag-title">Playback Controls</div>
                <button mat-icon-button class="collapse-btn" (click)="togglePanel()" [title]="isPanelCollapsed() ? 'Expand' : 'Collapse'">
                    <mat-icon>{{ isPanelCollapsed() ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
            </div>

            <div class="hud-body" *ngIf="!isPanelCollapsed()">
            
            <!-- Journey Summary Stats -->
            <div class="summary-stats">
              <div class="s-box">
                <mat-icon class="c-blue">route</mat-icon>
                <div class="s-val">{{ totalDistanceKm() | number:'1.2-2' }} <small>km</small></div>
                <div class="s-lbl">DISTANCE</div>
              </div>
              <div class="s-box">
                <mat-icon class="c-red">keyboard_double_arrow_up</mat-icon>
                <div class="s-val">{{ topSpeed() | number:'1.0-0' }} <small>km/h</small></div>
                <div class="s-lbl">TOP SPEED</div>
              </div>
              <div class="s-box">
                <mat-icon class="c-orange">keyboard_arrow_down</mat-icon>
                <div class="s-val">{{ minSpeed() | number:'1.0-0' }} <small>km/h</small></div>
                <div class="s-lbl">MIN SPEED</div>
              </div>
              <div class="s-box">
                <mat-icon class="c-green">grass</mat-icon>
                <div class="s-val">{{ estArea() | number:'1.1-2' }} <small>Acres</small></div>
                <div class="s-lbl">EST. AREA</div>
              </div>
            </div>

            <!-- Playback Controls -->
            <div class="controls-row">
                <button mat-icon-button class="ctrl-btn main-ctrl" (click)="togglePlayback()" [disabled]="isPlaying()">
                    <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
                <button mat-icon-button class="ctrl-btn" (click)="stopPlayback()" [disabled]="!isPlaying() && currentPointIndex() === 0">
                    <mat-icon>stop</mat-icon>
                </button>
                
                <div class="speed-control">
                    <span class="speed-label">{{ playbackSpeed() }}x</span>
                    <button mat-icon-button class="mini-btn" (click)="changeSpeed(1)">1x</button>
                    <button mat-icon-button class="mini-btn" (click)="changeSpeed(5)">5x</button>
                    <button mat-icon-button class="mini-btn" (click)="changeSpeed(15)">15x</button>
                    <button mat-icon-button class="mini-btn" (click)="changeSpeed(30)">30x</button>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container">
                <input type="range" class="timeline-slider" 
                       [min]="0" [max]="journeyData().length - 1" 
                       [value]="currentPointIndex()" 
                       (input)="onTimelineScrub($event)">
                <div class="timeline-meta">
                    <span>{{ journeyData().length > 0 ? (journeyData()[0].timestamp | date:'shortDate') : '' }}</span>
                    <span>Points: {{ currentPointIndex() }} / {{ journeyData().length - 1 }}</span>
                    <span>{{ journeyData().length > 0 ? (journeyData()[journeyData().length - 1].timestamp | date:'shortDate') : '' }}</span>
                </div>
            </div>

            <div class="hud-divider"></div>

            <!-- Live Telemetry View -->
            <div class="telemetry-grid" *ngIf="currentTelemetry()">
                <div class="tel-box">
                    <mat-icon>schedule</mat-icon>
                    <div class="tel-data">
                        <label>TIME</label>
                        <span>{{ currentTelemetry().timestamp | date:'shortTime' }}</span>
                    </div>
                </div>
                <div class="tel-box">
                    <mat-icon>speed</mat-icon>
                    <div class="tel-data">
                        <label>SPEED</label>
                        <span>{{ currentTelemetry().speed | number:'1.0-0' }} <small>km/h</small></span>
                    </div>
                </div>
                <div class="tel-box">
                    <mat-icon [class.active]="currentTelemetry().ignition === 1">
                        {{ currentTelemetry().ignition === 1 ? 'key' : 'key_off' }}
                    </mat-icon>
                    <div class="tel-data">
                        <label>ENGINE</label>
                        <span [class.active-text]="currentTelemetry().ignition === 1">
                            {{ currentTelemetry().ignition === 1 ? 'ON' : 'OFF' }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="addr-box" *ngIf="currentTelemetry()?.address">
                <mat-icon>location_on</mat-icon>
                <div class="addr-text">{{ currentTelemetry().address }}</div>
            </div>
            </div>
        </div>

        <!-- Empty State / Loading -->
        <div class="status-overlay glass" *ngIf="isLoading() || (journeyData().length === 0 && !isLoading()) || errorMsg()">
            <div class="loading-state" *ngIf="isLoading()">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Retrieving satellite telemetry logs...</p>
            </div>
            
            <div class="empty-state" *ngIf="journeyData().length === 0 && !isLoading() && !errorMsg()">
                <mat-icon>satellite_alt</mat-icon>
                <h4>No Telemetry Found</h4>
                <p>No journey data exists for the selected time range.</p>
            </div>

            <div class="error-state" *ngIf="errorMsg()">
                <mat-icon>warning</mat-icon>
                <h4>Connection Error</h4>
                <p>{{ errorMsg() }}</p>
            </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .journey-dialog {
      width: 100vw; height: 100vh; position: relative; background: #020617; 
      overflow: hidden; font-family: 'Outfit', 'Inter', sans-serif;
    }

    .map-box { 
        width: 100%; height: 100%; position: absolute; z-index: 1; 
        transition: filter 0.5s ease;
    }
    .map-box.dark-mode { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }

    .hud-container {
        position: absolute; inset: 0; z-index: 10; pointer-events: none;
        padding: 24px; display: flex; flex-direction: column; gap: 16px;
    }
    .hud-container > * { pointer-events: auto; }

    .glass {
        background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .hud-header {
      padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;
      width: fit-content; margin: 0 auto 0 0; min-width: 350px;
      .h-left {
        display: flex; gap: 16px; align-items: center;
        .pulse-icon { color: #3b82f6; font-size: 28px; width: 28px; height: 28px; }
        .h-txt { display: flex; flex-direction: column; .h-title { font-size: 15px; font-weight: 900; color: white; letter-spacing: 1px; margin-bottom: 2px;} .h-sub { font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono'; } }
      }
      .h-right { display: flex; gap: 8px; }
      .c-btn { color: #94a3b8; width: 36px; height: 36px; line-height: 36px; mat-icon { font-size: 20px; } &:hover { color: white; background: rgba(255,255,255,0.1); } }
    }

    .time-controls {
        padding: 12px 20px; width: fit-content; margin: 0;
        
        .preset-filters {
            display: flex; gap: 8px; align-items: center;
            button {
                border-radius: 8px; background: rgba(255,255,255,0.05); color: #cbd5e1; font-weight: 600; font-size: 13px; height: 36px;
                &.active-filter { background: #3b82f6; color: white; }
                &:hover:not(.active-filter) { background: rgba(255,255,255,0.1); }
            }
            .custom-range-toggle button { width: 36px; height: 36px; mat-icon { font-size: 20px; margin-top: -4px; } }
        }

        .custom-date-form {
            display: flex; gap: 16px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);
            
            ::ng-deep .mat-mdc-form-field { margin-bottom: -1.25em; width: 160px; }
            ::ng-deep .mdc-text-field--outlined { --mdc-outlined-text-field-container-shape: 8px; }
            ::ng-deep .mdc-text-field--outlined .mdc-notched-outline { border-color: rgba(255,255,255,0.2) !important; }
            ::ng-deep .mdc-text-field--outlined:hover .mdc-notched-outline { border-color: rgba(255,255,255,0.4) !important; }
            ::ng-deep .mat-mdc-form-field-focus-overlay { background-color: rgba(255,255,255,0.05); }
            ::ng-deep .mat-mdc-input-element { color: white !important; font-size: 13px; }
            ::ng-deep .mdc-floating-label { color: #94a3b8 !important; }
            ::ng-deep .mat-datepicker-toggle { color: #94a3b8 !important; }
            
            .date-separator { color: #64748b; font-size: 13px; font-weight: 600; }
            .apply-btn { height: 50px; border-radius: 8px; background: #10b981; color: white; font-weight: 700; margin-bottom: 6px;}
        }
    }

    .playback-hud {
        position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
        width: 100%; max-width: 600px; padding: 0;
        display: flex; flex-direction: column; cursor: default;
        &.cdk-drag-dragging { opacity: 0.9; box-shadow: 0 16px 50px rgba(0,0,0,0.6); }

        .hud-drag-handle {
            display: flex; justify-content: space-between; align-items: center; padding: 6px 16px;
            cursor: grab; border-bottom: 1px dashed rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.2); border-radius: 16px 16px 0 0;
            .drag-icon { color: #64748b; font-size: 20px; width: 20px; height: 20px; }
            .drag-title { font-size: 11px; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; text-transform: uppercase; flex: 1; margin-left: 8px; }
            .collapse-btn { width: 32px; height: 32px; mat-icon { font-size: 20px; color: #94a3b8; font-weight: bold; margin-top: -3px; } }
            &:active { cursor: grabbing; }
        }

        .hud-body {
            padding: 16px 24px 20px; display: flex; flex-direction: column; gap: 16px;
        }

        .summary-stats {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
            background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.05);
            .s-box {
                display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
                mat-icon { font-size: 18px; width: 18px; height: 18px; margin-bottom: 6px; 
                    &.c-blue { color: #3b82f6; } &.c-red { color: #ef4444; } &.c-orange { color: #f59e0b; } &.c-green { color: #10b981; }
                }
                .s-val { font-size: 12px; font-weight: 800; color: white; font-family: 'JetBrains Mono'; small { font-size: 9px; opacity: 0.7; margin-left:2px;} }
                .s-lbl { font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; margin-top: 4px; }
            }
        }

        .controls-row {
            display: flex; justify-content: space-between; align-items: center;
            
            .ctrl-btn { color: white; background: rgba(255,255,255,0.1); margin-right: 8px; transition: all 0.2s;
                &.main-ctrl { background: #3b82f6; width: 48px; height: 48px; line-height: 48px; mat-icon { font-size: 28px; width: 28px; height: 28px; margin-top: 4px; } }
                &:hover:not([disabled]) { transform: scale(1.05); background: rgba(255,255,255,0.2); }
                &.main-ctrl:hover:not([disabled]) { background: #2563eb; }
                &[disabled] { opacity: 0.5; cursor: not-allowed; }
            }

            .speed-control {
                display: flex; gap: 4px; align-items: center; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);
                .speed-label { font-size: 12px; font-weight: 800; color: #10b981; margin-right: 8px; width: 30px; text-align: center; }
                .mini-btn { width: 32px; height: 32px; font-size: 11px; font-weight: 700; color: #cbd5e1; border-radius: 50%; 
                    &:hover { background: rgba(255,255,255,0.1); color: white; }
                }
            }
        }

        .progress-container {
            .timeline-slider {
                -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; outline: none; margin-bottom: 8px; cursor: pointer;
                &::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: 2px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5); transition: transform 0.1s; }
                &::-webkit-slider-thumb:hover { transform: scale(1.2); }
            }
            .timeline-meta { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono'; font-weight: 600; }
        }

        .hud-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }

        .telemetry-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
            .tel-box {
                display: flex; align-items: center; gap: 12px;
                mat-icon { font-size: 24px; width: 24px; height: 24px; color: #64748b; &.active { color: #10b981; } }
                .tel-data {
                    display: flex; flex-direction: column;
                    label { font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 2px; }
                    span { font-size: 14px; font-weight: 700; color: white; font-family: 'JetBrains Mono'; small { font-size: 10px; opacity: 0.6; } &.active-text { color: #10b981; } }
                }
            }
        }

        .addr-box {
            display: flex; gap: 10px; align-items: flex-start; margin-top: 8px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1);
            mat-icon { font-size: 18px; width: 18px; height: 18px; color: #f43f5e; margin-top: 2px; }
            .addr-text { font-size: 12px; color: #cbd5e1; line-height: 1.4; flex: 1; }
        }
    }

    .status-overlay {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        padding: 40px; text-align: center; min-width: 300px; max-width: 400px;
        
        display: flex; flex-direction: column; align-items: center; gap: 16px;

        p { color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5; }
        h4 { color: white; font-size: 18px; font-weight: 800; margin: 0; }
        mat-icon { font-size: 48px; width: 48px; height: 48px; color: #64748b; margin-bottom: 8px; }

        .error-state { mat-icon { color: #ef4444; } h4 { color: #ef4444; } }
    }

    /* Leaflet Overrides */
    ::ng-deep .leaflet-control-zoom { border: none !important; border-radius: 8px !important; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; margin-right: 24px !important; margin-top: 100px !important; }
    ::ng-deep .leaflet-control-zoom a { background: rgba(15, 23, 42, 0.9) !important; color: #fff !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
    ::ng-deep .leaflet-control-zoom a:hover { background: #3b82f6 !important; color: #fff !important; }
    
    ::ng-deep .tractor-avatar {
        width: 40px; height: 40px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 2px solid #3b82f6;
        transition: transform 0.2s linear;
        img { width: 30px; height: 30px; }
        &::after {
            content: ''; position: absolute; inset: -15px; border-radius: 50%;
            background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%);
            z-index: -1; pointer-events: none;
        }
    }

    ::ng-deep .start-marker { width: 14px; height: 14px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
    ::ng-deep .end-marker { width: 14px; height: 14px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
  `]
})
export class MapJourneyDialogComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<MapJourneyDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as MapJourneyData;
  private http = inject(HttpClient);

  // Map state
  private map!: L.Map;
  private polyline!: L.Polyline;
  private tractorMarker!: L.Marker;
  private startPointMarker: L.Marker | null = null;
  private endPointMarker: L.Marker | null = null;
  isDarkMode = signal(false);

  // Data state
  journeyData = signal<any[]>([]);
  isLoading = signal(false);
  errorMsg = signal<string | null>(null);

  // Playback state
  isPlaying = signal(false);
  playbackSpeed = signal(5); // Adjust speed factor
  currentPointIndex = signal(0);
  private animationFrameId: number | null = null;
  private segmentStartTime: number | null = null;
  currentTelemetry = signal<any>(null);

  // Stats State
  totalDistanceKm = signal(0);
  topSpeed = signal(0);
  minSpeed = signal(0);
  estArea = signal(0);

  // Filter state
  activeFilter = signal<'today' | 'week' | 'month' | '6months' | 'year' | 'custom'>('week'); // changed init to trigger fetch below
  showCustomRange = signal(false);
  isPanelCollapsed = signal(false);
  
  startDateCtrl = new FormControl<Date | null>(null);
  endDateCtrl = new FormControl<Date | null>(null);

  ngOnInit() {
    setTimeout(() => {
        this.initMap();
        this.setFilter('week'); // Default load
    }, 100);
  }

  toggleTheme() { this.isDarkMode.set(!this.isDarkMode()); }
  togglePanel() { this.isPanelCollapsed.set(!this.isPanelCollapsed()); }

  setFilter(filter: 'today' | 'week' | 'month' | '6months' | 'year' | 'custom') {
      this.activeFilter.set(filter);
      if (filter !== 'custom') {
          this.showCustomRange.set(false);
          this.fetchJourneyDataForPreset(filter);
      }
  }

  toggleCustomRange() {
      this.showCustomRange.set(!this.showCustomRange());
      if (this.showCustomRange()) this.activeFilter.set('custom');
  }

  applyCustomRange() {
      if (this.startDateCtrl.value && this.endDateCtrl.value) {
          this.fetchJourneyData(this.startDateCtrl.value, this.endDateCtrl.value);
      }
  }

  private fetchJourneyDataForPreset(preset: string) {
      const end = new Date();
      const start = new Date();

      switch(preset) {
          case 'today': start.setHours(0,0,0,0); break;
          case 'week': start.setDate(start.getDate() - 7); break;
          case 'month': start.setMonth(start.getMonth() - 1); break;
          case '6months': start.setMonth(start.getMonth() - 6); break;
          case 'year': start.setFullYear(start.getFullYear() - 1); break;
      }
      this.fetchJourneyData(start, end);
  }

  private fetchJourneyData(start: Date, end: Date) {
      this.isLoading.set(true);
      this.errorMsg.set(null);
      this.stopPlayback();
      this.journeyData.set([]);
      this.clearMapLayers();

      const startStr = start.toISOString();
      const endStr = end.toISOString();

      this.http.get<any[]>(`${environment.apiUrl}/api/public/journey-imei/${this.data.imei}?startDate=${startStr}&endDate=${endStr}`)
          .subscribe({
              next: (raw) => {
                  this.isLoading.set(false);
                  
                  // Filter out junk data and impossible jumps (e.g. > 150km in short interval)
                  const data = this.filterJunkCoordinates(raw);

                  if (data && data.length > 0) {
                      this.journeyData.set(data);
                      this.calculateJourneyStats(data);
                      this.drawJourney();
                      this.currentPointIndex.set(0);
                      this.updateTelemetry(0);
                  } else {
                      this.errorMsg.set('No valid telemetry found in this range. Remaining data was filtered out as invalid or drift.');
                  }
              },
              error: (err) => {
                  this.isLoading.set(false);
                  this.errorMsg.set('Failed to fetch telemetry data.');
                  console.error(err);
              }
          });
  }

  private calculateJourneyStats(data: any[]) {
      let total = 0;
      let maxS = 0;
      let minS = 9999;
      
      for (let i = 0; i < data.length; i++) {
          const pt = data[i];
          if (pt.speed > maxS) maxS = pt.speed;
          if (pt.speed > 0 && pt.speed < minS) minS = pt.speed;
          
          if (i > 0) {
              total += this.getDistanceFromLatLonInKm(
                  data[i-1].latitude, data[i-1].longitude,
                  pt.latitude, pt.longitude
              );
          }
      }
      
      this.totalDistanceKm.set(total);
      this.topSpeed.set(maxS);
      this.minSpeed.set(minS === 9999 ? 0 : minS);
      
      // Standard implement width assumed ~2.5 meters.
      // Area in Acres = (dist_km * 1000 * 2.5) / 4046.86
      const acres = (total * 1000 * 2.5) / 4046.86;
      this.estArea.set(acres);
  }

  private filterJunkCoordinates(data: any[]): any[] {
      if (!data || data.length === 0) return [];
      
      const filtered: any[] = [];
      let lastValidPoint: any = null;

      for (const point of data) {
          // Additional frontend safety net for obvious bad values just in case
          if (!point.latitude || !point.longitude || 
              (point.latitude === 0 && point.longitude === 0) ||
              point.latitude < -90 || point.latitude > 90 ||
              point.longitude < -180 || point.longitude > 180) {
              continue;
          }

          // If we have a previous point, calculate distance to detect impossible GPS jumps
          if (lastValidPoint) {
              const distanceKm = this.getDistanceFromLatLonInKm(
                  lastValidPoint.latitude, lastValidPoint.longitude,
                  point.latitude, point.longitude
              );
              
              // If a jump is over 200km between two logs, it's very likely a GPS glitch/jump
              // Adjust this threshold based on tracker frequency/behavior if needed
              if (distanceKm > 200) {
                  continue; // Skip this errant point
              }
          }

          filtered.push(point);
          lastValidPoint = point;
      }
      return filtered;
  }

  private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Radius of the earth in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1); 
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      return R * c; 
  }

  private deg2rad(deg: number): number {
      return deg * (Math.PI/180);
  }

  private initMap() {
      this.map = L.map('journey-map', { 
          zoomControl: false,
          attributionControl: false
      }).setView([31.1704, 72.7097], 6); // Default to Punjab center roughly

      L.control.zoom({ position: 'topright' }).addTo(this.map);

      // Using Google Streets/Hybrid style variant equivalent via open sources or carto
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
      }).addTo(this.map);
  }

  private clearMapLayers() {
      if (this.polyline) this.map.removeLayer(this.polyline);
      if (this.tractorMarker) this.map.removeLayer(this.tractorMarker);
      if (this.startPointMarker) this.map.removeLayer(this.startPointMarker);
      if (this.endPointMarker) this.map.removeLayer(this.endPointMarker);
  }

  private drawJourney() {
      const data = this.journeyData();
      if (!data || data.length === 0) return;

      const pathLatLangs: L.LatLngExpression[] = data.map(d => [d.latitude, d.longitude]);

      // Draw Path
      this.polyline = L.polyline(pathLatLangs, { 
          color: '#3b82f6', 
          weight: 4, 
          opacity: 0.8,
          dashArray: '10, 10'
      }).addTo(this.map);

      // Fit bounds
      this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });

      // Add Start Marker
      const startIcon = L.divIcon({ className: 'start-marker', iconSize: [14, 14], iconAnchor: [7, 7] });
      this.startPointMarker = L.marker(pathLatLangs[0], { icon: startIcon }).addTo(this.map);

      // Add End Marker
      const endIcon = L.divIcon({ className: 'end-marker', iconSize: [14, 14], iconAnchor: [7, 7] });
      this.endPointMarker = L.marker(pathLatLangs[pathLatLangs.length - 1], { icon: endIcon }).addTo(this.map);

      // Add 3D Tractor Avatar (Rotated)
      const tractorSvg = `
      <svg width="68" height="68" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#16a34a"/>
            <stop offset="100%" stop-color="#14532d"/>
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <linearGradient id="tires" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#111827"/>
            <stop offset="50%" stop-color="#4b5563"/>
            <stop offset="100%" stop-color="#000000"/>
          </linearGradient>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <!-- Axles -->
          <rect x="6" y="32" width="36" height="4" fill="#374151" rx="1"/>
          <rect x="10" y="8" width="28" height="3" fill="#374151" rx="1"/>
          <!-- Large Rear Tires -->
          <rect x="2" y="24" width="10" height="20" rx="3" fill="url(#tires)"/>
          <rect x="36" y="24" width="10" height="20" rx="3" fill="url(#tires)"/>
          <line x1="2" y1="28" x2="12" y2="28" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="2" y1="34" x2="12" y2="34" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="2" y1="40" x2="12" y2="40" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="28" x2="46" y2="28" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="34" x2="46" y2="34" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="40" x2="46" y2="40" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <!-- Front Small Tires -->
          <rect x="8" y="2" width="6" height="12" rx="2" fill="url(#tires)"/>
          <rect x="34" y="2" width="6" height="12" rx="2" fill="url(#tires)"/>
          <!-- Engine Block -->
          <path d="M 16 4 L 32 4 L 32 20 L 16 20 Z" fill="url(#body)" stroke="#4ade80" stroke-width="1"/>
          <rect x="19" y="8" width="10" height="1.5" fill="#064e3b"/>
          <rect x="19" y="12" width="10" height="1.5" fill="#064e3b"/>
          <rect x="19" y="16" width="10" height="1.5" fill="#064e3b"/>
          <!-- Cabin Shield -->
          <path d="M 12 20 L 36 20 L 36 44 L 12 44 Z" fill="url(#body)" stroke="#22c55e" stroke-width="1.5"/>
          <path d="M 15 24 L 33 24 L 33 39 L 15 39 Z" fill="url(#glass)"/>
          <path d="M 17 26 L 31 26 L 31 37 L 17 37 Z" fill="url(#body)" stroke="#86efac" stroke-width="0.5"/>
          <!-- Headlights -->
          <circle cx="18" cy="4" r="2.5" fill="#fef08a"/>
          <circle cx="30" cy="4" r="2.5" fill="#fef08a"/>
          <!-- Taillights -->
          <rect x="14" y="42" width="4" height="2" fill="#ef4444"/>
          <rect x="30" y="42" width="4" height="2" fill="#ef4444"/>
        </g>
      </svg>
      `;

      const tractorIcon = L.icon({
          iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tractorSvg),
          iconSize: [68, 68],
          iconAnchor: [34, 34]
      });

      this.tractorMarker = L.marker(pathLatLangs[0], { 
          icon: tractorIcon,
          zIndexOffset: 1000
      }).addTo(this.map);

      // Pre-calculate headings for all points to make playback smooth
      this.calculateHeadings();
  }

  togglePlayback() {
      if (this.isPlaying()) {
          this.pausePlayback();
      } else {
          if (this.currentPointIndex() >= this.journeyData().length - 1) {
              this.currentPointIndex.set(0); // Reset if at end
          }
          this.startPlaybackLoop();
      }
  }

  private startPlaybackLoop() {
      this.isPlaying.set(true);
      this.segmentStartTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animateFrame);
  }

  private animateFrame = () => {
      if (!this.isPlaying()) return;

      const data = this.journeyData();
      if (this.currentPointIndex() >= data.length - 1) {
          this.stopPlayback();
          return;
      }

      const now = performance.now();
      // Calculate smooth frame duration (base 2000ms divided by playback speed)
      const segmentDuration = Math.max(16, 2000 / this.playbackSpeed()); 
      
      const elapsed = now - (this.segmentStartTime || now);
      let fraction = elapsed / segmentDuration;

      if (fraction >= 1) {
          fraction = 0;
          this.currentPointIndex.set(this.currentPointIndex() + 1);
          this.segmentStartTime = performance.now();
          
          if (this.currentPointIndex() >= data.length - 1) {
              this.updateTractorPosition(this.currentPointIndex());
              this.stopPlayback();
              return;
          }
      }

      const currentIdx = this.currentPointIndex();
      const point1 = data[currentIdx];
      const point2 = data[currentIdx + 1];
      
      // Interpolate position smoothly using fractional progress
      const lat = point1.latitude + (point2.latitude - point1.latitude) * fraction;
      const lng = point1.longitude + (point2.longitude - point1.longitude) * fraction;

      // Smooth rotation math (taking the shortest path around the 360deg circle)
      let h1 = point1.calculatedHeading || 0;
      let h2 = point2.calculatedHeading || h1;
      let diff = h2 - h1;
      
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      
      const currentHeading = h1 + diff * fraction;

      const latlng: L.LatLngTuple = [lat, lng];
      if (this.tractorMarker) {
          this.tractorMarker.setLatLng(latlng);
          (this.tractorMarker as any).setRotationAngle(currentHeading);
          
          // Pan camera only if moving near the edge of the screen (10% padding boundary)
          // This creates a highly cinematic, smooth chasing camera effect without hitching
          if (!this.map.getBounds().pad(-0.1).contains(latlng)) {
              this.map.panTo(latlng, { animate: true, duration: 0.5 });
          }
      }
      
      this.updateTelemetry(currentIdx);
      this.animationFrameId = requestAnimationFrame(this.animateFrame);
  }

  pausePlayback() {
      this.isPlaying.set(false);
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  stopPlayback() {
      this.pausePlayback();
      this.currentPointIndex.set(0);
      if (this.journeyData().length > 0) {
          this.updateTractorPosition(0);
      }
  }

  changeSpeed(speed: number) {
      this.playbackSpeed.set(speed);
      if (this.isPlaying()) {
          this.pausePlayback();
          this.startPlaybackLoop();
      }
  }

  onTimelineScrub(event: any) {
      const val = parseInt(event.target.value);
      this.pausePlayback();
      this.currentPointIndex.set(val);
      this.updateTractorPosition(val);
  }

  private calculateHeadings() {
      // Create a forward-looking angle calculation for rotation
      const data = this.journeyData();
      for (let i = 0; i < data.length; i++) {
          if (i < data.length - 1) {
              const p1 = data[i];
              const p2 = data[i + 1];
              
              const dy = p2.latitude - p1.latitude;
              const dx = Math.cos(Math.PI / 180 * p1.latitude) * (p2.longitude - p1.longitude);
              
              // Skip calculation if the points are identical to prevent erratic spins
              if (Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001) {
                  data[i].calculatedHeading = i > 0 ? data[i-1].calculatedHeading : 0;
              } else {
                  // Adding 0 degree alignment correction, as the top-down SVG points "Up" initially
                  const angle = Math.atan2(dx, dy) * 180 / Math.PI;
                  data[i].calculatedHeading = angle;
              }
          } else {
              // Last point inherits previous angle
              data[i].calculatedHeading = i > 0 ? data[i-1].calculatedHeading : 0;
          }
      }
  }

  private updateTractorPosition(index: number) {
      const data = this.journeyData();
      if (!data || !data[index]) return;

      const point = data[index];
      const latlng: L.LatLngTuple = [point.latitude, point.longitude];
      
      this.updateTelemetry(index);

      if (this.tractorMarker) {
          this.tractorMarker.setLatLng(latlng);
          
          // Apply dynamic path rotation referencing our `calculateHeadings`
          if (point.calculatedHeading !== undefined) {
              (this.tractorMarker as any).setRotationAngle(point.calculatedHeading);
          }

          // Pan camera only if moving near the edge of the screen (10% padding boundary)
          if (!this.map.getBounds().pad(-0.1).contains(latlng)) {
              this.map.panTo(latlng, { animate: true, duration: 0.5 });
          }
      }
  }

  private updateTelemetry(index: number) {
      const data = this.journeyData()[index];
      if (data) this.currentTelemetry.set(data);
  }

  close() {
      this.stopPlayback();
      this.dialogRef.close();
  }
}
