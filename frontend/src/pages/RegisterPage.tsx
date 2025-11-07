import React, { useState } from 'react';
import { registerDataPoint } from '../services/api';
import { DataPoint } from '../types';
import './RegisterPage.css';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<Partial<DataPoint>>({
    key: '',
    description: '',
    addressType: 'D',
    address: 0,
    length: 1,
    type: 'number',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'address' || name === 'length' || name === 'bit'
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      // Validation
      if (!formData.key || !formData.description) {
        throw new Error('Key and description are required');
      }

      if (formData.type === 'bool' && (formData.bit === undefined || formData.bit === null)) {
        throw new Error('Bit position is required for bool type');
      }

      await registerDataPoint(formData as DataPoint);
      setMessage({ type: 'success', text: `Data point "${formData.key}" registered successfully!` });

      // Reset form
      setFormData({
        key: '',
        description: '',
        addressType: 'D',
        address: 0,
        length: 1,
        type: 'number',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Failed to register data point'
      });
    }
  };

  return (
    <div className="register-page">
      <h1>Register Data Point</h1>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label htmlFor="key">Key *</label>
          <input
            type="text"
            id="key"
            name="key"
            value={formData.key}
            onChange={handleInputChange}
            required
            placeholder="e.g., motor_speed"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            placeholder="e.g., Motor speed sensor"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="addressType">Address Type *</label>
            <select
              id="addressType"
              name="addressType"
              value={formData.addressType}
              onChange={handleInputChange}
              required
            >
              <option value="D">D - Data Register</option>
              <option value="R">R - File Register</option>
              <option value="M">M - Internal Relay</option>
              <option value="X">X - Input</option>
              <option value="Y">Y - Output</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <input
              type="number"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              min="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">Data Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              <option value="number">Number (Word Array)</option>
              <option value="string">String</option>
              <option value="bool">Boolean (Bit)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="length">
              Length * {formData.type === 'number' && '(words)'}
              {formData.type === 'string' && '(chars)'}
            </label>
            <input
              type="number"
              id="length"
              name="length"
              value={formData.length}
              onChange={handleInputChange}
              required
              min="1"
            />
          </div>
        </div>

        {formData.type === 'bool' && (
          <div className="form-group">
            <label htmlFor="bit">Bit Position * (0-15)</label>
            <input
              type="number"
              id="bit"
              name="bit"
              value={formData.bit || 0}
              onChange={handleInputChange}
              required
              min="0"
              max="15"
            />
          </div>
        )}

        <button type="submit" className="submit-btn">
          Register Data Point
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
