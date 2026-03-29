import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { FarmerApplicationService } from '../../../core/services/farmer-application.service';
import { QualityInspectionProcess, FarmerApplication, FirmInspectionStats, QualityInspectionDashboard, DivisionInspectionStats } from '../../../core/models/quality-inspection.model';

@Component({
    selector: 'app-quality-inspection-process',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatProgressBarModule,
        MatTableModule,
        MatFormFieldModule,
        MatSelectModule,
        MatTooltipModule
    ],
    template: `
    <div class="page-container" [class.panel-open]="selectedFirmDetails()">
      <header class="page-header">
        <div class="header-content">
          <div class="title-area">
            <h1>Quality Inspection Portal</h1>
            <p>Managing firm-wise inspection performance across divisions and districts</p>
          </div>
          <div class="header-actions">
              <button mat-stroked-button class="reports-list-btn" (click)="goToReportsList()">
                <mat-icon>assessment</mat-icon>
                View Reports
              </button>
              <button mat-button class="clear-btn" (click)="clearFilters()" *ngIf="divisionFilter() || districtFilter() || firmFilter()">
                <mat-icon>filter_alt_off</mat-icon>
                Clear Filters
              </button>
              <button mat-flat-button class="refresh-btn" (click)="loadData()">
                <mat-icon>refresh</mat-icon>
                Refresh Data
              </button>
          </div>
        </div>

        <!-- Summary Stats Section -->
        <div class="stats-summary" *ngIf="!isLoading()">
            <div class="summary-card glass-card">
                <div class="card-icon blue">
                    <mat-icon>assignment</mat-icon>
                </div>
                <div class="card-data">
                    <span class="label">Total Booked</span>
                    <span class="value">{{ summary().total }}</span>
                </div>
            </div>

            <div class="summary-card glass-card">
                <div class="card-icon orange">
                    <mat-icon>hourglass_empty</mat-icon>
                </div>
                <div class="card-data">
                    <span class="label">QIC Requested</span>
                    <span class="value">{{ summary().pending }}</span>
                </div>
            </div>

            <div class="summary-card glass-card">
                <div class="card-icon green">
                    <mat-icon>verified</mat-icon>
                </div>
                <div class="card-data">
                    <span class="label">QIC Approved</span>
                    <span class="value">{{ summary().approved }}</span>
                </div>
            </div>

            <div class="summary-card glass-card progress">
                <div class="card-data">
                    <div class="progress-header">
                        <span class="label">Execution Rate</span>
                        <span class="value">{{ summary().progress }}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar-fill shadow-green" [style.width.%]="summary().progress"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="filter-bar glass-flat">
            <mat-form-field appearance="outline" class="filter-field luxe">
                <mat-label>Division</mat-label>
                <mat-select [ngModel]="divisionFilter()" (ngModelChange)="divisionFilter.set($event); onFilterChange()">
                    <mat-option [value]="null">All Divisions</mat-option>
                    <mat-option *ngFor="let opt of divisionOptions()" [value]="opt.id">
                        {{ opt.name }}
                    </mat-option>
                </mat-select>
                <mat-icon matPrefix>map</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field luxe">
                <mat-label>District</mat-label>
                <mat-select [ngModel]="districtFilter()" (ngModelChange)="districtFilter.set($event); onFilterChange()">
                    <mat-option [value]="null">All Districts</mat-option>
                    <mat-option *ngFor="let opt of districtOptions()" [value]="opt.id">
                        {{ opt.name }}
                    </mat-option>
                </mat-select>
                <mat-icon matPrefix>location_on</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field luxe" *ngIf="!isFirmUser()">
                <mat-label>Firm Name</mat-label>
                <mat-select [ngModel]="firmFilter()" (ngModelChange)="firmFilter.set($event)">
                    <mat-option [value]="null">All Firms</mat-option>
                    <mat-option *ngFor="let opt of firmOptions()" [value]="opt.id">
                        {{ opt.name }}
                    </mat-option>
                </mat-select>
                <mat-icon matPrefix>business</mat-icon>
            </mat-form-field>

            <div class="filter-stats" *ngIf="!isLoading()">
                <span class="count-pill">{{ totalResultsCount() }} Firms Tracking</span>
            </div>
        </div>
      </header>

      <div class="loading-state" *ngIf="isLoading() || isDashboardLoading()">
        <div class="luxe-loader">
            <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
        </div>
        <p>{{ isLoading() ? 'Syncing dashboard metrics...' : 'Filtering inspection data...' }}</p>
      </div>

      <div class="content-view" *ngIf="!isLoading() && !isDashboardLoading()">
        <section class="division-group" *ngFor="let division of flattenedData()" [class.expanded]="isDivisionExpanded(division.divisionId)">
          <div class="division-banner" (click)="toggleDivision(division.divisionId)" matRipple>
             <div class="banner-content">
                <mat-icon class="banner-icon">{{ isDivisionExpanded(division.divisionId) ? 'expand_more' : 'chevron_right' }}</mat-icon>
                <div class="banner-text">
                    <h2>{{ division.divisionName }} Division</h2>
                    <p>{{ division.districts.length }} Districts Active</p>
                </div>
             </div>
             
             <div class="header-stats-row">
                <div class="stat-pill booked">
                    <span class="lab">Booked:</span>
                    <span class="val">{{ division.booked }}</span>
                </div>
                <div class="stat-pill pending">
                    <span class="lab">Requested:</span>
                    <span class="val">{{ division.pending }}</span>
                </div>
                <div class="stat-pill approved">
                    <span class="lab">Approved:</span>
                    <span class="val">{{ division.approved }}</span>
                </div>
             </div>

             <div class="banner-accent"></div>
          </div>

          <!-- Flat Firm List Layout -->
          <div class="stats-grid-container" *ngIf="isDivisionExpanded(division.divisionId)">
            <div class="stats-grid">
                <div class="firm-tile premium-card" [class.has-action]="firm.qicPending > 0" *ngFor="let firm of division.allFirms" (click)="viewDetails(firm.districtId!, firm.districtName!, firm)">
                    <div class="tile-header">
                        <div class="firm-branding">
                            <div class="firm-initial">{{ firm.firmName.charAt(0) }}</div>
                            <div class="firm-info-stack">
                                <h3>{{ firm.firmName }}</h3>
                                <span class="associated-district">{{ firm.districtName }}</span>
                            </div>
                        </div>
                        <span class="firm-id">#{{ firm.firmId }}</span>
                    </div>
                    
                    <div class="tile-body">
                        <div class="primary-stat">
                            <span class="val">{{ firm.totalApplications }}</span>
                            <span class="lab">Booked Cases</span>
                        </div>
                        
                        <div class="metrics-row">
                            <div class="mini-stat pending">
                                <span class="val">{{ firm.qicPending }}</span>
                                <span class="lab">QIC Requested</span>
                            </div>
                            <div class="mini-stat approved">
                                <span class="val">{{ firm.qicApproved }}</span>
                                <span class="lab">QIC Approved</span>
                            </div>
                        </div>
                    </div>

                    <div class="tile-footer">
                        <div class="performance-strip">
                            <div class="strip-fill" [style.width.%]="(firm.qicApproved / (firm.totalApplications || 1)) * 100"></div>
                        </div>
                        <div class="performance-meta">
                            <span>Efficiency Index</span>
                            <strong>{{ ((firm.qicApproved / (firm.totalApplications || 1)) * 100) | number:'1.0-0' }}%</strong>
                        </div>
                        
                        <button mat-flat-button class="start-qic-btn" *ngIf="firm.qicPending > 0" (click)="startQicAction(firm, $event)">
                            <mat-icon>play_arrow</mat-icon>
                            Start QIC Process
                        </button>
                    </div>
                    
                    <div class="card-interactive-layer">
                        <span class="action-text">Explore Applications</span>
                        <mat-icon>chevron_right</mat-icon>
                    </div>
                </div>
            </div>
          </div>
        </section>

        <div class="empty-state-luxe" *ngIf="groupedData().length === 0">
            <div class="empty-icon-box">
                <mat-icon>search_off</mat-icon>
            </div>
            <h3>No Records Matches Found</h3>
            <p>We couldn't find any firms matching your current criteria. Please refine your filters.</p>
            <button mat-flat-button class="reset-luxe-btn" (click)="clearFilters()">
                Reset Dashboard Filters
            </button>
        </div>
      </div>

      <!-- Side Detail Panel -->
      <div class="panel-overlay" *ngIf="selectedFirmDetails()" (click)="closeDetails()"></div>
      <div class="detail-panel" *ngIf="selectedFirmDetails()">
          <div class="panel-header">
              <div class="header-titles">
                  <h2>{{ selectedFirmDetails()?.firmName }}</h2>
                  <p>{{ selectedDistrictName() }} District • {{ details().length }} Applications</p>
              </div>
              <button mat-icon-button class="close-btn" (click)="closeDetails()">
                  <mat-icon>close</mat-icon>
              </button>
          </div>

          <div class="panel-content">
              <div class="table-container shadow-sm">
                  <table mat-table [dataSource]="details()" class="app-table">
                      <ng-container matColumnDef="appNo">
                          <th mat-header-cell *matHeaderCellDef> Application </th>
                          <td mat-cell *matCellDef="let app">
                              <span class="app-number">{{ app.applicationNumber }}</span>
                          </td>
                      </ng-container>

                      <ng-container matColumnDef="farmer">
                          <th mat-header-cell *matHeaderCellDef> Farmer </th>
                          <td mat-cell *matCellDef="let app">
                              <div class="farmer-cell">
                                  <span class="name">{{ app.farmerName }}</span>
                                  <span class="cnic">{{ app.cnic }}</span>
                              </div>
                          </td>
                      </ng-container>

                      <ng-container matColumnDef="implement">
                          <th mat-header-cell *matHeaderCellDef> Implement </th>
                          <td mat-cell *matCellDef="let app"> {{ app.implementName }} </td>
                      </ng-container>

                      <ng-container matColumnDef="location">
                          <th mat-header-cell *matHeaderCellDef> Location </th>
                          <td mat-cell *matCellDef="let app">
                              <div class="location-cell">
                                  <span class="dist">{{ app.districtName }}</span>
                                  <span class="markaz">{{ app.markazName }}</span>
                              </div>
                          </td>
                      </ng-container>

                      <ng-container matColumnDef="status">
                          <th mat-header-cell *matHeaderCellDef> Status </th>
                          <td mat-cell *matCellDef="let app">
                              <span class="status-pill" [attr.data-status]="app.status">
                                  {{ app.status.replace('_', ' ') }}
                              </span>
                          </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                  </table>
              </div>

              <div class="panel-empty" *ngIf="details().length === 0">
                  <mat-icon>inbox</mat-icon>
                  <p>No applications found matching current criteria.</p>
              </div>
          </div>

          <div class="panel-footer" *ngIf="selectedFirmDetails()">
              <button mat-flat-button class="full-view-btn" (click)="goToFullView()">
                  View Performance Insights
                  <mat-icon>trending_up</mat-icon>
              </button>
          </div>
      </div>
    </div>
  `,
    styles: [`
    .page-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      margin-bottom: 40px;
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 32px;
      }
      h1 {
        font-size: 36px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px;
        letter-spacing: -1px;
      }
      p {
        color: #64748b;
        font-size: 18px;
        margin: 0;
        font-weight: 500;
      }
      .refresh-btn {
        background: #0f172a; color: white; border-radius: 14px; padding: 12px 24px; font-weight: 600; 
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: all 0.3s ease;
        &:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
      }
      .reports-list-btn {
        margin-right: 12px; height: 48px; border-radius: 14px; font-weight: 800; border: 2px solid #e2e8f0; color: #475569;
        &:hover { background: #f8fafc; border-color: #cbd5e1; }
        mat-icon { margin-right: 8px; color: #64748b; }
      }
      .clear-btn { color: #64748b; font-weight: 600; padding: 8px 16px; margin-right: 12px; }
    }

    .glass-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.03);
    }

    .stats-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        margin-bottom: 40px;
        
        .summary-card {
            padding: 28px;
            display: flex;
            align-items: center;
            gap: 24px;
            transition: all 0.3s ease;
            
            &:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
            
            &.progress { flex-direction: column; align-items: stretch; justify-content: center; }
            
            .card-icon {
                width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center;
                mat-icon { font-size: 30px; width: 30px; height: 30px; }
                &.blue { background: #edf2ff; color: #4361ee; }
                &.orange { background: #fff5eb; color: #f72585; }
                &.green { background: #f0fff4; color: #4cc9f0; }
            }
            
            .card-data {
                display: flex; flex-direction: column; flex: 1;
                .label { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
                .value { font-size: 28px; font-weight: 900; color: #0f172a; }
                
                .progress-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
                .progress-track {
                    height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; position: relative;
                    .progress-bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #4cc9f0, #4361ee); transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1); }
                }
            }
        }
    }

    .glass-flat {
        background: var(--card-bg);
        padding: 20px 32px;
        border-radius: 24px;
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        
        .filter-field.luxe {
            flex: 1;
            max-width: 280px;
            margin-bottom: -1.25em;
            ::ng-deep .mat-mdc-text-field-wrapper { background: #f8fafc !important; border-radius: 12px !important; }
            ::ng-deep .mat-mdc-form-field-focus-indicator { display: none; }
            ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
            mat-icon { color: #94a3b8; margin-right: 8px; }
        }

        .filter-stats {
            margin-left: auto;
            .count-pill {
                background: #f1f5f9; color: #475569; padding: 8px 18px; border-radius: 12px; font-size: 14px; font-weight: 700;
                border: 1px solid #e2e8f0;
            }
        }
    }

    .division-group {
        margin-bottom: 56px;
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    .header-stats-row {
        display: flex; align-items: center; gap: 12px; z-index: 2;
        
        .stat-pill {
            display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 12px; font-size: 13px; font-weight: 700;
            white-space: nowrap;
            .lab { color: #64748b; text-transform: uppercase; font-size: 10px; opacity: 0.8; }
            
            &.booked { background: #f1f5f9; color: #1e293b; }
            &.pending { background: #fff5eb; color: #f72585; }
            &.approved { background: #f0fff4; color: #10b981; }
        }
    }

    .division-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 16px;
        transition: all 0.2s ease;
        
        &:hover {
            background: #f8fafc;
            .banner-text h2 { color: #4361ee; }
            .banner-icon { color: #4361ee; opacity: 1; transform: scale(1.1); }
        }
        
        .banner-content {
            display: flex; align-items: center; gap: 20px;
            .banner-icon { width: 32px; height: 32px; font-size: 32px; color: #94a3b8; transition: all 0.3s ease; }
            .banner-text {
                h2 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; transition: color 0.2s ease; }
                p { color: #64748b; margin: 2px 0 0; font-weight: 600; font-size: 14px; }
            }
        }

        .header-stats-row { margin-left: auto; }
        .banner-accent { height: 2px; flex: 1; margin-left: 32px; background: linear-gradient(90deg, #f1f5f9, transparent); }
    }

    .stats-grid-container {
        padding-left: 52px;
        margin-bottom: 32px;
        animation: fadeIn 0.4s ease;
    }

    .district-header {
        display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; 
        border-radius: 14px; cursor: pointer; transition: all 0.2s ease;
        
        &:hover {
            background: #f1f5f9;
            .header-main-info h3 { color: #0f172a; }
            .status-icon { transform: translate(2px); }
        }

        .header-main-info {
            display: flex; align-items: center; gap: 12px;
            .status-icon { font-size: 24px; width: 24px; height: 24px; transition: all 0.3s ease; }
            h3 { font-size: 17px; font-weight: 700; color: #475569; margin: 0; transition: color 0.2s ease; }
            .district-pill {
                margin-left: 12px; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; font-weight: 800;
                padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;
            }
        }

        .header-stats-row {
            .stat-pill {
                padding: 4px 12px; border-radius: 10px; font-size: 12px;
                .lab { font-size: 9px; }
            }
        }
    }

    .stats-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
    }

    .premium-card {
        background: #ffffff;
        border-radius: 20px;
        padding: 24px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border-color: #4361ee;
            
            .card-interactive-layer { transform: translateY(0); opacity: 1; }
        }

        &.has-action {
             border-left: 4px solid #4361ee;
             
             .card-interactive-layer {
                 padding-bottom: 90px; /* Shift "Explore" text up above the button */
             }
        }

        .tile-header {
            display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
            .firm-branding {
                display: flex; align-items: center; gap: 12px;
                .firm-initial {
                    width: 38px; height: 38px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    font-size: 16px; font-weight: 800; color: #4361ee; border: 1px solid #e2e8f0;
                }
                .firm-info-stack {
                    display: flex; flex-direction: column; gap: 1px;
                    h3 { font-size: 15px; font-weight: 800; color: #1e293b; margin: 0; line-height: 1.2; }
                    .associated-district { font-size: 11px; color: #64748b; font-weight: 600; }
                }
            }
            .firm-id { font-size: 9px; font-weight: 700; color: #94a3b8; background: #f8fafc; padding: 2px 8px; border-radius: 12px; }
        }

        .primary-stat {
            margin-bottom: 16px;
            .val { font-size: 32px; font-weight: 900; color: #0f172a; display: block; line-height: 1; margin-bottom: 2px; }
            .lab { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        }

        .metrics-row {
            display: flex; gap: 12px; margin-bottom: 24px;
            .mini-stat {
                flex: 1; padding: 12px; border-radius: 14px;
                .val { font-size: 18px; font-weight: 800; display: block; margin-bottom: 1px; }
                .lab { font-size: 10px; font-weight: 700; color: #64748b; }
                &.pending { background: #fff7ed; .val { color: #f97316; } }
                &.approved { background: #f0fdf4; .val { color: #22c55e; } }
            }
        }

        .tile-footer {
            .performance-strip {
                height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-bottom: 10px;
                .strip-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 3px; transition: width 1s ease; }
            }
            .performance-meta {
                display: flex; justify-content: space-between; align-items: center;
                span { font-size: 11px; font-weight: 600; color: #94a3b8; }
                strong { font-size: 13px; font-weight: 800; color: #475569; }
            }
        }

        .start-qic-btn {
            position: relative;
            z-index: 10;
            width: 100%;
            margin-top: 16px;
            height: 48px;
            background: #4361ee;
            color: white;
            border-radius: 12px;
            font-weight: 800;
            font-size: 13px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(67, 97, 238, 0.25);
            transition: all 0.3s ease;
            
            mat-icon { margin-right: 4px; font-size: 20px; width: 20px; height: 20px; }
            
            &:hover {
                background: #3046c8;
                transform: scale(1.02);
                box-shadow: 0 8px 20px rgba(67, 97, 238, 0.35);
            }
        }

        .card-interactive-layer {
            position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.9) 100%);
            display: flex; align-items: flex-end; justify-content: center; padding: 20px;
            gap: 6px; color: white; font-weight: 700; transform: translateY(20px); opacity: 0; transition: all 0.3s ease;
            pointer-events: none;
            font-size: 13px;
            mat-icon { font-size: 18px; width: 18px; height: 18px; }
        }
    }

    .empty-state-luxe {
        text-align: center; padding: 100px 40px; background: white; border-radius: 32px; border: 2px dashed #e2e8f0;
        .empty-icon-box {
            width: 80px; height: 80px; background: #f8fafc; border-radius: 24px; margin: 0 auto 24px;
            display: flex; align-items: center; justify-content: center;
            mat-icon { font-size: 40px; width: 40px; height: 40px; color: #cbd5e1; }
        }
        h3 { font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
        p { color: #64748b; max-width: 400px; margin: 0 auto 24px; font-size: 16px; }
        .reset-luxe-btn { background: #4361ee; color: white; border-radius: 12px; padding: 10px 24px; font-weight: 700; }
    }

    .luxe-loader { margin-bottom: 24px; mat-progress-bar { height: 8px; border-radius: 4px; } }

    .detail-panel {
        position: fixed; right: 0; top: 0; height: 100vh; width: 700px; background: white; z-index: 1001;
        box-shadow: -10px 0 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; animation: slideIn 0.4s cubic-bezier(0, 0, 0.2, 1); border-left: 1px solid #e2e8f0;
    }

    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .panel-header {
        padding: 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;
        .header-titles { h2 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 4px; } p { color: #64748b; font-weight: 600; margin: 0; } }
        .close-btn { color: #94a3b8; &:hover { color: #ef4444; background: #fee2e2; } }
    }

    .panel-content { flex: 1; overflow-y: auto; padding: 0 32px 32px; }
    .panel-loading { padding: 32px 0; }
    .table-container {
        margin-top: 24px;
        .app-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        th { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; padding-bottom: 16px; }
        td { padding: 16px 8px; border-bottom: 1px solid #f1f5f9; }
    }
    .app-number { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #4CAF50; font-size: 13px; }
    .farmer-cell { display: flex; flex-direction: column; .name { font-weight: 700; color: #1e293b; font-size: 14px; } .cnic { font-size: 12px; color: #94a3b8; font-weight: 600; } }
    .location-cell { display: flex; flex-direction: column; .dist { font-weight: 700; color: #1e293b; font-size: 13px; } .markaz { font-size: 11px; color: #94a3b8; font-weight: 600; } }
    .status-pill {
        padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;
        &[data-status="BOOKED"] { background: #dcfce7; color: #166534; }
        &[data-status="QIC_PENDING"] { background: #ffedd5; color: #9a3412; }
        &[data-status="QIC_APPROVED"] { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
        &[data-status="QIC_DEFFERED"] { background: #fee2e2; color: #991b1b; }
    }
    .panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 1000; animation: fadeIn 0.3s ease; }

    @media (max-width: 1200px) { .stats-summary { grid-template-columns: repeat(2, 1fr); } }
    
    .panel-footer {
      padding: 24px 32px;
      border-top: 1px solid #f1f5f9;
      background: white;
      
      .full-view-btn {
        width: 100%;
        height: 52px;
        background: #4361ee;
        color: white;
        border-radius: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-shadow: 0 4px 15px rgba(67, 97, 238, 0.2);
        transition: all 0.3s ease;

        &:hover {
          background: #3046c8;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(67, 97, 238, 0.3);
        }

        mat-icon { font-size: 20px; width: 20px; height: 20px; }
      }
    }

    .panel-empty {
      text-align: center;
      padding: 80px 40px;
      color: #94a3b8;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
      p { font-weight: 600; font-size: 15px; }
    }
  `]
})
export class QualityInspectionProcessComponent implements OnInit {
    private appService = inject(FarmerApplicationService);
    private authService = inject(AuthService);
    private router = inject(Router);

