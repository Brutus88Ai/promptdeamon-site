import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import BrutusAiPilotDashboard from './BrutusAiPilotDashboard';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LineChart: (props) => <svg data-testid="line-chart-icon" {...props} />,
  Sparkles: (props) => <svg data-testid="sparkles-icon" {...props} />,
  Video: (props) => <svg data-testid="video-icon" {...props} />,
  Share2: (props) => <svg data-testid="share2-icon" {...props} />,
  Check: (props) => <svg data-testid="check-icon" {...props} />,
  ArrowRight: (props) => <svg data-testid="arrow-right-icon" {...props} />,
  Download: (props) => <svg data-testid="download-icon" {...props} />,
}));


test('handleStart should handle re-renders gracefully', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<BrutusAiPilotDashboard />);

    // Find and click the start button
    const startButton = screen.getByText('Start Auto-Pilot');
    fireEvent.click(startButton);

    // Advance time by 1.5 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // Check that the first step is complete
    let firstStep = screen.getByText('Google Trends Scraper').parentElement;
    expect(firstStep.className).toContain('border-purple-500');

    let secondStep = screen.getByText('Pro-Prompt Engineer').parentElement;
    expect(secondStep.className).toContain('border-purple-500');

    // Rerender the component
    rerender(<BrutusAiPilotDashboard />);

    // Advance time by another 4.5 seconds
    await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
    });

    // With the fix, the timeouts should not be affected by the re-render,
    // and the pipeline should complete successfully.
    const lastStep = screen.getByText('Multi-Platform Upload').parentElement;
    expect(lastStep.className).toContain('border-purple-500');

    vi.useRealTimers();
});
