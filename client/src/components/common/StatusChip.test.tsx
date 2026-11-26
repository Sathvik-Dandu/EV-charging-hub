import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusChip from './StatusChip';

describe('StatusChip', () => {
  it('renders a readable label for the status', () => {
    render(<StatusChip value="IN_PROGRESS" kind="ticket" />);
    expect(screen.getByText('In Progress')).toBeTruthy();
  });
});
