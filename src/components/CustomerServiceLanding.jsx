import React from 'react'
import { useNavigate } from 'react-router-dom'
import Pricing from './Pricing'
import SubscriptionTabs from './SubscriptionTabs'
import { logout, getUser } from '../utils/auth'

export default function CustomerServiceLanding({ onLogout }) {
  const user = getUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    if (onLogout) onLogout()
  }

  const handleAddNewPlan = () => {
    navigate('/add-plan')
  }

  return (
    <div>
      {/* Custom NavBar for Customer Service - Logo centered + Logout only */}
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}></div>
        
        {/* Logo centered */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <button 
            onClick={() => navigate('/customer-service')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <img src="/logo.png" alt="UniHub Logo" style={{ height: '40px' }} />
          </button>
        </div>

        {/* Logout button on right */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#666'
            }}
            title="Logout"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16C13 17.6569 11.6569 19 10 19H6C4.34315 19 3 17.6569 3 16V8C3 6.34315 4.34315 5 6 5H10C11.6569 5 13 6.34315 13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>
      
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
        <h1>Welcome, {user?.first_name || user?.name || 'Customer Service'}!</h1>
        <p>Manage your subscription plans and handle inquiries below</p>
      </div>

      <Pricing 
        sectionId="customer-pricing"
        hideHeader={true}
        buyButtonText="More Info"
        showAddPlanButton={true}
        onAddNewPlan={handleAddNewPlan}
      />

      <SubscriptionTabs />
    </div>
  )
}
