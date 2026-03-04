import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateLinkForm } from '../src/components/CreateLinkForm';

// Mock the useCreateLink hook
const mockMutate = vi.fn();
vi.mock('../src/hooks/useLinks', () => ({
  useCreateLink: () => ({ mutate: mockMutate, isPending: false }),
}));

describe('CreateLinkForm', () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it('renders both input fields and the submit button', () => {
    render(<CreateLinkForm />);
    expect(screen.getByLabelText(/destination url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/custom slug/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create short link/i })).toBeInTheDocument();
  });

  it('shows a validation error when submitted with an empty URL', async () => {
    const user = userEvent.setup();
    render(<CreateLinkForm />);

    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(screen.getByText(/target url is required/i)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows a validation error for an invalid URL', async () => {
    const user = userEvent.setup();
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'not-a-url');
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows a validation error for an invalid slug format', async () => {
    const user = userEvent.setup();
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await user.type(screen.getByLabelText(/custom slug/i), 'AB'); // uppercase, too short
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(screen.getByText(/lowercase letters/i)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls mutate with correct payload on valid submit', async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await user.type(screen.getByLabelText(/custom slug/i), 'my-slug');
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUrl: 'https://example.com', slug: 'my-slug' },
      expect.any(Object)
    );
  });

  it('calls mutate without slug when slug field is left empty', async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUrl: 'https://example.com', slug: undefined },
      expect.any(Object)
    );
  });

  it('shows SLUG_TAKEN error from API as a field error', async () => {
    const user = userEvent.setup();
    const { ApiRequestError } = await import('../src/api/client');
    mockMutate.mockImplementation(
      (_data: unknown, options: { onError: (err: unknown) => void }) => {
        options.onError(new ApiRequestError('SLUG_TAKEN', 'That slug is already taken'));
      }
    );
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await user.type(screen.getByLabelText(/custom slug/i), 'taken-slug');
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    await waitFor(() => {
      expect(screen.getByText(/that slug is already taken/i)).toBeInTheDocument();
    });
  });

  it('auto-prepends https:// when user types a bare domain', async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    render(<CreateLinkForm />);

    await user.type(screen.getByLabelText(/destination url/i), 'example.com');
    await user.click(screen.getByRole('button', { name: /create short link/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUrl: 'https://example.com', slug: undefined },
      expect.any(Object)
    );
  });
});
