import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlossarySidePanel } from './GlossarySidePanel';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    userProfile: { qi: 0 }
  })
}));

const mockSaveLoreGlossaryTerm = vi.fn();

vi.mock('../lib/persistence', () => ({
  getLoreGlossary: vi.fn().mockResolvedValue([]),
  saveLoreGlossaryTerm: (...args: any[]) => mockSaveLoreGlossaryTerm(...args),
  deleteLoreGlossaryTerm: vi.fn(),
}));

describe('GlossarySidePanel', () => {
  beforeEach(() => {
    mockSaveLoreGlossaryTerm.mockClear();
    mockSaveLoreGlossaryTerm.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));
  });

  it('renders without crashing', () => {
    const { container } = render(
      <GlossarySidePanel 
        isOpen={true} 
        onClose={vi.fn()} 
        novelId="test" 
      />
    );
    expect(container).toBeDefined();
  });

  it('prevents adding the same term multiple times if clicked rapidly', async () => {
    render(<GlossarySidePanel isOpen={true} onClose={vi.fn()} novelId="test" />);

    const sourceInput = screen.getByPlaceholderText('Original word (e.g. Courting death)');
    const targetInput = screen.getByPlaceholderText('Translation');
    const addButton = screen.getByLabelText('Add term');

    fireEvent.change(sourceInput, { target: { value: 'Source' } });
    fireEvent.change(targetInput, { target: { value: 'Target' } });

    fireEvent.click(addButton);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockSaveLoreGlossaryTerm).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect((sourceInput as HTMLInputElement).value).toBe('');
      expect((targetInput as HTMLInputElement).value).toBe('');
    });

    expect(mockSaveLoreGlossaryTerm).toHaveBeenCalledTimes(1);
  });
});
