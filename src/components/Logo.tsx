interface LogoProps {
  className?: string;
  white?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', white = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/Logo-DELIVERY-Digital-Neo-sans-Bold noir_ 2 copie 5.png"
        alt="DELIVERY Digital"
        className="h-full w-auto"
        style={white ? { filter: 'invert(1) brightness(2)' } : undefined}
      />
    </div>
  );
};

export default Logo;
