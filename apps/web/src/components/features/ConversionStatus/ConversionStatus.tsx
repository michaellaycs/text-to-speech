import React from 'react';
import { ConversionStatus as ConversionStatusType } from '@/types/tts';
import styles from './ConversionStatus.module.css';

export interface ConversionStatusProps {
  status: ConversionStatusType | null;
  isConverting: boolean;
  progress: number;
  error: string | null;
  onRetry?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const ConversionStatus: React.FC<ConversionStatusProps> = ({
  status,
  isConverting,
  progress,
  error,
  onRetry,
  className = '',
  'data-testid': testId
}) => {
  // Don't render if nothing to show
  if (!isConverting && !status && !error) {
    return null;
  }

  const getStatusMessage = (): string => {
    if (error) return 'Conversion failed';
    if (!status && isConverting) return 'Starting conversion...';
    
    switch (status?.status) {
      case 'pending':
        return 'Preparing conversion...';
      case 'processing':
        return 'Converting to speech...';
      case 'completed':
        return 'Conversion completed!';
      case 'failed':
        return 'Conversion failed';
      default:
        return isConverting ? 'Converting...' : '';
    }
  };

  const getStatusClassName = (): string => {
    const baseClasses = [styles.status];
    
    if (error || status?.status === 'failed') {
      baseClasses.push(styles.statusError);
    } else if (status?.status === 'completed') {
      baseClasses.push(styles.statusSuccess);
    } else if (isConverting || status?.status === 'processing' || status?.status === 'pending') {
      baseClasses.push(styles.statusProcessing);
    }
    
    if (className) baseClasses.push(className);
    
    return baseClasses.join(' ');
  };

  const getCurrentProgress = (): number => {
    if (error || status?.status === 'failed') return 0;
    if (status?.status === 'completed') return 100;
    return Math.max(progress, status?.progress || 0);
  };

  const shouldShowProgressBar = (): boolean => {
    return isConverting || (status && status.status !== 'completed' && status.status !== 'failed');
  };

  const shouldShowRetryButton = (): boolean => {
    return (error || status?.status === 'failed') && onRetry !== undefined;
  };

  return (
    <div className={getStatusClassName()} data-testid={testId}>
      <div className={styles.statusContent}>
        {/* Status Icon */}
        <div className={styles.statusIcon}>
          {error || status?.status === 'failed' ? (
            <span className={styles.iconError}>⚠️</span>
          ) : status?.status === 'completed' ? (
            <span className={styles.iconSuccess}>✅</span>
          ) : (
            <span className={styles.iconProcessing}>🔄</span>
          )}
        </div>

        {/* Status Message */}
        <div className={styles.statusMessage}>
          <span className={styles.messageText}>
            {getStatusMessage()}
          </span>
          
          {/* Error Details */}
          {(error || status?.error) && (
            <div className={styles.errorDetails}>
              {error || status?.error}
            </div>
          )}
          
          {/* Progress Info */}
          {status && status.status === 'completed' && (
            <div className={styles.completionInfo}>
              Conversion completed successfully
            </div>
          )}
        </div>

        {/* Retry Button */}
        {shouldShowRetryButton() && (
          <button 
            className={styles.retryButton}
            onClick={onRetry}
            type="button"
            aria-label="Retry conversion"
          >
            Retry
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {shouldShowProgressBar() && (
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={getCurrentProgress()}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Conversion progress: ${getCurrentProgress()}%`}
          >
            <div 
              className={styles.progressFill}
              style={{ width: `${getCurrentProgress()}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {getCurrentProgress()}%
          </div>
        </div>
      )}
    </div>
  );
};