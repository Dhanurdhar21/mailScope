import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E4E7EC] p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center mx-auto mb-5 border border-[#B2DDFF]">
          <FileQuestion className="w-7 h-7" />
        </div>

        <span className="text-xs font-semibold text-[#315EFB] uppercase tracking-wider">
          404 Error
        </span>

        <h1 className="text-2xl font-bold text-[#182230] mt-1 mb-2">
          Page Not Found
        </h1>

        <p className="text-xs text-[#667085] leading-relaxed mb-6">
          The requested page does not exist or has been moved. Use the navigation controls below to return to MailScope.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              icon={<Home className="w-4 h-4" />}
              className="w-full"
            >
              Back to Home
            </Button>
          </Link>
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              className="w-full"
            >
              Open Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
