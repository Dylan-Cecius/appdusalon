import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';

interface SecureClientDataProps {
  appointmentId: string;
  initialName?: string;
  initialPhone?: string;
  showToggle?: boolean;
}

const SecureClientData = ({ 
  appointmentId, 
  initialName = 'Client', 
  initialPhone = '***-***-****',
  showToggle = true 
}: SecureClientDataProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [clientData, setClientData] = useState({
    name: initialName,
    phone: initialPhone
  });
  const [loading, setLoading] = useState(false);
  const { getClientDetails } = useSupabaseAppointments();

  const toggleReveal = async () => {
    if (!isRevealed) {
      // Reveal sensitive data
      setLoading(true);
      try {
        const details = await getClientDetails(appointmentId);
        setClientData({
          name: details.clientName,
          phone: details.clientPhone
        });
        setIsRevealed(true);
      } catch (error) {
        console.error('Error revealing client data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Hide sensitive data again
      setClientData({
        name: initialName,
        phone: initialPhone
      });
      setIsRevealed(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!isRevealed && <Lock className="h-3 w-3 text-muted-foreground" />}
          <div>
            <p className="font-medium text-sm truncate">{clientData.name}</p>
            <p className="text-xs text-muted-foreground">{clientData.phone}</p>
          </div>
        </div>
      </div>
      
      {showToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleReveal}
          disabled={loading}
          className="shrink-0 h-8 w-8 p-0"
          title={isRevealed ? "Masquer les données client" : "Révéler les données client"}
        >
          {loading ? (
            <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
          ) : isRevealed ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};

export default SecureClientData;