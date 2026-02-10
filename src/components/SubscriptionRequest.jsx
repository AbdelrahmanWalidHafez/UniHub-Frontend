import React, { useState, useRef, useEffect, useMemo } from 'react'
import NavBar from './NavBar'
import { sanitizeInput } from '../utils/xss'
import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import Select from 'react-select'
import allCountries from 'world-countries'
import { City } from 'country-state-city'
import { API_GATEWAY_BASE_URL } from '../utils/config'
import {
	INITIAL_FORM_STATE,
	VALIDATION_RULES,
	ERROR_MESSAGES,
	SUCCESS_MESSAGE,
	API_CONFIG,
	FILE_TYPES,
	FILE_CONFIG,
} from './SubscriptionRequest.constants'

/**
 * SubscriptionRequest Component
 * Handles subscription request form submission with validation, file uploads, and error handling
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.selectedPlan - Selected subscription plan details
 * @param {Function} props.onBackToLogin - Callback to navigate back to login
 * @returns {JSX.Element} Subscription request form page
 */
export default function SubscriptionRequest({ selectedPlan, onBackToLogin }) {
	const [form, setForm] = useState(INITIAL_FORM_STATE)
	const [errors, setErrors] = useState({})
	const [submitting, setSubmitting] = useState(false)
	const [success, setSuccess] = useState(false)
	const [logoFile, setLogoFile] = useState(null)
	const [accreditationFile, setAccreditationFile] = useState(null)
	const [showLogoModal, setShowLogoModal] = useState(false)
	const [showAccreditationModal, setShowAccreditationModal] = useState(false)

	const logoInputRef = useRef(null)
	const accInputRef = useRef(null)

	/** Memoized country options for better performance */
	const countryOptions = useMemo(
		() =>
			allCountries
				.map((c) => ({
					value: c.cca2,
					label: c.name.common,
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[]
	)

	const [cityOptions, setCityOptions] = useState([])

	useEffect(() => {
		if (form.countryCode) {
			const cities = City.getCitiesOfCountry(form.countryCode) || []
			const mapped = cities.map((city) => ({
				value: city.name,
				label: city.name,
			}))
			setCityOptions(mapped)
			setForm((prev) => ({ ...prev, city: '' }))
			setErrors((prev) => ({ ...prev, city: '' }))
		} else {
			setCityOptions([])
		}
	}, [form.countryCode])

	// Keep success visible until user navigates or submits another request

	function handleChange(e) {
		const { name, value } = e.target
		setForm((prev) => ({ ...prev, [name]: value }))
		setErrors((prev) => ({ ...prev, [name]: '' }))
	}

	const isFormComplete = !!(
		form.universityName.trim() &&
		form.universityEmail.trim() &&
		form.country.trim() &&
		form.city.trim() &&
		form.contactNumber.trim() &&
		form.universityWebsiteUrl.trim() &&
		form.universityDomain.trim() &&
		logoFile &&
		accreditationFile
	)

	function validate() {
		const newErrors = {}
		const trimmedValues = Object.keys(form).reduce((acc, key) => {
			acc[key] = form[key].trim ? form[key].trim() : form[key]
			return acc
		}, {})

		// Validate university name
		const nameRule = VALIDATION_RULES.universityName
		if (!trimmedValues.universityName) {
			newErrors.universityName = nameRule.messages.empty
		} else if (
			trimmedValues.universityName.length < nameRule.minLength ||
			trimmedValues.universityName.length > nameRule.maxLength
		) {
			newErrors.universityName = nameRule.messages.length
		} else if (!nameRule.pattern.test(trimmedValues.universityName)) {
			newErrors.universityName = nameRule.messages.pattern
		}

		// Validate email
		const emailRule = VALIDATION_RULES.universityEmail
		if (!trimmedValues.universityEmail) {
			newErrors.universityEmail = emailRule.messages.empty
		} else if (!emailRule.pattern.test(trimmedValues.universityEmail)) {
			newErrors.universityEmail = emailRule.messages.pattern
		}

		// Validate country
		const countryRule = VALIDATION_RULES.country
		if (!trimmedValues.country) {
			newErrors.country = countryRule.messages.empty
		} else if (
			trimmedValues.country.length < countryRule.minLength ||
			trimmedValues.country.length > countryRule.maxLength
		) {
			newErrors.country = countryRule.messages.length
		}

		// Validate city
		const cityRule = VALIDATION_RULES.city
		if (!trimmedValues.city) {
			newErrors.city = cityRule.messages.empty
		} else if (
			trimmedValues.city.length < cityRule.minLength ||
			trimmedValues.city.length > cityRule.maxLength
		) {
			newErrors.city = cityRule.messages.length
		} else if (!cityRule.pattern.test(trimmedValues.city)) {
			newErrors.city = cityRule.messages.pattern
		}

		// Validate contact number
		const phoneRule = VALIDATION_RULES.contactNumber
		const phoneNormalized = form.contactNumber.replace(/\s+/g, '').replace(/[^+\d]/g, '')
		if (!phoneNormalized) {
			newErrors.contactNumber = phoneRule.messages.empty
		} else if (!phoneRule.pattern.test(phoneNormalized)) {
			newErrors.contactNumber = phoneRule.messages.pattern
		}

		// Validate website URL
		const urlRule = VALIDATION_RULES.universityWebsiteUrl
		if (!trimmedValues.universityWebsiteUrl) {
			newErrors.universityWebsiteUrl = urlRule.messages.empty
		} else if (!urlRule.pattern.test(trimmedValues.universityWebsiteUrl)) {
			newErrors.universityWebsiteUrl = urlRule.messages.pattern
		}

		// Validate domain
		const domainRule = VALIDATION_RULES.universityDomain
		if (!trimmedValues.universityDomain) {
			newErrors.universityDomain = domainRule.messages.empty
		} else if (!domainRule.pattern.test(trimmedValues.universityDomain)) {
			newErrors.universityDomain = domainRule.messages.pattern
		}

		// Validate files
		if (!logoFile) {
			newErrors.universityLogo = 'University logo is required'
		}
		if (!accreditationFile) {
			newErrors.universityAccreditation = 'University accreditation file is required'
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	function handleFileSelect(e, type) {
		const file = e.target.files && e.target.files[0]
		if (!file) return
		if (type === FILE_TYPES.LOGO) {
			setLogoFile(file)
			setShowLogoModal(false)
		} else if (type === FILE_TYPES.ACCREDITATION) {
			setAccreditationFile(file)
			setShowAccreditationModal(false)
		}
	}

	function handleFileDrop(e, type) {
		e.preventDefault()
		e.stopPropagation()
		const file = e.dataTransfer.files && e.dataTransfer.files[0]
		if (!file) return
		if (type === FILE_TYPES.LOGO) {
			setLogoFile(file)
			setShowLogoModal(false)
		} else if (type === FILE_TYPES.ACCREDITATION) {
			setAccreditationFile(file)
			setShowAccreditationModal(false)
		}
	}

	/** Prevents default browser behavior for drag and drop */
	function preventDefault(e) {
		e.preventDefault()
		e.stopPropagation()
	}

	async function handleSubmit(e) {
		e.preventDefault()
		if (submitting) return
		const valid = validate()
		if (!valid) return
		setSubmitting(true)
		setSuccess(false)

		try {
			// Build DTO matching backend SubscriptionRequestDto (@JsonProperty names)
			const dto = {
				university_name: sanitizeInput(form.universityName),
				university_email: sanitizeInput(form.universityEmail),
				country: sanitizeInput(form.country),
				city: sanitizeInput(form.city),
				contact_number: sanitizeInput(form.contactNumber ? `+${form.contactNumber.replace(/\D/g, '')}` : ''),
				university_website_url: (form.universityWebsiteUrl || '').trim(),
				university_domain: sanitizeInput(form.universityDomain),
			}

			const formData = new FormData()
			formData.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }))
			if (accreditationFile) formData.append(FILE_CONFIG.accreditation.fieldName, accreditationFile)
			if (logoFile) formData.append(FILE_CONFIG.logo.fieldName, logoFile)

			const baseUrl = API_GATEWAY_BASE_URL.endsWith('/') ? API_GATEWAY_BASE_URL.slice(0, -1) : API_GATEWAY_BASE_URL
			const endpoint = `${baseUrl}${API_CONFIG.ENDPOINT_PATH}`

			const response = await fetch(endpoint, {
				method: 'POST',
				body: formData,
			})

			if (response.ok) {
				setSuccess(true)

				setTimeout(() => {
					setForm(INITIAL_FORM_STATE)
					setLogoFile(null)
					setAccreditationFile(null)
					setErrors({})
				}, API_CONFIG.FORM_RESET_DELAY)
			} else {
				handleSubmitError(response)
			}
		} catch (error) {
			setErrors({ submit: ERROR_MESSAGES.DEFAULT })
		} finally {
			setSubmitting(false)
		}
	}

	/**
	 * Handles submission errors and maps them to form fields
	 * @param {Response} response - Fetch response object
	 */
	async function handleSubmitError(response) {
		let errorData = {}
		try {
			errorData = await response.json()
		} catch (e) {
			// Ignore JSON parse errors
		}

		const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

		if (response.status === 409 || (errorData && /active request/i.test(errorData.message || errorData.error || ''))) {
			setErrors({ submit: ERROR_MESSAGES[409] })
		} else if (response.status === 400) {
			const fieldErrors = mapFieldErrors(errorData, snakeToCamel)
			if (Object.keys(fieldErrors).length) {
				setErrors((prev) => ({ ...prev, ...fieldErrors }))
			} else {
				setErrors({ submit: ERROR_MESSAGES[400] })
			}
		} else {
			const message = errorData?.message || errorData?.error || ERROR_MESSAGES.DEFAULT
			setErrors({ submit: message })
		}
	}

	/**
	 * Maps backend error response to form field errors
	 * @param {Object} errorData - Error response data
	 * @param {Function} transformKey - Function to transform field keys
	 * @returns {Object} Field errors object
	 */
	function mapFieldErrors(errorData, transformKey) {
		const fieldErrors = {}
		if (!errorData) return fieldErrors

		if (Array.isArray(errorData.errors)) {
			errorData.errors.forEach((err) => {
				if (err.field) fieldErrors[transformKey(err.field)] = err.message || err.defaultMessage
			})
		} else {
			Object.keys(errorData).forEach((k) => {
				const v = errorData[k]
				if (typeof v === 'string') fieldErrors[transformKey(k)] = v
				else if (Array.isArray(v) && v.length) fieldErrors[transformKey(k)] = v.join(', ')
				else if (v && typeof v === 'object' && v.message) fieldErrors[transformKey(k)] = v.message
			})
		}

		return fieldErrors
	}

	return (
		<div className="subscription-request-page">
			<NavBar
				appName="unihub"
				logoSrc="/logo.png"
				onLogoClick={onBackToLogin}
				onUserIconClick={onBackToLogin}
				isAuthenticated={false}
			/>

			<main className="subscription-request-main">
				<section className="subscription-request" aria-label="Subscription request">
					<div className="subscription-request-inner">
						<div className="subscription-header">
							<h2>Request a Subscription</h2>
							<p>Provide your university details to request a subscription.</p>
						</div>

						<form className="subscription-form" onSubmit={handleSubmit} noValidate>
							{errors.submit && (
								<div className="form-error-message" role="alert">
									<span>{errors.submit}</span>
								</div>
							)}

							{/* Section 1: Basic Information */}
							<div className="form-section-group">
								<h3 className="form-section-title">Basic Information</h3>
								<div className="subscription-grid">
								<label>
									University name
									<input
										name="universityName"
										type="text"
										value={form.universityName}
										onChange={handleChange}
										aria-invalid={!!errors.universityName}
										placeholder="University name"
										required
									/>
									<div className="field-help">{errors.universityName}</div>
								</label>

								<label>
								University domain
								<input
									name="universityDomain"
									type="text"
									value={form.universityDomain}
									onChange={handleChange}
									aria-invalid={!!errors.universityDomain}
									placeholder="university.edu"
									required
								/>
								<div className="field-help">{errors.universityDomain}</div>
							</label>
						</div>

						<div className="subscription-grid">
							<label>
								University website URL
								<input
									name="universityWebsiteUrl"
									type="url"
									value={form.universityWebsiteUrl}
									onChange={handleChange}
									aria-invalid={!!errors.universityWebsiteUrl}
									placeholder="https://www.university.edu"
									required
								/>
								<div className="field-help">{errors.universityWebsiteUrl}</div>
							</label>
						</div>
					</div>

					{/* Section 2: Location */}
					<div className="form-section-group">
						<h3 className="form-section-title">Location</h3>
						<div className="subscription-grid">
							<label>
								Country
								<Select
									name="country"
									options={countryOptions}
									value={countryOptions.find((c) => c.label === form.country) || null}
									onChange={(option) => {
										setForm((prev) => ({
											...prev,
											country: option ? option.label : '',
											countryCode: option ? option.value : '',
										}))
										setErrors((prev) => ({ ...prev, country: '' }))
									}}
									placeholder="Select country"
									classNamePrefix="country-select"
								/>
								<div className="field-help">{errors.country}</div>
							</label>

							<label>
								City
								{cityOptions.length > 0 ? (
									<Select
										name="city"
										options={cityOptions}
										value={cityOptions.find((c) => c.value === form.city) || null}
										onChange={(option) => {
											setForm((prev) => ({ ...prev, city: option ? option.value : '' }))
											setErrors((prev) => ({ ...prev, city: '' }))
										}}
										placeholder="Select city"
										classNamePrefix="country-select"
									/>
								) : (
									<input
										name="city"
										type="text"
										value={form.city}
										onChange={handleChange}
										aria-invalid={!!errors.city}
										placeholder="City"
									/>
								)}
								<div className="field-help">{errors.city}</div>
							</label>
						</div>
					</div>

						{/* Section 3: Contact Details */}
						<div className="form-section-group">
							<h3 className="form-section-title">Contact Details</h3>
							<div className="subscription-grid">
								<label>
								University email
								<input
									name="universityEmail"
									type="email"
									value={form.universityEmail}
									onChange={handleChange}
									aria-invalid={!!errors.universityEmail}
									placeholder="contact@university.edu"
									required
								/>
								<div className="field-help">{errors.universityEmail}</div>
							</label>

							<label>
								Contact number
								<PhoneInput
									defaultCountry="us"
									value={form.contactNumber}
									onChange={(value) => {
										setForm((prev) => ({ ...prev, contactNumber: value }))
										setErrors((prev) => ({ ...prev, contactNumber: '' }))
									}}
									inputProps={{
										name: 'contactNumber',
										required: true,
										'aria-invalid': !!errors.contactNumber,
									}}
								/>
								<div className="field-help">{errors.contactNumber}</div>
							</label>
							</div>
						</div>

						{/* Section 4: Documents */}
						<div className="form-section-group">
							<h3 className="form-section-title">Documents</h3>
							<div className="subscription-grid">
								<div className="file-field">
									<div className="file-label-row">
										<span>University logo</span>
									</div>
									<button
										type="button"
										className="file-button"
										onClick={() => setShowLogoModal(true)}
									>
										Add a file
									</button>
									{logoFile && <div className="file-name">{logoFile.name}</div>}
									<div className="field-help">{errors.universityLogo}</div>
								</div>

								<div className="file-field">
									<div className="file-label-row">
										<span>University accreditation</span>
									</div>
									<button
										type="button"
										className="file-button"
										onClick={() => setShowAccreditationModal(true)}
									>
										Add a file
									</button>
									{accreditationFile && <div className="file-name">{accreditationFile.name}</div>}
									<div className="field-help">{errors.universityAccreditation}</div>
								</div>
							</div>
						</div>

						<div className="subscription-actions">
							<button
								type="submit"
								className={`submit-btn ${submitting || !isFormComplete ? 'is-disabled' : ''} ${submitting ? 'is-loading' : ''}`}
								disabled={submitting || !isFormComplete}
							>
								{submitting ? (
									<>
										<span className="spinner"></span>
										Submitting...
									</>
								) : (
									'Submit request'
								)}
						</button>
						{success && (
							<div className="success-message" role="status">
								{SUCCESS_MESSAGE}
							</div>
						)}
					</div>
				</form>
			</div>
		</section>
			</main>

			{showLogoModal && (
				<div className="file-modal-overlay" onClick={() => setShowLogoModal(false)}>
					<div
						className="file-modal"
						onClick={(e) => e.stopPropagation()}
						onDragOver={preventDefault}
						onDragEnter={preventDefault}
					onDrop={(e) => handleFileDrop(e, FILE_TYPES.LOGO)}
				>
					<div className="file-modal-content" onClick={() => logoInputRef.current && logoInputRef.current.click()}>
						<div className="file-modal-cloud">
						<img src="/cloud.png" alt="Upload" className="file-cloud-img" />
						</div>
						<p>Drag your logo file here or click to browse</p>
						<input
							ref={logoInputRef}
							type="file"
							accept={FILE_CONFIG.logo.accept}
							style={{ display: 'none' }}
							onChange={(e) => handleFileSelect(e, FILE_TYPES.LOGO)}					/>
				</div>
			</div>
		</div>
		)}

		{showAccreditationModal && (
			<div className="file-modal-overlay" onClick={() => setShowAccreditationModal(false)}>
				<div
					className="file-modal"
						onClick={(e) => e.stopPropagation()}
						onDragOver={preventDefault}
						onDragEnter={preventDefault}
						onDrop={(e) => handleFileDrop(e, FILE_TYPES.ACCREDITATION)}
					>
				<div className="file-modal-content" onClick={() => accInputRef.current && accInputRef.current.click()}>
					<div className="file-modal-cloud">
					<img src="/cloud.png" alt="Upload" className="file-cloud-img" />
					</div>
					<p>Drag your accreditation file here or click to browse</p>
					<input
						ref={accInputRef}
						type="file"
						accept={FILE_CONFIG.accreditation.accept}
						style={{ display: 'none' }}
						onChange={(e) => handleFileSelect(e, FILE_TYPES.ACCREDITATION)}
					/>
				</div>
			</div>
		</div>
		)}
	</div>
	)
}