    isFirmUser = computed(() => this.authService.currentUser()?.role === 'FIRM' || this.authService.currentUser()?.role === 'ROLE_FIRM');

    // 1. Single source of state
    private rawData = signal<QualityInspectionProcess[]>([]);
    dashboardData = signal<QualityInspectionDashboard | null>(null);
    isLoading = signal<boolean>(true);
    isDashboardLoading = signal<boolean>(false);

    // 2. Filter state (Signals work perfectly with mat-select)
    divisionFilter = signal<number | null>(null);
    districtFilter = signal<number | null>(null);
    firmFilter = signal<number | null>(null);

    // 3. UI purely projects the filtered data
    filteredData = computed(() => {
        // We still keep this for local UI logic if needed, but primary data now comes from dashboardData
        return this.rawData();
    });

    flattenedData = computed(() => {
        const divisions = this.dashboardData()?.divisions || [];
        return divisions.map(div => ({
            ...div,
            allFirms: (div.districts || []).flatMap(dist =>
                dist.firms.map(f => ({
                    ...f,
                    districtName: dist.districtName,
                    districtId: dist.districtId
                }))
            ).sort((a, b) => b.totalApplications - a.totalApplications) // Sort by booked cases descending as it's a dashboard
        }));
    });

    groupedData = computed(() => {
        return this.dashboardData()?.divisions || [];
    });

