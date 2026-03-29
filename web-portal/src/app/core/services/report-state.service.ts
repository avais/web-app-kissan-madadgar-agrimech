import { Injectable, signal } from '@angular/core';

export interface ReportState {
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  viewMode: 'table' | 'cards';
  syncedApps: Set<number>;
}

@Injectable({
  providedIn: 'root'
})
export class ReportStateService {
  private states = new Map<number, ReportState>();

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
}
