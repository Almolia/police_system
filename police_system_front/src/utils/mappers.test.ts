import { describe, it, expect } from 'vitest';
import { mapSuspectData } from './mappers';

describe('Data Mappers - Suspect Data', () => {

    it('should map perfectly formatted Django data to React camelCase', () => {
        const perfectDjangoData = {
            id: 1,
            alias: 'The Ghost',
            status: 'WANTED',
            cached_ranking_score: 95
        };

        const result = mapSuspectData(perfectDjangoData);

        // Expect snake_case to be converted to camelCase
        expect(result.rankingScore).toBe(95);
        expect(result.alias).toBe('The Ghost');
    });

    it('should handle null and missing values safely without crashing', () => {
        const brokenDjangoData = {
            id: 2,
            alias: null,
            status: '',
            cached_ranking_score: null
        };

        const result = mapSuspectData(brokenDjangoData as any);

        // Expect our mapper to provide safe fallback values!
        expect(result.alias).toBe('Unknown Alias');
        expect(result.rankingScore).toBe(0);
        expect(result.status).toBe('UNKNOWN');
    });
});