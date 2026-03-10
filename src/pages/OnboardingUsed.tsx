import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OnboardingUsed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(240,30%,12%)] via-[hsl(260,40%,18%)] to-[hsl(230,35%,10%)] flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsla(260,60%,30%,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsla(230,60%,25%,0.2) 0%, transparent 40%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Convite já utilizado</h1>
        <p className="text-sm text-gray-500 mb-6">
          Este convite já foi aceito anteriormente. Se você já tem uma conta, acesse o sistema normalmente.
        </p>
        <Button onClick={() => navigate('/login')}>Ir para o login</Button>
      </div>
    </div>
  );
}
