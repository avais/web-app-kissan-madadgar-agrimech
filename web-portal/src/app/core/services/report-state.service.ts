import { Injectable, signal } from '@angular/core';

export interface ReportState {
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  viewMode: 'table' | 'cards';
  syncedApps: Set<number>;
}

export interface ReportsListState {
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  selectedStatus: string;
  selectedDistrictId: number | null;
  selectedFirmId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ReportStateService {
  private states = new Map<number, ReportState>();
  private reportsListState: ReportsListState | null = null;

  getOrCreateState(reportId: number): ReportState {
    if (!this.states.has(reportId)) {
      this.states.set(reportId, {
        searchQuery: '',
        currentPage: 0,
        pageSize: 10,
        viewMode: 'table',
        syncedApps: new Set<number>()
      });
    }
    return this.states.get(reportId)!;
  }

  saveState(reportId: number, state: ReportState) {
    this.states.set(reportId, state);
  }

  clearState(reportId: number) {
    this.states.delete(reportId);
  }

  getReportsListState(): ReportsListState | null {
    return this.reportsListState;
  }

  saveReportsListState(state: ReportsListState) {
    this.reportsListState = state;
  }

  clearReportsListState() {
    this.reportsListState = null;
  }
}
