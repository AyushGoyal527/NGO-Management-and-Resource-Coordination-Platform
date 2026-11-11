import ResourcePage from '../../components/ResourcePage';
import donations from '../../modules/donations';

// Own file so the chart library only loads when someone opens Donations.
export default function DonationsPage() { return <ResourcePage config={donations} />; }
