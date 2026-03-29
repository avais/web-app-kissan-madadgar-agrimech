export interface Project {
    id?: number;
    name: string;
    totalBeneficiary: number;
    totalProjectCost: number;
    description: string;
    unitCost: number;
    subsidyCost: number;
    active: boolean;
    implementId?: number;
    implementName?: string;
    implementIds?: number[];
    projectTypeId?: number;
}

