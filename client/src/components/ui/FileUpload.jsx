import { useRef } from 'react';

const FileUpload = ({ 
  label, 
  id, 
  value, 
  onChange, 
  accept, 
  className = '', 
  icon, 
  placeholder = 'Choose a file', 
  ...props 
}) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0] || null;
    onChange(file);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear input value so selecting the same file again fires onChange
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onChange(null);
  };

  return (
    <div className={`file-upload-container ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      
      <div className="file-upload-wrapper">
        <label htmlFor={id} className="file-upload-dropzone">
          {value ? (
            <span className="file-upload-filename">{value.name}</span>
          ) : (
            <div className="file-upload-content">
              {icon && <img src={icon} alt="" className="file-upload-icon" />}
              <span className="file-upload-placeholder">{placeholder}</span>
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
          style={{ display: 'none' }} // Hides the ugly native browser button
          {...props}
        />
        
        {value && (
          <button 
            type="button" 
            className="file-upload-clear" 
            onClick={handleClear} 
            aria-label="Remove file"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
