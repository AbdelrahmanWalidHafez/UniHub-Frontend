import React from 'react'
import { useNavigate } from 'react-router-dom'
import Pricing from './Pricing'
import SubscriptionTabs from './SubscriptionTabs'
import { logout, getUser } from '../utils/auth'
import { ROUTES } from '../constants/routes'

export default function CustomerServiceLanding({ onLogout }) {
  const user = getUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    if (onLogout) onLogout()
  }

  const handleAddNewPlan = () => {
    navigate(ROUTES.ADD_PLAN)
  }

  return (
    <div>
      {}
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}></div>
        
        {}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <button 
            onClick={() => navigate(ROUTES.CUSTOMER_SERVICE)}
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

        {}
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
            <img src="/logout.png" alt="Logout" style={{ width: 20, height: 20 }} />
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
