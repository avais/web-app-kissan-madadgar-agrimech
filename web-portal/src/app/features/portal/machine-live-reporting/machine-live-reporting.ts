import { Component, OnInit, inject, signal } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MachineLiveReportService, MachineLiveReportDto } from '../../../core/services/machine-live-report.service';
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
           <button mat-flat-button color="primary" class="refresh-btn" (click)="loadReports()">
             <mat-icon>refresh</mat-icon> Refresh
           </button>
        </div>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-item">
          <mat-label>Search IMEI</mat-label>
          <input matInput [(ngModel)]="imeiFilter" (ngModelChange)="onFilterChange()" placeholder="Enter IMEI...">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-item">
          <mat-label>Farmer CNIC</mat-label>
          <input matInput [(ngModel)]="cnicFilter" (ngModelChange)="onFilterChange()" placeholder="Enter CNIC...">
          <mat-icon matPrefix>person_search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-item">
          <mat-label>Internal Battery</mat-label>
          <mat-select [(ngModel)]="intBatFilter" (selectionChange)="onFilterChange()">
            <mat-option [value]="null">All Levels</mat-option>
            <mat-option [value]="20">Low (< 20%)</mat-option>
            <mat-option [value]="50">Medium (< 50%)</mat-option>
          </mat-select>
          <mat-icon matPrefix>battery_alert</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-item">
          <mat-label>External Battery</mat-label>
          <mat-select [(ngModel)]="extBatFilter" (selectionChange)="onFilterChange()">
            <mat-option [value]="null">All Levels</mat-option>
            <mat-option [value]="10500">Critical (< 10.5V)</mat-option>
            <mat-option [value]="11000">Very Low (< 11.0V)</mat-option>
            <mat-option [value]="11500">Low (< 11.5V)</mat-option>
            <mat-option [value]="12000">Medium (< 12.0V)</mat-option>
            <mat-option [value]="12500">Good (< 12.5V)</mat-option>
          </mat-select>
          <mat-icon matPrefix>electrical_services</mat-icon>
        </mat-form-field>
        
        <button mat-stroked-button class="reset-btn" (click)="resetFilters()">
          Clear Filters
        </button>
      </div>

      <div class="cards-grid" *ngIf="reports().length > 0">
        <mat-card class="machine-card" *ngFor="let item of reports()">
          <div class="card-header">
            <div class="hero">
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
              <button mat-flat-button color="accent" class="journey-btn-small" (click)="openJourneyDialog(item.imei)" [disabled]="!item.lastRecordTimeStamp">
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
              <span class="lbl">Last Report</span>
              <span class="val">{{item.lastRecordTimeStamp ? (item.lastRecordTimeStamp | date:'medium') : 'N/A'}}</span>
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
    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px);
      z-index: 100; display: flex; align-items: center; justify-content: center;
      border-radius: 20px;
      .loader-container {
        display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
        .loader-text {
          h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
          p { color: #64748b; font-size: 14px; margin: 4px 0 0; }
        }
      }
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .title-section { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
      .refresh-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #4CAF50 !important; color: white; }
    }
    .filter-bar {
       display: flex; flex-wrap: wrap; gap: 16px; background: white; padding: 20px; border-radius: 20px;
       box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(226,232,240,0.8);
       align-items: center;
       .filter-item { flex: 1; min-width: 200px; }
       ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
       .reset-btn { height: 56px; border-radius: 12px; color: #64748b; border-color: #e2e8f0; }
    }
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
          display: flex; justify-content: flex-start; align-items: center; gap: 12px;
          .lbl { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; width: 85px; text-align: left; }
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
  private dialog = inject(MatDialog);
  
  reports = signal<MachineLiveReportDto[]>([]);
  isLoading = signal(false);
  
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  imeiFilter = '';
  cnicFilter = '';
  intBatFilter: number | null = null;
  extBatFilter: number | null = null;

  ngOnInit() {
    this.loadReports();
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

  onFilterChange() {
    this.pageIndex.set(0);
    this.loadReports();
  }

  resetFilters() {
    this.imeiFilter = '';
    this.cnicFilter = '';
    this.intBatFilter = null;
    this.extBatFilter = null;
    this.onFilterChange();
  }

  loadReports() {
    this.isLoading.set(true);
    const filters = {
      imei: this.imeiFilter,
      cnic: this.cnicFilter,
      intBatThreshold: this.intBatFilter,
      extVoltThreshold: this.extBatFilter
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
    this.loadReports();
  }

  openJourneyDialog(imei: string) {
    this.dialog.open(MapJourneyDialogComponent, {
      data: { imei: imei },
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
