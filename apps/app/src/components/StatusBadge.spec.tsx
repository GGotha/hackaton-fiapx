import { VideoStatus } from '@fiapx/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the human label for a status', () => {
    render(<StatusBadge status={VideoStatus.Completed} />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('surfaces the failure reason as a tooltip when failed', () => {
    render(<StatusBadge status={VideoStatus.Failed} error="ffmpeg exited with code 1" />);
    expect(screen.getByText('Failed').getAttribute('title')).toBe('ffmpeg exited with code 1');
  });
});
