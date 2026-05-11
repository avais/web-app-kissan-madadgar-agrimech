import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { MachineLiveReportService, MachineLiveReportDto } from '../../../core/services/machine-live-report.service';
import { FirmService } from '../../../core/services/firm.service';
import { Firm } from '../../../core/models/firm.model';
import { MapJourneyDialogComponent } from '../../imei-verification/map-journey/map-journey-dialog.component';

@Component({
  selector: 'app-machine-live-reporting',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatProgressSpinnerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTimepickerModule,
    MatExpansionModule,
    FormsModule
  ],
  template: `
    <div class="manage-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Syncing Live Data</h3>
            <p>Fetching real-time data from tracked machines...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Machines Live Reporting</h1>
          <p>Monitor real-time status and journey of all active IoT devices associated with farmer applications.</p>
        </div>
        <div class="actions">
           <button mat-flat-button color="accent" class="filters-toggle-btn" (click)="isFiltersOpen = true">
              <mat-icon>tune</mat-icon> Filters
           </button>
           <button mat-flat-button color="primary" class="export-btn" (click)="exportToExcel()" [disabled]="isLoading() || reports().length === 0">
              <mat-icon>download</mat-icon> Download Excel
           </button>
           <button mat-flat-button color="primary" class="refresh-btn" (click)="loadReports()">
             <mat-icon>refresh</mat-icon> Refresh
           </button>
        </div>
      </div>

      <!-- Filters Slider Overlay -->
      <div class="filters-overlay" *ngIf="isFiltersOpen" (click)="isFiltersOpen = false"></div>

      <!-- Filters Slider -->
      <div class="filters-slider" [class.open]="isFiltersOpen">
        <div class="filters-slider-header">
          <div class="filters-panel-title">
            <mat-icon class="filters-title-icon">tune</mat-icon>
            <span>Search &amp; Filters</span>
          </div>
          <button mat-icon-button (click)="isFiltersOpen = false" aria-label="Close filters">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="filters-slider-body">
          <div class="filters-toolbar-actions">
            <button mat-flat-button color="primary" class="search-btn" type="button" (click)="searchReports()">
              <mat-icon>search</mat-icon> Search
            </button>
            <button mat-stroked-button class="reset-btn" type="button" (click)="resetFilters()">
              Clear Filters
            </button>
          </div>

          <div class="filter-sections">
            <div class="filter-section">
              <div class="section-header">
                <mat-icon>fingerprint</mat-icon>
                <h3>Identity &amp; Farmer</h3>
              </div>
              <div class="filter-bar-grid grid-5">
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Search IMEI</mat-label>
                  <input matInput [(ngModel)]="imeiFilter" placeholder="Enter IMEI..." (keyup.enter)="searchReports()">
                  <mat-icon matPrefix>search</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Farmer CNIC</mat-label>
                  <input matInput [(ngModel)]="cnicFilter" placeholder="Enter CNIC..." (keyup.enter)="searchReports()">
                  <mat-icon matPrefix>person_search</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Farmer Phone</mat-label>
                  <input matInput [(ngModel)]="phoneFilter" placeholder="Enter phone..." (keyup.enter)="searchReports()">
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Batch Number</mat-label>
                  <input matInput type="text" inputmode="numeric" pattern="[0-9]*" [(ngModel)]="batchNumberFilter" placeholder="e.g. 12" (keyup.enter)="searchReports()">
                  <mat-icon matPrefix>layers</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Firm Name</mat-label>
                  <mat-select [(ngModel)]="firmFilter">
                     <mat-option [value]="''">All Firms</mat-option>
                     <mat-option *ngFor="let f of firms()" [value]="f.name">{{f.name}}</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>business</mat-icon>
                </mat-form-field>
              </div>
            </div>

            <div class="filter-section">
              <div class="section-header">
                <mat-icon>sensors</mat-icon>
                <h3>Hardware Status &amp; Connectivity</h3>
              </div>
              <div class="filter-bar-grid grid-4">
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Internal Battery</mat-label>
                  <mat-select [(ngModel)]="intBatFilter">
                    <mat-option [value]="null">All Levels</mat-option>
                    <mat-option [value]="20">Low (&lt; 20%)</mat-option>
                    <mat-option [value]="50">Medium (&lt; 50%)</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>battery_alert</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>External Battery</mat-label>
                  <mat-select [(ngModel)]="extBatFilter">
                    <mat-option [value]="null">All Levels</mat-option>
                    <mat-option [value]="8000">Danger (&lt; 8.0 V)</mat-option>
                    <mat-option [value]="10500">Critical (&lt; 10.5V)</mat-option>
                    <mat-option [value]="11000">Very Low (&lt; 11.0V)</mat-option>
                    <mat-option [value]="11500">Low (&lt; 11.5V)</mat-option>
                    <mat-option [value]="12000">Medium (&lt; 12.0V)</mat-option>
                    <mat-option [value]="12500">Good (&lt; 12.5V)</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>electrical_services</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Report source</mat-label>
                  <mat-select #reportSourceSelect [(ngModel)]="reportSourceModes" multiple (selectionChange)="onReportSourceModesChange()">
                    <mat-option value="GPS">Only GPS</mat-option>
                    <mat-option value="HAS_FARMER">Has Farmer</mat-option>
                    <mat-option value="GSM">Only GSM</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>podcasts</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Time Frame (Not Reporting)</mat-label>
                  <mat-select [(ngModel)]="timeframeFilter">
                    <mat-option [value]="null">Any Time</mat-option>
                    <mat-option [value]="8">&gt; 8 Hours</mat-option>
                    <mat-option [value]="16">&gt; 16 Hours</mat-option>
                    <mat-option [value]="24">&gt; 24 Hours</mat-option>
                    <mat-option [value]="48">&gt; 48 Hours</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>history</mat-icon>
                </mat-form-field>
              </div>
            </div>

            <div class="filter-section">
              <div class="section-header">
                <mat-icon>date_range</mat-icon>
                <h3>Timestamps Filter</h3>
              </div>
              <div class="filter-bar-grid grid-4">
                <div class="grid-dt">
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>GPS timestamp from</mat-label>
                    <input matInput [matDatepicker]="gpsFromDatePk" [(ngModel)]="gpsTimestampFrom">
                    <mat-datepicker-toggle matIconSuffix [for]="gpsFromDatePk"></mat-datepicker-toggle>
                    <mat-datepicker #gpsFromDatePk></mat-datepicker>
                    <mat-icon matPrefix>schedule</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Time</mat-label>
                    <input matInput [matTimepicker]="gpsFromTimePk" [(ngModel)]="gpsTimestampFrom">
                    <mat-timepicker-toggle matIconSuffix [for]="gpsFromTimePk"></mat-timepicker-toggle>
                    <mat-timepicker #gpsFromTimePk interval="15m"></mat-timepicker>
                    <mat-icon matPrefix>access_time</mat-icon>
                  </mat-form-field>
                </div>
                <div class="grid-dt">
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>GPS timestamp to</mat-label>
                    <input matInput [matDatepicker]="gpsToDatePk" [(ngModel)]="gpsTimestampTo">
                    <mat-datepicker-toggle matIconSuffix [for]="gpsToDatePk"></mat-datepicker-toggle>
                    <mat-datepicker #gpsToDatePk></mat-datepicker>
                    <mat-icon matPrefix>schedule</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Time</mat-label>
                    <input matInput [matTimepicker]="gpsToTimePk" [(ngModel)]="gpsTimestampTo">
                    <mat-timepicker-toggle matIconSuffix [for]="gpsToTimePk"></mat-timepicker-toggle>
                    <mat-timepicker #gpsToTimePk interval="15m"></mat-timepicker>
                    <mat-icon matPrefix>access_time</mat-icon>
                  </mat-form-field>
                </div>
                <div class="grid-dt">
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Insertion date from</mat-label>
                    <input matInput [matDatepicker]="insFromDatePk" [(ngModel)]="serverInsertionFrom">
                    <mat-datepicker-toggle matIconSuffix [for]="insFromDatePk"></mat-datepicker-toggle>
                    <mat-datepicker #insFromDatePk></mat-datepicker>
                    <mat-icon matPrefix>cloud_upload</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Time</mat-label>
                    <input matInput [matTimepicker]="insFromTimePk" [(ngModel)]="serverInsertionFrom">
                    <mat-timepicker-toggle matIconSuffix [for]="insFromTimePk"></mat-timepicker-toggle>
                    <mat-timepicker #insFromTimePk interval="15m"></mat-timepicker>
                    <mat-icon matPrefix>access_time</mat-icon>
                  </mat-form-field>
                </div>
                <div class="grid-dt">
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Insertion date to</mat-label>
                    <input matInput [matDatepicker]="insToDatePk" [(ngModel)]="serverInsertionTo">
                    <mat-datepicker-toggle matIconSuffix [for]="insToDatePk"></mat-datepicker-toggle>
                    <mat-datepicker #insToDatePk></mat-datepicker>
                    <mat-icon matPrefix>cloud_upload</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="dt-field">
                    <mat-label>Time</mat-label>
                    <input matInput [matTimepicker]="insToTimePk" [(ngModel)]="serverInsertionTo">
                    <mat-timepicker-toggle matIconSuffix [for]="insToTimePk"></mat-timepicker-toggle>
                    <mat-timepicker #insToTimePk interval="15m"></mat-timepicker>
                    <mat-icon matPrefix>access_time</mat-icon>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <div class="filter-section">
              <div class="section-header">
                <mat-icon>sort</mat-icon>
                <h3>Sorting &amp; Presentation</h3>
              </div>
              <div class="filter-bar-grid grid-4">
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Sort by</mat-label>
                  <mat-select [(ngModel)]="sortByField">
                    <mat-option value="DEFAULT">Default (report source)</mat-option>
                    <mat-option value="GPS_TIMESTAMP">GPS timestamp</mat-option>
                    <mat-option value="SERVER_INSERTION">Insertion date</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>sort</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grid-field">
                  <mat-label>Sort direction</mat-label>
                  <mat-select [(ngModel)]="sortDirection">
                    <mat-option value="DESC">Newest first</mat-option>
                    <mat-option value="ASC">Oldest first</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>swap_vert</mat-icon>
                </mat-form-field>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="cards-grid" *ngIf="reports().length > 0">
        <mat-card class="machine-card" *ngFor="let item of reports(); let i = index">
          <div class="card-header">
            <div class="hero">
              <span class="tile-index-badge" [attr.aria-label]="'Result ' + tileOrdinal(i)">{{ tileOrdinal(i) }}</span>
              <mat-icon>sensors</mat-icon>
              <div class="hero-text">
                <h3>{{item.imei}}</h3>
                <span class="device-sim">SIM: {{item.deviceMobileNumber || 'N/A'}}</span>
                <span class="hours-badge" [class.recent]="item.totalHoursFromNow < 24" [class.old]="item.totalHoursFromNow >= 24">
                  {{formatTimeAgo(item)}}
                </span>
              </div>
            </div>
            <div class="header-actions">
              <button mat-flat-button color="accent" class="journey-btn-small" (click)="openJourneyDialog(item)" [disabled]="!item.lastRecordTimeStamp">
                <mat-icon>route</mat-icon> Journey
              </button>
              <button mat-stroked-button class="map-btn-small" (click)="openGoogleMap(item.latitude, item.longitude)" [disabled]="!item.latitude">
                <mat-icon>map</mat-icon> View Map
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="detail-row">
              <span class="lbl">Farmer</span>
              <span class="val">{{item.farmerName || 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">CNIC</span>
              <span class="val">{{item.cnic || 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Phone</span>
              <span class="val">{{item.farmerPhone || 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Firm</span>
              <span class="val">{{item.firmName || 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">GPS Date</span>
              <span class="val">{{item.lastRecordTimeStamp ? (item.lastRecordTimeStamp | date:'medium') : 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Insertion Date</span>
              <span class="val">{{item.insertionDate ? (item.insertionDate | date:'medium') : 'N/A'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Location</span>
              <span class="val loc-val" [title]="item.resolvedAddress || 'Unknown'">{{item.resolvedAddress || 'Unknown'}}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Coordinates</span>
              <span class="val">{{item.latitude != null ? (item.latitude | number:'1.6-6') + ', ' + (item.longitude | number:'1.6-6') : 'N/A'}}</span>
            </div>
          </div>
          
          <div class="card-footer">
             <div class="stat">
                <span class="s-lbl">Int. Bat</span>
                <span class="s-val"><mat-icon>battery_charging_full</mat-icon>{{item.remainingBattery != null ? item.remainingBattery + '%' : 'N/A'}}</span>
             </div>
             <div class="stat">
                <span class="s-lbl">Int. Volt</span>
                <span class="s-val"><mat-icon>flash_on</mat-icon>{{item.batteryVoltageMv != null ? (item.batteryVoltageMv/1000 | number:'1.1-2') + 'V' : 'N/A'}}</span>
             </div>
             <div class="stat">
                <span class="s-lbl">Ext. Bat</span>
                <span class="s-val"><mat-icon>battery_charging_full</mat-icon>{{item.externalBatteryPercentage != null ? item.externalBatteryPercentage + '%' : 'N/A'}}</span>
             </div>
             <div class="stat">
                <span class="s-lbl">Ext. Volt</span>
                <span class="s-val"><mat-icon>electrical_services</mat-icon>{{item.externalVoltageMv != null ? (item.externalVoltageMv/1000 | number:'1.1-2') + 'V' : 'N/A'}}</span>
             </div>
          </div>
        </mat-card>
      </div>

        <mat-paginator [length]="totalElements()"
                      [pageSize]="pageSize()"
                      [pageIndex]="pageIndex()"
                      [pageSizeOptions]="[5, 10, 25, 100]"
                      (page)="handlePageEvent($event)"
                      aria-label="Select page">
        </mat-paginator>

        <div class="empty-state" *ngIf="reports().length === 0 && !isLoading()">
          <mat-icon>satellite_alt</mat-icon>
          <h3>No Live Data Available</h3>
          <p>There are currently no active tracking devices reporting data.</p>
        </div>
    </div>
  `,
  styles: [`
    .manage-container { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; padding: 24px; }
    /* Fixed to viewport so spinner stays centered on screen (same card treatment as Manage Users). */
    .loader-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
    }
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: white;
      padding: 32px 48px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      text-align: center;
      animation: liveReportLoaderPopIn 0.3s ease-out;
    }
    .loader-text h3 { margin: 0; font-size: 18px; font-weight: 800; color: #1e293b; }
    .loader-text p { margin: 6px 0 0; font-size: 14px; color: #64748b; }
    @keyframes liveReportLoaderPopIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .title-section { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
      .actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: nowrap;
        white-space: nowrap;
      }
      .export-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #3b82f6 !important; color: white; margin: 0; }
      .refresh-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #4CAF50 !important; color: white; margin: 0; }
    }
    .filters-toggle-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #f59e0b !important; color: white; margin: 0; }

    .filters-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); z-index: 1000;
      opacity: 0; animation: fadeIn 0.3s forwards;
    }
    @keyframes fadeIn { to { opacity: 1; } }

    .filters-slider {
      position: fixed; top: 0; right: -1400px; width: 1400px; max-width: 95vw; height: 100vh;
      background: white; box-shadow: -4px 0 24px rgba(0,0,0,0.15); z-index: 1001;
      transition: right 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .filters-slider.open { right: 0; }

    .filters-slider-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .filters-panel-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
    }
    .filters-title-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #2563eb;
    }
    .filters-slider-body {
      padding: 24px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;
    }
    .filters-toolbar-actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 12px;
      margin: 0 0 20px;
    }
    .filter-sections {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-bottom: 20px;
    }
    .filter-section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      padding: 14px 18px;
      transition: all 0.2s ease-in-out;
    }
    .filter-section:hover {
      border-color: #cbd5e1;
      box-shadow: 0 6px 20px rgba(0,0,0,0.06);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .section-header mat-icon {
      color: #3b82f6;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .section-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-bar-grid {
      display: grid;
      gap: 12px 16px;
      align-items: start;
    }
    .grid-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .filter-bar-grid .grid-field {
      width: 100%;
      min-width: 0;
    }
    .filter-bar-grid .grid-dt {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-bar-grid .grid-dt .dt-field {
      width: 100%;
    }
    ::ng-deep .filter-bar-grid {
      --mat-form-field-container-height: 48px;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-text-field-wrapper {
      padding-right: 8px !important;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-prefix,
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-suffix {
      align-items: center !important;
      display: flex !important;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-prefix > .mat-icon,
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-suffix > .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-prefix > .mat-icon {
      margin-right: 8px;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-icon-suffix > .mat-icon {
      margin-left: 4px;
    }
    ::ng-deep .filter-bar-grid .mat-mdc-form-field-subscript-wrapper { display: none; }

    @media (max-width: 1000px) {
      .grid-5, .grid-4, .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 600px) {
      .grid-5, .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
      .filters-toolbar-actions {
        flex-direction: column;
        align-items: stretch;
      }
      .filters-toolbar-actions .search-btn,
      .filters-toolbar-actions .reset-btn { width: 100%; justify-content: center; }
    }
    .search-btn { height: 56px; border-radius: 12px; font-weight: 700; background-color: #2563eb !important; color: white; padding: 0 20px; }
    .reset-btn { height: 56px; border-radius: 12px; color: #64748b; border-color: #e2e8f0; padding: 0 18px; }
    .cards-grid {
       display: grid;
       grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
       gap: 20px;
       margin-bottom: 24px;
    }
    .machine-card {
       border-radius: 20px;
       padding: 20px;
       display: flex;
       flex-direction: column;
       gap: 16px;
       box-shadow: 0 4px 15px rgba(0,0,0,0.03);
       border: 1px solid rgba(226,232,240,0.8);
       background: #f9faf3 !important;
    }
    .card-header {
       display: flex; justify-content: space-between; align-items: flex-start;
       .hero {
          display: flex; align-items: center; gap: 12px;
          .tile-index-badge {
            flex-shrink: 0;
            min-width: 30px;
            height: 30px;
            padding: 0 8px;
            border-radius: 10px;
            background: #e0e7ff;
            color: #3730a3;
            font-size: 13px;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
          }
          mat-icon { font-size: 32px; width: 32px; height: 32px; color: #10b981; background: #ecfdf5; padding: 10px; border-radius: 12px; }
          .hero-text {
             display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
             h3 { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 800; color: #1e293b; }
             .device-sim { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; font-weight: 600; margin-top: -2px; }
           }
       }
    }
    .header-actions {
       display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
    }
    .journey-btn-small { border-radius: 10px; font-weight: 700; height: 36px !important; padding: 0 12px; background: #3b82f6 !important; color: white; display: flex; align-items: center; gap: 4px; min-width: 120px; justify-content: center; }
    .map-btn-small { border-radius: 10px; font-weight: 700; height: 36px !important; padding: 0 12px; color: #1e293b; border-color: #cbd5e1; display: flex; align-items: center; gap: 4px; min-width: 120px; justify-content: center; }

    .card-body {
       display: flex; flex-direction: column; gap: 8px; background: #f9faf3; padding: 12px; border-radius: 12px;
       .detail-row {
          display: flex; justify-content: flex-start; align-items: center; gap: 8px;
          .lbl { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; width: 112px; text-align: left; }
          .val { font-size: 13px; font-weight: 700; color: #0f172a; text-align: left; flex: 1; }
          .loc-val { width: 100%; }
       }
    }
    .card-footer {
       display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
       margin-top: auto;
       border-top: 1px dashed #e2e8f0;
       padding-top: 16px;
       .stat { 
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px; border-radius: 10px;
          .s-lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .s-val { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 800; color: #1e293b; 
                   mat-icon { font-size: 18px; width: 18px; height: 18px; color: #475569; } }
       }
    }
    
    .hours-badge { 
      padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
      &.recent { background: #dcfce7; color: #166534; }
      &.old { background: #fee2e2; color: #991b1b; }
    }

    .empty-state {
        padding: 64px; text-align: center; color: #64748b; background: white; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        margin-top: 24px;
        mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.3; color: #3b82f6; }
        h3 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
    }
  `]
})
export class MachineLiveReportingComponent implements OnInit {
  private service = inject(MachineLiveReportService);
  private firmService = inject(FirmService);
  private dialog = inject(MatDialog);
  private host = inject(ElementRef<HTMLElement>);

