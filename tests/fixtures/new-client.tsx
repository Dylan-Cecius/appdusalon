import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import NewClientDialog from '../../src/components/NewClientDialog';
import type { ClientCreateInput } from '../../src/lib/clientCreateDraft';
import '../../src/index.css';

const controls = { calls: 0, input: null as ClientCreateInput | null, succeed: () => {}, empty: () => {}, fail: () => {} };
Object.assign(window, { newClientFixture: controls });

export function Fixture() {
  const [open, setOpen] = useState(true);
  return <main><button onClick={() => setOpen(true)}>Ouvrir la fiche</button>
    <NewClientDialog open={open} onOpenChange={setOpen} canUseNotes onCreate={input => {
      controls.calls += 1; controls.input = input;
      return new Promise<{ id: string } | null>((resolve, reject) => {
        controls.succeed = () => resolve({ id: 'synthetic-client' });
        controls.empty = () => resolve(null);
        controls.fail = () => reject(new Error('Synthetic error'));
      });
    }} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
