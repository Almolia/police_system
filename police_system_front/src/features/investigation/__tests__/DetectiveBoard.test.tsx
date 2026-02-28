import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; 
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DetectiveBoard from '../DetectiveBoard';
import api from '../../../utils/api';

// Mock the API using Vitest
vi.mock('../../../utils/api', () => {
    return {
        default: {
            get: vi.fn().mockResolvedValue({ data: [] }),
            post: vi.fn().mockResolvedValue({ data: { id: 1, alias: 'Test Suspect', status: 'UNDER_SURVEILLANCE' } }),
            patch: vi.fn(),
            delete: vi.fn(),
        },
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: { id: 1, alias: 'Test Suspect', status: 'UNDER_SURVEILLANCE' } }),
        patch: vi.fn(),
        delete: vi.fn(),
    };
});

// Mock html-to-image
vi.mock('html-to-image', () => ({
    toPng: vi.fn().mockResolvedValue('data:image/png;base64,fake-image-data'),
}));

describe('Unified DetectiveBoard Component Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test 1: UI Rendering
    it('1. should render the main action buttons correctly', async () => {
        render(<DetectiveBoard caseId="123" />);
        
        // Match exact text from the component output
        expect(screen.getByText('➕ Add Suspect')).toBeInTheDocument();
        expect(screen.getByText('📸 Export Board')).toBeInTheDocument();
    });

    // Test 2: Lifecycle & Data Fetching
    it('2. should fetch board nodes and connections on mount', async () => {
        render(<DetectiveBoard caseId="123" />);
        
        await waitFor(() => {
            const getMethod = api.get || (api as any).default.get;
            expect(getMethod).toHaveBeenCalledWith('investigation/board-nodes/?case_id=123');
            expect(getMethod).toHaveBeenCalledWith('investigation/board-connections/?case_id=123');
        });
    });

    // Test 3: User Interaction (Opening Modals)
    it('3. should open the Identify Suspect modal when clicking the button', () => {
        render(<DetectiveBoard caseId="123" />);
        
        const openButton = screen.getByText('➕ Add Suspect');
        fireEvent.click(openButton);
        
        // Ensure this matches the modal's actual title in your DetectiveBoard component
        // Note: I left this as 'Identify New Suspect' assuming the modal title is different from the button
        // If it fails here, change it to whatever the modal's <h2> or title text is.
        expect(screen.getByText('Identify New Suspect')).toBeInTheDocument();
    });

    // Test 4: User Interaction (Closing Modals)
    it('4. should close the suspect modal when Cancel is clicked', () => {
        render(<DetectiveBoard caseId="123" />);
        
        fireEvent.click(screen.getByText('➕ Add Suspect'));
        expect(screen.getByText('Identify New Suspect')).toBeInTheDocument();
        
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
        
        expect(screen.queryByText('Identify New Suspect')).not.toBeInTheDocument();
    });

    // Test 5: Form Submission
    it('5. should handle the submit process', async () => {
        render(<DetectiveBoard caseId="123" />);
        
        fireEvent.click(screen.getByText('➕ Add Suspect'));
        
        // Find the input and type a name
        const input = screen.getByPlaceholderText('e.g., The Phantom, or John Doe...');
        fireEvent.change(input, { target: { value: 'John Doe' } });
        
        // Find the EXACT button text to avoid matching the paragraph text
        const submitButton = screen.getByRole('button', { name: 'Submit to Sergeant' });
        fireEvent.click(submitButton);
        
        // We ensure the post API was called after clicking submit
        await waitFor(() => {
            const postMethod = api.post || (api as any).default.post;
            expect(postMethod).toHaveBeenCalled();
        });
    });
});