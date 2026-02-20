import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, put, deleteRequest } from '../utils/api'
import { getUser } from '../utils/auth'
import { getRoleName, ROLES } from '../constants/roles'
import { MOUNT_ANIMATION_DELAY } from '../utils/config'

export default function Pricing({ 
	buyButtonText = 'Buy',
	onAddNewPlan = null,
	showAddPlanButton = false,
	sectionId = 'pricing',
	hideHeader = false,
	onSelectPlan = null,
	subscribedPlanId = null
}) {
	const [plans, setPlans] = useState([])
	const [selectedPlan, setSelectedPlan] = useState(null)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [formState, setFormState] = useState({ planName: '', planDescription: '', price: '', maxUserAmount: 1, currency: 'USD' })
	const [actionError, setActionError] = useState('')
	// Determine whether current user is customer service
	const user = getUser()
	const roleName = getRoleName(user)
	const isCustomerService = roleName === ROLES.CUSTOMER_SERVICE
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

		const navigate = useNavigate()

		function openDetails(plan) {
			if (isCustomerService) {
				navigate(`/customer-service/subscription-plan/${plan.subscription_plan_id}`)
				return
			}

			setSelectedPlan(plan)
			setFormState({
				planName: plan.subscription_plan_name || '',
				planDescription: plan.subscription_plan_description || '',
				price: (plan.subscription_plan_price != null) ? (plan.subscription_plan_price).toFixed(2) : '',
				maxUserAmount: plan.subscription_plan_max_user_amount || 1,
				currency: plan.subscription_plan_currency || 'USD'
			})
			setActionError('')
			setIsEditing(false)
			setDetailsOpen(true)
		}

	function closeDetails() {
		setDetailsOpen(false)
		setSelectedPlan(null)
		setActionError('')
	}

	function handleFormChange(e) {
		const { name, value } = e.target
		setFormState(prev => ({ ...prev, [name]: value }))
	}

	async function handleUpdate() {
		setActionError('')
		try {
			const body = {
				subscription_plan_name: formState.planName,
				subscription_plan_description: formState.planDescription,
				price: Math.round(parseFloat(formState.price) * 100) / 100,
				subscription_plan_max_user_amount: parseInt(formState.maxUserAmount, 10)
			}
			await put(`subscription/api/v1/subscription-plans/customer-service/update/${selectedPlan.subscription_plan_id}`, body)
			await fetchPlans(currentPage)
			setIsEditing(false)
			closeDetails()
		} catch (err) {
			setActionError(err.message || 'Failed to update plan')
		}
	}

	async function handleDelete() {
		setActionError('')
		if (!selectedPlan) return
		if (!window.confirm('Are you sure you want to delete this subscription plan?')) return
		try {
			await deleteRequest(`subscription/api/v1/subscription-plans/customer-service/delete/${selectedPlan.subscription_plan_id}`)
			await fetchPlans(currentPage)
			closeDetails()
		} catch (err) {
			setActionError(err.message || 'Failed to delete plan')
		}
	}

	function prev() {
		if (currentPage > 1) setCurrentPage(currentPage - 1)
	}

	function next() {
		if (plans.length > 0) setCurrentPage(currentPage + 1)
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
						{(showAddPlanButton && isCustomerService) && (
							<div style={{ marginTop: '16px' }}>
								<button onClick={onAddNewPlan} style={{ padding: '12px 18px', borderRadius: '6px', background: '#3a4a52', color: '#fff', border: 'none', cursor: 'pointer' }}>Add subscription plan</button>
							</div>
						)}
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
										{!isCustomerService && (
											plan.subscription_plan_id === subscribedPlanId ? (
												<button
													className="buy-pill"
													type="button"
													onClick={() => onSelectPlan && onSelectPlan(plan)}
												>
													More info
												</button>
											) : (
												<button
													className="buy-pill"
													type="button"
													onClick={() => onSelectPlan && onSelectPlan(plan)}
												>
													{buyButtonText}
												</button>
											)
										)}
										{isCustomerService && (
											<button
												className="buy-pill more-pill"
												type="button"
												onClick={() => openDetails(plan)}
											>
												More info
											</button>
										)}
									</div>
								</article>
							))}
							{(showAddPlanButton && isCustomerService) && (
								<div
									className="pricing-card add-plan-card"
									onClick={onAddNewPlan}
									style={{
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										minHeight: '300px',
										backgroundColor: '#f5f5f5',
										borderRadius: '8px',
										border: '2px dashed #ccc'
									}}
								>
									<button style={{ fontSize: '3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#3a4a52' }}>+</button>
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

			{detailsOpen && selectedPlan && (
				<div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
					<div style={{ width: '600px', maxWidth: '95%', background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
						<h3 style={{ marginTop: 0 }}>{selectedPlan.subscription_plan_name}</h3>
						{actionError && <div style={{ color: '#b71c1c', background: '#fdecea', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>{actionError}</div>}
						{!isEditing ? (
							<div>
								<p style={{ color: '#444' }}>{selectedPlan.subscription_plan_description}</p>
								<ul>
									<li><strong>Price:</strong> {selectedPlan.subscription_plan_currency} ${selectedPlan.subscription_plan_price.toFixed(2)}</li>
									<li><strong>Max users:</strong> {selectedPlan.subscription_plan_max_user_amount}</li>
									<li><strong>Created at:</strong> {selectedPlan.created_at || selectedPlan.createdAt}</li>
								</ul>
								<div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
									<button onClick={() => setIsEditing(true)} style={{ padding: '8px 12px' }}>Edit</button>
									<button onClick={handleDelete} style={{ padding: '8px 12px', background: '#b71c1c', color: '#fff', border: 'none' }}>Delete</button>
									<button onClick={closeDetails} style={{ padding: '8px 12px' }}>Close</button>
								</div>
							</div>
						) : (
							<div>
								<div style={{ display: 'grid', gap: '8px' }}>
									<label>Plan name<input name="planName" value={formState.planName} onChange={handleFormChange} /></label>
									<label>Description<textarea name="planDescription" value={formState.planDescription} onChange={handleFormChange} rows={4} /></label>
									<label>Price<input name="price" type="number" step="0.01" value={formState.price} onChange={handleFormChange} /></label>
									<label>Max users<input name="maxUserAmount" type="number" value={formState.maxUserAmount} onChange={handleFormChange} /></label>
								</div>
								<div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
									<button onClick={handleUpdate} style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none' }}>Save</button>
									<button onClick={() => setIsEditing(false)} style={{ padding: '8px 12px' }}>Cancel</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
			</div>
		</section>
	)
}