  @ViewChild('reportSourceSelect') private reportSourceSelect?: MatSelect;
  
  reports = signal<MachineLiveReportDto[]>([]);
  isLoading = signal(false);
  isFiltersOpen = false;
  
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  imeiFilter = '';
  cnicFilter = '';
  phoneFilter = '';
  firmFilter = '';
  firms = signal<Firm[]>([]);
  /** Digits only; empty = no server filter. */
  batchNumberFilter = '';
  intBatFilter: number | null = null;
  extBatFilter: number | null = null;
  /** Default Only GPS. Both Only GPS + Only GSM → backend BOTH (lat/lng not null and non-zero, timestamp order). */
  reportSourceModes: string[] = ['GPS'];
  timeframeFilter: number | null = null;

  /** Date + time share one model per field (Material datepicker + timepicker pattern). */
  gpsTimestampFrom: Date | null = null;
  gpsTimestampTo: Date | null = null;
  serverInsertionFrom: Date | null = null;
  serverInsertionTo: Date | null = null;
  sortByField: 'DEFAULT' | 'GPS_TIMESTAMP' | 'SERVER_INSERTION' = 'DEFAULT';
  sortDirection: 'ASC' | 'DESC' = 'DESC';

  exportToExcel() {
    if (this.reports().length === 0) return;

    const dataToExport = this.reports().map(item => ({
      'Farmer Name': item.farmerName || 'N/A',
      'Farmer CNIC': item.cnic || 'N/A',
      'Farmer Mobile Number': item.farmerPhone || 'N/A',
      'Firm Name': item.firmName || 'N/A',
      'IMEI': item.imei || 'N/A',
      'Tracker Phone': item.deviceMobileNumber || 'N/A',
      'Last Sent (Hours)': item.totalHoursFromNow != null ? Number(item.totalHoursFromNow.toFixed(2)) : 'N/A',
      'GPS Date': item.lastRecordTimeStamp ? new Date(item.lastRecordTimeStamp).toLocaleString() : 'N/A',
      'Insertion Date': item.insertionDate ? new Date(item.insertionDate).toLocaleString() : 'N/A',
      'Battery External (%)': item.externalBatteryPercentage != null ? item.externalBatteryPercentage : 'N/A',
      'External Voltage (V)': item.externalVoltageMv != null ? Number((item.externalVoltageMv / 1000).toFixed(2)) : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Live Reporting');

    // Auto-size columns slightly
    const wscols = [
      { wch: 25 }, // Farmer Name
      { wch: 20 }, // Farmer CNIC
      { wch: 20 }, // Farmer Mobile Number
      { wch: 25 }, // Firm Name
      { wch: 20 }, // IMEI
      { wch: 20 }, // Tracker Phone
      { wch: 18 }, // Last Sent (Hours)
      { wch: 25 }, // GPS Date
      { wch: 25 }, // Insertion Date
      { wch: 20 }, // Battery External (%)
      { wch: 20 }  // External Voltage (V)
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Machines_Live_Reporting_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  ngOnInit() {
    this.loadReports();
    this.loadFirms();
  }

  loadFirms() {
    this.firmService.getFirmsList().subscribe(data => this.firms.set(data));
  }

  /** 1-based index across pages (first item on page 2 with pageSize 10 is 11). */
  tileOrdinal(index: number): number {
    return this.pageIndex() * this.pageSize() + index + 1;
  }

  formatTimeAgo(item: MachineLiveReportDto): string {
    if (item.totalHoursFromNow === null || item.totalHoursFromNow === undefined) return 'N/A';
    
    if (item.totalHoursFromNow >= 1) {
      return `${Math.floor(item.totalHoursFromNow)} hrs ago`;
    }
    
    // For fractional hours less than 1, calculate absolute minutes
    if (item.lastRecordTimeStamp) {
      const now = new Date();
      const lastTs = new Date(item.lastRecordTimeStamp);
      const diffMs = now.getTime() - lastTs.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins <= 0) return 'Just now';
      return `${diffMins} mins ago`;
    }

    const calculatedMins = Math.round(item.totalHoursFromNow * 60);
    if (calculatedMins <= 0) return 'Just now';
    return `${calculatedMins} mins ago`;
  }

  /** Apply filters: reset to first page and fetch (used by Search and Clear filters). */
  searchReports() {
    this.pageIndex.set(0);
    this.loadReports();
    this.isFiltersOpen = false;
  }

  onReportSourceModesChange() {
    if (!this.reportSourceModes?.length) {
      this.reportSourceModes = ['GPS'];
    }
    queueMicrotask(() => this.reportSourceSelect?.close());
  }

  resetFilters() {
    this.imeiFilter = '';
    this.cnicFilter = '';
    this.phoneFilter = '';
    this.firmFilter = '';
    this.batchNumberFilter = '';
    this.intBatFilter = null;
    this.extBatFilter = null;
    this.reportSourceModes = ['GPS'];
    this.timeframeFilter = null;
    this.gpsTimestampFrom = null;
    this.gpsTimestampTo = null;
    this.serverInsertionFrom = null;
    this.serverInsertionTo = null;
    this.sortByField = 'DEFAULT';
    this.sortDirection = 'DESC';
    this.searchReports();
  }

  /** Backend expects ISO-LOCAL with seconds (yyyy-MM-dd'T'HH:mm:ss). */
  private dateToLocalIsoParam(value: Date | null): string | undefined {
    if (!value || !(value instanceof Date) || isNaN(value.getTime())) {
      return undefined;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
  }

  loadReports() {
    this.isLoading.set(true);
    const batchTrimmed = this.batchNumberFilter?.trim() ?? '';
    const batchParsed =
      batchTrimmed && /^\d+$/.test(batchTrimmed) ? parseInt(batchTrimmed, 10) : undefined;

    const filters = {
      imei: (this.imeiFilter ?? '').trim(),
      cnic: (this.cnicFilter ?? '').trim(),
      farmerPhone: (this.phoneFilter ?? '').trim(),
      firmName: (this.firmFilter ?? '').trim(),
      batchNumber: batchParsed,
      intBatThreshold: this.intBatFilter,
      extVoltThreshold: this.extBatFilter,
      reportSourceModes: this.reportSourceModes?.length ? [...this.reportSourceModes] : ['GPS'],
      sortBy: this.sortByField,
      sortDirection: this.sortDirection,
      gpsTimestampFrom: this.dateToLocalIsoParam(this.gpsTimestampFrom),
      gpsTimestampTo: this.dateToLocalIsoParam(this.gpsTimestampTo),
      serverInsertionFrom: this.dateToLocalIsoParam(this.serverInsertionFrom),
      serverInsertionTo: this.dateToLocalIsoParam(this.serverInsertionTo),
      timeframeHours: this.timeframeFilter
    };

    this.service.getLiveReports(this.pageIndex(), this.pageSize(), filters).subscribe({
      next: (data) => {
        const enriched = data.content.map(item => {
           item.resolvedAddress = item.currentLocationAddress || 'Unknown';
           if (!item.currentLocationAddress && item.latitude && item.longitude) {
               item.resolvedAddress = 'Resolving location...';
               this.reverseGeocode(item);
           }
           return item;
        });
        this.reports.set(enriched);
        this.totalElements.set(data.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading machine reports:', err);
        this.isLoading.set(false);
      }
    });
  }

  private reverseGeocode(item: MachineLiveReportDto) {
    if(!item.latitude || !item.longitude) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.latitude}&lon=${item.longitude}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.display_name) {
           item.resolvedAddress = data.display_name;
        } else {
           item.resolvedAddress = `Lat: ${item.latitude}, Lng: ${item.longitude}`;
        }
        this.reports.set([...this.reports()]);
      })
      .catch(() => {
        item.resolvedAddress = `Lat: ${item.latitude}, Lng: ${item.longitude}`;
        this.reports.set([...this.reports()]);
      });
  }

  handlePageEvent(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.scrollMainContentToTop();
    this.loadReports();
  }

  /** Portal layout scrolls `.content-area`, not the window. */
  private scrollMainContentToTop(): void {
    const scrollParent = this.host.nativeElement.closest('.content-area');
    if (scrollParent instanceof HTMLElement) {
      scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openJourneyDialog(item: MachineLiveReportDto) {
    this.dialog.open(MapJourneyDialogComponent, {
      data: {
        imei: item.imei,
        farmerName: item.farmerName?.trim() || undefined,
        cnic: item.cnic?.trim() || undefined
      },
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      panelClass: 'fullscreen-dialog',
      disableClose: true
    });
  }

  openGoogleMap(lat?: number, lng?: number) {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  }
}
