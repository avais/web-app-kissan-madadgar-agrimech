import { Component, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MachineryService } from '../../core/services/machinery.service';
import { MachineryCardComponent } from '../../shared/components/machinery-card/machinery-card.component';
import { BookingSheetComponent } from '../../shared/components/booking-sheet/booking-sheet.component';
import { Machinery } from '../../shared/models/machinery.model';

import * as L from 'leaflet';
import 'leaflet-defaulticon-compatibility';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatSliderModule,
    MatCheckboxModule,
    MachineryCardComponent
  ],
  template: `
    <div class="search-container">
      <!-- Desktop Sidebar Filters -->
      <aside class="filter-sidebar">
        <div class="filter-header">
          <h3>Filters</h3>
          <button mat-button color="primary" (click)="resetFilters()">Reset</button>
        </div>

        <div class="filter-group">
          <label>Machinery Type</label>
          <mat-checkbox class="block-check" checked>Tractors</mat-checkbox>
          <mat-checkbox class="block-check" checked>Harvesters</mat-checkbox>
          <mat-checkbox class="block-check">Levelers</mat-checkbox>
        </div>

        <div class="filter-group">
          <label>Price Range (PKR / hr)</label>
          <mat-slider min="0" max="5000" step="100" showTickMarks discrete>
            <input matSliderThumb [(ngModel)]="maxPrice">
          </mat-slider>
          <div class="slider-labels">
            <span>0</span>
            <span>Up to PKR {{ maxPrice() }}</span>
          </div>
        </div>

        <div class="filter-group">
          <label>Location</label>
          <div class="city-chips">
             @for (city of cities; track city) {
               <div class="city-chip" [class.active]="selectedCity() === city" (click)="selectedCity.set(city)">
                 {{ city }}
               </div>
             }
          </div>
        </div>
      </aside>

      <!-- Main Results Area -->
      <div class="results-main">
        <div class="results-header">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="searchQuery" placeholder="Search by name, firm or tool...">
          </mat-form-field>

          <div class="results-meta">
            <span class="count-text"><strong>{{ filteredMachines().length }}</strong> implements found</span>
            <div class="view-controls">
               <mat-button-toggle-group [(ngModel)]="viewMode" class="custom-toggle-group">
                <mat-button-toggle value="list">
                    <mat-icon>grid_view</mat-icon>
                </mat-button-toggle>
                <mat-button-toggle value="map">
                  <div class="toggle-content">
                    <mat-icon>map</mat-icon>
                    <span>Map</span>
                  </div>
                </mat-button-toggle>
              </mat-button-toggle-group>
            </div>
          </div>
        </div>

        <div class="results-content">
          @if (viewMode() === 'list') {
            <div class="machinery-grid">
              @for (machine of filteredMachines(); track machine.id) {
                <app-machinery-card 
                  [machine]="machine" 
                  (onBook)="openBookingSheet($event)">
                </app-machinery-card>
              } @empty {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <p>No machinery matches your current filters.</p>
                </div>
              }
            </div>
          } @else {
            <div class="map-view-wrapper">
               <div #mapContainer class="leaflet-map-container"></div>
               
               <!-- Floating Directional Badges (Reference Style) -->
               <div class="map-badge top-left">
                 <mat-icon>west</mat-icon> <span>1 machine</span>
               </div>
               <div class="map-badge top-right">
                 <mat-icon>east</mat-icon> <span>3 machines</span>
               </div>
               <div class="map-badge bottom-left">
                 <mat-icon>south</mat-icon> <span>2 machines</span>
               </div>

               <!-- Floating Map Controls -->
               <div class="map-controls">
                 <button class="control-btn" (click)="zoomIn()" title="Zoom In"><mat-icon>add</mat-icon></button>
                 <button class="control-btn" (click)="zoomOut()" title="Zoom Out"><mat-icon>remove</mat-icon></button>
                 <button class="control-btn" (click)="locateMe()" title="Locate Me"><mat-icon>my_location</mat-icon></button>
                 <button class="control-btn" title="Compass"><mat-icon>explore</mat-icon></button>
               </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 32px;
      max-width: 1280px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    
    .filter-sidebar {
      background: white;
      border-radius: 20px;
      padding: 24px;
      height: fit-content;
      position: sticky;
      top: 24px;
      border: 1px solid #eee;
    }
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      h3 { margin: 0; font-size: 18px; font-weight: 700; }
    }
    .filter-group {
      margin-bottom: 32px;
      label { display: block; font-size: 14px; font-weight: 600; color: #757575; margin-bottom: 12px; }
    }
    .block-check { display: block; margin-bottom: 8px; }
    .slider-labels { display: flex; justify-content: space-between; font-size: 12px; color: #9e9e9e; }
    
    .city-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .city-chip {
      padding: 8px 16px;
      border-radius: 14px;
      background: #f5f5f5;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      &.active { background: #4CAF50; color: white; }
      &:hover:not(.active) { background: #e0e0e0; }
    }

    .results-main {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .search-field { width: 100%; }
    ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    
    .results-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      .count-text { color: #616161; }
    }

    .custom-toggle-group {
      border: none !important;
      background: #f5f5f5;
      border-radius: 30px !important;
      padding: 2px;
      height: 26px;
    }

    ::ng-deep .custom-toggle-group .mat-button-toggle {
      border-radius: 13px !important;
      border: none !important;
      background: transparent;
      margin: 0 1px;
      
      .mat-button-toggle-label-content {
        line-height: inherit !important;
        padding: 0 10px !important;
        display: flex;
        align-items: center;
        height: 100%;
        font-size: 12px;
      }

      &.mat-button-toggle-checked {
        background: #f1f8e9 !important;
        color: #4CAF50 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
    }

    .toggle-content {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .results-content {
      flex: 1;
    }

    .machinery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 32px;
      padding-bottom: 60px;
    }

    .map-view-wrapper {
      height: 100%;
      min-height: 500px;
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid #eee;
    }

    .leaflet-map-container {
      height: 100%;
      width: 100%;
      filter: hue-rotate(20deg) saturate(0.8) brightness(1.05); /* Eco Green Tint */
    }

    ::ng-deep .leaflet-tile-pane {
      filter: sepia(0.2) hue-rotate(60deg) saturate(0.8);
    }

    /* Custom Circular Marker Icons */
    ::ng-deep .machinery-marker-icon {
      background: transparent;
      border: none;
    }
    ::ng-deep .marker-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 3px solid #1B5E20;
      background: white;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      position: relative;
    }
    ::ng-deep .marker-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    ::ng-deep .marker-label {
      position: absolute;
      top: -15px;
      background: #f1f8e9;
      color: #2e7d32;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      border: 1px solid #c8e6c9;
    }

    /* User Location Marker */
    ::ng-deep .user-location-marker {
      background: white;
      border: 3px solid #4CAF50;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
    }
    ::ng-deep .user-callout {
      background: white;
      padding: 8px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border: 1px solid #eee;
      text-align: center;
      min-width: 120px;
    }
    ::ng-deep .user-callout .title { font-weight: 800; display: block; filter: none; color: black; }
    ::ng-deep .user-callout .subtitle { font-size: 12px; color: #666; filter: none; }

    /* Map Badges */
    .map-badge {
      position: absolute;
      background: white;
      padding: 8px 16px;
      border-radius: 25px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #2e7d32;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      z-index: 500;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &.top-left { top: 20px; left: 20px; }
      &.top-right { top: 20px; right: 20px; }
      &.bottom-left { bottom: 20px; left: 20px; }
    }

    /* Map Controls */
    .map-controls {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 500;
    }
    .control-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #4a5568;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.2s;
      &:hover { background: #f8fafc; color: #2e7d32; }
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    @media (max-width: 959px) {
      .search-container { grid-template-columns: 1fr; height: auto; }
      .filter-sidebar { display: none; }
      .machinery-grid { grid-template-columns: 1fr; }
      .map-view-wrapper { height: 400px; }
    }
  `]
})
export class SearchComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private machineryService = inject(MachineryService);
  private dialog = inject(MatDialog);

  searchQuery = signal('');
  viewMode = signal<'list' | 'map'>('list');
  maxPrice = signal(5000);
  selectedCity = signal('All');

  cities = ['All', 'Multan', 'Sargodha', 'Faisalabad', 'Lahore', 'Rawalpindi', 'Gujranwala', 'Sialkot', 'Bahawalpur'];

  private map?: L.Map;
  private markers: L.Marker[] = [];
  private userMarker?: L.Marker;

  filteredMachines = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const city = this.selectedCity();
    const priceLimit = this.maxPrice();

    return this.machineryService.machines().filter(m => {
      const matchQuery = !query ||
        m.title.toLowerCase().includes(query) ||
        m.firmName.toLowerCase().includes(query);
      const matchCity = city === 'All' || m.city === city;
      const matchPrice = m.rentPerHour <= priceLimit;

      return matchQuery && matchCity && matchPrice;
    });
  });

  constructor() {
    // When filtered results change, update map markers
    effect(() => {
      if (this.viewMode() === 'map') {
        const machines = this.filteredMachines();
        // Wait a tick for the map to be available if we just switched
        setTimeout(() => this.updateMarkers(machines), 100);
      }
    });

    // Handle map resize when toggling viewMode
    effect(() => {
      if (this.viewMode() === 'map') {
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          } else {
            this.initMap();
          }
        }, 200);
      }
    });
  }

  ngAfterViewInit() {
    // If we deep link or start in map mode
    if (this.viewMode() === 'map') {
      this.initMap();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    if (this.map || !this.mapContainer) return;

    // Center on Sargodha area (32.07, 72.67) as per reference image
    const center: L.LatLngExpression = [32.0740, 72.6861];
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false // Disable default zoom controls to use our custom FABs
    }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Add User Location Marker (Demo coordinates for Sargodha)
    const userLocation: L.LatLngExpression = [32.0850, 72.6711];
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '👨‍🌾',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });

    this.userMarker = L.marker(userLocation, { icon: userIcon })
      .addTo(this.map)
      .bindTooltip(`
        <div class="user-callout">
          <span class="title">Your Location</span>
          <span class="subtitle">Current Location</span>
        </div>
      `, { permanent: true, direction: 'top', offset: [0, -30], className: 'custom-user-tooltip' });

    this.updateMarkers(this.filteredMachines());
  }

  private updateMarkers(machines: Machinery[]) {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    machines.forEach(mach => {
      if (mach.lat && mach.lng) {
        // Use a generic machinery image since assets might not exist
        const imgUrl = 'https://agriculture.punjab.gov.pk/system/files/machinery_harvester.jpg';
        const iconHtml = `
          <div class="marker-circle">
            <span class="marker-label">PKR ${mach.rentPerHour}/hr</span>
            <img src="${imgUrl}" alt="${mach.title}">
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'machinery-marker-icon',
          html: iconHtml,
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });

        const marker = L.marker([mach.lat, mach.lng], { icon: customIcon })
          .addTo(this.map!)
          .bindPopup(this.generatePopupHtml(mach));

        this.markers.push(marker);
      }
    });
  }

  // Floating Control Methods
  zoomIn() { this.map?.zoomIn(); }
  zoomOut() { this.map?.zoomOut(); }
  locateMe() {
    if (this.userMarker) {
      this.map?.setView(this.userMarker.getLatLng(), 15);
    }
  }

  private generatePopupHtml(mach: Machinery): string {
    return `
      <div style="font-family: 'Roboto', sans-serif; min-width: 200px;">
        <h4 style="margin: 0 0 8px; color: #1B5E20; font-size: 16px;">${mach.title}</h4>
        <p style="margin: 0 0 10px; font-size: 13px; color: #616161;">${mach.firmName}</p>
        <div style="background: #f1f8e9; padding: 8px; border-radius: 8px; margin-bottom: 12px;">
           <span style="display: block; font-size: 14px; color: #2e7d32; font-weight: 800;">PKR ${mach.rentPerHour}/hr</span>
           <span style="font-size: 11px; color: #757575;">Fuel: PKR ${mach.fuelPerKm}/km</span>
        </div>
        <button onclick="window.dispatchEvent(new CustomEvent('mapBook', {detail: ${mach.id}}))" 
                style="width: 100%; background:#4CAF50; color:white; padding:10px; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
          Book Now
        </button>
      </div>
    `;
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCity.set('All');
    this.maxPrice.set(5000);
  }

  openBookingSheet(machine: Machinery) {
    this.dialog.open(BookingSheetComponent, {
      data: machine,
      width: '90%',
      maxWidth: '600px',
      panelClass: 'centered-booking-dialog'
    });
  }
}
