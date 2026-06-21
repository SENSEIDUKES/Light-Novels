import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentBadge } from './AgentBadge';
import { AGENTS } from '../lib/agents';
import React from 'react';

// Mock motion to bypass animations in tests if necessary, although framer-motion 
// usually tests fine unless it requires intersection observers.
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} data-testid="motion-div" {...props}>{children}</div>
  }
}));

describe('AgentBadge', () => {
  it('renders correctly with VERSA agent without a task', () => {
    render(<AgentBadge agent={AGENTS.VERSA} />);
    
    expect(screen.getByText('VERSA')).toBeDefined();
    expect(screen.getByText('The Writer')).toBeDefined();
    expect(screen.getByText('Wordsmith. Drafts, rewrites, sharpens phrasing.')).toBeDefined();
    
    const img = screen.getByRole('img');
    expect(img).toHaveProperty('src', 'https://images.seihouse.org/AGENT%20EMBLEM/Versa/master-versa-emblem.png');
    expect(img).toHaveProperty('alt', 'VERSA');
  });

  it('renders correctly with SCOUT agent and a specific task', () => {
    render(<AgentBadge agent={AGENTS.SCOUT} task="Scanning context..." isWorking={true} />);
    
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByText('The Retriever')).toBeDefined();
    expect(screen.getByText('Scanning context...')).toBeDefined();
    
    // The default role should not be displayed if task is provided
    const roleText = screen.queryByText('Finder. Scans, surfaces, locates.');
    expect(roleText).toBeNull();
  });
  
  it('does not show working indicators when isWorking is false', () => {
    render(<AgentBadge agent={AGENTS.VERSA} isWorking={false} />);
    const motionDivs = screen.queryAllByTestId('motion-div');
    expect(motionDivs.length).toBe(0);
  });

  it('shows working indicators when isWorking is true', () => {
    render(<AgentBadge agent={AGENTS.VERSA} isWorking={true} />);
    const motionDivs = screen.queryAllByTestId('motion-div');
    expect(motionDivs.length).toBeGreaterThan(0);
  });
});
