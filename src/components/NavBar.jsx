import React from 'react'
import { Link } from 'react-router-dom'
import { getAccessToken } from '../utils/auth'

export default function NavBar({ appName = 'App Name', logoSrc = '', onUserIconClick, onLogoClick, onCartClick, cartTo, isAuthenticated }) {
	const authenticated = isAuthenticated !== undefined ? isAuthenticated : !!getAccessToken()

	return (
		<header className="navbar">
			<div className="scroll-progress" aria-hidden>
				<div className="scroll-progress__bar" />
			</div>
			<div className="nav-left">
				<button
					className="logo-button"
					onClick={authenticated ? undefined : onLogoClick}
					aria-label="Home"
					aria-disabled={authenticated}
					style={{ background: 'transparent', border: 'none', cursor: authenticated ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
				<nav className={`nav-links ${authenticated ? 'nav-disabled' : ''}`}>
					<a href="#about">About Us</a>
					<a href="#solutions">Solutions</a>
					<a href="#pricing">Pricing</a>
					<a href="#success-partners">Success partners</a>
					<a href="#contact">Contact Us</a>
					<a href="#contact">Our Location</a>
				</nav>

				<div className="nav-icons">
					{cartTo ? (
						<Link to={cartTo} aria-label="cart" className="icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
							<img src="/cart.png" alt="cart" style={{ width: 20, height: 20 }} />
						</Link>
					) : (
						<button aria-label="cart" className="icon-button" onClick={onCartClick ? () => onCartClick() : undefined}>
							<img src="/cart.png" alt="cart" style={{ width: 20, height: 20 }} />
						</button>
					)}
					<button
						aria-label={authenticated ? 'logout' : 'user'}
						className="icon-button"
						onClick={onUserIconClick}
					>
						{authenticated ? (
								<img src="/logout.png" alt="Logout" style={{ width: 20, height: 20 }} />
							) : (
								<img src="/user.png" alt="user" style={{ width: 20, height: 20 }} />
							)}
					</button>
				</div>
			</div>
		</header>
	)
}

