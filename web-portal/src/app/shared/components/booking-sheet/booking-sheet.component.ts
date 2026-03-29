import { Component, inject, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import * as L from 'leaflet';
import { Machinery } from '../../models/machinery.model';

@Component({
  selector: 'app-booking-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatSelectModule
  ],
  template: `
    <div class="booking-sheet-wrapper">
      <div class="header">
        <mat-icon class="back-icon" (click)="close()">arrow_back</mat-icon>
        <h2>Book Machine for Rental</h2>
        <div class="header-spacer"></div>
      </div>

      <mat-stepper #stepper [linear]="true" class="custom-stepper">
        <!-- Step 1: Machine Details -->
        <mat-step [stepControl]="machineStepForm">
          <ng-template matStepLabel>Machine Details</ng-template>
          <div class="step-container">
            <div class="machine-summary-card">
              <div class="machine-image-placeholder">
                <mat-icon>agriculture</mat-icon>
              </div>
              <div class="machine-details">
                <h3>{{ data.title }}</h3>
                <p>{{ data.firmName }}</p>
                <div class="price-tag">PKR {{ data.rentPerHour }}/hr</div>
              </div>
            </div>
            <button mat-flat-button color="primary" class="next-btn" matStepperNext>Next</button>
          </div>
        </mat-step>

        <!-- Step 2: Booking Dates -->
        <mat-step [stepControl]="dateStepForm">
          <ng-template matStepLabel>Booking Dates</ng-template>
          <div class="step-container">
            <form [formGroup]="dateStepForm" class="date-form">
              <div class="form-section">
                <div class="section-label">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Booking Start Date <span class="required">*</span></span>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Select Date</mat-label>
                  <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                  <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>
                
                <div class="time-picker-row">
                  <mat-form-field appearance="outline" class="time-field">
                    <mat-select formControlName="startHH" placeholder="HH">
                      <mat-option *ngFor="let h of hours" [value]="h">{{h}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <span class="colon">:</span>
                  <mat-form-field appearance="outline" class="time-field">
                    <mat-select formControlName="startMM" placeholder="MM">
                      <mat-option *ngFor="let m of minutes" [value]="m">{{m}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ampm-field">
                    <mat-select formControlName="startAMPM" placeholder="AM/PM">
                      <mat-option value="AM">AM</mat-option>
                      <mat-option value="PM">PM</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <div class="section-label">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Booking End Date <span class="required">*</span></span>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Select Date</mat-label>
                  <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                  <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>

                <div class="time-picker-row">
                  <mat-form-field appearance="outline" class="time-field">
                    <mat-select formControlName="endHH" placeholder="HH">
                      <mat-option *ngFor="let h of hours" [value]="h">{{h}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <span class="colon">:</span>
                  <mat-form-field appearance="outline" class="time-field">
                    <mat-select formControlName="endMM" placeholder="MM">
                      <mat-option *ngFor="let m of minutes" [value]="m">{{m}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ampm-field">
                    <mat-select formControlName="endAMPM" placeholder="AM/PM">
                      <mat-option value="AM">AM</mat-option>
                      <mat-option value="PM">PM</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </form>
            <button mat-flat-button color="primary" class="next-btn" matStepperNext [disabled]="!dateStepForm.valid">Next</button>
          </div>
        </mat-step>

        <!-- Step 3: Location -->
        <mat-step [stepControl]="locationStepForm">
          <ng-template matStepLabel>Location</ng-template>
          <div class="step-container">
            <form [formGroup]="locationStepForm" class="location-form">
              <div class="form-section">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Distance (km)</mat-label>
                  <input matInput type="number" formControlName="distance">
                  <mat-icon matSuffix>straighten</mat-icon>
                </mat-form-field>
                
                <div class="section-label">
                  <mat-icon>place</mat-icon>
                  <span>Location Address</span>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Enter Address</mat-label>
                  <input matInput formControlName="address" placeholder="e.g. Cbr, Lahore">
                </mat-form-field>
              </div>

              <div class="map-selection-container">
                <div #bookingMap class="booking-map"></div>
                <!-- Simulating floating controls from image -->
                <div class="map-controls">
                  <mat-icon>add</mat-icon>
                  <mat-icon>remove</mat-icon>
                  <mat-icon>my_location</mat-icon>
                  <mat-icon>fullscreen</mat-icon>
                </div>
              </div>
            </form>
            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Previous</button>
              <button mat-flat-button color="primary" class="next-btn" matStepperNext [disabled]="!locationStepForm.valid">Next</button>
            </div>
          </div>
        </mat-step>

        <!-- Step 4: Confirm -->
        <mat-step>
          <ng-template matStepLabel>Confirm</ng-template>
          <div class="step-container">
            <div class="confirmation-summary">
              <h4>Booking Summary</h4>
              <div class="summary-item">
                <span>Start</span>
                <span>{{ dateStepForm.value.startDate | date:'MMM d, y' }} at {{ dateStepForm.value.startHH }}:{{ dateStepForm.value.startMM }} {{ dateStepForm.value.startAMPM }}</span>
              </div>
              <div class="summary-item">
                <span>Location</span>
                <span>{{ locationStepForm.value.address }}</span>
              </div>
              
              <div class="cost-breakdown">
                <div class="cost-row">
                  <span>Base Rent</span>
                  <span>PKR {{ totalBaseRent() }}</span>
                </div>
                <div class="cost-row">
                  <span>Service Fee</span>
                  <span>PKR 150</span>
                </div>
                <div class="cost-row total">
                  <span>Total Estimated</span>
                  <span>PKR {{ totalCost() }}</span>
                </div>
              </div>
            </div>
            
            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Previous</button>
              <button mat-flat-button color="primary" class="confirm-btn" (click)="confirm()">Confirm Booking</button>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .booking-sheet-wrapper {
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow-y: auto;
    }

    .header {
      background: #2e7d32;
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      h2 { margin: 0; font-size: 18px; font-weight: 600; }
      .back-icon { cursor: pointer; }
      .header-spacer { flex: 1; }
    }

    .custom-stepper {
      background: transparent;
      flex: 1;
    }

    ::ng-deep .mat-step-header {
      padding: 12px 16px !important;
      .mat-step-icon { background-color: #e8f5e9; color: #2e7d32; }
      .mat-step-icon-selected { background-color: #2e7d32; color: white; }
    }

    .step-container {
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Step 1 Styles */
    .machine-summary-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border: 1px solid #edf2f7;
    }
    .machine-image-placeholder {
      width: 80px;
      height: 80px;
      background: #f1f8e9;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #2e7d32; font-size: 40px; width: 40px; height: 40px; }
    }
    .machine-details {
      flex: 1;
      h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1a202c; }
      p { margin: 4px 0 8px; font-size: 14px; color: #718096; }
      .price-tag { font-weight: 800; color: #2e7d32; font-size: 14px; }
    }

    /* Step 2 & 3 Styles */
    .form-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border: 1px solid #edf2f7;
    }
    .section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-weight: 600;
      color: #2e7d32;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .required { color: #e53e3e; }
    }
    .full-width { width: 100%; }

    .time-picker-row {
      display: flex;
      align-items: center;
      gap: 12px;
      .time-field { width: 80px; }
      .ampm-field { width: 100px; }
      .colon { font-weight: 700; font-size: 18px; margin-top: -20px; }
    }

    .map-selection-container {
      height: 240px;
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #edf2f7;
      margin-bottom: 16px;
    }
    .booking-map { height: 100%; width: 100%; }
    .map-controls {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      padding: 4px;
      gap: 12px;
      z-index: 400;
      mat-icon { cursor: pointer; color: #4a5568; font-size: 20px; width: 20px; height: 20px; }
    }

    /* Step 4 Styles */
    .confirmation-summary {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      h4 { margin: 0 0 16px; font-size: 18px; color: #2e7d32; }
    }
    .summary-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
      span:first-child { font-size: 12px; color: #718096; font-weight: 600; margin-bottom: 2px; }
      span:last-child { font-size: 15px; color: #1a202c; font-weight: 500; }
    }
    .cost-breakdown {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 2px dashed #edf2f7;
    }
    .cost-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
      color: #4a5568;
      &.total {
        margin-top: 16px;
        font-weight: 800;
        font-size: 18px;
        color: #2e7d32;
      }
    }

    .next-btn, .confirm-btn {
      height: 54px;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 700;
      background-color: #2e7d32 !important;
    }
    .stepper-actions {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 16px;
      align-items: center;
    }
  `]
})
export class BookingSheetComponent implements AfterViewInit {
  @ViewChild('bookingMap') mapContainer?: ElementRef;

