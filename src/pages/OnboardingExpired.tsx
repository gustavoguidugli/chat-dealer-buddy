import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OnboardingExpired() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(240,30%,12%)] via-[hsl(260,40%,18%)] to-[hsl(230,35%,10%)] flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsla(260,60%,30%,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsla(230,60%,25%,0.2) 0%, transparent 40%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Este convite expirou</h1>
        <p className="text-sm text-gray-500 mb-6">
          Os convites expiram após 72 horas. Solicite um novo convite ao administrador do time.
        </p>
        <Button variant="outline" onClick={() => navigate('/login')}>Voltar ao login</Button>
      </div>
    </div>
  );
}
