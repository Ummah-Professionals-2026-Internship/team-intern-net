import React, { useRef } from 'react';

const FileUpload = ({ label, id, value, onChange, accept, className, icon, ...props }) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    onChange(e.target.files[0] || null);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <div className={`file-upload-container ${className || ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="file-upload-wrapper">
        <label htmlFor={id} className="file-upload-dropzone">
          {value ? (
            <span className="file-upload-filename">{value.name}</span>
          ) : (
            <div className="file-upload-content">
              {icon && <img src={icon} alt="" className="file-upload-icon" />}
              <span className="file-upload-placeholder">{props.placeholder || 'Choose a file'}</span>
            </div>
          )}
        </label>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="file-upload-input"
          {...props}
        />
        {value && (
          <button type="button" className="file-upload-clear" onClick={handleClear} aria-label="Remove file">
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;