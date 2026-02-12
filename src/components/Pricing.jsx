import React, { useEffect, useState } from 'react'
import { get } from '../utils/api'
import { MOUNT_ANIMATION_DELAY } from '../utils/config'

export default function Pricing({ 
	buyButtonText = 'Buy',
	onAddNewPlan = null,
	showAddPlanButton = false,
	sectionId = 'pricing',
	hideHeader = false
}) {
	const [plans, setPlans] = useState([])
	const [currentPage, setCurrentPage] = useState(1)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		const t = setTimeout(() => setMounted(true), MOUNT_ANIMATION_DELAY)
		return () => clearTimeout(t)
	}, [])

	useEffect(() => {
		fetchPlans(currentPage)
	}, [currentPage])

	async function fetchPlans(pageNum) {
		setLoading(true)
		setError('')
		try {
			// Full URL: http://localhost:8082/unihub/subscription/subscription-plans/all?page_num=1
			const data = await get(`subscription/api/v1/subscription-plans/all?page_num=${pageNum}`)
			const plansData = data['subscription-plans'] || []
			
			if (plansData.length === 0 && pageNum > 1) {
				setCurrentPage(pageNum - 1)
				return
			}
			
			setPlans(plansData)
		} catch (err) {
			const errorMessage = err.message || 'Failed to load subscription plans. Please try again later.'
			setError(errorMessage)
		} finally {
			setLoading(false)
		}
	}

	function prev() {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1)
		}
	}

	function next() {
		if (plans.length > 0) {
			setCurrentPage(currentPage + 1)
		}
	}

	const canGoPrev = currentPage > 1
	const canGoNext = plans.length > 0

	return (
		<section id={sectionId} className="pricing" aria-label="Pricing">
			<div className="pricing-inner">
				{!hideHeader && (
					<div className="pricing-header">
						<h3>Pricing</h3>
						<p>Simple, predictable plans — pick what fits your institution.</p>
					</div>
				)}

				{error && (
					<div style={{ color: '#e74c3c', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', textAlign: 'center' }}>
						{error}
					</div>
				)}

			{plans.length === 0 && !loading ? (
				<div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
					No subscription plans available at the moment.
				</div>
			) : (
				<div className={`pricing-row ${mounted ? 'enter' : ''}`} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
					<button
						className="pricing-nav left"
						onClick={prev}
						disabled={!canGoPrev || loading}
						aria-label="Previous plan"
						style={{ opacity: (canGoPrev && !loading) ? 1 : 0.5, cursor: (canGoPrev && !loading) ? 'pointer' : 'not-allowed' }}
					>
						‹
					</button>

					<div className="pricing-cards">
							{plans.map((plan, i) => (
								<article
									key={plan.subscription_plan_id}
									className={`pricing-card ${i === 0 ? 'active' : ''}`}
									onClick={() => {}}
								>
									<div className="card-body">
										<h4 className="card-title">{plan.subscription_plan_name}</h4>
										<p className="card-blurb">{plan.subscription_plan_description}</p>
										<div className="card-supports">
											<span className="supports-arrow">➤</span>
											Supports up to <strong>{plan.subscription_plan_max_user_amount}</strong> users
										</div>
									</div>

									<div className="card-bottom">
										<div className="card-price-group">
											<div className="card-price-meta">per year</div>
											<div className="card-price">
												{plan.subscription_plan_currency} ${plan.subscription_plan_price.toFixed(2)}
											</div>
										</div>
									</div>

									<div className="card-actions">
										<button className="buy-pill">{buyButtonText}</button>
									</div>
								</article>
							))}
							{showAddPlanButton && (
								<div className="pricing-card add-plan-card" onClick={onAddNewPlan} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '2px dashed #ccc' }}>
									<button style={{ fontSize: '3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#007bff' }}>+</button>
								</div>
							)}
						</div>

						<button
							className="pricing-nav right"
							onClick={next}
							disabled={!canGoNext || loading}
							aria-label="Next plan"
							style={{ opacity: (canGoNext && !loading) ? 1 : 0.5, cursor: (canGoNext && !loading) ? 'pointer' : 'not-allowed' }}
						>
							›
						</button>
					</div>
				)}
			</div>
		</section>
	)
}