    // 2. Computed Dropdown Options (Context-Aware)
    divisionOptions = computed(() => {
        const options = this.rawData().map(d => ({ id: d.divisionId, name: d.divisionName }));
        return this.getUniqueOptions(options);
    });

    districtOptions = computed(() => {
        const divId = this.divisionFilter();
        const source = divId ? this.rawData().filter(d => d.divisionId === divId) : this.rawData();
        const options = source.map(d => ({ id: d.districtId, name: d.districtName }));
        return this.getUniqueOptions(options);
    });

    firmOptions = computed(() => {
        const divId = this.divisionFilter();
        const dId = this.districtFilter();
        let source = this.rawData();
        if (divId) source = source.filter(d => d.divisionId === divId);
        if (dId) source = source.filter(d => d.districtId === dId);

        const options = source.flatMap(d => d.firms.map(f => ({ id: f.firmId, name: f.firmName })));
        return this.getUniqueOptions(options);
    });

    // 3. Overall Statistics Hero
    summary = computed(() => {
        const d = this.dashboardData();
        if (!d) return { total: 0, pending: 0, approved: 0, progress: 0 };

        const total = Number(d.totalBooked || 0);
        const approved = Number(d.totalApproved || 0);
        const pending = Number(d.totalPending || 0);

        const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
        return {
            total,
            pending,
            approved,
            progress
        };
    });

