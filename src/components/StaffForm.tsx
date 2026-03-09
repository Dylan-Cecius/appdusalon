import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const roleOptions = [
  { value: 'gérant', label: 'Gérant' },
  { value: 'coiffeur', label: 'Coiffeur' },
  { value: 'esthéticien', label: 'Esthéticien' },
  { value: 'barbier', label: 'Barbier' },
  { value: 'assistant', label: 'Assistant' },
];

const colorOptions = [
  '#8B5CF6', '#3B82F6', '#EC4899', '#EF4444',
  '#F97316', '#22C55E', '#14B8A6', '#6366F1',
];

export interface StaffFormData {
  name: string;
  role: string;
  color: string;
  phone: string;
  email: string;
  commission_rate: number;
  is_active: boolean;
}

interface StaffFormProps {
  initialValues: StaffFormData;
  onSubmit: (data: StaffFormData) => void;
  submitLabel: string;
  isPending: boolean;
}

// Using uncontrolled inputs with refs to completely avoid React state re-render issues
const StaffForm = ({ initialValues, onSubmit, submitLabel, isPending }: StaffFormProps) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const commissionRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState(initialValues.role);
  const [color, setColor] = useState(initialValues.color);

  const handleSubmit = () => {
    onSubmit({
      name: nameRef.current?.value || '',
      role,
      color,
      phone: phoneRef.current?.value || '',
      email: emailRef.current?.value || '',
      commission_rate: parseInt(commissionRef.current?.value || '0') || 0,
      is_active: initialValues.is_active,
    });
  };

  // Track name for button disable state
  const [hasName, setHasName] = useState(!!initialValues.name);

  return (
    <div className="space-y-4">
      <div>
        <Label>Nom *</Label>
        <Input
          ref={nameRef}
          defaultValue={initialValues.name}
          onChange={(e) => setHasName(!!e.target.value.trim())}
          placeholder="Marie Dupont"
        />
      </div>
      <div>
        <Label>Rôle</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Couleur</Label>
        <div className="flex gap-2 mt-1">
          {colorOptions.map(c => (
            <button
              key={c}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Téléphone</Label>
          <Input
            ref={phoneRef}
            defaultValue={initialValues.phone}
            placeholder="0612345678"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            ref={emailRef}
            defaultValue={initialValues.email}
            placeholder="marie@salon.com"
          />
        </div>
      </div>
      <div>
        <Label>Commission (%)</Label>
        <Input
          ref={commissionRef}
          type="number"
          min={0}
          max={100}
          defaultValue={initialValues.commission_rate}
        />
      </div>
      <Button onClick={handleSubmit} className="w-full" disabled={isPending || !hasName}>
        {isPending ? 'En cours...' : submitLabel}
      </Button>
    </div>
  );
};

export default StaffForm;
