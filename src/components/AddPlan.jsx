import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from './NavBar'
import { logout } from '../utils/auth'
import { ROUTES } from '../constants/routes'
import { ENABLE_LOGGING } from '../utils/config'

export default function AddPlan({ onGoBack }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    planName: '',
    description: '',
    price: '',
    maxUsers: '',
    currency: 'USD'
  })

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.HOME)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (ENABLE_LOGGING) {
      console.debug('New plan data:', formData)
    }
    // TODO: Send to backend API
    navigate(ROUTES.CUSTOMER_SERVICE)
  }

  const handleCancel = () => {
    navigate(ROUTES.CUSTOMER_SERVICE)
  }

  return (
    <div>
      <NavBar 
        appName="UniHub" 
        logoSrc="/logo.png" 
        onUserIconClick={handleLogout} 
        onLogoClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
        isAuthenticated={true}
      />

      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <h2>Add New Subscription Plan</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Create a new subscription plan for your customers</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Plan Name</label>
            <input
              type="text"
              name="planName"
              value={formData.planName}
              onChange={handleInputChange}
              placeholder="e.g., Premium Plan"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe this plan"
              rows="4"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="100.00"
                step="0.01"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Max Users</label>
              <input
                type="number"
                name="maxUsers"
                value={formData.maxUsers}
                onChange={handleInputChange}
                placeholder="50"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Create Plan
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
