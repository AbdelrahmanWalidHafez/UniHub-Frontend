export function sanitizeInput(input) {
	if (typeof input !== 'string') return ''
	
	return input
		.trim()
		.replace(/[<>]/g, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+=/gi, '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
		.replace(/\//g, '&#x2F;')
}

export function escapeHtml(text) {
	if (typeof text !== 'string') return ''
	
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	}
	
	return text.replace(/[&<>"']/g, (m) => map[m])
}


