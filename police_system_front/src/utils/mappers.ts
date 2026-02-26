// src/utils/mappers.ts

// The Type matching exactly what Django sends
export interface DjangoSuspectData {
    id: number;
    alias: string | null;
    status: string;
    cached_ranking_score: number | null;
}

// The Type our React components will actually use
export interface FrontendSuspect {
    id: number;
    alias: string;
    status: string;
    rankingScore: number;
}

// The Mapper Function
export const mapSuspectData = (data: DjangoSuspectData): FrontendSuspect => {
    return {
        id: data.id,
        alias: data.alias || 'Unknown Alias', // Safe fallback if Django sends null
        status: data.status || 'UNKNOWN',
        rankingScore: data.cached_ranking_score || 0, // Maps snake_case to camelCase
    };
};