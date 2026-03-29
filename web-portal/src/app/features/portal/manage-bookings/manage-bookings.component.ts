import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BookingService, BookingRequest } from '../../../core/services/booking.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-manage-bookings',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatSnackBarModule,
        MatTableModule,
        MatProgressSpinnerModule
    ],
    template: `
    <div class="booking-page">
      <div class="header">
        <div class="title-section">
          <h1>Booking & Allotment Process</h1>
          <p>Search and secure farmer applications for equipment procurement.</p>
        </div>
      </div>

      <div class="search-section">
        <mat-card class="glass-panel">
          <form [formGroup]="searchForm" (ngSubmit)="search()" class="search-form">
            <mat-form-field appearance="outline" class="cnic-field">
              <mat-label>Search by Farmer CNIC</mat-label>
              <input matInput formControlName="cnic" placeholder="12345-1234567-1">
              <mat-icon matPrefix>search</mat-icon>
              <mat-hint>Enter the 13-digit CNIC of the successful applicant</mat-hint>
            </mat-form-field>
            <button mat-flat-button color="primary" class="search-btn" [disabled]="searchForm.invalid || isSearching()">
              <mat-icon *ngIf="!isSearching()">find_in_page</mat-icon>
              <mat-spinner diameter="20" *ngIf="isSearching()"></mat-spinner>
              <span>Inspect Application</span>
            </button>
          </form>
        </mat-card>
      </div>

      <!-- Application Details found -->
      <div class="details-section" *ngIf="foundApplication()">
        <mat-card class="application-summary-card">
          <div class="badge-row">
            <span class="status-badge" [class.booked]="foundApplication()?.status === 'BOOKED'">
              {{foundApplication()?.status}}
            </span>
          </div>
          
          <div class="content-grid">
            <div class="info-block">
              <label>Farmer Name</label>
              <h3>{{foundApplication()?.farmer?.name}}</h3>
            </div>
            <div class="info-block">
              <label>Application #</label>
              <h3>{{foundApplication()?.applicationNumber}}</h3>
            </div>
            <div class="info-block">
              <label>District</label>
              <h3>{{foundApplication()?.district?.name}}</h3>
            </div>
            <div class="info-block">
              <label>Requested Implement</label>
              <h3 class="highlight">{{foundApplication()?.implement?.name}}</h3>
            </div>
          </div>

          <!-- Booking Form -->
          <div class="booking-form-area" *ngIf="foundApplication()?.status !== 'BOOKED'">
             <div class="divider"></div>
             <h3>Secure Booking Details</h3>
             <form [formGroup]="bookingForm" class="booking-form">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>CDR Number</mat-label>
                    <input matInput formControlName="cdrNo" placeholder="E.g. 0543219">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>CDR Bank Name</mat-label>
                    <input matInput formControlName="cdrBankName" placeholder="E.g. Bank of Punjab">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>CDR Amount</mat-label>
                    <input matInput type="number" formControlName="cdrAmount">
                    <span matPrefix>Rs.&nbsp;</span>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Additional Remarks</mat-label>
                  <textarea matInput formControlName="remarks" rows="2"></textarea>
                </mat-form-field>
                <div class="action-row">
                   <button mat-flat-button color="accent" class="confirm-btn" [disabled]="bookingForm.invalid || isProcessing()" (click)="confirmBooking()">
                      <mat-icon *ngIf="!isProcessing()">verified_user</mat-icon>
                      <mat-spinner diameter="20" *ngIf="isProcessing()"></mat-spinner>
                      <span>Initialize Official Booking</span>
                   </button>
                </div>
             </form>
          </div>
        </mat-card>
      </div>

      <!-- My Bookings History -->
      <div class="history-section">
        <div class="section-title">
          <h2>My Active Bookings</h2>
          <button mat-button color="primary" (click)="loadMyBookings()">
             <mat-icon>refresh</mat-icon> Sync
          </button>
        </div>
        
        <mat-card class="table-card" *ngIf="myBookings().length > 0; else emptyState">
          <table mat-table [dataSource]="myBookings()" class="bookings-table">
            <ng-container matColumnDef="appNo">
              <th mat-header-cell *matHeaderCellDef> Application # </th>
              <td mat-cell *matCellDef="let b"> {{b.applicationNumber}} </td>
            </ng-container>
            <ng-container matColumnDef="farmer">
              <th mat-header-cell *matHeaderCellDef> Farmer </th>
              <td mat-cell *matCellDef="let b"> {{b.farmer?.name}} </td>
            </ng-container>
            <ng-container matColumnDef="implement">
              <th mat-header-cell *matHeaderCellDef> Implement </th>
              <td mat-cell *matCellDef="let b"> {{b.implement?.name}} </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Status </th>
              <td mat-cell *matCellDef="let b"> 
                <span class="status-chip">{{b.status}}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card>

        <ng-template #emptyState>
           <div class="empty-bookings">
              <mat-icon>move_to_inbox</mat-icon>
              <p>No active bookings found for your firm.</p>
           </div>
        </ng-template>
      </div>
    </div>
  `,
    styles: [`
    .booking-page { padding: 32px; max-width: 1100px; margin: 0 auto; }
    .header { margin-bottom: 32px; h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; } p { color: #64748b; margin-top: 4px; } }
    .glass-panel { padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .search-form { display: flex; gap: 20px; align-items: center; .cnic-field { flex: 1; } .search-btn { height: 56px; padding: 0 32px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; } }
    .details-section { margin-top: 32px; animation: slideUp 0.4s ease; }
    .application-summary-card { padding: 32px; border-radius: 24px; border: 1px solid #10b98130; }
    .badge-row { margin-bottom: 24px; .status-badge { padding: 6px 16px; border-radius: 20px; background: #fef3c7; color: #92400e; font-weight: 800; font-size: 12px; text-transform: uppercase; &.booked { background: #dcfce7; color: #166534; } } }
    .content-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; .info-block { display: flex; flex-direction: column; label { font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; } h3 { margin: 8px 0 0; color: #1e293b; font-weight: 800; &.highlight { color: #10b981; } } } }
    .booking-form-area { .divider { height: 1px; background: #f1f5f9; margin-bottom: 24px; } h3 { font-weight: 900; color: #1e293b; margin-bottom: 20px; } .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; } .full-width { width: 100%; margin-top: 10px; } .action-row { display: flex; justify-content: flex-end; margin-top: 24px; .confirm-btn { height: 52px; padding: 0 40px; border-radius: 14px; font-weight: 800; gap: 10px; display: flex; align-items: center; } } }
    .history-section { margin-top: 56px; .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h2 { font-weight: 900; color: #1e293b; margin: 0; } } .table-card { border-radius: 20px; overflow: hidden; padding: 0; } .bookings-table { width: 100%; th { background: #f8fafc; font-weight: 800; color: #64748b; padding: 16px; } td { padding: 16px; font-weight: 500; color: #334155; } .status-chip { background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 12px; } } }
    .empty-bookings { padding: 60px; text-align: center; color: #94a3b8; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class ManageBookingsComponent implements OnInit {
    private fb = inject(FormBuilder);
    private bookingService = inject(BookingService);
    private snackBar = inject(MatSnackBar);

    searchForm: FormGroup;
    bookingForm: FormGroup;

    isSearching = signal(false);
    isProcessing = signal(false);
    foundApplication = signal<any | null>(null);
    myBookings = signal<any[]>([]);

    displayedColumns: string[] = ['appNo', 'farmer', 'implement', 'status'];

    constructor() {
        this.searchForm = this.fb.group({
            cnic: ['', [Validators.required, Validators.pattern(/^[0-9+]{5}-[0-9+]{7}-[0-9+]{1}$/)]]
        });

        this.bookingForm = this.fb.group({
            cdrNo: ['', Validators.required],
            cdrBankName: ['', Validators.required],
            cdrAmount: [0, [Validators.required, Validators.min(1)]],
            remarks: ['']
        });
    }

    ngOnInit() {
        this.loadMyBookings();
    }

    loadMyBookings() {
        this.bookingService.getMyBookings().subscribe({
            next: (data: any[]) => this.myBookings.set(data),
            error: () => this.showNotification('Failed to load your bookings', 'error')
        });
    }

    search() {
        if (this.searchForm.invalid) return;

        this.isSearching.set(true);
        this.foundApplication.set(null);
        const cnic = this.searchForm.value.cnic;

        this.bookingService.searchByCnic(cnic)
            .pipe(finalize(() => this.isSearching.set(false)))
            .subscribe({
                next: (app: any) => {
                    this.foundApplication.set(app);
                    const cdrAmount = app.implement?.farmerShare || 0;
                    this.bookingForm.patchValue({ cdrAmount });
                },
                error: () => this.showNotification('Application not found or ineligible for booking', 'error')
            });
    }

    confirmBooking() {
        if (this.bookingForm.invalid || !this.foundApplication()) return;

        this.isProcessing.set(true);
        const request: BookingRequest = {
            applicationId: this.foundApplication().id,
            implementId: this.foundApplication().implement.id,
            ...this.bookingForm.value
        };

        this.bookingService.processBooking(request)
            .pipe(finalize(() => this.isProcessing.set(false)))
            .subscribe({
                next: () => {
                    this.showNotification('Booking successfully secured!', 'success');
                    this.foundApplication.set(null);
                    this.searchForm.reset();
                    this.bookingForm.reset();
                    this.loadMyBookings();
                },
                error: () => this.showNotification('Failed to process booking', 'error')
            });
    }

    private showNotification(message: string, type: 'success' | 'error') {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
        });
    }
}
