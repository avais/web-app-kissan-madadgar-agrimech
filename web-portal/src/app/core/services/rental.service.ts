import { Injectable, signal, computed } from '@angular/core';

export interface Rental {
    id: number;
    machineId: number;
    machineTitle: string;
    firmName: string;
    startDate: string;
    endDate: string;
    status: 'Current' | 'Completed' | 'Pending' | 'Cancelled';
    totalCost: number;
    imageUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class RentalService {
    private mockRentals: Rental[] = [
        {
            id: 101,
            machineId: 1,
            machineTitle: 'John Deere 5050 D',
            firmName: 'Punjab Agri Solutions',
            startDate: 'Feb 14, 2026',
            endDate: 'Feb 16, 2026',
            status: 'Current',
            totalCost: 10500,
            imageUrl: 'https://agriculture.punjab.gov.pk/system/files/machinery_harvester.jpg'
        },
        {
            id: 102,
            machineId: 3,
            machineTitle: 'Laser Land Leveler',
            firmName: 'Sargodha Farm Tools',
            startDate: 'Feb 05, 2026',
            endDate: 'Feb 06, 2026',
            status: 'Completed',
            totalCost: 4800,
            imageUrl: 'https://agriculture.punjab.gov.pk/system/files/styles/news_detail/private/Laser-land-leveler.jpg'
        },
        {
            id: 103,
            machineId: 2,
            machineTitle: 'Messy Ferguson 385',
            firmName: 'Faisalabad Implements',
            startDate: 'Feb 20, 2026',
            endDate: 'Feb 22, 2026',
            status: 'Pending',
            totalCost: 15600,
            imageUrl: 'https://agriculture.punjab.gov.pk/system/files/machinery_harvester.jpg'
        }
    ];

    rentals = signal<Rental[]>(this.mockRentals);

    constructor() { }

    getRentalsByStatus(status: string) {
        return computed(() => {
            if (status === 'All') return this.rentals();
            return this.rentals().filter(r => r.status === status);
        });
    }
}
