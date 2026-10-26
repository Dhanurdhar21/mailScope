import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Clock,
  Server
} from 'lucide-react';
import type { ClassificationType } from '../types/analysis';

interface StatusBadgeProps {
  type: 'classification' | 'domain' | 'mx' | 'syntax';
  value: string | boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  if (type === 'classification') {
    const classification = value as ClassificationType;

    switch (classification) {
      case 'likely_to_be_delivered':
        return (
          <span
            className={`inline-flex items-center font-medium rounded-full bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] ${sizeClasses}`}
            title="Available technical evidence indicates active mail routing configured."
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] shrink-0" aria-hidden="true" />
            <span>Likely to Deliver</span>
          </span>
        );
      case 'likely_to_bounce':
        return (
          <span
            className={`inline-flex items-center font-medium rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] ${sizeClasses}`}
            title="Evidence indicates invalid syntax or non-existent domain."
          >
            <XCircle className="w-3.5 h-3.5 text-[#F04438] shrink-0" aria-hidden="true" />
            <span>Likely to Bounce</span>
          </span>
        );
      case 'unknown':
      default:
        return (
          <span
            className={`inline-flex items-center font-medium rounded-full bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] ${sizeClasses}`}
            title="DNS timeout, fallback A record, or insufficient technical evidence."
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#F79009] shrink-0" aria-hidden="true" />
            <span>Unknown</span>
          </span>
        );
    }
  }

  if (type === 'syntax') {
    const isValid = Boolean(value);
    return isValid ? (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7] ${sizeClasses}`}
      >
        <CheckCircle2 className="w-3 h-3 text-[#16A34A] shrink-0" aria-hidden="true" />
        <span>Valid RFC 5322</span>
      </span>
    ) : (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] ${sizeClasses}`}
      >
        <XCircle className="w-3 h-3 text-[#DC2626] shrink-0" aria-hidden="true" />
        <span>Malformed</span>
      </span>
    );
  }

  if (type === 'domain') {
    const status = String(value);
    if (status === 'resolved') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#F8F9FC] text-[#344054] border border-[#E4E7EC] ${sizeClasses}`}
        >
          <Server className="w-3 h-3 text-[#12B76A] shrink-0" aria-hidden="true" />
          <span>Resolved</span>
        </span>
      );
    }
    if (status === 'nonexistent') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] ${sizeClasses}`}
        >
          <XCircle className="w-3 h-3 text-[#F04438] shrink-0" aria-hidden="true" />
          <span>NXDOMAIN</span>
        </span>
      );
    }
    if (status === 'timeout') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] ${sizeClasses}`}
        >
          <Clock className="w-3 h-3 text-[#F79009] shrink-0" aria-hidden="true" />
          <span>Timeout</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-[#F2F4F7] text-[#475467] border border-[#E4E7EC] ${sizeClasses}`}
      >
        <AlertTriangle className="w-3 h-3 text-[#667085] shrink-0" aria-hidden="true" />
        <span>{status === 'not_checked' ? 'Not Checked' : status}</span>
      </span>
    );
  }

  if (type === 'mx') {
    const status = String(value);
    if (status === 'present') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF] ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3 h-3 text-[#12B76A] shrink-0" aria-hidden="true" />
          <span>MX Present</span>
        </span>
      );
    }
    if (status === 'fallback_a_record') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#F4F3FF] text-[#5925DC] border border-[#D9D6FE] ${sizeClasses}`}
          title="No MX record found; domain has A record fallback."
        >
          <Server className="w-3 h-3 text-[#7F56D9] shrink-0" aria-hidden="true" />
          <span>Fallback A/AAAA</span>
        </span>
      );
    }
    if (status === 'none') {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] ${sizeClasses}`}
        >
          <XCircle className="w-3 h-3 text-[#F04438] shrink-0" aria-hidden="true" />
          <span>No Records</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-[#F2F4F7] text-[#475467] border border-[#E4E7EC] ${sizeClasses}`}
      >
        <span>{status === 'not_checked' ? 'Not Checked' : status}</span>
      </span>
    );
  }

  return <span>{String(value)}</span>;
};
