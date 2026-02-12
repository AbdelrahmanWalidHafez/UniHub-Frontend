import React, { useState, useEffect } from 'react'
import { get } from '../utils/api'

export default function SubscriptionRequests() {
	const [requests, setRequests] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [page, setPage] = useState(1)

	useEffect(() => {
		fetchSubscriptionRequests(page)
	}, [page])

	async function fetchSubscriptionRequests(pageNum) {
		setLoading(true)
		setError('')
		try {
			// Full URL: http://localhost:8082/unihub/subscription/api/v1/customer-service/get-requests?page_num=1
			const data = await get(`subscription/api/v1/customer-service/get-requests?page_num=${pageNum}`)
			const requestsData = data['subscription-requests'] || data || []
			setRequests(Array.isArray(requestsData) ? requestsData : [])
		} catch (err) {
			console.error('Failed to fetch subscription requests:', err)
			setError(err.message || 'Failed to load subscription requests')
		} finally {
			setLoading(false)
		}
	}

	const formatDate = (dateString) => {
		if (!dateString) return '-'
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
	}

	const getStatusBadgeColor = (status) => {
		const statusLower = (status || '').toLowerCase()
		switch (statusLower) {
			case 'pending':
				return { bg: '#fff3cd', color: '#856404', border: '#ffc107' }
			case 'approved':
				return { bg: '#d4edda', color: '#155724', border: '#28a745' }
			case 'rejected':
				return { bg: '#f8d7da', color: '#721c24', border: '#dc3545' }
			case 'completed':
				return { bg: '#d1ecf1', color: '#0c5460', border: '#17a2b8' }
			default:
				return { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
		}
	}

	return (
		<div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px 0' }}>
			{error && (
				<div style={{
					padding: '12px 16px',
					backgroundColor: '#f8d7da',
					border: '1px solid #f5c6cb',
					borderRadius: '4px',
					color: '#721c24',
					marginBottom: '20px'
				}}>
					{error}
				</div>
			)}

			{loading ? (
				<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
					<p>Loading subscription requests...</p>
				</div>
			) : requests.length === 0 ? (
				<div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
					<p>No subscription requests found</p>
				</div>
			) : (
				<div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
					<table style={{
						width: '100%',
						borderCollapse: 'collapse',
						backgroundColor: '#fff',
						fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
					}}>
						<thead>
							<tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>Request ID</th>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>University Name</th>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>Created By</th>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>Created At</th>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>Updated By</th>
								<th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '14px' }}>Updated At</th>
								<th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#333', fontSize: '14px' }}>Status</th>
							</tr>
						</thead>
						<tbody>
							{requests.map((request, index) => {
								const statusColors = getStatusBadgeColor(request.status)
								return (
									<tr
										key={request.request_id || index}
										style={{
											borderBottom: '1px solid #e9ecef',
											backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
											transition: 'background-color 0.2s ease',
											':hover': { backgroundColor: '#f0f0f0' }
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'}
									>
										<td style={{ padding: '16px', fontSize: '13px', color: '#333', fontFamily: 'monospace' }}>
											{request.request_id ? request.request_id.substring(0, 8) + '...' : '-'}
										</td>
										<td style={{ padding: '16px', fontSize: '13px', color: '#333', fontWeight: '500' }}>
											{request.university_name || '-'}
										</td>
										<td style={{ padding: '16px', fontSize: '13px', color: '#666' }}>
											{request.created_by || '-'}
										</td>
										<td style={{ padding: '16px', fontSize: '13px', color: '#666' }}>
											{formatDate(request.created_at)}
										</td>
										<td style={{ padding: '16px', fontSize: '13px', color: '#666' }}>
											{request.updated_by || '-'}
										</td>
										<td style={{ padding: '16px', fontSize: '13px', color: '#666' }}>
											{formatDate(request.updated_at)}
										</td>
										<td style={{ padding: '16px', textAlign: 'center' }}>
											<span style={{
												display: 'inline-block',
												padding: '4px 12px',
												borderRadius: '20px',
												fontSize: '12px',
												fontWeight: '600',
												textTransform: 'capitalize',
												backgroundColor: statusColors.bg,
												color: statusColors.color,
												border: `1px solid ${statusColors.border}`
											}}>
												{request.status || 'Unknown'}
											</span>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			{!loading && requests.length > 0 && (
				<div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
					<button
						onClick={() => setPage(Math.max(1, page - 1))}
						disabled={page === 1}
						style={{
							padding: '8px 16px',
							backgroundColor: page === 1 ? '#e9ecef' : '#007bff',
							color: page === 1 ? '#999' : '#fff',
							border: 'none',
							borderRadius: '4px',
							cursor: page === 1 ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '600',
							transition: 'background-color 0.2s'
						}}
					>
						Previous
					</button>
					<span style={{ padding: '8px 16px', color: '#666', fontWeight: '600' }}>
						Page {page}
					</span>
					<button
						onClick={() => setPage(page + 1)}
						style={{
							padding: '8px 16px',
							backgroundColor: '#007bff',
							color: '#fff',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '600',
							transition: 'background-color 0.2s'
						}}
					>
						Next
					</button>
				</div>
			)}
		</div>
	)
}
