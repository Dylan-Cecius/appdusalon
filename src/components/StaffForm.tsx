import { useState, useCallback, useRef, memo } from 'react';
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

const StaffForm = memo(({ initialValues, onSubmit, submitLabel, isPending }: StaffFormProps) => {
  // State initialized once from initialValues. No useEffect sync — remount via key to reset.
  const [form, setForm] = useState<StaffFormData>(() => ({ ...initialValues }));

  // Use ref for onSubmit to avoid re-render when parent callback changes
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const handleChange = useCallback((field: keyof StaffFormData, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmitRef.current(form);
  }, [form]);

  return (
    <div className="space-y-4">
      <div>
        <Label>Nom *</Label>
        <Input
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Marie Dupont"
        />
      </div>
      <div>
        <Label>Rôle</Label>
        <Select value={form.role} onValueChange={(v) => handleChange('role', v)}>
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
              className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => handleChange('color', c)}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Téléphone</Label>
          <Input
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="0612345678"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="marie@salon.com"
          />
        </div>
      </div>
      <div>
        <Label>Commission (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.commission_rate}
          onChange={(e) => handleChange('commission_rate', parseInt(e.target.value) || 0)}
        />
      </div>
      <Button onClick={handleSubmit} className="w-full" disabled={isPending || !form.name.trim()}>
        {isPending ? 'En cours...' : submitLabel}
      </Button>
    </div>
  );
});

StaffForm.displayName = 'StaffForm';

export default StaffForm;