    totalResultsCount = computed(() => {
        const d = this.dashboardData();
        if (!d || !d.divisions) return 0;

        return d.divisions.reduce((acc, div) =>
            acc + (div.districts || []).reduce((dAcc, dist) =>
                dAcc + (dist.firms || []).length, 0), 0);
    });

    // Detail Panel State
    selectedFirmDetails = signal<FirmInspectionStats | null>(null);
    selectedDistrictName = signal<string>('');
    details = signal<FarmerApplication[]>([]);
    isDetailsLoading = signal<boolean>(false);
    displayedColumns = ['appNo', 'farmer', 'implement', 'location', 'status'];

    // Collapse/Expand state
    expandedDivisions = signal<Set<number>>(new Set());
    expandedDistricts = signal<Set<number>>(new Set());

    toggleDivision(id: number) {
        const set = new Set(this.expandedDivisions());
        if (set.has(id)) set.delete(id);
        else set.add(id);
        this.expandedDivisions.set(set);
    }

    toggleDistrict(id: number) {
        const set = new Set(this.expandedDistricts());
        if (set.has(id)) set.delete(id);
        else set.add(id);
        this.expandedDistricts.set(set);
    }

    isDivisionExpanded(id: number) {
        return this.expandedDivisions().has(id);
    }

    isDistrictExpanded(id: number) {
        return this.expandedDistricts().has(id);
    }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);

        // 1. Load context data once for dropdowns
        this.appService.getQualityInspections().subscribe({
            next: (res: QualityInspectionProcess[]) => {
                this.rawData.set(res);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });

        // 2. Load the actual dashboard view
        this.refreshDashboard();
    }

    refreshDashboard() {
        this.isDashboardLoading.set(true);
        this.appService.getQualityInspectionDashboard(
            this.divisionFilter() || undefined,
            this.districtFilter() || undefined,
            this.firmFilter() || undefined
        ).subscribe({
            next: (res: QualityInspectionDashboard) => {
                try {
                    this.dashboardData.set(res);
                } catch (err) {
                    console.error('Error updating dashboard data:', err);
                } finally {
                    this.isDashboardLoading.set(false);
                }
            },
            error: (err) => {
                console.error('Failed to load dashboard:', err);
                this.isDashboardLoading.set(false);
            }
        });
    }

    onFilterChange() {
        // Check if selected district/firm is still valid under higher-level filters
        const divId = this.divisionFilter();
        const dId = this.districtFilter();
        const fId = this.firmFilter();

        if (divId && dId) {
            const isValidDistrict = this.rawData().some(d => d.divisionId === divId && d.districtId === dId);
            if (!isValidDistrict) {
                this.districtFilter.set(null);
                this.firmFilter.set(null);
            }
        }

        if (dId && fId) {
            const district = this.rawData().find(d => d.districtId === dId);
            const hasFirm = district?.firms.some(f => f.firmId === fId);
            if (!hasFirm) {
                this.firmFilter.set(null);
            }
        }

        this.refreshDashboard();
    }

    clearFilters() {
        this.divisionFilter.set(null);
        this.districtFilter.set(null);
        this.firmFilter.set(null);
        this.refreshDashboard();
    }

    viewDetails(districtId: number, districtName: string, firm: FirmInspectionStats) {
        this.selectedDistrictName.set(districtName);
        this.selectedFirmDetails.set(firm);
        this.details.set(firm.applications || []);
    }

    startQicAction(firm: any, event: Event) {
        event.stopPropagation();
        this.router.navigate(['/portal/quality-inspection/details'], {
            queryParams: {
                districtId: this.rawData().find(d => d.firms.some(f => f.firmId === firm.firmId))?.districtId,
                districtName: firm.districtName,
                firmId: firm.firmId,
                firmName: firm.firmName,
                status: 'QIC_REQUESTED'
            }
        });
    }

    closeDetails() {
        this.selectedFirmDetails.set(null);
        this.details.set([]);
    }

    goToFullView() {
        const firm = this.selectedFirmDetails();
        if (!firm) return;

        this.router.navigate(['/portal/quality-inspection/details'], {
            queryParams: {
                districtId: this.rawData().find(d => d.firms.some(f => f.firmId === firm.firmId))?.districtId,
                districtName: this.selectedDistrictName(),
                firmId: firm.firmId,
                firmName: firm.firmName
            }
        });
    }

    goToReportsList() {
        this.router.navigate(['/portal/quality-inspection/reports']);
    }

    private getUniqueOptions(options: { id: number, name: string }[]) {
        return options
            .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}
