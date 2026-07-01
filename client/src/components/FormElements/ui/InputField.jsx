import React from 'react';

const InputField = ({ label, id, type = 'text', value, onChange, placeholder, className, rightIcon, ...props }) => {
  return (
    <div className={`input-field-container ${className || ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="input-wrapper">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...props}
        />
        {rightIcon}
      </div>
    </div>
  );
};

export default InputField;