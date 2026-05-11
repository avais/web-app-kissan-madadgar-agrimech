import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FirmService } from '../../../core/services/firm.service';
import { Firm } from '../../../core/models/firm.model';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-manage-firms',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, RouterModule, MatProgressSpinnerModule, MatPaginatorModule],
  template: `
    <div class="manage-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Syncing Firms</h3>
            <p>Loading manufacturer and firm data...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Manufacturers & Firms</h1>
          <p>Manage registered manufacturers and their area of interest.</p>
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" [value]="searchQuery()" (input)="onSearch($event)" placeholder="Search firms by name...">
            <button *ngIf="searchQuery()" mat-icon-button (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
        <button mat-flat-button color="primary" class="add-btn" routerLink="register">
          <mat-icon>add</mat-icon> Register New Firm
        </button>
      </div>

      <mat-card class="table-card">
        <div class="table-scroll">
        <table mat-table [dataSource]="firms()" class="firms-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Firm Name </th>
            <td mat-cell *matCellDef="let element"> 
                <div class="firm-cell">
                    <mat-icon>business</mat-icon>
                    <span>{{element.name}}</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef> Email </th>
            <td mat-cell *matCellDef="let element"> {{element.email}} </td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef> Contact </th>
            <td mat-cell *matCellDef="let element"> {{element.phone || 'N/A'}} </td>
          </ng-container>

          <ng-container matColumnDef="ntn">
            <th mat-header-cell *matHeaderCellDef> NTN </th>
            <td mat-cell *matCellDef="let element" class="tax-cell" [title]="element.ntn || ''">{{ element.ntn || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="strn">
            <th mat-header-cell *matHeaderCellDef> STRN </th>
            <td mat-cell *matCellDef="let element" class="tax-cell" [title]="element.strn || ''">{{ element.strn || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef> Region </th>
            <td mat-cell *matCellDef="let element">
                <div class="location-cell"
                     [title]="(element.markazName || '') + ' — ' + (element.divisionName || '') + ' › ' + (element.districtName || '')">
                    <span class="loc-main">{{element.markazName || '—'}}</span>
                    <span class="loc-sub">{{element.divisionName}} › {{element.districtName}}</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="convener">
            <th mat-header-cell *matHeaderCellDef> Convener </th>
            <td mat-cell *matCellDef="let element"> {{element.convenerName || 'Not Assigned'}} </td>
          </ng-container>

          <ng-container matColumnDef="stats">
            <th mat-header-cell *matHeaderCellDef> Bookings </th>
            <td mat-cell *matCellDef="let element">
                <div class="stats-cell">
                    <span class="total" title="Total Bookings">
                        <mat-icon>bookmarks</mat-icon> {{element.totalBookings || 0}}
                    </span>
                    <span class="active" title="Approved (QIC) Bookings">
                        <mat-icon>verified</mat-icon> {{element.totalActiveBookings || 0}}
                    </span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let element">
                <span class="status-badge" [class.active]="element.active" [class.inactive]="!element.active">
                    {{element.active ? 'Operational' : 'Suspended'}}
                </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="primary" [routerLink]="['edit', element.id]" title="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>

        <mat-paginator [length]="totalElements()"
                      [pageSize]="pageSize()"
                      [pageIndex]="pageIndex()"
                      [pageSizeOptions]="[5, 10, 25, 100]"
                      (page)="handlePageEvent($event)"
                      aria-label="Select page">
        </mat-paginator>

        <div class="empty-state" *ngIf="firms().length === 0 && !isLoading()">
          <mat-icon>business</mat-icon>
          <h3>No Firms Registered</h3>
          <p>Click 'Register New Firm' to add your first manufacturer.</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .manage-container { position: relative; display: flex; flex-direction: column; gap: 16px; min-height: 400px; padding: 16px 20px; }
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
      h1 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 13px; color: #64748b; margin: 2px 0 0; }
      .title-section { display: flex; flex-direction: column; gap: 2px; flex-grow: 1; }
      .search-box {
        margin-top: 10px;
        max-width: 360px;
        height: 40px;
        background: var(--card-bg);
        border-radius: 12px;
        display: flex;
        align-items: center;
        padding-left: 16px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
        &:focus-within { border-color: #4CAF50; box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.1); }
        mat-icon { color: #94a3b8; margin-right: 8px; font-size: 20px; width: 20px; height: 20px; }
        input { border: none; outline: none; width: 100%; font-size: 13px; font-weight: 500; color: #1e293b; &::placeholder { color: #94a3b8; } }
      }
      .add-btn { height: 40px; border-radius: 10px; font-weight: 700; font-size: 13px; background-color: #4CAF50 !important; }
    }
    .table-card {
      border: none; border-radius: 14px; background: var(--card-bg); box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .table-scroll {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .firms-table {
      width: 100%;
      min-width: 960px;
    }
    .tax-cell {
      font-size: 11px;
      font-family: ui-monospace, monospace;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .firm-cell {
      display: flex; align-items: center; gap: 8px;
      mat-icon { color: #4CAF50; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      span { font-weight: 700; color: #1e293b; font-size: 13px; line-height: 1.25; }
    }
    .location-cell {
      display: flex; flex-direction: column; gap: 0; line-height: 1.2; max-width: 200px;
      .loc-main { font-size: 12px; font-weight: 600; color: #1e293b; }
      .loc-sub { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }
    .stats-cell {
        display: flex; gap: 10px; align-items: center; flex-wrap: nowrap;
        span { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; font-size: 12px; }
        .total { color: #64748b; mat-icon { font-size: 15px; width: 15px; height: 15px; } }
        .active { color: #15803d; mat-icon { font-size: 15px; width: 15px; height: 15px; } }
    }
    .status-badge {
        display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.3;
        &.active { background: #dcfce7; color: #166534; }
        &.inactive { background: #fee2e2; color: #991b1b; }
    }

    :host ::ng-deep {
      .table-card table.mat-mdc-table {
        .mat-mdc-header-cell {
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.02em;
        }
        .mat-mdc-cell {
          padding: 6px 10px;
          font-size: 13px;
          color: #334155;
          vertical-align: middle;
        }
        .mat-mdc-row { height: auto; min-height: 40px; }
        .mat-mdc-header-row { min-height: 40px; }
      }
      .table-scroll table.firms-table.mat-mdc-table {
        .mat-mdc-cell.mat-column-actions,
        .mat-mdc-header-cell.mat-column-actions {
          position: sticky;
          right: 0;
          min-width: 96px;
          text-align: right;
          box-sizing: border-box;
        }
        .mat-mdc-cell.mat-column-actions {
          z-index: 2;
          background: var(--card-bg);
          box-shadow: -6px 0 10px -4px rgba(15, 23, 42, 0.12);
        }
        .mat-mdc-header-cell.mat-column-actions {
          z-index: 3;
          background: #f1f5f9;
          box-shadow: -6px 0 10px -4px rgba(15, 23, 42, 0.08);
        }
      }
      .table-card .mat-mdc-cell .mat-mdc-icon-button.mat-mdc-button-base {
        --mdc-icon-button-state-layer-size: 32px;
        width: 32px;
        height: 32px;
        padding: 0;
      }
      .table-card .mat-mdc-cell .mat-mdc-icon-button .mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .table-card .mat-mdc-paginator {
        min-height: 48px;
        padding: 0 8px;
      }
      .table-card .mat-mdc-paginator-container {
        min-height: 48px;
      }
    }
    .empty-state {
        padding: 64px; text-align: center; color: #64748b;
        mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.3; color: #4CAF50; }
        h3 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
    }
  `]
})
export class ManageFirmsComponent implements OnInit {
  private firmService = inject(FirmService);
  firms = signal<Firm[]>([]);
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);
  searchQuery = signal('');
  private searchSubject = new Subject<string>();
  isLoading = signal(false);
  displayedColumns = ['name', 'email', 'phone', 'ntn', 'strn', 'location', 'convener', 'stats', 'status', 'actions'];

  ngOnInit() {
    this.loadFirms();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.pageIndex.set(0); // Reset to first page on search
      this.loadFirms();
    });
  }

  loadFirms() {
    this.isLoading.set(true);
    this.firmService.getFirms(this.pageIndex(), this.pageSize(), this.searchQuery())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.firms.set(response.content);
          this.totalElements.set(response.totalElements);
        },
        error: (err) => console.error('Error loading firms', err)
      });
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchSubject.next('');
    this.pageIndex.set(0);
    this.loadFirms();
  }

  handlePageEvent(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.loadFirms();
  }
}
