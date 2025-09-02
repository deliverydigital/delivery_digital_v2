interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/Logo-DELIVERY-Digital-Neo-sans-Bold noir_ 2 copie 5.png" 
        alt="DELIVERY Digital" 
        className="h-12 w-auto"
      />
    </div>
  );
};

export default Logo;