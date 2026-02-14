/**
 * Subscription Request Component Constants
 * Contains validation rules, API configuration, and UI messages
 */

export const FORM_FIELDS = {
	UNIVERSITY_NAME: 'universityName',
	UNIVERSITY_EMAIL: 'universityEmail',
	COUNTRY: 'country',
	COUNTRY_CODE: 'countryCode',
	CITY: 'city',
	CONTACT_NUMBER: 'contactNumber',
	UNIVERSITY_WEBSITE_URL: 'universityWebsiteUrl',
	UNIVERSITY_DOMAIN: 'universityDomain',
	CIF: 'cif',
}

export const INITIAL_FORM_STATE = {
	universityName: '',
	universityEmail: '',
	country: '',
	countryCode: '',
	city: '',
	contactNumber: '',
	universityWebsiteUrl: '',
	universityDomain: '',
	cif: '',
}

export const VALIDATION_RULES = {
	universityName: {
		minLength: 3,
		maxLength: 150,
		pattern: /^[\p{L} .'-]+$/u,
		messages: {
			empty: 'University name is required',
			length: 'University name must be between 3 and 150 characters',
			pattern: 'University name contains invalid characters',
		},
	},
	universityEmail: {
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		messages: {
			empty: 'University email cannot be empty',
			pattern: 'Invalid email address',
		},
	},
	country: {
		minLength: 2,
		maxLength: 56,
		messages: {
			empty: 'Country cannot be empty',
			length: 'Invalid country name',
		},
	},
	city: {
		minLength: 2,
		maxLength: 100,
		pattern: /^[\p{L} .'-]+$/u,
		messages: {
			empty: 'City cannot be empty',
			length: 'City name is too short or too long',
			pattern: 'City name contains invalid characters',
		},
	},
	contactNumber: {
		pattern: /^\+?\d{7,15}$/,
		messages: {
			empty: 'Number cannot be empty',
			pattern: 'Invalid phone number',
		},
	},
	universityWebsiteUrl: {
		pattern: /^https?:\/\/.+/i,
		messages: {
			empty: 'University website url cannot be empty',
			pattern: 'Invalid url',
		},
	},
	universityDomain: {
		pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
		messages: {
			empty: 'University domain cannot be empty',
			pattern: 'Invalid university domain',
		},
	},
	cif: {
		minLength: 2,
		maxLength: 50,
		pattern: /^[A-Za-z0-9\-]+$/,
		messages: {
			empty: 'CIF is required',
			length: 'CIF must be between 2 and 50 characters',
			pattern: 'CIF contains invalid characters',
		},
	},
}

export const ERROR_MESSAGES = {
	409: 'There is already an active request with this data. If you see any suspicious activity contact us.',
	400: 'Invalid request data',
	500: 'Server error occurred. If you see any suspicious activity contact us.',
	504: 'Server timeout. Please try again later.',
	DEFAULT: 'Submission failed. If you see any suspicious activity contact us.',
}

export const SUCCESS_MESSAGE =
	'Your subscription request has been recorded. You will receive an acceptance or rejection email within one business day.'

export const API_CONFIG = {
	ENDPOINT_PATH: '/subscription/api/v1/public/request-subscription',
	FORM_RESET_DELAY: 2000,
	DEFAULT_COUNTRY: 'us',
}

export const FILE_TYPES = {
	LOGO: 'logo',
	ACCREDITATION: 'accreditation',
}

export const FILE_CONFIG = {
	logo: {
		name: 'University logo',
		accept: '.png,.jpg,.jpeg,.pdf',
		fieldName: 'media',
	},
	accreditation: {
		name: 'University accreditation',
		accept: '.pdf,.png,.jpg,.jpeg',
		fieldName: 'file',
	},
}
