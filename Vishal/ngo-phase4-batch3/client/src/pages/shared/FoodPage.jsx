import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal, PageHeader, Tabs } from '../../components/ui';
import ResourcePage from '../../components/ResourcePage';
import FoodAlerts from '../../components/FoodAlerts';
import DistributionForm from '../../components/DistributionForm';
import DistributionHistory from '../../components/DistributionHistory';
import { useAuth } from '../../context/AuthContext';
import foodInventory from '../../modules/foodInventory';

export default function FoodPage() {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState('stock');
  const [version, setVersion] = useState(0); // bumped whenever stock changes, so alerts and both lists refresh
  const [form, setForm] = useState(false);
  const bump = () => setVersion((v) => v + 1);

  return (
    <>
      <PageHeader title="Food" subtitle="What is in stock, what needs attention, and what was given out."
        actions={hasPermission('food.distribute') && <button className="btn-primary" onClick={() => setForm(true)}><Plus className="h-4 w-4" />Record distribution</button>} />
      <FoodAlerts version={version} />
      <div className="mb-4 rounded-xl border border-slate-200 bg-white">
        <Tabs tabs={[{ key: 'stock', label: 'Stock' }, { key: 'history', label: 'Distribution history' }]} value={tab} onChange={setTab} />
      </div>
      {tab === 'stock'
        ? <ResourcePage config={foodInventory} embedded refreshKey={version} onChange={bump} />
        : <DistributionHistory canDelete={hasPermission('food.delete')} isAdmin={user.role === 'admin'} refreshKey={version} onChange={bump} />}

      <Modal open={form} wide title="Record distribution" onClose={() => setForm(false)}>
        {form && <DistributionForm isAdmin={user.role === 'admin'} onClose={() => setForm(false)} onSaved={() => { setForm(false); bump(); }} />}
      </Modal>
    </>
  );
}
