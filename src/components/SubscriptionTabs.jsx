import React, { useState } from 'react'
import SubscriptionRequests from './SubscriptionRequests'
import Inquiries from './Inquiries'

export default function SubscriptionTabs() {
	const [activeTab, setActiveTab] = useState('subscription-requests')

	const tabs = [
		{ id: 'subscription-requests', label: 'Subscription Requests' },
		{ id: 'inquiries', label: 'Inquiries' },
		{ id: 'universities', label: 'Universities' }
	]

	return (
		<div className="subscription-tabs" style={{ marginTop: '40px', padding: '20px' }}>
			<div className="tabs-nav" style={{ display: 'flex', justifyContent: 'center', borderBottom: '2px solid #e0e0e0', marginBottom: '20px', gap: '40px' }}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						style={{
							padding: '15px 0',
							background: 'none',
							border: 'none',
							fontSize: '16px',
							fontWeight: activeTab === tab.id ? '600' : '400',
							color: activeTab === tab.id ? '#3a4a52' : '#666',
							borderBottom: activeTab === tab.id ? '3px solid #3a4a52' : 'none',
							cursor: 'pointer',
							transition: 'all 0.3s ease',
							whiteSpace: 'nowrap'
						}}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="tab-content" style={{ padding: '20px 0' }}>
				{activeTab === 'subscription-requests' && <SubscriptionRequests />}
				{activeTab === 'inquiries' && <Inquiries />}
				{activeTab === 'universities' && (
					<div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
						<p>Universities content will go here</p>
					</div>
				)}
			</div>
		</div>
	)
}
