export interface Machinery {
    id: number;
    title: string;
    description: string;
    rentPerHour: number;
    fuelPerKm: number;
    rating: number;
    distanceKm: number;
    city: string;
    lat?: number;
    lng?: number;
    firmName: string;
    tags: string[];           // e.g. ['Imported', 'Wheat']
    imported: boolean;
    crop?: string;
    imageUrl?: string;
}

export interface Firm {
    id: number;
    name: string;
    location: string;
    machinesCount: number;
    contact: string;
    rating: number;
    distanceKm: number;
}
