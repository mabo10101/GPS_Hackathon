import compassLogo from '../assets/compass-updated.png';
import './BrandLogo.css';

export default function BrandLogo({ small = false }: { small?: boolean }) {
  return <img className={`brand-logo${small ? ' brand-logo-small' : ''}`} src={compassLogo} alt="Go Forth compass logo" width={small ? 36 : 72} height={small ? 36 : 72} />;
}