  data = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<BookingSheetComponent>);
  private fb = inject(FormBuilder);

  private map?: L.Map;

  hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  minutes = ['00', '15', '30', '45'];

  machineStepForm = this.fb.group({});

  dateStepForm = this.fb.group({
    startDate: [new Date(), Validators.required],
    startHH: ['09', Validators.required],
    startMM: ['00', Validators.required],
    startAMPM: ['AM', Validators.required],
    endDate: [new Date(), Validators.required],
    endHH: ['05', Validators.required],
    endMM: ['00', Validators.required],
    endAMPM: ['PM', Validators.required]
  });

  locationStepForm = this.fb.group({
    distance: [25, [Validators.required, Validators.min(1)]],
    address: ['Lahore Cantt, Lahore', Validators.required]
  });

  totalBaseRent = computed(() => {
    // For now we assume a 4 hour minimum or calculate based on mock duration
    return this.data.rentPerHour * 8;
  });

  totalCost = computed(() => {
    return this.totalBaseRent() + 150;
  });

  ngAfterViewInit() {
    // We delay map init to ensure the stepper has rendered the element
    setTimeout(() => this.initMap(), 500);
  }

  private initMap() {
    if (this.map || !this.mapContainer) return;

    // Center on Lahore as per reference screenshot
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false
    }).setView([31.5204, 74.3587], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    // Custom bright green marker as per screenshot
    const customIcon = L.divIcon({
      html: '<div style="background: #00D100; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
      className: 'custom-map-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([31.5204, 74.3587], { icon: customIcon }).addTo(this.map);
  }

  close() {
    this.ref.close();
  }

  confirm() {
    alert('Booking request sent successfully!');
    this.ref.close();
  }
}
