import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultDetails } from '../components/ResultDetails';
import type { EmailAnalysisResult } from '../types/analysis';

describe('Domain Intelligence Inspection Drawer', () => {
  it('renders active MX configuration with server list and priority', () => {
    const result: EmailAnalysisResult = {
      email: 'alex@company.com',
      normalized_email: 'alex@company.com',
      syntax_valid: true,
      domain_status: 'resolved',
      mx_status: 'present',
      classification: 'likely_to_be_delivered',
      reason: 'Valid RFC syntax and active MX routing.',
      domain: 'company.com',
      diagnostics: {
        has_mx: true,
        is_disposable: false,
        mx_records: ['10 aspmx.l.google.com', '20 alt1.aspmx.l.google.com'],
        has_fallback_a: false,
        response_time_ms: 50
      }
    };

    render(<ResultDetails result={result} onClose={vi.fn()} />);

    expect(screen.getByText('alex@company.com')).toBeDefined();
    expect(screen.getByText('10 aspmx.l.google.com')).toBeDefined();
    expect(screen.getByText('20 alt1.aspmx.l.google.com')).toBeDefined();
    expect(screen.getByText('Priority #1')).toBeDefined();
    expect(screen.getByText('Priority #2')).toBeDefined();
  });

  it('renders explicit RFC 7505 Null MX record distinction', () => {
    const result: EmailAnalysisResult = {
      email: 'test@nullmxdomain.org',
      normalized_email: 'test@nullmxdomain.org',
      syntax_valid: true,
      domain_status: 'resolved',
      mx_status: 'present',
      classification: 'likely_to_bounce',
      reason: 'Domain publishes RFC 7505 Null MX record refusing all incoming mail.',
      domain: 'nullmxdomain.org',
      diagnostics: {
        has_mx: true,
        is_disposable: false,
        mx_records: ['0 .'],
        has_fallback_a: false,
        response_time_ms: 35
      }
    };

    render(<ResultDetails result={result} onClose={vi.fn()} />);

    expect(screen.getByText(/RFC 7505 Null MX Record Published/i)).toBeDefined();
    expect(
      screen.getByText(/Standard compliant MTAs will immediately reject or bounce/i)
    ).toBeDefined();
  });

  it('renders NXDOMAIN non-existent domain explanation', () => {
    const result: EmailAnalysisResult = {
      email: 'nobody@nonexistent-fake-domain.xyz',
      normalized_email: 'nobody@nonexistent-fake-domain.xyz',
      syntax_valid: true,
      domain_status: 'nonexistent',
      mx_status: 'none',
      classification: 'likely_to_bounce',
      reason: 'Domain does not exist.',
      domain: 'nonexistent-fake-domain.xyz',
      diagnostics: {
        has_mx: false,
        is_disposable: false,
        mx_records: [],
        has_fallback_a: false,
        response_time_ms: 40
      }
    };

    render(<ResultDetails result={result} onClose={vi.fn()} />);

    expect(screen.getByText(/Confirmed Non-Existent Domain \(NXDOMAIN\)/i)).toBeDefined();
    expect(screen.getByText(/NXDOMAIN \(Non-Existent Domain\)/i)).toBeDefined();
  });

  it('renders DNS timeout failure without claiming domain non-existence', () => {
    const result: EmailAnalysisResult = {
      email: 'contact@slow-dns-server.com',
      normalized_email: 'contact@slow-dns-server.com',
      syntax_valid: true,
      domain_status: 'timeout',
      mx_status: 'timeout',
      classification: 'unknown',
      reason: 'Nameserver lookup timed out.',
      domain: 'slow-dns-server.com',
      diagnostics: {
        has_mx: false,
        is_disposable: false,
        mx_records: [],
        has_fallback_a: false,
        response_time_ms: 5000
      }
    };

    render(<ResultDetails result={result} onClose={vi.fn()} />);

    expect(screen.getByText(/DNS Timeout \/ Resolver Failure/i)).toBeDefined();
    expect(
      screen.getByText(/does NOT prove that the domain does not exist/i)
    ).toBeDefined();
  });

  it('renders RFC 5321 Fallback Routing when domain has no MX but active A/AAAA', () => {
    const result: EmailAnalysisResult = {
      email: 'host@fallback-server.org',
      normalized_email: 'host@fallback-server.org',
      syntax_valid: true,
      domain_status: 'resolved',
      mx_status: 'none',
      classification: 'likely_to_be_delivered',
      reason: 'Domain has no MX records, but active A/AAAA fallback host routing is present.',
      domain: 'fallback-server.org',
      diagnostics: {
        has_mx: false,
        is_disposable: false,
        mx_records: [],
        has_fallback_a: true,
        response_time_ms: 60
      }
    };

    render(<ResultDetails result={result} onClose={vi.fn()} />);

    expect(screen.getByText(/RFC 5321 Implicit Fallback Routing/i)).toBeDefined();
    expect(screen.getByText(/direct host address \(A\/AAAA\) records are active/i)).toBeDefined();
  });

  it('renders historical snapshot badge and triggers reanalyze callback', () => {
    const result: EmailAnalysisResult = {
      email: 'historical@example.com',
      normalized_email: 'historical@example.com',
      syntax_valid: true,
      domain_status: 'resolved',
      mx_status: 'present',
      classification: 'likely_to_be_delivered',
      reason: 'Active MX',
      domain: 'example.com',
      diagnostics: {
        has_mx: true,
        is_disposable: false,
        mx_records: ['10 mx.example.com'],
        has_fallback_a: false,
        response_time_ms: 25
      }
    };

    const reanalyzeMock = vi.fn();
    render(
      <ResultDetails
        result={result}
        onClose={vi.fn()}
        isHistorical={true}
        savedAt={1700000000000}
        onReanalyze={reanalyzeMock}
      />
    );

    expect(screen.getByText('Historical Snapshot')).toBeDefined();
    const reanalyzeBtn = screen.getByRole('button', { name: /Reanalyze Live/i });
    expect(reanalyzeBtn).toBeDefined();

    fireEvent.click(reanalyzeBtn);
    expect(reanalyzeMock).toHaveBeenCalledWith('historical@example.com');
  });

  it('handles missing optional diagnostics gracefully without crashing', () => {
    const bareResult: EmailAnalysisResult = {
      email: 'bare@test.com',
      normalized_email: 'bare@test.com',
      syntax_valid: true,
      domain: 'test.com',
      domain_status: 'resolved',
      mx_status: 'present',
      classification: 'likely_to_be_delivered',
      reason: 'Basic deliverable'
      // diagnostics intentionally omitted
    };

    const { container } = render(<ResultDetails result={bareResult} onClose={vi.fn()} />);
    expect(container).toBeDefined();
    expect(screen.getByText('bare@test.com')).toBeDefined();
  });
});
