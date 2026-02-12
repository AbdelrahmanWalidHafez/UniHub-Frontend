import React, { useState } from 'react'
import MapView from './MapView'
import { post } from '../utils/api'
import { sanitizeInput } from '../utils/xss'

export default function Contact() {
	const [form, setForm] = useState({ customer_email: '', subject: '', content: '' })
	const [submitted, setSubmitted] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [fieldErrors, setFieldErrors] = useState({})

	function handleChange(e) {
		const { name, value } = e.target
		setForm((s) => ({ ...s, [name]: value }))
		setError('')
		validateField(name, value)
	}

	function isValidEmail(v) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
	}

	function validateField(name, value) {
		const errors = { ...fieldErrors }
		
		if (name === 'customer_email') {
			if (!value.trim()) {
				errors.customer_email = 'Email cannot be blank'
			} else if (!isValidEmail(value)) {
				errors.customer_email = 'Must be a valid email'
			} else {
				delete errors.customer_email
			}
		}

		if (name === 'subject') {
			if (!value.trim()) {
				errors.subject = 'Subject cannot be blank'
			} else if (value.trim().length < 3) {
				errors.subject = 'Subject must be at least 3 characters'
			} else if (value.trim().length > 30) {
				errors.subject = 'Subject must be at most 30 characters'
			} else {
				delete errors.subject
			}
		}

		if (name === 'content') {
			if (!value.trim()) {
				errors.content = 'Content cannot be blank'
			} else if (value.trim().length < 5) {
				errors.content = 'Content must be at least 5 characters'
			} else if (value.trim().length > 300) {
				errors.content = 'Content must be at most 300 characters'
			} else {
				delete errors.content
			}
		}

		setFieldErrors(errors)
	}

	const isEmailValid = form.customer_email && isValidEmail(form.customer_email)
	const isSubjectValid = form.subject.trim().length >= 3 && form.subject.trim().length <= 30
	const isContentValid = form.content.trim().length >= 5 && form.content.trim().length <= 300
	const valid = isEmailValid && isSubjectValid && isContentValid

	async function handleSubmit(e) {
		e.preventDefault()
		if (!valid || submitting) return
		setSubmitting(true)
		setError('')
		setFieldErrors({})

		try {
			const data = await post('subscription/request-subscription', {
				subject: sanitizeInput(form.subject),
				content: sanitizeInput(form.content),
				customer_email: sanitizeInput(form.customer_email),
			}, { public: true })

				setSubmitted(true)
				setForm({ customer_email: '', subject: '', content: '' })
		} catch (err) {
			const errorMessage = err.message || 'An error occurred while submitting the form. Please try again later.'
				setError(errorMessage)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<section id="contact" className="contact" aria-label="Contact us">
			<div className="contact-inner" style={{ transition: 'none', animation: 'none' }}>
				<div className="contact-left">
					<h3>Get in Touch</h3>
					<p className="contact-sub">You can reach us anytime</p>
					<p className="contact-ack">UniHub can deliver licenses and service access across regions with flexible plans. By submitting this form you agree that UniHub may process the personal data you provide above for the purposes you specify. We take privacy seriously and will only use your details to respond and fulfil your request. Our team typically replies within one business day — please include any relevant order numbers or account IDs in your message to help us assist you faster.</p>

					<div className="contact-info">
						<h4>Contact</h4>
						<p>Phone: <a href="tel:+20100906333">+20 100906333</a>, <a href="tel:+035455918">+03 5455918</a></p>
						<p>Email: <a href="mailto:uni.hub.grad.project@gmail.com">uni.hub.grad.project@gmail.com</a></p>
					</div>
				</div>



				<div className="contact-right">
					<div className="contact-card" style={{ animation: 'none', transition: 'none' }}>
						{submitted ? (
							<div className="contact-success" style={{ animation: 'none', transition: 'none' }}>
								<div className="success-check">✓</div>
								<h4>Thanks — we received your message</h4>
								<p>We'll reply to the address you provided as soon as possible.</p>
							</div>					) : (							<form className="contact-form" onSubmit={handleSubmit} noValidate>
								{error && (
									<div className="form-error" style={{ color: '#e74c3c', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8d7da', borderRadius: '4px', borderLeft: '4px solid #e74c3c' }}>
										{error}
									</div>
								)}
								<label>
									Email
									<input name="customer_email" type="email" value={form.customer_email} onChange={handleChange} placeholder="you@company.com" aria-invalid={!!fieldErrors.customer_email} />
									<div className="field-help">{fieldErrors.customer_email}</div>
								</label>

								<label>
									Subject
									<input name="subject" type="text" value={form.subject} onChange={handleChange} placeholder="Subject (3-30 characters)" aria-invalid={!!fieldErrors.subject} />
									<div className="field-row">
										<div className="field-help">{fieldErrors.subject}</div>
										<div className="char-count">{form.subject.length}/30</div>
									</div>
								</label>

								<label>
									Message
									<textarea name="content" rows={6} maxLength={300} value={form.content} onChange={handleChange} placeholder="How can we help? (5-300 characters)" aria-invalid={!!fieldErrors.content} />
									<div className="field-row">
										<div className="field-help">{fieldErrors.content}</div>
										<div className="char-count">{form.content.length}/300</div>
									</div>
								</label>

								<div className="contact-actions">
									<button type="submit" className={`submit-btn ${submitting ? 'is-loading' : ''}`} disabled={!valid || submitting}>
										{submitting ? (
											<span className="btn-loader" aria-hidden></span>
										) : null}
										<span className="btn-label">{submitted ? 'Sent' : 'Submit'}</span>
									</button>
								</div>

								<div className="contact-legal">By contacting us, you agree to our Terms of service and Privacy Policy</div>
							</form>
						)}
					</div>
				</div>
			</div>

			<div className="social-strip" aria-hidden={false}>
				<div className="social-icons">
					<a href="https://facebook.com" target="_blank" rel="noreferrer"><img src="/facebook.png" alt="facebook" /></a>
					<a href="https://twitter.com" target="_blank" rel="noreferrer"><img src="/X.png" alt="X" /></a>
					<a href="https://www.linkedin.com" target="_blank" rel="noreferrer"><img src="/linkedIn.png" alt="LinkedIn" /></a>
					<a href="https://www.youtube.com" target="_blank" rel="noreferrer"><img src="/youtube.png" alt="YouTube" /></a>
					<a href="https://instagram.com" target="_blank" rel="noreferrer"><img src="/instgram.png" alt="Instagram" /></a>
				</div>
				<div className="social-copy">© 2026 UniHub. All rights reserved.</div>
				<div className="made-in"><img src="/worldwide.png" alt="globe" style={{width:16,height:16,marginRight:8}}/>Made in Egypt</div>
			</div>

			<div className="contact-map">
					<MapView lat={31.23052} lng={29.952007500000004} zoom={13} />
				</div>
			</section>
	)
}

