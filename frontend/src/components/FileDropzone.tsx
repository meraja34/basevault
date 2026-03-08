import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { MAX_FILE_SIZE } from '../constants';
import { formatFileSize } from '../utils/ipfs';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
}

export default function FileDropzone({
  onFilesSelected,
  multiple = false,
  label = 'Drop any file here or click to browse',
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const valid = acceptedFiles.filter((f) => f.size <= MAX_FILE_SIZE);
      if (valid.length > 0) onFilesSelected(valid);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}>
      <input {...getInputProps()} />
      <div className="dropzone-content">
        <div className="dropzone-icon">
          {isDragActive ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>
        <p className="dropzone-label">{isDragActive ? 'Drop it here!' : label}</p>
        <p className="dropzone-hint">Any file type. Max size: {formatFileSize(MAX_FILE_SIZE)}</p>
      </div>
    </div>
  );
}
