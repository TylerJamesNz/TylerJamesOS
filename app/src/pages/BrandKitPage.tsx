import { Link } from 'react-router-dom'
import BrandKitShell from '../components/BrandKitShell'
import './BrandKitPage.css'

export default function BrandKitPage() {
  return (
    <>
      <div className="brand-kit-back">
        <Link to="/">← Hub</Link>
      </div>
      <BrandKitShell />
    </>
  )
}
