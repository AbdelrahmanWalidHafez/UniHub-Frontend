import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { getAccessToken } from '../utils/auth'

export default function NavBar({ appName = 'App Name', logoSrc = '', onUserIconClick, onLogoClick, onCartClick, cartTo, isAuthenticated, showLumos = false }) {
	const authenticated = isAuthenticated !== undefined ? isAuthenticated : !!getAccessToken()
	const navigate = useNavigate()
	const [lumosOpen, setLumosOpen] = React.useState(false)

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

					{/* Lumos AI tab with submenu — only for students/instructors */}
				{showLumos && (
					<div className="lumos-nav" style={{ position: 'relative' }}>
						<button
							className="lumos-toggle"
							onClick={(e) => { e.preventDefault(); setLumosOpen(!lumosOpen) }}
							style={{ background: 'transparent', border: 'none', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
						>
							Lumos AI
						</button>
						{lumosOpen && (
							<div className="lumos-submenu" style={{ position: 'absolute', right: 0, top: 'calc(var(--nav-height) + 8px)', background: '#fff', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '8px', minWidth: 160, zIndex: 1400 }}>
								<button className="lumos-submenu-btn" onClick={() => { setLumosOpen(false); navigate(ROUTES.LUMOS_AI) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Continue chat</button>
								<button className="lumos-submenu-btn" onClick={() => { setLumosOpen(false); navigate(ROUTES.LUMOS_AI, { state: { newChat: Date.now() } }) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Start new chat</button>
							</div>
						)}
					</div>
				)}

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

