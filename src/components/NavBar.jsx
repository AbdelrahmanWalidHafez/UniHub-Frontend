import React from 'react'
import { getAccessToken } from '../utils/auth'

export default function NavBar({ appName = 'App Name', logoSrc = '', onUserIconClick, onLogoClick, onCartClick, isAuthenticated }) {
	const authenticated = isAuthenticated !== undefined ? isAuthenticated : !!getAccessToken()

	return (
		<header className="navbar">
			<div className="scroll-progress" aria-hidden>
				<div className="scroll-progress__bar" />
			</div>
			<div className="nav-left">
				<button
					className="logo-button"
					onClick={onLogoClick}
					aria-label="Home"
					style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
				>
					{logoSrc ? (
						<img src={logoSrc} alt="logo" className="logo-img" />
					) : (
						<div className="logo-placeholder" />
					)}
					<span className="app-name">{appName}</span>
				</button>
			</div>

			<div className="nav-right">
				<nav className="nav-links">
					<a href="#about">About Us</a>
					<a href="#solutions">Solutions</a>
					<a href="#pricing">Pricing</a>
					<a href="#success-partners">Success partners</a>
					<a href="#contact">Contact Us</a>
					<a href="#contact">Our Location</a>
				</nav>

				<div className="nav-icons">
					<button aria-label="cart" className="icon-button" onClick={onCartClick}>
						<img src="/cart.png" alt="cart" style={{ width: 20, height: 20 }} />
					</button>
					<button
						aria-label={authenticated ? 'logout' : 'user'}
						className="icon-button"
						onClick={onUserIconClick}
					>
						{authenticated ? (
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M17 16L21 12M21 12L17 8M21 12H7M13 16C13 17.6569 11.6569 19 10 19H6C4.34315 19 3 17.6569 3 16V8C3 6.34315 4.34315 5 6 5H10C11.6569 5 13 6.34315 13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						) : (
							<img src="/user.png" alt="user" style={{ width: 20, height: 20 }} />
						)}
					</button>
				</div>
			</div>
		</header>
	)
}

