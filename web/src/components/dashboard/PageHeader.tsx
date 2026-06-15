import React from 'react'

type PageHeaderProps = {
  title: React.ReactNode
  subtitle: string
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <header className="dashboard-header">
      <div className="dashboard-greeting">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  )
}

export default PageHeader
