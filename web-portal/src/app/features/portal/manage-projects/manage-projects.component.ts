import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { ImplementService } from '../../../core/services/implement.service';
import { Project } from '../../../core/models/project.model';
import { Implement } from '../../../core/models/implement.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HttpClientModule,
    RouterModule
  ],
  template: `
    <div class="location-page">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Syncing Project Data</h3>
            <p>Gathering infrastructure details from server...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Project Portfolio</h1>
          <p>Orchestrate high-impact initiatives, financial benchmarks, and operational targets.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="registerProject()">
          <mat-icon>add</mat-icon> Initialize Project
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Project</mat-label>
          <input matInput placeholder="Search by name or description..." (keyup)="applySearchFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="select-field">
          <mat-label>Filter by Implements</mat-label>
          <mat-select (selectionChange)="onImplementFilterChange($event.value)" [multiple]="true">
            <mat-option *ngFor="let imp of implements" [value]="imp.id">
              {{imp.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="project-grid" *ngIf="dataSource.filteredData.length > 0 && !isLoading()">
        <div class="project-tile" *ngFor="let element of dataSource.filteredData">
          <div class="tile-header">
            <div class="status-indicator" [class.active]="element.active"></div>
            <div class="header-main">
              <h3>{{element.name}}</h3>
              <span class="implement-name" *ngIf="element.implementName">{{element.implementName}}</span>
            </div>
            <div class="tile-actions">
              <button mat-icon-button class="edit-btn" (click)="editProject(element.id!)" title="Edit">
                <mat-icon>edit_note</mat-icon>
              </button>
              <button mat-icon-button class="delete-btn" (click)="deleteProject(element.id!)" title="Delete">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>

          <div class="tile-content">
            <p class="description" *ngIf="element.description">{{element.description | slice:0:80}}{{element.description.length > 80 ? '...' : ''}}</p>
            <p class="description no-val" *ngIf="!element.description">No description provided for this infrastructure project.</p>
            
            <div class="metrics-row">
              <div class="metric">
                <mat-icon>groups</mat-icon>
                <div class="metric-info">
                  <span class="val">{{element.totalBeneficiary | number}}</span>
                  <span class="lbl">Beneficiaries</span>
                </div>
              </div>
              <div class="metric">
                <mat-icon>event_available</mat-icon>
                <div class="metric-info">
                  <span class="val status-text" [class.active]="element.active">{{element.active ? 'Active' : 'Paused'}}</span>
                  <span class="lbl">Operational</span>
                </div>
              </div>
            </div>

            <div class="costing-section">
              <div class="cost-item primary-cost">
                <div class="cost-header">
                  <mat-icon>payments</mat-icon>
                  <span>Total Project Cost</span>
                </div>
                <div class="cost-amount">
                  {{element.totalProjectCost | currency:'PKR':'symbol':'1.0-0'}}
                </div>
              </div>
              
              <div class="cost-sub-grid">
                <div class="cost-item sub-cost">
                  <span class="lbl">Subsidy Allocation</span>
                  <span class="val">{{element.subsidyCost | currency:'PKR':'symbol':'1.0-0'}}</span>
                </div>
                <div class="cost-item sub-cost">
                  <span class="lbl">Unit Benchmark</span>
                  <span class="val">{{element.unitCost | currency:'PKR':'symbol':'1.0-0'}}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="tile-footer">
            <div class="progress-bar-container">
              <div class="progress-label">
                 <span>Subsidy Coverage</span>
                 <span>{{(element.subsidyCost / element.totalProjectCost) * 100 | number:'1.0-0'}}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="(element.subsidyCost / element.totalProjectCost) * 100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="dataSource.filteredData.length === 0 && !isLoading()">
        <mat-icon>folder_off</mat-icon>
        <h3>No Projects Found</h3>
        <p>No project records match your current criteria.</p>
      </div>
    </div>
  `,
  styles: [`
    .location-page { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; padding: 24px; background: #f8fafc; }
    
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      .title-section {
        h1 { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.8px; }
        p { font-size: 14px; color: #64748b; margin: 4px 0 0; }
      }
      .add-btn { height: 44px; border-radius: 12px; font-weight: 700; background-color: #4CAF50 !important; padding: 0 20px; box-shadow: 0 8px 16px rgba(76, 175, 80, 0.15); }
    }

    .filters { 
      display: flex; gap: 20px; 
      .search-field { width: 450px; } 
      .select-field { width: 300px; }
      ::ng-deep .mat-mdc-text-field-wrapper { background: white !important; border-radius: 16px !important; }
    }

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .project-tile {
      background: white; border-radius: 20px; border: 1px solid #f1f5f9; padding: 20px;
      display: flex; flex-direction: column; gap: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.1);
        border-color: #e2e8f0;
        
        .tile-actions { opacity: 1; transform: translateX(0); }
      }
    }

    .tile-header {
      display: flex; align-items: flex-start; gap: 16px; position: relative;
      
      .status-indicator {
        width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; margin-top: 10px; flex-shrink: 0;
        &.active { background: #4CAF50; box-shadow: 0 0 12px rgba(76, 175, 80, 0.5); }
      }

      .header-main {
        flex: 1;
        h3 { font-size: 18px; font-weight: 850; color: #0f172a; margin: 0; line-height: 1.2; letter-spacing: -0.4px; }
        .implement-name { font-size: 12px; font-weight: 700; color: #3b82f6; background: #eff6ff; padding: 2px 10px; border-radius: 6px; display: inline-block; margin-top: 6px; }
      }

      .tile-actions {
        display: flex; gap: 6px; opacity: 0; transform: translateX(8px); transition: all 0.3s ease;
        button { 
          width: 40px; height: 40px; line-height: 40px; border-radius: 12px; 
          mat-icon { font-size: 22px; width: 22px; height: 22px; }
          &.edit-btn { color: #64748b; &:hover { background: #f1f5f9; color: #1e293b; } }
          &.delete-btn { color: #ef4444; &:hover { background: #fef2f2; } }
        }
      }
    }

    .tile-content {
      display: flex; flex-direction: column; gap: 16px;
      
      .description { font-size: 14px; color: #475569; line-height: 1.5; margin: 0; min-height: 42px; font-weight: 500; }
      .no-val { font-style: italic; color: #cbd5e1; }

      .metrics-row {
        display: flex; gap: 24px; padding: 12px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
        
        .metric {
          display: flex; align-items: center; gap: 10px;
          mat-icon { color: #64748b; font-size: 22px; width: 22px; height: 22px; }
          .metric-info {
            display: flex; flex-direction: column;
            .val { font-size: 15px; font-weight: 800; color: #0f172a; }
            .lbl { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
            .status-text { color: #ef4444; &.active { color: #10b981; } }
          }
        }
      }

      .costing-section {
        background: #f8fafc; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
        
        .primary-cost {
          .cost-header {
            display: flex; align-items: center; gap: 6px;
            mat-icon { font-size: 16px; width: 16px; height: 16px; color: #4CAF50; }
            span { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          }
          .cost-amount { font-size: 24px; font-weight: 950; color: #0f172a; margin-top: 4px; letter-spacing: -0.5px; }
        }

        .cost-sub-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          .cost-item {
            display: flex; flex-direction: column;
            .lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
            .val { font-size: 15px; font-weight: 800; color: #334155; }
          }
        }
      }
    }

    .tile-footer {
      .progress-bar-container {
        display: flex; flex-direction: column; gap: 6px;
        .progress-label {
          display: flex; justify-content: space-between;
          span { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        }
        .progress-track { height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #81c784); border-radius: 10px; }
      }
    }

    .loader-overlay { 
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); 
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      .loader-container { 
        display: flex; flex-direction: column; align-items: center; gap: 20px;
        h3 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; }
        p { color: #64748b; }
      }
    }

    .empty-state {
      padding: 80px 24px; text-align: center; background: white; border-radius: 32px; border: 2px dashed #e2e8f0;
      mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.2; color: #4CAF50; }
      h3 { font-size: 24px; font-weight: 900; color: #1e293b; margin: 0; }
      p { margin: 12px 0 0; color: #64748b; font-size: 16px; }
    }

    ::ng-deep .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; }
  `]
})
export class ManageProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private implementService = inject(ImplementService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['name', 'implement', 'beneficiaries', 'financials', 'status', 'actions'];
  dataSource = new MatTableDataSource<Project>([]);
  implements: Implement[] = [];
  isLoading = signal(false);

  private filterValues = {
    search: '',
    implements: [] as number[]
  };

  ngOnInit() {
    this.setupFilterPredicate();
    this.loadProjects();
    this.implementService.getAll().subscribe(data => this.implements = data);
  }

  setupFilterPredicate() {
    this.dataSource.filterPredicate = (data: Project, filter: string) => {
      const searchTerms = JSON.parse(filter);
      const matchesSearch = !searchTerms.search ||
        data.name.toLowerCase().includes(searchTerms.search) ||
        (data.description && data.description.toLowerCase().includes(searchTerms.search));

      const matchesImplements = searchTerms.implements.length === 0 ||
        (data.implementId !== null && searchTerms.implements.includes(data.implementId));

      return matchesSearch && matchesImplements;
    };
  }

  loadProjects() {
    this.isLoading.set(true);
    this.projectService.getProjects()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.dataSource.data = data;
          this.dataSource.filter = JSON.stringify(this.filterValues);
        },
        error: () => this.showNotification('Failed to load projects.', 'error')
      });
  }

  applySearchFilter(event: Event) {
    this.filterValues.search = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = JSON.stringify(this.filterValues);
  }

  onImplementFilterChange(selectedIds: number[]) {
    this.filterValues.implements = selectedIds;
    this.dataSource.filter = JSON.stringify(this.filterValues);
  }

  registerProject() {
    this.router.navigate(['/portal/projects/register']);
  }

  editProject(id: number) {
    this.router.navigate(['/portal/projects/edit', id]);
  }

  deleteProject(id: number) {
    if (confirm('Are you sure you want to delete this project?')) {
      this.isLoading.set(true);
      this.projectService.deleteProject(id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('Project deleted successfully.', 'success');
            this.loadProjects();
          },
          error: () => this.showNotification('Failed to delete project.', 'error')
        });
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
}
