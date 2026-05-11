import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import * as XLSX from 'xlsx';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { FarmerApplicationService, FarmerApplicationPayload, PagedResponse } from '../../../core/services/farmer-application.service';
import { FirmService } from '../../../core/services/firm.service';
import { Firm } from '../../../core/models/firm.model';
import { AuthService } from '../../../core/services/auth.service';
import { DivisionService, Division } from '../../../core/services/division.service';
import { DistrictService, District } from '../../../core/services/district.service';
import { RegionService, Region } from '../../../core/services/region.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, timer } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-manage-farmer-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule,
    FormsModule,
    MatTooltipModule,
    MatDialogModule,
    ConfirmationDialogComponent
  ],
  template: `
    <div class="page-container">
      <div class="premium-processing-overlay" *ngIf="isProcessing()">
        <div class="processing-card">
          <div class="processing-header">
            <div class="header-icon">
              <mat-icon>terminal</mat-icon>
              <div class="header-ring"></div>
            </div>
            <h2>Processing Bulk Subsidy Request</h2>
            <p>Please wait while we prepare documentation and finalize records</p>
          </div>

          <div class="progress-area">
            <div class="progress-details">
              <span>Request Lifecycle Progress</span>
              <span class="pct">{{ loadingProgress() }}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width.%]="loadingProgress()">
                <div class="progress-bar-shine"></div>
              </div>
            </div>
          </div>

          <div class="steps-flow">
            <div class="step-line-item" *ngFor="let step of loadingSteps; let i = index" 
                 [class.active]="i === currentStep()" 
                 [class.completed]="i < currentStep()">
              <div class="step-icon-wrap">
                <mat-icon *ngIf="i < currentStep()">check_circle</mat-icon>
                <div class="step-dot-point" *ngIf="i >= currentStep()"></div>
                <div class="step-connector" *ngIf="i < loadingSteps.length - 1"></div>
              </div>
              <span class="step-label-text">{{ step }}</span>
            </div>
          </div>

          <div class="processing-footer">
            <div class="live-pulse"></div>
            <span>System is executing your request pipeline...</span>
          </div>
        </div>
      </div>

      <div class="loading-overlay" *ngIf="isExporting()" role="alertdialog" aria-busy="true" aria-label="Export in progress">
        <mat-spinner diameter="50" color="primary"></mat-spinner>
        <div class="l-text">Preparing Excel export…</div>
        <div class="l-sub">Fetching all rows for your current filters. Please wait.</div>
      </div>

      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-badge" *ngIf="!isConvenerUser()">ADMINISTRATION PORTAL</div>
          <div class="title-badge convener-badge" *ngIf="isConvenerUser()">CONVENER OVERSIGHT</div>
          <h1 *ngIf="!isConvenerUser()">Farmer Applications</h1>
          <h1 *ngIf="isConvenerUser()">Supervised applications</h1>
          <p *ngIf="!isConvenerUser()">Orchestrate and monitor the agricultural implement lifecycle across all districts.</p>
          <p *ngIf="isConvenerUser()">Quality inspection and delivery pipeline for firms where you are the assigned convener.</p>
        </div>
        <div class="header-actions">
          <button *ngIf="hasRegisterFeature()" mat-flat-button class="premium-btn primary" routerLink="/portal/applications/register">
            <mat-icon>add_task</mat-icon> New Application
          </button>
          <button *ngIf="hasQicStartFeature()" mat-flat-button class="premium-btn primary qic-btn" routerLink="/portal/quality-inspection/initiate">
            <mat-icon>assignment_turned_in</mat-icon> Request Quality Inspection
          </button>
          <button *ngIf="hasSubsidyRequestFeature()" mat-flat-button 
                  class="premium-btn primary subsidy-btn" 
                  (click)="onRequestFarmerShareRelease()" 
                  [disabled]="dicApprovedCount() === 0"
                  [matTooltip]="subsidyTooltip()"
                  matTooltipPosition="above">
            <mat-icon>payments</mat-icon> 
            <span class="btn-text">Request Farmer Share Release</span>
            <span class="premium-badge pulse" *ngIf="dicApprovedCount() > 0">{{dicApprovedCount()}}</span>
          </button>
        </div>
      </div>

      <!-- Super Admin Executive KPIs -->
      <div class="super-admin-kpi-wrap" *ngIf="isSuperAdmin()">
        <div class="super-admin-kpi-header">
          <div class="kpi-header-copy">
            <div class="eyebrow">Super Admin Overview</div>
            <div class="kpi-title-row">
              <h3>Executive Dashboard</h3>
              <button
                mat-icon-button
                type="button"
                class="kpi-refresh-btn"
                title="Refresh dashboard"
                (click)="refreshExecutiveDashboard()"
                [disabled]="isStatsLoading()"
              >
                <mat-icon [class.kpi-refresh-spinning]="isStatsLoading()">refresh</mat-icon>
              </button>
            </div>
            <p>Live consolidated metrics across applications, inspections, organizations and tracker integration.</p>
          </div>
          <div class="kpi-top-filters">
            <mat-form-field appearance="outline" class="status-select geo-multi">
              <mat-label>Firms</mat-label>
              <mat-select
                multiple
                [value]="selectedFirmIds()"
                (selectionChange)="onSuperAdminFirmsChange($event.value)"
                panelClass="super-admin-firms-select-panel"
                panelWidth="min(520px, 92vw)"
                (openedChange)="onSuperAdminFirmsPanelOpenedChange($event)"
              >
                <mat-option
                  class="super-admin-firms-search-option"
                  [value]="firmSearchRowValue"
                  (mousedown)="$event.stopPropagation()"
                  (click)="$event.stopPropagation()"
                >
                  <input
                    type="text"
                    class="super-admin-firms-search-input"
                    placeholder="Search firms..."
                    [value]="firmSearchText()"
                    (input)="onFirmSearchInput($event)"
                    (click)="$event.stopPropagation()"
                    (mousedown)="$event.stopPropagation()"
                    (keydown)="onFirmSearchKeydown($event)"
                  />
                </mat-option>
                <mat-option *ngFor="let f of filteredFirms()" [value]="f.id">{{ f.name }}</mat-option>
                <mat-option *ngIf="firms().length && !filteredFirms().length" disabled class="super-admin-firms-empty-option">
                  No matching firms
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="status-select geo-multi">
              <mat-label>Region</mat-label>
              <mat-select multiple [value]="selectedRegionIds()" (selectionChange)="onSuperAdminRegionsChange($event.value)">
                <mat-option *ngFor="let region of regions()" [value]="region.id">{{region.name}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="status-select geo-multi">
              <mat-label>Division</mat-label>
              <mat-select multiple [value]="selectedDivisionIds()" (selectionChange)="onSuperAdminDivisionsChange($event.value)">
                <mat-option *ngFor="let div of superAdminDivisions()" [value]="div.id">{{div.name}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="status-select geo-multi">
              <mat-label>District</mat-label>
              <mat-select multiple [value]="selectedDistrictIds()" (selectionChange)="onSuperAdminDistrictsChange($event.value)">
                <mat-option *ngFor="let dist of superAdminDistricts()" [value]="dist.id">{{dist.name}}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="super-admin-kpi-grid">
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">description</mat-icon>
            <div class="kpi-icon total"><mat-icon>description</mat-icon></div>
            <div class="kpi-meta">
              <label>Total Applications</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().total | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">shopping_bag</mat-icon>
            <div class="kpi-icon booked"><mat-icon>shopping_bag</mat-icon></div>
            <div class="kpi-meta">
              <label>Total Booked</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().booked | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">pending_actions</mat-icon>
            <div class="kpi-icon qic-pending"><mat-icon>pending_actions</mat-icon></div>
            <div class="kpi-meta">
              <label>Total QIC Requested</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().qicPending | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">verified</mat-icon>
            <div class="kpi-icon qic-completed"><mat-icon>verified</mat-icon></div>
            <div class="kpi-meta">
              <label>Total QIC Completed</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().qicCompleted | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">hourglass_top</mat-icon>
            <div class="kpi-icon dic-pending"><mat-icon>hourglass_top</mat-icon></div>
            <div class="kpi-meta">
              <label>Total DIC Pending</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().dicPending | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">sync</mat-icon>
            <div class="kpi-icon dic-in-progress"><mat-icon>sync</mat-icon></div>
            <div class="kpi-meta">
              <label>Total DIC In Progress</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().dicInProgress | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">fact_check</mat-icon>
            <div class="kpi-icon dic-completed"><mat-icon>fact_check</mat-icon></div>
            <div class="kpi-meta">
              <label>Total DIC Completed</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().dicCompleted | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">apartment</mat-icon>
            <div class="kpi-icon firms"><mat-icon>apartment</mat-icon></div>
            <div class="kpi-meta">
              <label>Total Firms Registered</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().totalFirmsRegistered | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card" [class.loading]="isStatsLoading()">
            <mat-icon class="kpi-watermark">precision_manufacturing</mat-icon>
            <div class="kpi-icon tracker"><mat-icon>precision_manufacturing</mat-icon></div>
            <div class="kpi-meta">
              <label>Total Farmer Machines Tracker Integrated</label>
              <div class="kpi-value" *ngIf="!isStatsLoading()">{{displayedStats().trackerIntegrated | number}}</div>
              <div class="super-loader" *ngIf="isStatsLoading()">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
              <div class="super-loader-bar" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="super-kpi-card">
            <mat-icon class="kpi-watermark">landscape</mat-icon>
            <div class="kpi-icon area"><mat-icon>landscape</mat-icon></div>
            <div class="kpi-meta">
              <label>Total Farming Area Cultivated</label>
              <div class="kpi-value kpi-placeholder">Coming soon</div>
            </div>
          </div>
          <div class="super-kpi-card">
            <mat-icon class="kpi-watermark">schedule</mat-icon>
            <div class="kpi-icon hours"><mat-icon>schedule</mat-icon></div>
            <div class="kpi-meta">
              <label>Farmer Machines Tracking Hours</label>
              <div class="kpi-value kpi-placeholder">Coming soon</div>
            </div>
          </div>
          <div class="super-kpi-card">
            <mat-icon class="kpi-watermark">payments</mat-icon>
            <div class="kpi-icon subsidy"><mat-icon>payments</mat-icon></div>
            <div class="kpi-meta">
              <label>Subsidy Paid</label>
              <div class="kpi-value kpi-placeholder">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Convener: glass KPI row (aligned with convener-dashboard semantics, light theme) -->
      <div class="convener-kpi-section" *ngIf="isConvenerUser()">
        <div class="convener-kpi-intro">
          <mat-icon class="intro-icon">verified_user</mat-icon>
          <div>
            <h3>Supervised firm pipeline</h3>
            <p>Counts include only applications booked under your assigned firms. QIC requests are firm submissions in <strong>QIC requested</strong> status.</p>
          </div>
        </div>
        <div class="stats-grid convener-kpi-grid">
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">Supervised total</span>
            <div class="stat-content">
              <div class="stat-icon-mini convener-total"><mat-icon>hub</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().total | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">Booked</span>
            <div class="stat-content">
              <div class="stat-icon-mini booked"><mat-icon>shopping_bag</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().booked | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">QIC Requests</span>
            <div class="stat-content">
              <div class="stat-icon-mini requested"><mat-icon>assignment_turned_in</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().qicInspectionRequests | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">Balloted</span>
            <div class="stat-content">
              <div class="stat-icon-mini convener-ballot"><mat-icon>how_to_reg</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().balloted | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">DIC pending</span>
            <div class="stat-content">
              <div class="stat-icon-mini dic"><mat-icon>pending_actions</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().dicPending | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
          <div class="stat-card glass-morphism convener-stat" [class.loading]="isStatsLoading()">
            <span class="label">Completed</span>
            <div class="stat-content">
              <div class="stat-icon-mini done"><mat-icon>task_alt</mat-icon></div>
              <span class="val" *ngIf="!isStatsLoading()">{{ displayedStats().completed | number }}</span>
              <div class="mini-loader" *ngIf="isStatsLoading()"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid for Admin/Standard Users -->
      <div class="stats-grid" *ngIf="!isFirmUser() && !isDistrictOfficer() && !isSuperAdmin() && !isConvenerUser()">
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon total"><mat-icon>analytics</mat-icon></div>
          <div class="stat-info">
            <label>Total Pipeline</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().total | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon draft"><mat-icon>assignment_turned_in</mat-icon></div>
          <div class="stat-info">
            <label>Eligible Candidates</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().eligible | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon active"><mat-icon>how_to_reg</mat-icon></div>
          <div class="stat-info">
            <label>Successfully Balloted</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().balloted | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card" [class.loading]="isStatsLoading()">
          <div class="stat-icon completed"><mat-icon>task_alt</mat-icon></div>
          <div class="stat-info">
            <label>Fully Completed</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
      </div>

      <!-- Stats Grid for District Officers -->
      <div class="stats-grid district-officer-grid" *ngIf="isDistrictOfficer()">
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon district"><mat-icon>location_on</mat-icon></div>
          <div class="stat-info">
            <label>District Pipeline</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().total | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Applications in your district</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon balloted"><mat-icon>how_to_reg</mat-icon></div>
          <div class="stat-info">
            <label>Balloted</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().balloted | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Success in ballot</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon booked"><mat-icon>shopping_bag</mat-icon></div>
          <div class="stat-info">
            <label>Booked</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().booked | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Firm associations</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon dic-pending"><mat-icon>pending_actions</mat-icon></div>
          <div class="stat-info">
            <label>DIC Pending</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicPending | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Awaiting delivery initiation</div>
        </div>
        <div class="stat-card district-theme" [class.loading]="isStatsLoading()">
          <div class="stat-icon completed"><mat-icon>verified</mat-icon></div>
          <div class="stat-info">
            <label>Verified & Paid</label>
            <div class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed | number}}</div>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
          <div class="stat-footer">Process finalized</div>
        </div>
      </div>

      <!-- Stats Grid for Firm Users -->
      <div class="stats-grid compact-grid" *ngIf="isFirmUser()">
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">Booked</span>
          <div class="stat-content">
            <div class="stat-icon-mini booked"><mat-icon>shopping_bag</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().booked || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">QIC Requested</span>
          <div class="stat-content">
            <div class="stat-icon-mini requested"><mat-icon>drive_folder_upload</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().qicRequested || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">QIC Approved</span>
          <div class="stat-content">
            <div class="stat-icon-mini approved"><mat-icon>verified</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().qicApproved || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">DIC Pending</span>
          <div class="stat-content">
            <div class="stat-icon-mini dic"><mat-icon>pending_actions</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicPending || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">DIC Approved</span>
          <div class="stat-content">
            <div class="stat-icon-mini dicsuccess"><mat-icon>fact_check</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().dicApproved || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
        <div class="stat-card glass-morphism" [class.loading]="isStatsLoading()">
          <span class="label">Completed</span>
          <div class="stat-content">
            <div class="stat-icon-mini done"><mat-icon>task_alt</mat-icon></div>
            <span class="val" *ngIf="!isStatsLoading()">{{displayedStats().completed || 0 | number}}</span>
            <div class="mini-loader" *ngIf="isStatsLoading()"></div>
          </div>
        </div>
      </div>

      <!-- Redesigned Financial Intelligence Section -->
      <div class="financial-showcase" *ngIf="isFirmUser() || isConvenerUser()">
        <div class="showcase-header">
           <mat-icon>payments</mat-icon>
           <span *ngIf="!isConvenerUser()">Financial Intelligence Dashboard</span>
           <span *ngIf="isConvenerUser()">Supervised pipeline value</span>
        </div>
        <div class="financial-grid-modern">
           <!-- Expected Revenue -->
           <div class="premium-finance-card expected" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Total Pipeline Value</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().expectedRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && !isConvenerUser()">Total value of all booked orders</div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && isConvenerUser()">Booked machinery value across your firms</div>
              </div>
           </div>

           <!-- Received Revenue -->
           <div class="premium-finance-card realized" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Revenue Realized</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().receivedRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && !isConvenerUser()">Subsidy & payments settled</div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && isConvenerUser()">Realized on supervised applications</div>
              </div>
           </div>

           <!-- Pending Revenue -->
           <div class="premium-finance-card pending" [class.loading]="isStatsLoading()">
              <div class="wave-bg"></div>
              <div class="card-content">
                <label>Revenue Pipeline</label>
                <div class="main-val" *ngIf="!isStatsLoading()">
                   <span class="currency-label">PKR</span>
                   {{displayedStats().pendingRevenue | number}}
                </div>
                <div class="mini-loader white" *ngIf="isStatsLoading()"></div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && !isConvenerUser()">Current value in verification stages</div>
                <div class="sub-desc" *ngIf="!isStatsLoading() && isConvenerUser()">Still in QIC / DIC flow under your firms</div>
              </div>
           </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filter-toolbar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search by Farmer Name, CNIC or App ID..." (input)="onSearchChange($event)">
        </div>
        <div class="filter-options">
          <mat-form-field appearance="outline" class="status-select">
            <mat-label>Lifecycle Status</mat-label>
            <mat-select (selectionChange)="onStatusChange($event.value)" value="all">
              <mat-option value="all">All Phases</mat-option>
              <mat-option value="ACCEPTED">Accepted</mat-option>
              <mat-option value="ELIGIBLE">Eligible</mat-option>
              <mat-option value="BALLOTED">Balloted</mat-option>
              <mat-option value="ALLOTED">Alloted</mat-option>
              <mat-option value="BOOKED">Booked</mat-option>
              <mat-option value="QIC_PENDING">QIC Pending</mat-option>
              <mat-option value="QIC_REQUESTED">QIC Requested</mat-option>
              <mat-option value="QIC_IN_PROGRESS">QIC In Progress</mat-option>
              <mat-option value="QIC_APPROVED">QIC Approved</mat-option>
              <mat-option value="QIC_DEFFERED">QIC Deferred</mat-option>
              <mat-option value="DIC_PENDING">DIC Pending</mat-option>
              <mat-option value="DIC_IN_PROGRESS">DIC In Progress</mat-option>
              <mat-option value="DIC_APPROVED">DIC Approved</mat-option>
              <mat-option value="DIC_REJECTED">DIC Rejected</mat-option>
               <mat-option value="DIC_DEFFERED">DIC Deferred</mat-option>
              <mat-option value="REQUEST_INVOICE">Request Invoice</mat-option>
              <mat-option value="SUBSIDY_REQUESTED">Subsidy Requested</mat-option>
              <mat-option value="SUBSIDY_PAID">Subsidy Paid</mat-option>
              <mat-option value="COMPLETED">Completed</mat-option>
            </mat-select>
          </mat-form-field>
          <ng-container *ngIf="!isSuperAdmin()">
          <mat-form-field appearance="outline" class="status-select">
            <mat-label>Division</mat-label>
            <mat-select (selectionChange)="onDivisionChange($event.value)" [value]="'all'">
              <mat-option value="all">All Divisions</mat-option>
              <mat-option *ngFor="let div of divisions()" [value]="div.id">{{div.name}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="status-select">
            <mat-label>District</mat-label>
            <mat-select (selectionChange)="onDistrictChange($event.value)" [value]="'all'" [disabled]="!selectedDivision()">
              <mat-option value="all">All Districts</mat-option>
              <mat-option *ngFor="let dist of districts()" [value]="dist.id">{{dist.name}}</mat-option>
            </mat-select>
          </mat-form-field>
          </ng-container>
          <button
            mat-flat-button
            type="button"
            class="export-filtered-btn"
            (click)="exportFilteredToExcel()"
            [disabled]="isExporting() || totalCount() === 0"
            title="Download all rows matching current filters (same list API as the table)"
          >
            <mat-icon>file_download</mat-icon>
            Export
          </button>
          <button mat-icon-button class="refresh-btn" (click)="loadApplications()" [disabled]="isLoading()">
            <mat-icon [class.rotating]="isLoading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <mat-card class="premium-table-card">
        <mat-progress-bar mode="indeterminate" *ngIf="isLoading()" color="accent"></mat-progress-bar>
        
        <div class="table-scroll-wrap">
        <table mat-table [dataSource]="applications()" class="farmer-apps-table" [fixedLayout]="true">
          <!-- Farmer Column -->
          <ng-container matColumnDef="farmer">
            <th mat-header-cell *matHeaderCellDef> Applicant Details </th>
            <td mat-cell *matCellDef="let app">
              <div class="farmer-cell">
                <div class="avatar-orb">{{app.farmerName.charAt(0)}}</div>
                <div class="info">
                   <!-- Farmer Name -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'farmerName'">
                      <div class="name">{{app.farmerName}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'farmerName')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'farmerName'">
                      <input type="text" [(ngModel)]="editModel.farmerName" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>

                   <!-- Father Name (Optional Display) -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'fatherName'">
                      <div class="father-name" *ngIf="app.fatherName">S/O {{app.fatherName}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'fatherName')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'fatherName'">
                      <input type="text" [(ngModel)]="editModel.fatherName" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>

                   <!-- CNIC -->
                   <div class="val-group" *ngIf="editingId() !== app.id || editingField() !== 'cnic'">
                      <div class="cnic">{{app.cnic}}</div>
                      <button mat-icon-button class="inline-edit-btn" *ngIf="hasEditFeature()" (click)="startEdit(app, 'cnic')">
                         <mat-icon>edit</mat-icon>
                      </button>
                   </div>
                   <div class="inline-edit-box" *ngIf="editingId() === app.id && editingField() === 'cnic'">
                      <input type="text" [(ngModel)]="editModel.cnic" class="premium-input-tiny" (keyup.enter)="saveEdit(app)" (keyup.escape)="cancelEdit()">
                      <div class="edit-btns">
                         <button mat-icon-button (click)="saveEdit(app)" color="primary"><mat-icon>check</mat-icon></button>
                         <button mat-icon-button (click)="cancelEdit()" color="warn"><mat-icon>close</mat-icon></button>
                      </div>
                   </div>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- District / Division (stacked: label + district bold + division caps) -->
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef> District </th>
            <td mat-cell *matCellDef="let app">
              <div class="district-division-cell" [title]="locationTooltip(app)">
                <div class="dd-district">{{ (app.districtName || '').trim() || '—' }}</div>
                <div class="dd-division" *ngIf="(app.divisionName || '').trim()">{{ ((app.divisionName || '').trim()) | uppercase }}</div>
              </div>
            </td>
          </ng-container>

          <!-- Unique Implement ID Column -->
          <ng-container matColumnDef="uniqueImplementId">
            <th mat-header-cell *matHeaderCellDef> Asset ID </th>
            <td mat-cell *matCellDef="let app">
              <span class="unique-id-cell">{{app.uniqueImplementId || 'Pending'}}</span>
            </td>
          </ng-container>

          <!-- App ID & Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Application Ref </th>
            <td mat-cell *matCellDef="let app">
              <div class="ref-cell">
                <div class="app-id">{{app.applicationNumber}}</div>
                <div class="date">{{app.createdAt | date:'mediumDate'}}</div>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Pipeline Status </th>
            <td mat-cell *matCellDef="let app">
              <div class="status-cell">
                <div class="status-badge" [attr.data-status]="app.status">
                  <div class="dot"></div>
                  <span>{{ statusDisplayLabel(app.status) }}</span>
                </div>
                <div class="firm-name-subline" *ngIf="app.bookedByFirmName">
                  {{ app.bookedByFirmName }}
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Control </th>
            <td mat-cell *matCellDef="let app">
              <div class="action-stack">
                <button mat-stroked-button class="review-action-btn" [routerLink]="['details', app.id]">
                  <span>View</span>
                  <mat-icon class="view-link-icon">open_in_new</mat-icon>
                </button>
                <button *ngIf="hasBookingFeature() && app.status === 'ALLOTED'" 
                        mat-flat-button class="quick-book-btn" 
                        [routerLink]="['details', app.id]">
                  <mat-icon>bookmark_add</mat-icon>
                  <span>Book Now</span>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="premium-row"></tr>
        </table>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading() && applications().length === 0">
          <mat-icon>manage_search</mat-icon>
          <h3>No applications found</h3>
          <p>Refine your search or status filters to locate records.</p>
        </div>

        <mat-paginator [length]="totalCount()"
                       [pageSize]="pageSize()"
                       [pageSizeOptions]="[5, 10, 25, 100]"
                       (page)="onPageChange($event)"
                       aria-label="Select page">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: exportOverlayFadeIn 0.35s ease forwards;
      pointer-events: auto;
      box-sizing: border-box;
      padding: 24px;
    }
    .loading-overlay .l-text {
      margin-top: 24px;
      font-weight: 800;
      color: #1e293b;
      font-size: 16px;
      letter-spacing: -0.02em;
      text-align: center;
    }
    .loading-overlay .l-sub {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      max-width: 320px;
      text-align: center;
      line-height: 1.45;
    }
    @keyframes exportOverlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .page-container { 
      padding: 32px 16px; 
      background: #fdfbf7; /* Matching the Premium Beige Theme */
      min-height: calc(100vh - 80px);
      display: flex; flex-direction: column; gap: 32px;
      max-width: 100%;
      box-sizing: border-box;
    }

    /* Header Styling */
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      .title-badge { font-size: 10px; font-weight: 800; color: #10b981; letter-spacing: 1px; margin-bottom: 8px; }
      h1 { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; }
      p { color: #64748b; font-size: 15px; margin-top: 8px; max-width: 500px; }
    }

    .header-actions { display: flex; gap: 16px; align-items: center; }
    .premium-btn {
      height: 48px; border-radius: 16px; padding: 0 24px; font-weight: 800; font-size: 14px; position: relative;
      mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 10px; }
      &.primary { background: #10b981 !important; color: white !important; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4); }
      &.qic-btn { background: #4f46e5 !important; color: white !important; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4); }
      &.subsidy-btn { 
        padding: 0 32px 0 24px !important;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; 
        color: white !important; 
        box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5) !important;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        &:hover:not([disabled]) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 15px 30px -8px rgba(16, 185, 129, 0.6) !important;
          .premium-badge { transform: scale(1.2) rotate(10deg); }
        }
        &[disabled] { filter: grayscale(0.8); opacity: 0.6; }
      }
      &.secondary { background: white; color: #64748b; border: 1.5px solid #e2e8f0 !important; }
    }

    .premium-badge {
      position: absolute;
      top: -25px;
      right: -25px;
      background: #ef4444;
      color: white;
      min-width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4);
      border: 2px solid white;
      transition: all 0.3s ease;
      z-index: 10;

      &.pulse {
        animation: badgePulse 2s infinite;
      }
    }

    @keyframes badgePulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Super Admin KPI Section */
    .super-admin-kpi-wrap {
      background: linear-gradient(180deg, #ffffff 0%, #fcfffe 100%);
      border: 1px solid #e6f5ee;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 10px 30px -16px rgba(15, 23, 42, 0.18);
    }
    .super-admin-kpi-header {
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      .kpi-header-copy { flex: 1; min-width: 260px; }
      .kpi-title-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 4px 0 0;
        h3 { margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; }
      }
      .kpi-refresh-btn {
        color: #0f766e;
        margin-top: 2px;
        &:hover:not([disabled]) { background: rgba(15, 118, 110, 0.08); }
        &[disabled] { opacity: 0.55; }
      }
      .kpi-refresh-spinning {
        animation: kpiRefreshSpin 0.9s linear infinite;
      }
      @keyframes kpiRefreshSpin {
        to { transform: rotate(360deg); }
      }
      .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: #0f766e; }
      h3 { margin: 4px 0; font-size: 24px; font-weight: 900; color: #0f172a; }
      p { margin: 0; color: #64748b; font-size: 13px; font-weight: 500; }
    }
    .kpi-top-filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
      .geo-multi { width: 170px; }
    }

    /* Firms select: wider dropdown panel only (panelClass on mat-mdc-select-panel); trigger stays .geo-multi */
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel {
      min-width: min(520px, 92vw) !important;
      max-width: min(560px, 94vw);
      box-sizing: border-box;
    }
    /* Multiple mat-select adds a leading pseudo-checkbox; hide it on the search row so the input spans the panel */
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .mat-mdc-option.super-admin-firms-search-option .mat-mdc-option-pseudo-checkbox {
      display: none !important;
      width: 0 !important;
      margin: 0 !important;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .mat-mdc-option.super-admin-firms-search-option {
      cursor: text;
      min-height: 52px;
      padding: 10px 14px !important;
      overflow: visible !important;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .mat-mdc-option.super-admin-firms-search-option .mdc-list-item__primary-text {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      display: block !important;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .super-admin-firms-search-input {
      display: block;
      width: 100% !important;
      min-width: 0;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      outline: none;
      background: #f8fafc;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .super-admin-firms-search-input::placeholder {
      color: #94a3b8;
      font-weight: 500;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .super-admin-firms-search-input:focus {
      border-color: #10b981;
      background: #fff;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .mat-mdc-option:not(.super-admin-firms-search-option) .mdc-list-item__primary-text {
      white-space: normal;
      line-height: 1.35;
    }
    :host ::ng-deep .mat-mdc-select-panel.super-admin-firms-select-panel .mat-mdc-option.super-admin-firms-empty-option {
      opacity: 0.75 !important;
      font-size: 13px;
      font-style: italic;
    }
    .super-admin-kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }
    .super-kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #ffffff;
      min-height: 88px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: all 0.25s ease;
      &.loading { pointer-events: none; opacity: 0.85; }
      &:hover { transform: translateY(-2px); border-color: #c7f2df; box-shadow: 0 10px 20px -16px rgba(2, 132, 199, 0.45); }
    }
    .kpi-watermark {
      position: absolute;
      right: 10px;
      top: 8px;
      font-size: 52px;
      width: 52px;
      height: 52px;
      color: #94a3b8;
      opacity: 0.06;
      pointer-events: none;
      transform: rotate(-8deg);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    .super-kpi-card:hover .kpi-watermark {
      transform: rotate(-6deg) scale(1.03);
      opacity: 0.1;
    }
    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &.total { background: #ecfeff; color: #0e7490; }
      &.booked { background: #fff7ed; color: #c2410c; }
      &.qic-pending { background: #fefce8; color: #a16207; }
      &.qic-completed { background: #ecfdf5; color: #15803d; }
      &.dic-pending { background: #fef2f2; color: #b91c1c; }
      &.dic-in-progress { background: #eff6ff; color: #2563eb; }
      &.dic-completed { background: #eef2ff; color: #4338ca; }
      &.firms { background: #f0f9ff; color: #0369a1; }
      &.tracker { background: #ecfccb; color: #3f6212; }
      &.area { background: #ecfdf5; color: #166534; }
      &.hours { background: #eef2ff; color: #3730a3; }
      &.subsidy { background: #fef3c7; color: #92400e; }
    }
    .kpi-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      label { font-size: 11px; font-weight: 800; color: #64748b; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.45px; }
      .kpi-value { font-size: 20px; line-height: 1.1; font-weight: 800; color: #0f172a; }
      .kpi-value.kpi-placeholder { font-size: 16px; font-weight: 700; color: #94a3b8; letter-spacing: 0.02em; }
    }
    .super-loader {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 20px;
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        animation: superDotPulse 1.1s infinite ease-in-out;
      }
      .dot:nth-child(2) { animation-delay: 0.16s; }
      .dot:nth-child(3) { animation-delay: 0.32s; }
    }
    .super-loader-bar {
      width: 76px;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
      background-size: 180% 100%;
      animation: superShimmer 1.3s linear infinite;
    }
    @keyframes superDotPulse {
      0%, 80%, 100% { transform: scale(0.75); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes superShimmer {
      from { background-position: 180% 0; }
      to { background-position: -180% 0; }
    }
    @media (max-width: 1500px) {
      .super-admin-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 1200px) {
      .super-admin-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .super-admin-kpi-header { flex-direction: column; align-items: stretch; }
      .kpi-top-filters { justify-content: flex-start; }
    }

    /* Stats Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .compact-grid { grid-template-columns: repeat(6, 1fr); gap: 16px; }

    .title-badge.convener-badge { color: #4f46e5; }
    .convener-kpi-section {
      display: flex; flex-direction: column; gap: 20px;
      padding: 24px; border-radius: 28px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, rgba(16, 185, 129, 0.06) 100%);
      border: 1px solid rgba(99, 102, 241, 0.14);
      box-shadow: 0 14px 44px -22px rgba(79, 70, 229, 0.35);
    }
    .convener-kpi-intro {
      display: flex; align-items: flex-start; gap: 16px;
      .intro-icon {
        flex-shrink: 0; width: 28px; height: 28px; font-size: 28px;
        padding: 12px; border-radius: 16px;
        color: #4338ca;
        background: rgba(99, 102, 241, 0.14);
        box-sizing: content-box;
      }
      h3 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
      p { margin: 6px 0 0; font-size: 13px; color: #64748b; font-weight: 500; max-width: 560px; line-height: 1.45; }
    }
    .convener-kpi-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }
    @media (max-width: 1400px) {
      .convener-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .convener-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .stat-card.convener-stat {
      border-color: rgba(99, 102, 241, 0.14);
      min-height: 102px;
      &:hover {
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: 0 14px 32px -14px rgba(16, 185, 129, 0.22);
      }
    }
    
    .stat-card {
      background: var(--card-bg); border-radius: 20px; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;
      border: 1px solid var(--border-color); transition: all 0.3s ease;
      position: relative; overflow: hidden; min-height: 110px;
      &:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05); }

      &.glass-morphism { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
      &.loading { pointer-events: none; opacity: 0.8; }

      .label { font-size: 11px; font-weight: 850; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; }

      .stat-content {
        display: flex; align-items: center; gap: 14px;
        .val { font-size: 28px; font-weight: 950; color: #1e293b; line-height: 1; }
      }

      .stat-icon-mini {
        width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
        &.booked { background: #e0f2fe; color: #0369a1; }
        &.pending { background: #fff7ed; color: #c2410c; }
        &.requested { background: #eef2ff; color: #4f46e5; }
        &.approved { background: #f0fdf4; color: #15803d; }
        &.dic { background: #fefce8; color: #a16207; }
        &.dicsuccess { background: #ecfeff; color: #0891b2; }
        &.done { background: #fdf4ff; color: #d946ef; }
        &.convener-total { background: #eef2ff; color: #4338ca; }
        &.convener-ballot { background: #faf5ff; color: #7e22ce; }
      }

      .mini-loader {
        width: 16px; height: 16px; border: 2px solid rgba(16, 185, 129, 0.1); border-top: 2px solid #10b981;
        border-radius: 50%; animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    }

    /* Modern Financial Section */
    .financial-showcase {
      background: var(--card-bg); border-radius: 32px; padding: 24px; border: 1px solid var(--border-color);
      display: flex; flex-direction: column; gap: 20px;
      box-shadow: 0 10px 40px -15px rgba(0,0,0,0.03);
    }
    .showcase-header {
      display: flex; align-items: center; gap: 12px; color: #0f172a;
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: #6366f1; }
      span { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
    }
    .financial-grid-modern { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    
    .premium-finance-card {
      height: 100px; border-radius: 16px; position: relative; overflow: hidden; padding: 14px 20px;
      display: flex; flex-direction: column; justify-content: space-between;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      &:hover { transform: scale(1.02); }

      .card-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; }
      label { font-size: 9px; font-weight: 800; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .main-val { 
          font-size: 22px; font-weight: 900; margin: 0; display: flex; align-items: baseline;
          .currency-label { font-size: 11px; margin-right: 4px; font-weight: 700; opacity: 0.9; }
      }
      .sub-desc { font-size: 9px; font-weight: 600; opacity: 0.7; margin-top: 4px; }

      &.expected { 
          background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.3);
      }
      &.realized { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.3);
      }
      &.pending { 
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;
          box-shadow: 0 20px 40px -10px rgba(245, 158, 11, 0.3);
      }

      .wave-bg {
        position: absolute; bottom: -20px; right: -20px; width: 120px; height: 120px;
        background: rgba(255,255,255,0.1); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        animation: wave 10s infinite linear;
      }
      @keyframes wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    }

    /* Filter Toolbar */
    .filter-toolbar {
      display: flex; justify-content: space-between; align-items: center; background: var(--card-bg);
      padding: 10px 10px 10px 24px; border-radius: 20px; border: 1px solid var(--border-color);
      flex-wrap: wrap; gap: 16px;
    }
    .search-box {
      display: flex; align-items: center; gap: 12px; flex: 1;
      mat-icon { color: #94a3b8; }
      input { border: none; font-size: 14px; font-weight: 600; color: #1e293b; width: 100%; outline: none; }
      input::placeholder { color: #cbd5e1; font-weight: 500; }
    }
    .filter-options { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .export-filtered-btn {
      height: 40px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 13px;
      padding: 0 18px;
      background: #10b981 !important;
      color: #fff !important;
      box-shadow: 0 6px 16px -4px rgba(16, 185, 129, 0.5);
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
        color: #fff !important;
      }
      &:hover:not([disabled]) {
        background: #059669 !important;
        box-shadow: 0 8px 22px -4px rgba(5, 150, 105, 0.55);
      }
      &:disabled {
        background: #cbd5e1 !important;
        color: #f8fafc !important;
        box-shadow: none;
        mat-icon { color: #f8fafc !important; }
      }
    }
    :host ::ng-deep .export-filtered-btn .mdc-button__label,
    :host ::ng-deep .export-filtered-btn .mat-icon {
      color: #fff !important;
    }
    :host ::ng-deep .export-filtered-btn[disabled] .mdc-button__label,
    :host ::ng-deep .export-filtered-btn[disabled] .mat-icon {
      color: #f8fafc !important;
    }
    .status-select { ::ng-deep .mat-mdc-form-field-wrapper { padding-bottom: 0; } width: 160px; }
    .geo-multi { width: 190px; }
    .refresh-btn { color: #94a3b8; .rotating { animation: rotate 1s infinite linear; } }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Table Styling */
    .premium-table-card { 
      border: none; border-radius: 28px; background: transparent !important; 
      box-shadow: none !important;
    }
    .table-scroll-wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    .farmer-apps-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
    }
    /* Shrink columns + allow multi-line wrap (Material defaults clip with ellipsis) */
    .farmer-apps-table td.mat-mdc-cell,
    .farmer-apps-table th.mat-mdc-header-cell {
      max-width: 0;
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: visible;
      text-overflow: unset;
      white-space: normal;
      word-wrap: break-word;
      align-items: flex-start;
    }
    .farmer-apps-table td { vertical-align: top; }
    .farmer-apps-table .mat-column-farmer { width: 22%; }
    .farmer-apps-table .mat-column-location { width: 18%; }
    .farmer-apps-table .mat-column-uniqueImplementId { width: 15%; }
    .farmer-apps-table .mat-column-date { width: 10%; }
    .farmer-apps-table th.mat-column-date.mat-mdc-header-cell,
    .farmer-apps-table td.mat-column-date.mat-mdc-cell {
      justify-content: center;
      text-align: center;
    }
    .farmer-apps-table .mat-column-status { width: 17%; }
    .farmer-apps-table .mat-column-actions { width: 18%; }
    table { 
      width: 100%; border-collapse: separate; border-spacing: 0 12px; 
      background: transparent; margin-top: -12px;
    }
    th { 
      padding: 8px 8px !important; font-size: 10px; font-weight: 800; color: #94a3b8; 
      text-transform: uppercase; letter-spacing: 0.6px; border: none !important;
    }
    td { 
      padding: 12px 8px !important; background: var(--card-bg); border: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:first-child { border-radius: 20px 0 0 20px; border-left: 1px solid #f1f5f9 !important; }
      &:last-child { border-radius: 0 20px 20px 0; border-right: 1px solid #f1f5f9 !important; }
      border-top: 1px solid #f1f5f9 !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }

    .premium-row {
      cursor: pointer;
      &:hover td { 
        background: #fdfbf7; 
        transform: translateY(-2px);
        border-top-color: #10b98140 !important;
        border-bottom-color: #10b98140 !important;
        box-shadow: 0 10px 20px -10px rgba(0,0,0,0.05);
      }
    }

    /* Cell Components */
    .farmer-cell { 
      display: flex; align-items: flex-start; gap: 8px; min-width: 0;
      .avatar-orb { flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; }
      .info { min-width: 0; .name { font-weight: 800; color: #1e293b; font-size: 12px; line-height: 1.3; word-break: break-word; } .cnic { font-size: 10px; font-weight: 600; color: #94a3b8; } }
    }
    .district-division-cell {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 2px 0;
      .dd-district {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.25;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .dd-division {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: #94a3b8;
        line-height: 1.2;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
    }
    .unique-id-cell {
      font-family: monospace; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; font-size: 9px;
      white-space: normal; word-break: break-all; overflow-wrap: anywhere; line-height: 1.35; display: block; max-width: 100%; box-sizing: border-box;
    }
    .ref-cell {
      min-width: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      .app-id { font-weight: 800; color: #0f172a; font-size: 11px; line-height: 1.25; word-break: break-word; }
      .date { font-size: 9px; color: #94a3b8; font-weight: 600; }
    }

    .status-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-width: 0;
      width: 100%;
    }
    .firm-name-subline {
      font-size: 10px;
      font-weight: 600;
      color: #2563eb;
      line-height: 1.3;
      width: 100%;
      margin-top: 0;
      word-break: break-word;
    }

    /* Modern Status Badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 8px; font-size: 9px; font-weight: 800;
      white-space: normal; flex-wrap: wrap; max-width: 100%; line-height: 1.25; transition: all 0.3s ease; border: 1px solid transparent;
      .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
      
      &[data-status="ELIGIBLE"], &[data-status="ALLOTED"], &[data-status="BOOKED"], &[data-status="DIC_APPROVED"], &[data-status="QIC_APPROVED"], &[data-status="ACCEPTED"] { background: #ecfdf5; color: #10b981; border-color: #d1fae5; .dot { background: #10b981; } }
      &[data-status="PENDING"], &[data-status="QIC_PENDING"], &[data-status="DIC_PENDING"] { background: #fffcf0; color: #f59e0b; border-color: #fef3c7; .dot { background: #f59e0b; } }
      &[data-status="QIC_REQUESTED"] { background: #eef2ff; color: #4f46e5; border-color: #e0e7ff; .dot { background: #4f46e5; } }
      &[data-status="QIC_IN_PROGRESS"], &[data-status="DIC_IN_PROGRESS"] { background: #eff6ff; color: #3b82f6; border-color: #dbeafe; .dot { background: #3b82f6; } }
      &[data-status="QIC_DEFFERED"], &[data-status="DIC_DEFERRED"], &[data-status="DIC_DEFFERED"], &[data-status="DIC_REJECTED"], &[data-status="NOT_ELIGIBLE"], &[data-status="DEFERRED"], &[data-status="REJECTED"] { background: #fef2f2; color: #ef4444; border-color: #fee2e2; .dot { background: #ef4444; } }
      &[data-status="REQUEST_INVOICE"] { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; .dot { background: #22c55e; } }
      &[data-status="SUBSIDY_REQUESTED"] { background: #eff6ff; color: #2563eb; border-color: #dbeafe; .dot { background: #2563eb; } }
      &[data-status="COMPLETED"], &[data-status="SUBSIDY_PAID"] { background: #fdf4ff; color: #d946ef; border-color: #f5d0fe; .dot { background: #d946ef; } }
      &[data-status="BALLOTED"] { background: #eef2ff; color: #4f46e5; border-color: #e0e7ff; .dot { background: #4f46e5; } }
      
      /* Fallback for new/unknown statuses */
      &:not([data-status]) { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; .dot { background: #94a3b8; } }
    }

    .review-action-btn { 
      min-width: 0 !important; width: 100%; max-width: 100%; height: 32px; border-radius: 8px; 
      padding: 0 6px !important;
      border: 1.5px solid var(--border-color) !important; 
      background: var(--card-bg) !important;
      color: #0f172a !important; 
      font-weight: 800 !important; 
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: inline-flex; align-items: center; justify-content: center;
      box-sizing: border-box;

      span { margin-right: 4px; color: #0f172a; }
      mat-icon.view-link-icon { font-size: 14px; width: 14px; height: 14px; color: #3b82f6; flex-shrink: 0; }
      
      &:hover { 
        background: #f8fafc !important; 
        border-color: #10b981 !important; 
        color: #10b981 !important;
        span, mat-icon.view-link-icon { color: #10b981; }
      }
    }

    .action-stack { display: flex; flex-direction: column; gap: 6px; align-items: stretch; width: 100%; min-width: 0; }
    .quick-book-btn {
      height: 32px; border-radius: 8px; background: #4f46e5 !important; color: white !important;
      font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 0 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 4px; }
    }

    .empty-state { padding: 80px 20px; text-align: center; color: #94a3b8; mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 20px; } h3 { font-size: 20px; color: #1e293b; margin-bottom: 8px; } p { font-size: 14px; } }

    mat-paginator { background: transparent; border-top: 1px solid #f1f5f9; }

    .val-group { display: flex; align-items: center; gap: 4px; }
    .inline-edit-btn {
      width: 24px; height: 24px; line-height: 24px; opacity: 0; transition: all 0.2s;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: #10b981; }
      &:hover { background: #f0fdf4; }
    }
    .val-group:hover .inline-edit-btn { opacity: 1; }
    .inline-edit-box { display: flex; align-items: center; gap: 4px; margin: 2px 0; }
    .edit-btns { display: flex; gap: 0; button { width: 28px; height: 28px; line-height: 28px; mat-icon { font-size: 16px; width: 16px; height: 16px; } } }
    .premium-input-tiny { height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #1e293b; width: 120px; &:focus { border-color: #10b981; outline: none; } }
    .farmer-cell .info .father-name { font-size: 10px; font-weight: 600; color: #64748b; line-height: 1.3; word-break: break-word; }
    .stats-grid.district-officer-grid {
      grid-template-columns: repeat(5, 1fr);
    }
    .stat-card.district-theme {
      background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 20px;
      display: flex; flex-direction: column; gap: 12px; transition: all 0.3s ease;
      &:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: #10b981; }
      .stat-icon.district { background: #f0f9ff; color: #0ea5e9; }
      .stat-icon.balloted { background: #fdf4ff; color: #d946ef; }
      .stat-icon.booked { background: #fff7ed; color: #f97316; }
      .stat-icon.dic-pending { background: #fefce8; color: #a16207; }
      .stat-icon.completed { background: #f0fdf4; color: #10b981; }
      .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
      .stat-footer { font-size: 11px; color: #94a3b8; font-weight: 600; }
    }

    /* Premium Processing Overlay (Light Theme Adaptation) */
    .premium-processing-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px) saturate(140%);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: overlayFadeIn 0.5s ease-out;
    }

    @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .processing-card {
      width: min(440px, 92vw);
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 32px;
      padding: 40px;
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 28px;
      text-align: center;
    }

    .processing-header {
      .header-icon {
        position: relative;
        width: 56px; height: 56px;
        background: #f0f9ff;
        border-radius: 18px;
        display: flex;
        align-items: center; justify-content: center;
        margin: 0 auto 20px;
        mat-icon { color: #0ea5e9; font-size: 28px; width: 28px; height: 28px; }
        .header-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid rgba(14, 165, 233, 0.15);
          border-top-color: #0ea5e9;
          border-radius: 20px;
          animation: spinRing 2s linear infinite;
        }
      }
      h2 { font-size: 20px; font-weight: 850; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
      p { font-size: 13px; color: #64748b; margin: 6px 0 0; }
    }

    .progress-area {
      .progress-details {
        display: flex; justify-content: space-between; margin-bottom: 10px;
        font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;
        .pct { color: #0ea5e9; }
      }
      .progress-bar-track {
        height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; position: relative;
      }
      .progress-bar-fill {
        height: 100%; background: linear-gradient(90deg, #0ea5e9, #10b981);
        border-radius: 999px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        .progress-bar-shine {
          position: absolute; top: 0; left: 0; bottom: 0; width: 40px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          animation: shineBar 2s infinite linear;
        }
      }
    }

    .steps-flow { display: flex; flex-direction: column; gap: 0; text-align: left; }
    .step-line-item {
      display: flex; gap: 16px; padding-bottom: 16px; position: relative; opacity: 0.3; transition: all 0.5s ease;
      &.active { opacity: 1; .step-label-text { color: #0f172a; font-weight: 700; } .step-dot-point { transform: scale(1.2); background: #0ea5e9; box-shadow: 0 0 12px #0ea5e9; } }
      &.completed { opacity: 0.7; .step-icon-wrap mat-icon { color: #10b981; } .step-label-text { color: #64748b; } }
      &:last-child { padding-bottom: 0; }
    }
    .step-icon-wrap {
      position: relative; width: 16px; display: flex; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .step-dot-point { width: 8px; height: 8px; background: #e2e8f0; border-radius: 50%; margin-top: 5px; }
      .step-connector { position: absolute; top: 18px; left: 50%; width: 2px; height: calc(100% - 2px); background: #f1f5f9; transform: translateX(-50%); }
    }
    .step-label-text { font-size: 13px; font-weight: 500; color: #94a3b8; }

    .processing-footer {
      display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 11px; font-weight: 700; color: #94a3b8;
      .live-pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulseOpacity 1.5s infinite; }
    }

    @keyframes spinRing { to { transform: rotate(360deg); } }
    @keyframes shineBar { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
    @keyframes pulseOpacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  `]
})
export class ManageFarmerApplicationsComponent implements OnInit {
  private applicationService = inject(FarmerApplicationService);
  private firmService = inject(FirmService);
  private authService = inject(AuthService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private regionService = inject(RegionService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  hasEditFeature = signal(false);
  hasSubsidyRequestFeature = signal(false);
  editingId = signal<number | null>(null);
  editingField = signal<string | null>(null);
  editModel = { farmerName: '', fatherName: '', cnic: '' };

  divisions = signal<Division[]>([]);
  regions = signal<Region[]>([]);
  allDivisions = signal<Division[]>([]);
  allDistricts = signal<District[]>([]);
  districts = signal<District[]>([]);
  selectedDivision = signal<number | null>(null);
  selectedDistrict = signal<number | null>(null);
  selectedRegionIds = signal<number[]>([]);
  selectedDivisionIds = signal<number[]>([]);
  selectedDistrictIds = signal<number[]>([]);
  selectedFirmIds = signal<number[]>([]);
  firms = signal<Firm[]>([]);
  /**
   * Sentinel value for the non-selectable search row inside mat-select (multiple).
   * Real firm IDs from the API are positive; this must never be sent as a filter.
   */
  readonly firmSearchRowValue = -1;

  /** Local filter text for Firms dropdown only; cleared when panel closes. */
  firmSearchText = signal('');
  filteredFirms = computed(() => {
    const q = this.firmSearchText().trim().toLowerCase();
    const list = this.firms();
    const selected = new Set(this.selectedFirmIds());
    if (!q) {
      return list;
    }
    return list.filter(
      f => f.id != null && (selected.has(f.id) || (f.name || '').toLowerCase().includes(q))
    );
  });

  isFirmUser = signal(false);
  isDistrictOfficer = signal(false);
  isSuperAdmin = signal(false);
  /** Convener sees supervised-firm KPIs + financial strip, not generic admin pipeline cards. */
  isConvenerUser = signal(false);

  displayedColumns = ['farmer', 'location', 'uniqueImplementId', 'date', 'status', 'actions'];

  hasRegisterFeature = signal(false);
  hasBookingFeature = signal(false);
  hasQicStartFeature = signal(false);
  isLoading = signal(false);
  /** True while paging through list() for Excel export (same filters as the table). */
  isExporting = signal(false);
  isStatsLoading = signal(false);
  applications = signal<FarmerApplicationPayload[]>([]);
  stats = signal<any>({
    total: 0, eligible: 0, balloted: 0, completed: 0,
    booked: 0, qicRequested: 0, qicInspectionRequests: 0, qicApproved: 0, dicPending: 0, dicInProgress: 0, dicApproved: 0,
    qicPending: 0, qicCompleted: 0, dicCompleted: 0,
    totalFirmsRegistered: 0, trackerIntegrated: 0,
    expectedRevenue: 0, receivedRevenue: 0, pendingRevenue: 0
  });

  displayedStats = signal<any>({
    total: 0, eligible: 0, balloted: 0, completed: 0,
    booked: 0, qicRequested: 0, qicInspectionRequests: 0, qicApproved: 0, dicPending: 0, dicInProgress: 0, dicApproved: 0,
    qicPending: 0, qicCompleted: 0, dicCompleted: 0,
    totalFirmsRegistered: 0, trackerIntegrated: 0,
    expectedRevenue: 0, receivedRevenue: 0, pendingRevenue: 0
  });

  dicApprovedCount = signal<number>(0);
  subsidyTooltip = computed(() => {
    const count = this.dicApprovedCount();
    if (count === 0) return 'No applications ready for subsidy release';
    return `${count} Farmer(s) Approved, submit request to release farmer share`;
  });

  // Premium Processing Overlay
  isProcessing = signal(false);
  loadingProgress = signal(0);
  currentStep = signal(0);
  loadingSteps = [
    'Aggregating DIC approved applications',
    'Calculating bulk subsidy metrics',
    'Generating official share release report',
    'Registering request in application history',
    'Preparing secure document download'
  ];

  totalCount = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  currentSearch = '';
  currentStatus = 'all';

  /** Tooltip for district / division cell (full text on hover). */
  locationTooltip(app: FarmerApplicationPayload): string {
    const dist = (app.districtName ?? '').trim();
    const div = (app.divisionName ?? '').trim();
    if (dist && div) return `${dist} — ${div}`;
    return dist || div || '';
  }

  statusDisplayLabel(status: string | null | undefined): string {
    if (!status) return '';
    if (status === 'SUBSIDY_REQUESTED') return 'Subsidy Requested';
    if (status === 'SUBSIDY_PAID') return 'Subsidy Paid';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }

  /**
   * Exports every row for the current filters by calling the same paginated list endpoint as the table
   * (`FarmerApplicationService.list`), walking pages until all `totalElements` are loaded.
   */
  exportFilteredToExcel(): void {
    if (this.totalCount() <= 0) {
      this.snackBar.open('No applications to export for the current filters.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.isExporting.set(true);
    const pageSize = 500;
    const accumulated: FarmerApplicationPayload[] = [];
    let totalElements = 0;

    const loadPage = (page: number) => {
      this.applicationService
        .list(
          this.currentSearch,
          this.currentStatus,
          this.selectedDivision() || undefined,
          this.selectedDistrict() || undefined,
          page,
          pageSize,
          'updatedAt,desc',
          this.isSuperAdmin() ? this.selectedRegionIds() : undefined,
          this.isSuperAdmin() ? this.selectedDivisionIds() : undefined,
          this.isSuperAdmin() ? this.selectedDistrictIds() : undefined,
          this.isSuperAdmin() ? this.selectedFirmIds() : undefined
        )
        .subscribe({
          next: (res: PagedResponse<FarmerApplicationPayload>) => {
            if (page === 0) {
              totalElements = res.totalElements;
              if (totalElements === 0) {
                this.isExporting.set(false);
                this.snackBar.open('No applications to export for the current filters.', 'Dismiss', {
                  duration: 4000
                });
                return;
              }
            }
            accumulated.push(...res.content);
            const done =
              accumulated.length >= totalElements || res.content.length === 0;
            if (done) {
              this.isExporting.set(false);
              this.writeApplicationsExcel(accumulated);
              this.snackBar.open(`Exported ${accumulated.length} row(s) to Excel.`, 'OK', { duration: 3500 });
            } else {
              loadPage(page + 1);
            }
          },
          error: (err) => {
            console.error('Export list fetch failed', err);
            this.isExporting.set(false);
            this.snackBar.open('Export failed. Please try again.', 'Dismiss', { duration: 5000 });
          }
        });
    };

    loadPage(0);
  }

  private writeApplicationsExcel(rows: FarmerApplicationPayload[]): void {
    const exportRows = rows.map((app) => ({
      'Applicant Name': app.farmerName ?? '',
      'Father Name': app.fatherName ?? '',
      CNIC: String(app.cnic ?? ''),
      District: (app.districtName ?? '').trim() || '—',
      'Asset ID': (app.uniqueImplementId ?? '').trim() || 'Pending',
      'Application Ref': app.applicationNumber ?? '',
      'Ref Date': app.createdAt
        ? formatDate(app.createdAt, 'mediumDate', 'en-US')
        : '',
      'Pipeline Status': (this.statusDisplayLabel(app.status) || app.status || '').trim(),
      'Entity Name': app.bookedByFirmName ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 36 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Farmer Applications');
    const stamp = formatDate(new Date(), 'yyyy-MM-dd-HHmm', 'en-US');
    XLSX.writeFile(wb, `farmer-applications-export-${stamp}.xlsx`);
  }

  ngOnInit() {
    this.checkFeatures();
    const userRole = this.authService.currentUser()?.role;
    const roleUpper = (userRole || '').toUpperCase();
    this.isFirmUser.set(roleUpper === 'FIRM' || roleUpper === 'ROLE_FIRM');
    this.isDistrictOfficer.set(roleUpper === 'DISTRICT_OFFICER' || roleUpper === 'ROLE_DISTRICT_OFFICER');
    const isAnySuperAdmin = roleUpper.includes('SUPER_ADMIN') || (roleUpper.includes('SUPER') && roleUpper.includes('ADMIN')) || roleUpper.includes('ADMIN_DG_OFFICE') || roleUpper.includes('NESPAK');
    this.isSuperAdmin.set(isAnySuperAdmin);
    this.isConvenerUser.set(
      roleUpper.includes('CONVENER') && userRole !== 'FIRM' && userRole !== 'ROLE_FIRM'
    );
    
    this.loadRegions();
    this.loadDivisions();
    this.loadAllDistricts();
    if (this.isSuperAdmin()) {
      this.loadFirms();
    }
    this.loadApplications();
    this.loadStats();
  }

  loadStats() {
    this.isStatsLoading.set(true);
    this.applicationService.getSummaryCounts(
      this.isSuperAdmin() ? this.selectedRegionIds() : undefined,
      this.isSuperAdmin() ? this.selectedDivisionIds() : undefined,
      this.isSuperAdmin() ? this.selectedDistrictIds() : undefined,
      this.isSuperAdmin() ? this.selectedFirmIds() : undefined
    ).subscribe({
      next: (counts) => {
        const firstNumber = (...values: any[]): number => {
          for (const value of values) {
            if (typeof value === 'number' && !Number.isNaN(value)) return value;
          }
          return 0;
        };

        const newStats = {
          ...counts,
          total: firstNumber(counts.total, counts.totalApplications, counts.total_applications),
          eligible: firstNumber(counts.eligible, counts.totalEligible, counts.total_eligible),
          balloted: firstNumber(counts.balloted, counts.totalBalloted, counts.total_balloted),
          completed: firstNumber(counts.completed, counts.totalCompleted, counts.total_completed),
          booked: firstNumber(counts.booked, counts.totalBooked, counts.total_booked),
          qicPending: firstNumber(
            counts.qicPending,
            counts.qic_pending,
            counts.qicRequested,
            counts.qic_requested
          ),
          qicCompleted: firstNumber(
            counts.qicCompleted,
            counts.qic_completed,
            counts.qicApproved,
            counts.qic_approved
          ),
          qicRequested: firstNumber(counts.qicRequested, counts.qic_requested),
          qicInspectionRequests: firstNumber(
            counts.qicInspectionRequests,
            counts.qic_inspection_requests
          ),
          qicApproved: firstNumber(counts.qicApproved, counts.qic_approved),
          dicPending: firstNumber(counts.dicPending, counts.dic_pending),
          dicInProgress: firstNumber(counts.dicInProgress, counts.dic_in_progress),
          dicCompleted: firstNumber(counts.dicCompleted, counts.dic_completed, counts.dicApproved, counts.dic_approved),
          dicApproved: firstNumber(counts.dicApproved, counts.dic_approved),
          totalFirmsRegistered: firstNumber(counts.totalFirmsRegistered, counts.total_firms_registered, counts.totalFirms, counts.total_firms, counts.firmsRegistered, counts.firmCount, counts.firm_count),
          // Tracker integrated should come from iot_devices count when provided by backend.
          trackerIntegrated: firstNumber(
            counts.iotDevicesCount,
            counts.iot_devices_count,
            counts.iotDevices,
            counts.iot_devices,
            counts.totalIotDevices,
            counts.total_iot_devices,
            counts.totalTrackerIntegrated,
            counts.total_tracker_integrated,
            counts.trackerIntegrated
          ),
          expectedRevenue: firstNumber(counts.expectedRevenue, counts.expected_revenue),
          receivedRevenue: firstNumber(counts.receivedRevenue, counts.received_revenue),
          pendingRevenue: firstNumber(counts.pendingRevenue, counts.pending_revenue)
        };

        delete newStats.totalUsers;
        delete newStats.total_users;

        this.stats.set(newStats);
        this.isStatsLoading.set(false);
        this.animateStats(newStats);
        this.loadDicApprovedCount();
      },
      error: (err) => {
        console.error('Error fetching stats', err);
        this.isStatsLoading.set(false);
      }
    });
  }

  /** Super Admin executive board: refetch summary KPIs and the applications list (respects current filters). */
  refreshExecutiveDashboard(): void {
    this.loadStats();
    this.loadApplications();
  }

  loadDivisions() {
    this.divisionService.getDivisions().subscribe({
      next: (divs) => {
        this.divisions.set(divs);
        this.allDivisions.set(divs);
      },
      error: (err) => console.error('Error loading divisions', err)
    });
  }
  loadRegions() {
    this.regionService.getRegions().subscribe({
      next: (regions) => this.regions.set(regions),
      error: (err) => console.error('Error loading regions', err)
    });
  }
  loadAllDistricts() {
    this.districtService.getDistricts().subscribe({
      next: (districts) => this.allDistricts.set(districts),
      error: (err) => console.error('Error loading districts', err)
    });
  }

  loadFirms() {
    this.firmService.getFirms(0, 5000).subscribe({
      next: (res) => this.firms.set((res.content ?? []).filter((f): f is Firm & { id: number } => f.id != null)),
      error: (err) => console.error('Error loading firms', err)
    });
  }

  private animateStats(target: any) {
    const duration = 1500; // 1.5s
    const start = Date.now();
    const initial = { ...this.displayedStats() };

    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const currentDisp = { ...initial };
      Object.keys(target).forEach(key => {
        if (typeof target[key] === 'number') {
          currentDisp[key] = Math.floor(initial[key] + (target[key] - initial[key]) * easeProgress);
        }
      });

      this.displayedStats.set(currentDisp);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.displayedStats.set(target);
      }
    };

    requestAnimationFrame(step);
  }

  loadApplications() {
    this.isLoading.set(true);
    this.applicationService.list(
      this.currentSearch, 
      this.currentStatus, 
      this.selectedDivision() || undefined,
      this.selectedDistrict() || undefined,
      this.pageIndex(), 
      this.pageSize(),
      'updatedAt,desc',
      this.isSuperAdmin() ? this.selectedRegionIds() : undefined,
      this.isSuperAdmin() ? this.selectedDivisionIds() : undefined,
      this.isSuperAdmin() ? this.selectedDistrictIds() : undefined,
      this.isSuperAdmin() ? this.selectedFirmIds() : undefined
    ).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res: PagedResponse<FarmerApplicationPayload>) => {
        this.applications.set(res.content);
        this.totalCount.set(res.totalElements);
        // Stats are loaded independently via loadStats() for real-time accuracy across all pages
      },
      error: (err: any) => console.error('Error fetching applications', err)
    });
  }

  calculateStats(data: FarmerApplicationPayload[]) {
    // In a real scenario, stats would come from a summary endpoint
    // For now, we update them based on the response if possible, 
    // but usually total is provided by separate aggregated count
    this.stats.update(s => ({ ...s, total: this.totalCount() }));
  }

  onSearchChange(event: any) {
    this.currentSearch = event.target.value;
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onStatusChange(status: string) {
    this.currentStatus = status;
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onDivisionChange(divisionId: any) {
    if (divisionId === 'all') {
      this.selectedDivision.set(null);
      this.selectedDistrict.set(null);
      this.districts.set([]);
    } else {
      const id = Number(divisionId);
      this.selectedDivision.set(id);
      this.selectedDistrict.set(null);
      this.districtService.getDistrictsByDivision(id).subscribe({
        next: (districts) => this.districts.set(districts),
        error: (err) => console.error('Error loading districts', err)
      });
    }
    this.pageIndex.set(0);
    this.loadApplications();
  }

  onDistrictChange(districtId: any) {
    this.selectedDistrict.set(districtId === 'all' ? null : Number(districtId));
    this.pageIndex.set(0);
    this.loadApplications();
    this.loadStats();
  }

  onSuperAdminRegionsChange(values: number[]) {
    this.selectedRegionIds.set((values || []).map(Number));
    const regionIds = this.selectedRegionIds();
    const filteredDivisionIds = new Set(
      this.allDivisions()
        .filter(d => !regionIds.length || regionIds.includes(d.regionId))
        .map(d => d.id!)
    );
    this.selectedDivisionIds.set(this.selectedDivisionIds().filter(id => filteredDivisionIds.has(id)));
    const filteredDistrictIds = new Set(
      this.allDistricts()
        .filter(d => !this.selectedDivisionIds().length || this.selectedDivisionIds().includes(d.divisionId))
        .map(d => d.id!)
    );
    this.selectedDistrictIds.set(this.selectedDistrictIds().filter(id => filteredDistrictIds.has(id)));
    this.pageIndex.set(0);
    this.loadApplications();
    this.loadStats();
  }

  onSuperAdminDivisionsChange(values: number[]) {
    this.selectedDivisionIds.set((values || []).map(Number));
    const filteredDistrictIds = new Set(
      this.allDistricts()
        .filter(d => !this.selectedDivisionIds().length || this.selectedDivisionIds().includes(d.divisionId))
        .map(d => d.id!)
    );
    this.selectedDistrictIds.set(this.selectedDistrictIds().filter(id => filteredDistrictIds.has(id)));
    this.pageIndex.set(0);
    this.loadApplications();
    this.loadStats();
  }

  onSuperAdminDistrictsChange(values: number[]) {
    this.selectedDistrictIds.set((values || []).map(Number));
    this.pageIndex.set(0);
    this.loadApplications();
    this.loadStats();
  }

  onSuperAdminFirmsChange(values: number[]) {
    const cleaned = (values || [])
      .map(Number)
      .filter((id) => id !== this.firmSearchRowValue && !Number.isNaN(id));
    this.selectedFirmIds.set(cleaned);
    this.pageIndex.set(0);
    this.loadApplications();
    this.loadStats();
  }

  onSuperAdminFirmsPanelOpenedChange(open: boolean) {
    if (!open) {
      this.firmSearchText.set('');
    }
  }

  onFirmSearchInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.firmSearchText.set(v);
  }

  onFirmSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab' || event.key === 'Escape') {
      return;
    }
    event.stopPropagation();
  }

  superAdminDivisions(): Division[] {
    const selectedRegions = this.selectedRegionIds();
    return this.allDivisions().filter(d => !selectedRegions.length || selectedRegions.includes(d.regionId));
  }

  superAdminDistricts(): District[] {
    const selectedDivisions = this.selectedDivisionIds();
    return this.allDistricts().filter(d => !selectedDivisions.length || selectedDivisions.includes(d.divisionId));
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadApplications();
  }

  private checkFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        const allFeatures = JSON.parse(featuresStr);
        this.hasRegisterFeature.set(
          allFeatures.some((f: any) => (f.name === 'Register New Farmer Application' || f.name === 'Register Application') && f.active)
        );
        this.hasBookingFeature.set(
          allFeatures.some((f: any) => (f.name === 'Booking Process' || f.name.includes('Booking')) && f.active)
        );
        this.hasQicStartFeature.set(
          allFeatures.some((f: any) => (f.name === 'Quality Inspection Initiation Request. (QIC Start)') && f.active)
        );
        this.hasEditFeature.set(
          allFeatures.some((f: any) => (f.name === 'Edit Farmer Application' || f.name === 'Farmer Application Updation') && f.active)
        );
        this.hasSubsidyRequestFeature.set(
          allFeatures.some((f: any) => (f.name === 'Request Farmer Share Release') && f.active)
        );
      } catch (e) {
        console.error('Error parsing features', e);
      }
    }
  }

  startEdit(app: any, field: string) {
    this.editingId.set(app.id);
    this.editingField.set(field);
    this.editModel = { 
      farmerName: app.farmerName, 
      fatherName: app.fatherName, 
      cnic: app.cnic 
    };
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingField.set(null);
  }

  saveEdit(app: any) {
    if (!this.editingId() || !app.id) return;
    
    const payload: any = {};
    const field = this.editingField();
    if (field) {
      payload[field] = (this.editModel as any)[field];
    }

    this.applicationService.update(app.id, payload).subscribe({
      next: (res) => {
        this.snackBar.open(`${field} updated successfully`, 'OK', { duration: 3000 });
        // Update local state
        Object.assign(app, res);
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.snackBar.open('Failed to update field', 'Error', { duration: 3000 });
      }
    });
  }

  loadDicApprovedCount() {
    if (this.isFirmUser()) {
      this.applicationService.getDicApprovedCount().subscribe((count) => {
        this.dicApprovedCount.set(count);
      });
    }
  }

  onRequestFarmerShareRelease() {
    const count = this.dicApprovedCount();
    if (count === 0) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '440px',
      data: {
        title: 'Submit Subsidy Request?',
        message: `You are about to initiate a bulk subsidy release request for ${count} approved farmer applications. This will generate the necessary documentation and update the system audit history.`,
        confirmText: 'Yes, Submit Request',
        cancelText: 'Cancel',
        icon: 'payments',
        iconColor: '#10b981'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeSubsidyPipeline();
      }
    });
  }

  private executeSubsidyPipeline() {
    this.isProcessing.set(true);
    this.loadingProgress.set(0);
    this.currentStep.set(0);

    const simulationDelay = 800;

    // Simulation sequence for premium experience
    timer(0).subscribe(() => {
      this.currentStep.set(0);
      this.loadingProgress.set(15);
    });

    timer(simulationDelay).subscribe(() => {
      this.currentStep.set(1);
      this.loadingProgress.set(35);
    });

    timer(simulationDelay * 2).subscribe(() => {
      this.currentStep.set(2);
      this.loadingProgress.set(55);
      
      // Real API Call
      this.applicationService.requestFarmerShareRelease().subscribe({
        next: (res) => {
          this.currentStep.set(3);
          this.loadingProgress.set(80);
          
          timer(simulationDelay).subscribe(() => {
            this.currentStep.set(4);
            this.loadingProgress.set(100);

            timer(500).subscribe(() => {
              this.isProcessing.set(false);
              this.snackBar.open(res.message || 'Request submitted successfully!', 'Success', { duration: 5000 });
              this.loadApplications();
              this.loadStats();

              if (res.reportUrl) {
                const url = res.reportUrl.startsWith('/') ? environment.apiUrl + res.reportUrl : res.reportUrl;
                const a = document.createElement('a');
                a.href = url;
                a.style.display = 'none';
                a.download = 'Farmer_Share_Release_Request.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            });
          });
        },
        error: (err) => {
          this.isProcessing.set(false);
          console.error('Subsidy request failed:', err);
          this.snackBar.open('Failed to process subsidy request. Please try again.', 'Error', { duration: 5000 });
        }
      });
    });
  }
}
