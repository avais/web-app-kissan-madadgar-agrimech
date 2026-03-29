import { Injectable, signal, computed } from '@angular/core';
import { Machinery } from '../../shared/models/machinery.model';
import { Firm } from '../../shared/models/firm.model';

@Injectable({
    providedIn: 'root'
})
export class MachineryService {
    private machineryList = signal<Machinery[]>([
        {
            id: 1,
            title: 'Wheat Seed Grader Cum Cleaner',
            description: 'High precision cleaning and grading for wheat seeds.',
            rentPerHour: 800,
            fuelPerKm: 5,
            rating: 4.5,
            distanceKm: 1.4,
            city: 'Multan',
            lat: 30.1575,
            lng: 71.5249,
            firmName: 'M/S Ali Bhai Engineers',
            tags: ['Imported', 'Wheat'],
            imported: true,
            crop: 'Wheat',
            imageUrl: 'assets/images/machinery/grader.jpg'
        },
        {
            id: 2,
            title: 'Laser Land Leveler',
            description: 'Precision land leveling for water saving.',
            rentPerHour: 1200,
            fuelPerKm: 8,
            rating: 4.8,
            distanceKm: 2.5,
            city: 'Sargodha',
            lat: 32.0740,
            lng: 72.6861,
            firmName: 'Punjab Agri Solutions',
            tags: ['Eco-Friendly', 'Land Prep'],
            imported: false,
            crop: 'All',
            imageUrl: 'assets/images/machinery/leveler.jpg'
        },
        {
            id: 3,
            title: 'Combine Harvester (Rice)',
            description: 'Efficient harvesting for rice crops.',
            rentPerHour: 2500,
            fuelPerKm: 15,
            rating: 4.2,
            distanceKm: 5.0,
            city: 'Faisalabad',
            lat: 31.4504,
            lng: 73.1350,
            firmName: 'Faisalabad Farm Tools',
            tags: ['Rice', 'Fast'],
            imported: true,
            crop: 'Rice',
            imageUrl: 'assets/images/machinery/harvester.jpg'
        },
        // ... I will add more mock items to reach 30+ in the final implementation
        // For now, I'll add a helper to generate them or just paste more
    ]);

    private firmsList = signal<Firm[]>([
        {
            id: 1,
            name: 'M/S Ali Bhai Engineers',
            location: 'Multan, Punjab',
            machinesCount: 12,
            contact: '+92 300 1234567',
            rating: 4.6,
            distanceKm: 1.5
        },
        {
            id: 2,
            name: 'Punjab Agri Solutions',
            location: 'Sargodha, Punjab',
            machinesCount: 8,
            contact: '+92 311 7654321',
            rating: 4.9,
            distanceKm: 2.2
        }
    ]);

    // Signals for components to consume
    machines = computed(() => this.machineryList());
    firms = computed(() => this.firmsList());

    constructor() {
        this.generateMoreMockData();
    }

    private generateMoreMockData() {
        const cityCoords: { [key: string]: { lat: number, lng: number } } = {
            'Multan': { lat: 30.1575, lng: 71.5249 },
            'Sargodha': { lat: 32.0740, lng: 72.6861 },
            'Faisalabad': { lat: 31.4504, lng: 73.1350 },
            'Lahore': { lat: 31.5204, lng: 74.3587 },
            'Rawalpindi': { lat: 33.6844, lng: 73.0479 },
            'Gujranwala': { lat: 32.1877, lng: 74.1945 },
            'Sialkot': { lat: 32.4945, lng: 74.5229 },
            'Bahawalpur': { lat: 29.3544, lng: 71.6911 }
        };

        const cities = Object.keys(cityCoords);
        const firms = ['M/S Ali Bhai Engineers', 'Punjab Agri Solutions', 'Faisalabad Farm Tools', 'Lahore Agro', 'Pindi Tractors'];
        const types = ['Grader', 'Leveler', 'Harvester', 'Plow', 'Cultivator', 'Rotavator', 'Seed Drill'];

        const currentList = this.machineryList();
        for (let i = 4; i <= 35; i++) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            const firm = firms[Math.floor(Math.random() * firms.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const coords = cityCoords[city];

            // Add slight randomness to coords so markers aren't perfectly on top of each other
            const lat = coords.lat + (Math.random() - 0.5) * 0.1;
            const lng = coords.lng + (Math.random() - 0.5) * 0.1;

            currentList.push({
                id: i,
                title: `${type} Model X-${i}`,
                description: `Reliable ${type.toLowerCase()} for ${city} farmers.`,
                rentPerHour: 500 + Math.floor(Math.random() * 2000),
                fuelPerKm: 5 + Math.floor(Math.random() * 15),
                rating: 3.5 + (Math.random() * 1.5),
                distanceKm: (Math.random() * 20).toFixed(1) as any,
                city: city,
                lat: lat,
                lng: lng,
                firmName: firm,
                tags: [type, city],
                imported: Math.random() > 0.5,
                crop: 'Wheat/Rice'
            });
        }
        this.machineryList.set([...currentList]);

        const currentFirms = this.firmsList();
        for (let i = 3; i <= 10; i++) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            currentFirms.push({
                id: i,
                name: `${city} Agri Center`,
                location: `${city}, Punjab`,
                machinesCount: 5 + Math.floor(Math.random() * 15),
                contact: `+92 345 ${1000000 + i}`,
                rating: 4.0 + (Math.random() * 1.0),
                distanceKm: (Math.random() * 10).toFixed(1) as any
            });
        }
        this.firmsList.set([...currentFirms]);
    }

    getMachineryById(id: number) {
        return this.machineryList().find(m => m.id === id);
    }

    searchMachines(query: string) {
        if (!query) return this.machineryList();
        return this.machineryList().filter(m =>
            m.title.toLowerCase().includes(query.toLowerCase()) ||
            m.city.toLowerCase().includes(query.toLowerCase())
        );
    }
}
