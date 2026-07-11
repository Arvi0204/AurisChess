import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/aurischess-logo.svg'

type PageHeaderProps = {
  title?: React.ReactNode
  subtitle?: string
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-inner">
        <div className="header-brand-mobile">
          <Link className="sidebar-logo" to="/dashboard" aria-label="AurisChess home">
            <img className="logo__graphic" src={logo} alt="" />
            <span className="logo__text">Auris<span>Chess</span></span>
          </Link>
        </div>
        {(title || subtitle) && (
          <div className="dashboard-greeting">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
      </div>
    </header>
  )
}

export default PageHeader
