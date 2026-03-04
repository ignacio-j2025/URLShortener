import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinksTable } from '../src/components/LinksTable';
import type { Link } from '../src/types/index';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock @tanstack/react-query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// Mock useDeleteLink
const mockMutate = vi.fn();
vi.mock('../src/hooks/useLinks', () => ({
  useDeleteLink: () => ({ mutate: mockMutate, isPending: false }),
}));

const sampleLinks: Link[] = [
  {
    id: 1,
    slug: 'gh-home',
    targetUrl: 'https://github.com',
    shortUrl: 'http://localhost:3001/gh-home',
    totalClicks: 42,
    createdAt: '2026-01-12T00:00:00Z',
  },
  {
    id: 2,
    slug: 'example',
    targetUrl: 'https://example.com',
    shortUrl: 'http://localhost:3001/example',
    totalClicks: 0,
    createdAt: '2026-02-01T00:00:00Z',
  },
];

describe('LinksTable', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockMutate.mockReset();
    mockInvalidateQueries.mockReset();
  });

  describe('Empty states', () => {
    it('shows "No links yet" when totalLinks is 0', () => {
      render(<LinksTable links={[]} totalLinks={0} />);
      expect(screen.getByText(/no links yet/i)).toBeInTheDocument();
    });

    it('shows "No links on this page" when totalLinks > 0 but page is empty', () => {
      render(<LinksTable links={[]} totalLinks={5} />);
      expect(screen.getByText(/no links on this page/i)).toBeInTheDocument();
    });

    it('defaults to "No links yet" when totalLinks is undefined', () => {
      render(<LinksTable links={[]} />);
      expect(screen.getByText(/no links yet/i)).toBeInTheDocument();
    });
  });

  describe('Rendering links', () => {
    it('renders a table row for each link', () => {
      render(<LinksTable links={sampleLinks} />);
      expect(screen.getByText('gh-home')).toBeInTheDocument();
      expect(screen.getByText('example')).toBeInTheDocument();
    });

    it('displays click counts', () => {
      render(<LinksTable links={sampleLinks} />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders slugs as clickable links pointing to shortUrl', () => {
      render(<LinksTable links={sampleLinks} />);
      const slugLink = screen.getByRole('link', { name: 'gh-home' });
      expect(slugLink).toHaveAttribute('href', 'http://localhost:3001/gh-home');
      expect(slugLink).toHaveAttribute('target', '_blank');
    });

    it('renders destination URLs as links', () => {
      render(<LinksTable links={sampleLinks} />);
      const targetLink = screen.getByRole('link', { name: 'https://github.com' });
      expect(targetLink).toHaveAttribute('href', 'https://github.com');
    });

    it('renders favicon images for each link', () => {
      render(<LinksTable links={sampleLinks} />);
      const favicons = document.querySelectorAll('img[alt=""]');
      expect(favicons.length).toBeGreaterThanOrEqual(2);
      expect(favicons[0]).toHaveAttribute('src', expect.stringContaining('github.com'));
    });
  });

  describe('Actions', () => {
    it('shows Analytics button before Copy URL button', () => {
      render(<LinksTable links={[sampleLinks[0]]} />);
      const buttons = screen.getAllByRole('button');
      const btnLabels = buttons.map((b) => b.textContent);
      const analyticsIdx = btnLabels.indexOf('Analytics');
      const copyIdx = btnLabels.indexOf('Copy URL');
      expect(analyticsIdx).toBeLessThan(copyIdx!);
    });

    it('navigates to analytics page when Analytics is clicked', async () => {
      const user = userEvent.setup();
      render(<LinksTable links={[sampleLinks[0]]} />);
      await user.click(screen.getByRole('button', { name: 'Analytics' }));
      expect(mockNavigate).toHaveBeenCalledWith('/links/gh-home');
    });
  });
});
