import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { environment } from '@env/environment';
import { tractorMapIconLeafletOptions } from '@app/shared/map/tractor-map-marker';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker'; // Make sure this is installed via npm install leaflet-rotatedmarker @types/leaflet-rotatedmarker

export interface MapJourneyData {
  imei: string;
  /** Shown in header when provided (e.g. from farmer application or live report). */
  farmerName?: string;
  cnic?: string;
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
      <div id="journey-map" class="map-box" [class.dark-mode]="isDarkMode() && !isSatelliteView()"></div>

      <!-- Compact Overlay Interface (HUD Style) -->
      <div class="hud-container">
        
        <!-- Header HUD -->
        <header class="hud-header glass" cdkDrag cdkDragBoundary=".journey-dialog">
            <div class="h-left">
                <mat-icon class="pulse-icon">route</mat-icon>
                <div class="h-txt">
                    <span class="h-title">ASSET JOURNEY EXPLORER</span>
                    <span class="h-sub mono">IMEI: {{ data.imei }}</span>
                    <span class="h-sub farmer-line" *ngIf="data.farmerName">Farmer: {{ data.farmerName }}</span>
                    <span class="h-sub mono" *ngIf="data.cnic">CNIC: {{ data.cnic }}</span>
                </div>
            </div>
            <div class="h-right">
                <button mat-icon-button (click)="toggleBaseMap()" class="c-btn" [class.layer-active]="isSatelliteView()" title="{{ isSatelliteView() ? 'Street map' : 'Satellite imagery' }}">
                    <mat-icon>{{ isSatelliteView() ? 'map' : 'satellite_alt' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="toggleTheme()" class="c-btn" title="Toggle Map Theme">
                    <mat-icon>{{ isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="close()" class="c-btn"><mat-icon>close</mat-icon></button>
            </div>
        </header>

        <!-- Bottom dock: date range + playback (single panel — frees map area) -->
        <div class="playback-hud glass" cdkDrag cdkDragBoundary=".journey-dialog">
            <div class="hud-drag-handle">
                <mat-icon class="drag-icon">drag_indicator</mat-icon>
                <div class="drag-title">Journey</div>
                <button *ngIf="journeyData().length > 0" mat-icon-button class="collapse-btn" (click)="togglePanel()" [title]="isPanelCollapsed() ? 'Expand timeline, presets & playback' : 'Compact view (range + key stats)'">
                    <mat-icon>{{ isPanelCollapsed() ? 'expand_more' : 'expand_less' }}</mat-icon>
                </button>
            </div>

            <div class="dock-date-section">
                <div class="collapsed-journey-strip" *ngIf="journeyData().length > 0 && isPanelCollapsed()">
                    <span class="c-range-pill" [title]="activeRangeTitle()">{{ activeRangeLabel() }}</span>
                    <span class="c-sep" aria-hidden="true"></span>
                    <span class="c-stat"><span class="c-lbl">Dist</span> <span class="c-num">{{ totalDistanceKm() | number:'1.2-2' }}</span><span class="c-unit">km</span></span>
                    <span class="c-sep" aria-hidden="true"></span>
                    <span class="c-stat"><span class="c-lbl">Speed</span> <span class="c-num">{{ currentSpeedKmh() | number:'1.0-0' }}</span><span class="c-unit">km/h</span></span>
                    <span class="c-sep" aria-hidden="true"></span>
                    <span class="c-stat"><span class="c-lbl">Top</span> <span class="c-num">{{ topSpeed() | number:'1.0-0' }}</span><span class="c-unit">km/h</span></span>
                    <span class="c-sep" aria-hidden="true"></span>
                    <span class="c-stat"><span class="c-lbl">Min</span> <span class="c-num">{{ minSpeed() | number:'1.0-0' }}</span><span class="c-unit">km/h</span></span>
                    <span class="c-sep" aria-hidden="true"></span>
                    <span class="c-stat c-acres"><span class="c-lbl">Acres</span> <span class="c-num">{{ estArea() | number:'1.2-2' }}</span></span>
                </div>

                <ng-container *ngIf="journeyData().length === 0 || !isPanelCollapsed()">
                    <div class="preset-filters compact">
                        <button mat-flat-button type="button" [class.active-filter]="activeFilter() === 'today'" (click)="setFilter('today')" title="From midnight today">Today</button>
                        <button mat-flat-button type="button" [class.active-filter]="activeFilter() === 'week'" (click)="setFilter('week')" title="Last 7 days">7d</button>
                        <button mat-flat-button type="button" [class.active-filter]="activeFilter() === 'month'" (click)="setFilter('month')" title="Last month">1 mo</button>
                        <button mat-flat-button type="button" [class.active-filter]="activeFilter() === '6months'" (click)="setFilter('6months')" title="Last 6 months">6 mo</button>
                        <button mat-flat-button type="button" [class.active-filter]="activeFilter() === 'year'" (click)="setFilter('year')" title="Last year">1 yr</button>
                        <button mat-icon-button type="button" class="cal-btn" [class.active-filter]="activeFilter() === 'custom'" (click)="toggleCustomRange()" title="Custom date range">
                            <mat-icon>date_range</mat-icon>
                        </button>
                    </div>
                    <div class="custom-date-form" *ngIf="showCustomRange()">
                        <mat-form-field appearance="outline" class="date-field">
                            <mat-label>Start</mat-label>
                            <input matInput [matDatepicker]="startPicker" [formControl]="startDateCtrl">
                            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                            <mat-datepicker #startPicker></mat-datepicker>
                        </mat-form-field>
                        <span class="date-separator">–</span>
                        <mat-form-field appearance="outline" class="date-field">
                            <mat-label>End</mat-label>
                            <input matInput [matDatepicker]="endPicker" [formControl]="endDateCtrl">
                            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                            <mat-datepicker #endPicker></mat-datepicker>
                        </mat-form-field>
                        <button mat-flat-button class="apply-btn" (click)="applyCustomRange()" [disabled]="!startDateCtrl.value || !endDateCtrl.value">Apply</button>
                    </div>
                </ng-container>
            </div>

            <div class="hud-body" *ngIf="journeyData().length > 0 && !isPanelCollapsed()">
            
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
                       (pointerdown)="$event.stopPropagation()"
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
                    <mat-icon [class.active]="engineIndicatedOn(currentTelemetry())">
                        {{ engineIndicatedOn(currentTelemetry()) ? 'key' : 'key_off' }}
                    </mat-icon>
                    <div class="tel-data">
                        <label>ENGINE</label>
                        <span [class.active-text]="engineIndicatedOn(currentTelemetry())">
                            {{ engineIndicatedOn(currentTelemetry()) ? 'ON' : 'OFF' }}
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
      width: fit-content; margin: 0 auto 0 0; min-width: 350px; z-index: 6; cursor: grab;
      align-self: flex-start;
      .h-left {
        display: flex; gap: 16px; align-items: center;
        .pulse-icon { color: #3b82f6; font-size: 28px; width: 28px; height: 28px; }
        .h-txt {
          display: flex; flex-direction: column; gap: 2px; max-width: min(420px, 55vw);
          .h-title { font-size: 15px; font-weight: 900; color: white; letter-spacing: 1px; margin-bottom: 2px; }
          .h-sub { font-size: 11px; color: #94a3b8; line-height: 1.35; word-break: break-word; }
          .h-sub.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
          .h-sub.farmer-line { font-family: inherit; font-weight: 500; color: #cbd5e1; }
        }
      }
      .h-right { display: flex; gap: 8px; }
      .c-btn { color: #94a3b8; width: 36px; height: 36px; line-height: 36px; mat-icon { font-size: 20px; } &:hover { color: white; background: rgba(255,255,255,0.1); } }
      .c-btn.layer-active { color: #fff; background: rgba(59, 130, 246, 0.35); mat-icon { color: #93c5fd; } }
    }

    /* Do not use CSS transform for horizontal centering — CDK Drag uses transform and conflicts with boundary math. */
    .playback-hud {
        position: absolute; bottom: 16px; left: 0; right: 0;
        margin-left: auto; margin-right: auto;
        width: min(720px, calc(100vw - 32px)); max-width: 720px; padding: 0; z-index: 25;
        display: flex; flex-direction: column; cursor: grab;
        overflow: hidden;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.78) !important;
        &.cdk-drag-dragging { opacity: 0.95; box-shadow: 0 16px 50px rgba(0,0,0,0.6); cursor: grabbing; }

        .hud-drag-handle {
            display: flex; justify-content: space-between; align-items: center; padding: 5px 12px;
            cursor: grab; border-bottom: 1px dashed rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.2); border-radius: 16px 16px 0 0;
            .drag-icon { color: #64748b; font-size: 18px; width: 18px; height: 18px; }
            .drag-title { font-size: 11px; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; text-transform: uppercase; flex: 1; margin-left: 8px; }
            .collapse-btn { width: 32px; height: 32px; mat-icon { font-size: 20px; color: #94a3b8; font-weight: bold; margin-top: -3px; } }
            &:active { cursor: grabbing; }
        }

        .dock-date-section {
            padding: 8px 12px 10px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .collapsed-journey-strip {
            display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
            gap: 6px 4px; padding: 2px 0; row-gap: 8px;
            font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .c-range-pill {
            font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
            color: #e2e8f0; background: rgba(59, 130, 246, 0.35); border: 1px solid rgba(59, 130, 246, 0.5);
            padding: 4px 10px; border-radius: 999px; flex-shrink: 0;
        }
        .c-sep {
            width: 4px; height: 4px; border-radius: 50%; background: rgba(148, 163, 184, 0.45); flex-shrink: 0;
        }
        .c-stat {
            display: inline-flex; align-items: baseline; gap: 4px; flex-wrap: nowrap; font-size: 11px; color: #cbd5e1;
            .c-lbl { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
            .c-num { font-weight: 800; color: #f8fafc; }
            .c-unit { font-size: 9px; font-weight: 600; color: #94a3b8; margin-left: 1px; }
        }
        .c-stat.c-acres .c-num { color: #6ee7b7; }

        .preset-filters.compact {
            display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center;
            button.mat-mdc-button-base {
                border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1;
                font-weight: 700; font-size: 12px; min-height: 30px; padding: 0 10px; line-height: 30px;
                &.active-filter { background: #3b82f6; color: white; }
                &:hover:not(.active-filter) { background: rgba(255,255,255,0.12); }
            }
            .cal-btn {
                width: 34px; height: 34px; padding: 0; border-radius: 8px;
                background: rgba(255,255,255,0.06); color: #cbd5e1;
                &.active-filter { background: #3b82f6; color: white; }
                mat-icon { font-size: 18px; width: 18px; height: 18px; margin: 0; }
            }
        }

        .custom-date-form {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
            margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);
            ::ng-deep .mat-mdc-form-field { margin-bottom: -1.25em; width: 132px; }
            ::ng-deep .mdc-text-field--outlined { --mdc-outlined-text-field-container-shape: 8px; }
            ::ng-deep .mdc-text-field--outlined .mdc-notched-outline { border-color: rgba(255,255,255,0.2) !important; }
            ::ng-deep .mdc-text-field--outlined:hover .mdc-notched-outline { border-color: rgba(255,255,255,0.4) !important; }
            ::ng-deep .mat-mdc-form-field-focus-overlay { background-color: rgba(255,255,255,0.05); }
            ::ng-deep .mat-mdc-input-element { color: white !important; font-size: 12px; }
            ::ng-deep .mdc-floating-label { color: #94a3b8 !important; font-size: 12px; }
            ::ng-deep .mat-datepicker-toggle { color: #94a3b8 !important; }
            .date-separator { color: #64748b; font-size: 12px; font-weight: 700; }
            .apply-btn { height: 40px; border-radius: 8px; background: #10b981; color: white; font-weight: 700; font-size: 12px; padding: 0 14px; }
        }

        .hud-body {
            padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 12px;
        }

        .summary-stats {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
            background: rgba(0,0,0,0.22); border-radius: 10px; padding: 8px; border: 1px solid rgba(255,255,255,0.05);
            .s-box {
                display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
                mat-icon { font-size: 16px; width: 16px; height: 16px; margin-bottom: 4px; 
                    &.c-blue { color: #3b82f6; } &.c-red { color: #ef4444; } &.c-orange { color: #f59e0b; } &.c-green { color: #10b981; }
                }
                .s-val { font-size: 11px; font-weight: 800; color: white; font-family: 'JetBrains Mono'; small { font-size: 8px; opacity: 0.7; margin-left:2px;} }
                .s-lbl { font-size: 8px; font-weight: 700; color: #94a3b8; letter-spacing: 0.4px; margin-top: 2px; }
            }
        }

        .controls-row {
            display: flex; justify-content: space-between; align-items: center;
            
            .ctrl-btn { color: white; background: rgba(255,255,255,0.1); margin-right: 8px; transition: all 0.2s;
                &.main-ctrl { background: #3b82f6; width: 44px; height: 44px; line-height: 44px; mat-icon { font-size: 26px; width: 26px; height: 26px; margin-top: 4px; } }
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
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
            .tel-box {
                display: flex; align-items: center; gap: 8px;
                mat-icon { font-size: 20px; width: 20px; height: 20px; color: #64748b; &.active { color: #10b981; } }
                .tel-data {
                    display: flex; flex-direction: column;
                    label { font-size: 8px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 2px; }
                    span { font-size: 13px; font-weight: 700; color: white; font-family: 'JetBrains Mono'; small { font-size: 9px; opacity: 0.6; } &.active-text { color: #10b981; } }
                }
            }
        }

        .addr-box {
            display: flex; gap: 8px; align-items: flex-start; margin-top: 4px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1);
            mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f43f5e; margin-top: 2px; }
            .addr-text { font-size: 11px; color: #cbd5e1; line-height: 1.4; flex: 1; }
        }
    }

    .status-overlay {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 12;
        padding: 40px; text-align: center; min-width: 300px; max-width: 400px;
        box-sizing: border-box;

        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;

        p { color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5; }
        h4 { color: white; font-size: 18px; font-weight: 800; margin: 0; }
        mat-icon { font-size: 48px; width: 48px; height: 48px; color: #64748b; margin-bottom: 8px; }

        /* mat-spinner is block-level; flex centers it (text-align alone does not) */
        .loading-state,
        .empty-state,
        .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            width: 100%;
        }

        .error-state { mat-icon { color: #ef4444; } h4 { color: #ef4444; } }
    }

    /* Leaflet Overrides */
    ::ng-deep .leaflet-control-zoom { border: none !important; border-radius: 8px !important; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; margin-right: 24px !important; margin-top: 72px !important; }
    ::ng-deep .leaflet-control-zoom a { background: rgba(15, 23, 42, 0.9) !important; color: #fff !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
    ::ng-deep .leaflet-control-zoom a:hover { background: #3b82f6 !important; color: #fff !important; }
    
    ::ng-deep .tractor-avatar {
        width: 32px; height: 32px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 2px solid #3b82f6;
        transition: transform 0.2s linear;
        img { width: 24px; height: 24px; }
        &::after {
            content: ''; position: absolute; inset: -12px; border-radius: 50%;
            background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%);
            z-index: -1; pointer-events: none;
        }
    }

    ::ng-deep .start-marker { width: 14px; height: 14px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
    ::ng-deep .end-marker { width: 14px; height: 14px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }

    .hud-header.cdk-drag-dragging,
    .playback-hud.cdk-drag-dragging {
        z-index: 1000;
    }
  `]
})
export class MapJourneyDialogComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<MapJourneyDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as MapJourneyData;
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe);

  // Map state
  private map!: L.Map;
  private polyline!: L.Polyline;
  private tractorMarker!: L.Marker;
  private startPointMarker: L.Marker | null = null;
  private endPointMarker: L.Marker | null = null;
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;
  isDarkMode = signal(false);
  /** When true, Esri World Imagery is shown instead of street tiles. */
  isSatelliteView = signal(false);

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

  /** Short label for the active time range (collapsed strip). */
  activeRangeLabel(): string {
    switch (this.activeFilter()) {
      case 'today': return 'Today';
      case 'week': return '7d';
      case 'month': return '1 mo';
      case '6months': return '6 mo';
      case 'year': return '1 yr';
      case 'custom': {
        const s = this.startDateCtrl.value;
        const e = this.endDateCtrl.value;
        if (s && e) {
          return `${this.datePipe.transform(s, 'mediumDate') ?? '…'} – ${this.datePipe.transform(e, 'mediumDate') ?? '…'}`;
        }
        return 'Custom';
      }
      default: return '';
    }
  }

  /** Tooltip with full description of the range. */
  activeRangeTitle(): string {
    switch (this.activeFilter()) {
      case 'today': return 'From midnight today';
      case 'week': return 'Last 7 days';
      case 'month': return 'Last month';
      case '6months': return 'Last 6 months';
      case 'year': return 'Last year';
      case 'custom': {
        const s = this.startDateCtrl.value;
        const e = this.endDateCtrl.value;
        if (s && e) {
          return `Custom: ${this.datePipe.transform(s, 'mediumDate')} – ${this.datePipe.transform(e, 'mediumDate')}`;
        }
        return 'Custom date range';
      }
      default: return '';
    }
  }

  /** Current point speed for collapsed HUD (km/h). */
  currentSpeedKmh(): number {
    const t = this.currentTelemetry();
    if (!t || t.speed == null) return 0;
    const n = Number(t.speed);
    return Number.isFinite(n) ? n : 0;
  }

  toggleBaseMap() {
    if (!this.map || !this.streetLayer || !this.satelliteLayer) return;
    const next = !this.isSatelliteView();
    this.isSatelliteView.set(next);
    if (next) {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
  }

  /** If speed > 0, engine is shown ON (movement implies running); otherwise use ignition. */
  engineIndicatedOn(t: { ignition?: number; speed?: number } | null | undefined): boolean {
    if (!t) return false;
    const speed = Number(t.speed);
    if (Number.isFinite(speed) && speed > 0) return true;
    return t.ignition === 1;
  }

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

      this.streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
      });
      this.satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
      );
      this.streetLayer.addTo(this.map);
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

      const tractorIcon = L.icon(tractorMapIconLeafletOptions());

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
