import React, { useState, useEffect } from 'react'
import { get } from '../utils/api'
import SubscriptionRequests from './SubscriptionRequests'
import Inquiries from './Inquiries'
import Universities from './Universities'

export default function SubscriptionTabs() {
	usePrefetchTabs()
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
							color: activeTab === tab.id ? '#000' : '#666',
							borderBottom: activeTab === tab.id ? '3px solid #000' : 'none',
							cursor: 'pointer',
							transition: 'color 180ms ease, border-bottom 180ms ease',
							whiteSpace: 'nowrap'
						}}
						onMouseEnter={(e) => { e.currentTarget.style.color = '#000' }}
						onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#666' }}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="tab-content" style={{ padding: '20px 0', position: 'relative', minHeight: 300 }}>
				<div className="tab-panel" style={{ position: 'absolute', inset: 0, transition: 'opacity 180ms ease, transform 200ms cubic-bezier(.2,.8,.2,1)', opacity: activeTab === 'subscription-requests' ? 1 : 0, transform: activeTab === 'subscription-requests' ? 'none' : 'translateY(4px)', pointerEvents: activeTab === 'subscription-requests' ? 'auto' : 'none', visibility: activeTab === 'subscription-requests' ? 'visible' : 'hidden' }}>
					<SubscriptionRequests />
				</div>
				<div className="tab-panel" style={{ position: 'absolute', inset: 0, transition: 'opacity 180ms ease, transform 200ms cubic-bezier(.2,.8,.2,1)', opacity: activeTab === 'inquiries' ? 1 : 0, transform: activeTab === 'inquiries' ? 'none' : 'translateY(4px)', pointerEvents: activeTab === 'inquiries' ? 'auto' : 'none', visibility: activeTab === 'inquiries' ? 'visible' : 'hidden', willChange: 'opacity, transform' }}>
					<Inquiries />
				</div>
				<div className="tab-panel" style={{ position: 'absolute', inset: 0, transition: 'opacity 180ms ease, transform 200ms cubic-bezier(.2,.8,.2,1)', opacity: activeTab === 'universities' ? 1 : 0, transform: activeTab === 'universities' ? 'none' : 'translateY(4px)', pointerEvents: activeTab === 'universities' ? 'auto' : 'none', visibility: activeTab === 'universities' ? 'visible' : 'hidden', willChange: 'opacity, transform' }}>
					<Universities />
				</div>
			</div>
		</div>
	)
}

	
	function usePrefetchTabs() {
		useEffect(() => {
			let cancelled = false
			const t = setTimeout(async () => {
				try {
					
					await Promise.all([
						get('subscription/api/v1/customer-service/get-requests?page_num=1&page_size=3'),
						get('subscription/api/v1/inquiries/customer-service/get-inquiries?page_num=1&page_size=3'),
						get('universitymanagement/api/v1/customer-service/get-universities?page_num=1&page_size=3')
					])
				} catch (err) {
					
					console.debug('Tab prefetch failed', err)
				}
			}, 120)
			return () => { cancelled = true; clearTimeout(t) }
		}, [])
	}
